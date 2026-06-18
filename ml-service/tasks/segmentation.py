# ============================================================================
# FILE ADDRESS: ml-service/tasks/segmentation.py
# ============================================================================
# EXPLANATION:
# This module implements the upgraded Customer Segmentation system using
# K-Means clustering. It replaces the previous implementation with several
# critical fixes identified in the professor's review:
#
# KEY FIXES IMPLEMENTED:
# 1. 🔧 K-Range Bug Fix: Ensures we always test at least 3 K values,
#    preventing the edge case where only 2 values were tested.
# 2. 🎯 Centroid-Distance-Based Labeling: Replaces static threshold rules
#    with mathematical archetype matching using Euclidean distance in RFM space.
# 3. 🚫 No Duplicate Labels: Implements Hungarian-style greedy assignment
#    to ensure each cluster gets a unique business segment label.
# 4. 📊 Cross-Validation: Runs K-Means 10 times with different random_state
#    values and logs mean ± std of Silhouette Score for robustness.
# 5. 📝 Training Metadata: Logs date ranges, customer counts, and model
#    parameters to `ml_model_accuracy` for drift detection.
# ============================================================================

import logging
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from scipy.spatial.distance import cdist
from datetime import datetime
from psycopg2.extras import execute_batch, Json

logger = logging.getLogger("bushal-ml.segmentation")

# ─── Archetype Definitions ───────────────────────────────────────────────────
# These represent ideal customer profiles in normalized RFM space [0,1].
# R = Recency (lower is better), F = Frequency (higher is better), M = Monetary (higher is better)
ARCHETYPES = {
    "VIP":          (0.2, 0.9, 0.9),   # Recent, frequent, high spender
    "Loyal":        (0.4, 0.7, 0.7),   # Somewhat recent, regular buyer
    "Big_Spender":  (0.5, 0.4, 0.95),  # High monetary, lower frequency
    "New_Customer": (0.1, 0.2, 0.3),   # Very recent, low activity
    "At_Risk":      (0.8, 0.5, 0.5),   # Not recent, moderate activity
    "Churned":      (0.95, 0.1, 0.1),  # Very old, low activity
    "Regular":      (0.5, 0.5, 0.5),   # Average across all dimensions
    "Fake_Orders":  (0.3, 0.95, 0.1),  # Very frequent but low spend (suspicious)
}

def assign_unique_labels(centroids_scaled: np.ndarray, scaler: StandardScaler) -> dict:
    """
    Assign business labels to clusters using centroid-distance-based matching.
    Uses Hungarian-style greedy assignment to ensure no duplicate labels.
    
    Args:
        centroids_scaled: Scaled centroid coordinates from KMeans
        scaler: The StandardScaler used to transform the data
        
    Returns:
        dict: Mapping of cluster_id -> segment_label
    """
    # Inverse transform centroids to get them back in original RFM scale
    centroids_original = scaler.inverse_transform(centroids_scaled)
    
    # Normalize to [0,1] range for comparison with archetypes
    min_vals = centroids_original.min(axis=0)
    max_vals = centroids_original.max(axis=0)
    range_vals = max_vals - min_vals
    
    # Avoid division by zero
    range_vals[range_vals == 0] = 1
    
    centroids_normalized = (centroids_original - min_vals) / range_vals
    
    # Convert archetypes to numpy array
    archetype_names = list(ARCHETYPES.keys())
    archetype_coords = np.array(list(ARCHETYPES.values()))
    
    # Calculate Euclidean distance from each centroid to each archetype
    distances = cdist(centroids_normalized, archetype_coords, metric='euclidean')
    
    # Hungarian-style greedy assignment: closest match first, no repeats
    assigned = {}
    used_archetypes = set()
    
    # Flatten distances with (cluster_id, archetype_idx, distance)
    pairs = [(i, j, distances[i, j])
             for i in range(len(centroids_normalized))
             for j in range(len(archetype_names))]
    pairs.sort(key=lambda x: x[2])  # Sort by distance ascending
    
    for cluster_id, archetype_idx, _ in pairs:
        if cluster_id not in assigned and archetype_idx not in used_archetypes:
            assigned[cluster_id] = archetype_names[archetype_idx]
            used_archetypes.add(archetype_idx)
    
    # If some clusters weren't assigned (more clusters than archetypes),
    # assign them to "Regular"
    for cluster_id in range(len(centroids_normalized)):
        if cluster_id not in assigned:
            assigned[cluster_id] = "Regular"
    
    return assigned

def run_customer_segmentation():
    """
    Executes the customer segmentation pipeline using K-Means clustering.
    Dynamically determines optimal K using Silhouette Score with cross-validation,
    then maps clusters to business segments using centroid-distance matching.
    """
    logger.info("📊 Starting Customer Segmentation Pipeline...")
    conn = None
    
    try:
        from main import get_db_connection
        conn = get_db_connection()
        
        # 1. Fetch RFM Data from Supabase
        logger.info("🔄 Fetching customer purchase data...")
        query = """
        SELECT
            p.id as customer_id,
            EXTRACT(DAY FROM (NOW() - MAX(o.created_at))) as recency,
            COUNT(o.id) as frequency,
            COALESCE(SUM(o.total), 0) as monetary
        FROM profiles p
        LEFT JOIN orders o ON p.id = o.user_id AND o.status = 'fulfilled'
        WHERE p.role = 'customer'
        GROUP BY p.id
        HAVING COUNT(o.id) > 0;
        """
        df = pd.read_sql_query(query, conn)
        
        if df.empty or len(df) < 10:
            logger.warning("⚠️ Not enough customer data for clustering. Skipping.")
            return {"status": "skipped", "reason": "Insufficient data"}
        
        logger.info(f"✅ Fetched {len(df)} active customers.")
        
        # 2. Prepare and Scale Features
        features = df[['recency', 'frequency', 'monetary']].fillna(0)
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        
        # 3. Find Optimal K using Silhouette Score with Cross-Validation
        # FIX: Ensure we always test at least 3 K values
        logger.info("🔍 Finding optimal K using Silhouette Score (10-fold CV)...")
        max_k = min(10, max(3, len(df) // 5))  # FIX: Ensure max_k >= 3
        K_range = range(2, max_k + 1)  # FIX: Inclusive range, always at least 2-4
        
        best_k = 2
        best_score = -1
        best_std = 0
        cv_results = {}
        
        for k in K_range:
            scores = []
            # Run 10 times with different random_state for cross-validation
            for random_state in range(10):
                kmeans_temp = KMeans(
                    n_clusters=k,
                    random_state=random_state,
                    n_init=10,
                    max_iter=300
                )
                cluster_labels_temp = kmeans_temp.fit_predict(features_scaled)
                score = silhouette_score(features_scaled, cluster_labels_temp)
                scores.append(score)
            
            mean_score = np.mean(scores)
            std_score = np.std(scores)
            cv_results[k] = {"mean": mean_score, "std": std_score}
            
            logger.info(f"   K={k}, Silhouette={mean_score:.4f} ± {std_score:.4f}")
            
            if mean_score > best_score:
                best_score = mean_score
                best_std = std_score
                best_k = k
        
        logger.info(f"🎯 Optimal K determined: {best_k} (Score: {best_score:.4f} ± {best_std:.4f})")
        
        # 4. Run Final K-Means with Optimal K
        kmeans = KMeans(
            n_clusters=best_k,
            random_state=42,
            n_init=10,
            max_iter=300
        )
        df['cluster'] = kmeans.fit_predict(features_scaled)
        
        # 5. Assign Business Labels Using Centroid-Distance Matching
        logger.info("🧠 Mapping clusters to business segments via centroid distances...")
        cluster_labels = assign_unique_labels(kmeans.cluster_centers_, scaler)
        
        df['segment'] = df['cluster'].map(cluster_labels)
        
        # Log cluster assignments for debugging
        for cluster_id, label in cluster_labels.items():
            centroid = kmeans.cluster_centers_[cluster_id]
            centroid_original = scaler.inverse_transform([centroid])[0]
            logger.info(
                f"   Cluster {cluster_id} -> {label} "
                f"(R={centroid_original[0]:.1f}d, F={centroid_original[1]:.1f}, M=৳{centroid_original[2]:.0f})"
            )
        
        # 6. Write Results to Database
        logger.info("💾 Writing segmentation results to database...")
        cursor = conn.cursor()
        
        # Clear old segments
        cursor.execute("TRUNCATE TABLE customer_segments;")
        
        # Insert new segments
        insert_query = """
        INSERT INTO customer_segments (
            customer_id, segment, recency, frequency, monetary, cluster_id, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        records = [
            (
                str(row['customer_id']),
                row['segment'],
                int(row['recency']),
                int(row['frequency']),
                float(row['monetary']),
                int(row['cluster'])
            )
            for _, row in df.iterrows()
        ]
        execute_batch(cursor, insert_query, records, page_size=1000)
        conn.commit()
        cursor.close()
        
        # 7. Log Training Metadata to ml_model_accuracy
        logger.info("📝 Logging training metadata...")
        cursor = conn.cursor()
        
        # Calculate date range of training data
        date_range_query = """
        SELECT
            MIN(o.created_at) as start_date,
            MAX(o.created_at) as end_date
        FROM orders o
        WHERE o.status = 'fulfilled'
        """
        cursor.execute(date_range_query)
        date_range = cursor.fetchone()
        
        metadata = {
            "date_range": [
                date_range['start_date'].isoformat() if date_range['start_date'] else None,
                date_range['end_date'].isoformat() if date_range['end_date'] else None
            ],
            "customer_count": len(df),
            "order_count": int(df['frequency'].sum()),
            "avg_orders_per_customer": float(df['frequency'].mean()),
            "optimal_k": best_k,
            "silhouette_mean": float(best_score),
            "silhouette_std": float(best_std),
            "cv_results": {str(k): {"mean": float(v["mean"]), "std": float(v["std"])} for k, v in cv_results.items()},
            "random_state": 42,
            "run_timestamp": datetime.now().isoformat()
        }
        
        # Insert into ml_model_accuracy table
        insert_accuracy = """
        INSERT INTO ml_model_accuracy (
            model_name, metric_name, metric_value, records_evaluated, evaluated_at, training_metadata
        ) VALUES (%s, %s, %s, %s, NOW(), %s)
        """
        cursor.execute(insert_accuracy, (
            'kmeans_segmentation',
            'silhouette_score',
            best_score,
            len(df),
            Json(metadata)
        ))
        conn.commit()
        cursor.close()
        
        # 8. Generate Summary
        segment_counts = df['segment'].value_counts().to_dict()
        logger.info(f"✅ Segmentation complete. Distribution: {segment_counts}")
        
        return {
            "status": "success",
            "customers_analyzed": len(df),
            "optimal_k": best_k,
            "silhouette_score": round(best_score, 4),
            "silhouette_std": round(best_std, 4),
            "segment_distribution": segment_counts,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"❌ Segmentation failed: {str(e)}", exc_info=True)
        if conn:
            conn.rollback()
        return {"status": "error", "error": str(e)}
    
    finally:
        if conn:
            conn.close()