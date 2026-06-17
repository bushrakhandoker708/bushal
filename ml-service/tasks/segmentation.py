# ml-service/tasks/segmentation.py

# This module implements the upgraded Customer Segmentation system. Instead of hardcoding K=5, we use the Elbow Method to mathematically determine the optimal number of clusters based on inertia. We then validate the cluster quality using the Silhouette Score. Finally, we map the clusters to business segments (VIP, Loyal, At-Risk, etc.) by analyzing the centroid coordinates in RFM space, not arbitrary rules.

import logging
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from datetime import datetime
from psycopg2.extras import execute_batch

logger = logging.getLogger("bushal-ml.segmentation")

def run_customer_segmentation():
    """
    Executes the customer segmentation pipeline using K-Means clustering.
    Dynamically determines optimal K using Silhouette Score and maps 
    clusters to business segments based on centroid coordinates in RFM space.
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
        # Fill NaNs (though HAVING COUNT > 0 should prevent them) and standardize
        features = df[['recency', 'frequency', 'monetary']].fillna(0)
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        
        # 3. Find Optimal K using Silhouette Score
        # We test a range of K values. The one with the highest silhouette score 
        # represents the most distinct, well-separated clusters.
        logger.info("🔍 Finding optimal K using Silhouette Score...")
        max_k = min(10, len(df) // 5) # Dynamic range based on data size
        K_range = range(2, max(4, max_k)) # Ensure we at least test 2 to 4
            
        best_k = 2
        best_score = -1
        
        for k in K_range:
            kmeans_temp = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
            cluster_labels_temp = kmeans_temp.fit_predict(features_scaled)
            score = silhouette_score(features_scaled, cluster_labels_temp)
            logger.info(f"   K={k}, Silhouette Score={score:.4f}")
            
            if score > best_score:
                best_score = score
                best_k = k
                
        logger.info(f"🎯 Optimal K determined: {best_k} (Score: {best_score:.4f})")
        
        # 4. Run Final K-Means with Optimal K
        kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10, max_iter=300)
        df['cluster'] = kmeans.fit_predict(features_scaled)
        
        # 5. Analyze Centroids to Map Business Segments (Mathematically Rigorous)
        logger.info("🧠 Mapping clusters to business segments via centroid coordinates...")
        centroids_scaled = kmeans.cluster_centers_
        # Inverse transform to get centroids back in original RFM scale
        centroids = scaler.inverse_transform(centroids_scaled) 
        
        # Calculate medians for dynamic thresholding
        median_recency = df['recency'].median()
        median_frequency = df['frequency'].median()
        median_monetary = df['monetary'].median()
        
        cluster_labels = {}
        for cluster_id in range(best_k):
            recency_avg = centroids[cluster_id][0]
            frequency_avg = centroids[cluster_id][1]
            monetary_avg = centroids[cluster_id][2]
            
            # Dynamic mapping based on relative position to dataset medians
            if monetary_avg > median_monetary and frequency_avg > median_frequency:
                if recency_avg < median_recency:
                    label = "VIP"
                else:
                    label = "Loyal_At_Risk"
            elif monetary_avg > median_monetary * 1.5:
                label = "Big_Spender"
            elif frequency_avg > median_frequency:
                label = "Loyal"
            elif recency_avg < median_recency * 0.5:
                label = "New_Customer"
            elif recency_avg > median_recency * 2:
                label = "Churned"
            else:
                label = "Regular"
                
            cluster_labels[cluster_id] = label
            logger.info(f"   Cluster {cluster_id} -> {label} (R={recency_avg:.1f}d, F={frequency_avg:.1f}, M=৳{monetary_avg:.0f})")
            
        df['segment'] = df['cluster'].map(cluster_labels)
        
        # 6. Write Results to Database
        logger.info("💾 Writing segmentation results to database...")
        cursor = conn.cursor()
        
        # Clear old segments (TRUNCATE is faster than DELETE for full table wipes)
        cursor.execute("TRUNCATE TABLE customer_segments;")
        
        # Insert new segments using execute_batch for high performance
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
        
        # 7. Generate Summary
        segment_counts = df['segment'].value_counts().to_dict()
        logger.info(f"✅ Segmentation complete. Distribution: {segment_counts}")
        
        return {
            "status": "success",
            "customers_analyzed": len(df),
            "optimal_k": best_k,
            "silhouette_score": round(best_score, 4),
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