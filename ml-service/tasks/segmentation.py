# ============================================================================
# FILE ADDRESS: ml-service/tasks/segmentation.py
# ============================================================================
# EXPLANATION:
# This module implements Customer Segmentation using K-Means clustering on 
# RFM (Recency, Frequency, Monetary) features. It replaces the previous 
# TypeScript implementation that ran inside Vercel serverless functions.
#
# BUG FIXES APPLIED:
# 1. Function signature now accepts `conn` parameter from main.py
# 2. Uses correct column names matching actual DB schema:
#    - customer_segments: customer_id, segment, recency, frequency, monetary, cluster_id
#    - ml_model_accuracy: model_name, metric_name, metric_value, records_evaluated, evaluated_at
# 3. Gracefully returns "skipped" status when insufficient data exists
# 4. Does NOT close the connection (main.py handles that)
# 5. Proper error handling with rollback on failure
# ============================================================================

import logging
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("bushal-ml.segmentation")


def run_customer_segmentation(conn):
    """
    Runs K-Means clustering on customer RFM data and writes results to 
    the customer_segments table.
    
    Args:
        conn: psycopg2 connection object (passed from main.py)
    
    Returns:
        dict: Status and metrics of the segmentation run
    """
    logger.info("📊 Starting Customer Segmentation (K-Means)...")
    cursor = None
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # ─── 1. Fetch Fulfilled Orders ─────────────────────────────────────
        logger.info("   📥 Fetching order history...")
        cursor.execute("""
            SELECT 
                o.user_id,
                o.total,
                o.created_at,
                EXTRACT(DAY FROM (NOW() - MAX(o.created_at) OVER (PARTITION BY o.user_id))) as recency_days
            FROM public.orders o
            WHERE o.status = 'fulfilled'
            ORDER BY o.user_id, o.created_at DESC
        """)
        
        orders = cursor.fetchall()
        
        if not orders or len(orders) < 10:
            logger.warning("   ⏭️ Insufficient order data for segmentation. Need at least 10 fulfilled orders.")
            return {
                "status": "skipped",
                "reason": "Insufficient data",
                "orders_found": len(orders) if orders else 0
            }
        
        # ─── 2. Calculate RFM Metrics ──────────────────────────────────────
        logger.info("   🧮 Calculating RFM metrics...")
        
        # Group by customer
        customer_data = {}
        for order in orders:
            uid = str(order['user_id'])
            if uid not in customer_data:
                customer_data[uid] = {
                    'recency': order['recency_days'] or 0,
                    'frequency': 0,
                    'monetary': 0.0
                }
            customer_data[uid]['frequency'] += 1
            customer_data[uid]['monetary'] += float(order['total'] or 0)
        
        # Convert to DataFrame
        df = pd.DataFrame([
            {
                'customer_id': uid,
                'recency': data['recency'],
                'frequency': data['frequency'],
                'monetary': data['monetary']
            }
            for uid, data in customer_data.items()
        ])
        
        logger.info(f"   📊 Found {len(df)} unique customers with order history.")
        
        if len(df) < 5:
            logger.warning("   ⏭️ Too few unique customers for meaningful clustering. Need at least 5.")
            return {
                "status": "skipped",
                "reason": "Too few unique customers",
                "customers_found": len(df)
            }
        
        # ─── 3. Prepare Features for Clustering ────────────────────────────
        features = ['recency', 'frequency', 'monetary']
        X = df[features].values
        
        # Standardize features (K-Means is distance-based)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # ─── 4. Find Optimal K (Elbow Method + Silhouette) ─────────────────
        logger.info("   🔍 Finding optimal number of clusters (K)...")
        
        # We want 5 segments: VIP, Loyal, Normal, High Risk, Fake Orders
        # But we test K=3 to K=7 to find the best silhouette score
        min_k = 3
        max_k = min(7, len(df) - 1)  # Can't have more clusters than data points
        
        if max_k < min_k:
            max_k = min_k
        
        best_k = 5  # Default target
        best_score = -1
        best_std = 0
        best_labels = None
        best_model = None
        
        k_range = range(min_k, max_k + 1)
        scores = []
        
        for k in k_range:
            try:
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
                labels = kmeans.fit_predict(X_scaled)
                
                # Need at least 2 clusters for silhouette score
                if len(set(labels)) < 2:
                    continue
                
                score = silhouette_score(X_scaled, labels)
                scores.append((k, score))
                
                logger.info(f"      K={k}: Silhouette Score = {score:.4f}")
                
                # Prefer K=5 if it's within 10% of the best score
                if k == 5 and score >= best_score * 0.9:
                    best_k = 5
                    best_score = score
                    best_labels = labels
                    best_model = kmeans
                elif score > best_score:
                    best_score = score
                    best_k = k
                    best_labels = labels
                    best_model = kmeans
                    
            except Exception as e:
                logger.warning(f"      K={k} failed: {e}")
                continue
        
        if best_labels is None:
            logger.error("   ❌ Could not find any valid clustering. Aborting.")
            return {
                "status": "error",
                "error": "No valid clustering found"
            }
        
        # Calculate standard deviation of scores for stability metric
        if len(scores) > 1:
            best_std = np.std([s[1] for s in scores])
        else:
            best_std = 0
        
        logger.info(f"   🎯 Optimal K determined: {best_k} (Score: {best_score:.4f})")
        
        # ─── 5. Assign Segment Labels ──────────────────────────────────────
        logger.info("   🏷️ Assigning segment labels...")
        
        df['cluster_id'] = best_labels
        
        # Calculate cluster centroids in original scale
        centroids_scaled = best_model.cluster_centers_
        centroids_original = scaler.inverse_transform(centroids_scaled)
        
        # Map clusters to business segments based on centroid characteristics
        # Sort clusters by monetary value (highest spenders first)
        cluster_monetary_avg = []
        for i in range(best_k):
            mask = df['cluster_id'] == i
            avg_monetary = df.loc[mask, 'monetary'].mean()
            avg_frequency = df.loc[mask, 'frequency'].mean()
            avg_recency = df.loc[mask, 'recency'].mean()
            cluster_monetary_avg.append({
                'cluster': i,
                'monetary': avg_monetary,
                'frequency': avg_frequency,
                'recency': avg_recency,
                'count': mask.sum()
            })
        
        # Sort by monetary value descending
        cluster_monetary_avg.sort(key=lambda x: x['monetary'], reverse=True)
        
        # Assign segment names based on rank and characteristics
        segment_mapping = {}
        segment_names = ['VIP', 'Loyal', 'Normal', 'High Risk', 'Fake Orders']
        
        for idx, cluster_info in enumerate(cluster_monetary_avg):
            cluster_id = cluster_info['cluster']
            
            if idx == 0:
                # Highest monetary = VIP
                segment_mapping[cluster_id] = 'VIP'
            elif idx == 1:
                # Second highest = Loyal
                segment_mapping[cluster_id] = 'Loyal'
            elif idx == len(cluster_monetary_avg) - 1:
                # Check if this cluster has very low frequency (possible fake orders)
                if cluster_info['frequency'] <= 1.2 and cluster_info['count'] <= max(2, len(df) * 0.05):
                    segment_mapping[cluster_id] = 'Fake Orders'
                else:
                    segment_mapping[cluster_id] = 'High Risk'
            elif idx == len(cluster_monetary_avg) - 2:
                segment_mapping[cluster_id] = 'High Risk'
            else:
                segment_mapping[cluster_id] = 'Normal'
        
        # Handle edge case: if we have fewer than 5 clusters, fill remaining
        used_segments = set(segment_mapping.values())
        for name in segment_names:
            if name not in used_segments and len(segment_mapping) < best_k:
                # Find an unassigned cluster
                for cid in range(best_k):
                    if cid not in segment_mapping:
                        segment_mapping[cid] = name
                        break
        
        # Apply segment labels to DataFrame
        df['segment'] = df['cluster_id'].map(segment_mapping)
        
        # Log cluster characteristics
        for cluster_id, segment_name in segment_mapping.items():
            mask = df['cluster_id'] == cluster_id
            info = cluster_monetary_avg[next(i for i, c in enumerate(cluster_monetary_avg) if c['cluster'] == cluster_id)]
            logger.info(
                f"      Cluster {cluster_id} → {segment_name}: "
                f"Count={info['count']}, "
                f"R={info['recency']:.1f}d, F={info['frequency']:.1f}, M=৳{info['monetary']:.0f}"
            )
        
        # ─── 6. Write Results to Database ──────────────────────────────────
        logger.info("💾 Writing segmentation results to database...")
        
        # Clear old segments
        cursor.execute("TRUNCATE TABLE public.customer_segments;")
        
        # Insert new segments
        insert_query = """
            INSERT INTO public.customer_segments 
            (customer_id, segment, recency, frequency, monetary, cluster_id, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        
        records = []
        for _, row in df.iterrows():
            records.append((
                str(row['customer_id']),
                row['segment'],
                int(row['recency']),
                int(row['frequency']),
                float(row['monetary']),
                int(row['cluster_id'])
            ))
        
        cursor.executemany(insert_query, records)
        logger.info(f"   ✅ Inserted {len(records)} customer segments.")
        
        # ─── 7. Log Model Accuracy ─────────────────────────────────────────
        logger.info("📝 Logging training metadata...")
        
        metadata = {
            "optimal_k": best_k,
            "silhouette_score": round(best_score, 4),
            "silhouette_std": round(best_std, 4),
            "segment_distribution": {name: sum(1 for s in df['segment'] if s == name) for name in segment_names},
            "cluster_centroids": {
                str(cid): {
                    "recency": round(centroids_original[cid][0], 2),
                    "frequency": round(centroids_original[cid][1], 2),
                    "monetary": round(centroids_original[cid][2], 2)
                }
                for cid in range(best_k)
            }
        }
        
        # Insert into ml_model_accuracy (using correct column name: evaluated_at)
        insert_accuracy = """
            INSERT INTO public.ml_model_accuracy 
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at) 
            VALUES (%s, %s, %s, %s, NOW())
        """
        
        cursor.execute(insert_accuracy, (
            'kmeans_segmentation',
            'silhouette_score',
            best_score,
            len(df)
        ))
        
        conn.commit()
        cursor.close()
        
        # ─── 8. Generate Summary ───────────────────────────────────────────
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
            try:
                conn.rollback()
            except:
                pass
        return {"status": "error", "error": str(e)}
    finally:
        # NOTE: We do NOT close the connection here. 
        # main.py is responsible for managing the connection lifecycle.
        if cursor and not cursor.closed:
            cursor.close()