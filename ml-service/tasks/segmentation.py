# ml-service/tasks/segmentation.py
# ============================================================================
# CUSTOMER SEGMENTATION - K-MEANS CLUSTERING
# ============================================================================
#
# This module implements a K-Means clustering algorithm to segment customers
# based on their purchasing behavior. It analyzes three key features:
# 1. Total Spent (Monetary value)
# 2. Order Frequency (How often they buy)
# 3. Order Redundancy/Variance (Detects bots or fake orders)
#
# The algorithm automatically assigns customers to one of five segments:
# - VIP: High spenders, frequent buyers
# - Loyal: Consistent buyers, good lifetime value
# - Normal: Average purchasing behavior
# - High Risk: Declining engagement, churn risk
# - Anomalous: Statistical outliers requiring manual review (was "Fake Orders")
#
# MATHEMATICAL FOUNDATION:
# - K-Means: Iteratively assigns points to nearest centroid and updates centroids
#   until convergence. Uses Euclidean distance in 3D feature space.
# - Feature Normalization: Min-Max scaling ensures all features contribute equally.
#
# USAGE:
# const segments = segmentCustomers(customerData, k=5);
# ============================================================================

import logging
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("bushal-ml.segmentation")

# ─── Configuration ────────────────────────────────────────────────────────────
# Minimum silhouette score to consider clusters valid enough to write.
# Below this threshold, the clusters are too overlapping to be meaningful.
MIN_SILHOUETTE_THRESHOLD = 0.15

# K range to search for optimal cluster count
MIN_K = 3
MAX_K = 7

# Business target: we want exactly 5 named segments if the data supports it.
# If K=5 silhouette is within PREFERRED_K_TOLERANCE of the best, use K=5.
PREFERRED_K = 5
PREFERRED_K_TOLERANCE = 0.10  # 10% below best is acceptable for K=5

# Minimum number of unique customers required to run clustering
MIN_CUSTOMERS_FOR_CLUSTERING = 5

# ─── Helper Functions ───────────────────────────────────────────────────────
"""
Calculate Euclidean distance between two 3D points
"""
def euclidean_distance(a: list, b: list) -> float:
    return np.sqrt(
        np.power(a[0] - b[0], 2) +
        np.power(a[1] - b[1], 2) +
        np.power(a[2] - b[2], 2)
    )

"""
Min-Max normalization to scale features between 0 and 1
"""
def normalize_features(
    data: list,
    min_vals: list,
    max_vals: list
) -> list:
    normalized = []
    for row in data:
        norm_row = []
        for i, val in enumerate(row):
            range_val = max_vals[i] - min_vals[i]
            norm_row.append(0 if range_val == 0 else (val - min_vals[i]) / range_val)
        normalized.append(norm_row)
    return normalized

"""
Initialize centroids using K-Means++ algorithm for better convergence
"""
def initialize_centroids_kmeans_plus_plus(
    data: list,
    k: int
) -> list:
    centroids = []
    n = len(data)
    
    # 1. Choose first centroid randomly
    first_idx = np.random.randint(0, n)
    centroids.append(list(data[first_idx]))
    
    # 2. Choose remaining centroids
    for c in range(1, k):
        # Calculate distances to nearest existing centroid
        distances = []
        for point in data:
            min_dist = float('inf')
            for centroid in centroids:
                dist = euclidean_distance(point, centroid)
                if dist < min_dist:
                    min_dist = dist
            distances.append(min_dist * min_dist)  # Square distances for probability
        
        total_dist = sum(distances)
        
        # Weighted random selection
        rand_val = np.random.random() * total_dist
        chosen_idx = 0
        cumulative = 0
        for i, d in enumerate(distances):
            cumulative += d
            if cumulative >= rand_val:
                chosen_idx = i
                break
                
        centroids.append(list(data[chosen_idx]))
    
    return centroids

# ─── K-Means Clustering Algorithm ───────────────────────────────────────────
"""
Core K-Means clustering implementation.

@param data: Normalized feature matrix (n x 3)
@param k: Number of clusters
@param max_iterations: Maximum iterations before stopping
@param tolerance: Minimum centroid movement to continue
@returns Object containing assignments and final centroids
"""
def k_means_cluster(
    data: list,
    k: int,
    max_iterations: int = 100,
    tolerance: float = 0.0001
) -> dict:
    n = len(data)
    centroids = initialize_centroids_kmeans_plus_plus(data, k)
    assignments = [0] * n
    
    for iter_count in range(max_iterations):
        # 1. Assign each point to nearest centroid
        new_assignments = []
        for point in data:
            min_dist = float('inf')
            closest_centroid = 0
            for c, centroid in enumerate(centroids):
                dist = euclidean_distance(point, centroid)
                if dist < min_dist:
                    min_dist = dist
                    closest_centroid = c
            new_assignments.append(closest_centroid)
        
        # 2. Check for convergence
        if new_assignments == assignments:
            break
            
        assignments = new_assignments
        
        # 3. Update centroids
        new_centroids = []
        for c in range(k):
            cluster_points = [data[i] for i in range(n) if assignments[i] == c]
            if not cluster_points:
                new_centroids.append(centroids[c])  # Keep old centroid if empty
                continue
            
            dim = len(data[0])
            new_center = []
            for d in range(dim):
                center_val = sum(p[d] for p in cluster_points) / len(cluster_points)
                new_center.append(center_val)
            new_centroids.append(new_center)
        
        # 4. Check centroid movement
        max_movement = max(
            euclidean_distance(old_c, new_c) 
            for old_c, new_c in zip(centroids, new_centroids)
        )
        
        centroids = new_centroids
        if max_movement < tolerance:
            break
            
    return {"assignments": assignments, "centroids": centroids}

# ─── Segment Mapping Logic ──────────────────────────────────────────────────
"""
Map cluster indices to meaningful business segments.
This uses heuristic rules based on the normalized centroid values:
[Total Spent, Order Frequency, Order Variance]

FIX: Changed 'Fake Orders' label to 'Anomalous'. K-Means finds geometric
outliers, not intent. Low variance + high frequency indicates bot-like
patterns that warrant human review, not automatic fraud classification.
"""
def map_clusters_to_segments(
    centroids: list,
    assignments: list,
    customers: list
) -> dict:
    cluster_metrics = []
    for idx, centroid in enumerate(centroids):
        spent, freq, variance = centroid
        customers_in_cluster = [c for i, c in enumerate(customers) if assignments[i] == idx]
        
        avg_days_since = 0
        if customers_in_cluster:
            avg_days_since = sum(c['days_since_last_order'] for c in customers_in_cluster) / len(customers_in_cluster)
            
        cluster_metrics.append({
            'idx': idx,
            'spent': spent,
            'freq': freq,
            'variance': variance,
            'avg_days_since': avg_days_since,
            'count': len(customers_in_cluster),
        })
    
    # Sort by spent * frequency (revenue potential)
    cluster_metrics.sort(key=lambda m: m['spent'] * m['freq'], reverse=True)
    
    mapping = {}
    # Heuristic assignment based on normalized features
    for m in cluster_metrics:
        # FIX: Renamed from 'Fake Orders' to 'Anomalous'
        # Very low variance (identical orders) OR extremely high frequency with low spend
        if m['variance'] < 0.1 and m['freq'] > 0.7:
            mapping[m['idx']] = 'Anomalous'
        # VIP: High spend, high frequency
        elif m['spent'] > 0.7 and m['freq'] > 0.6:
            mapping[m['idx']] = 'VIP'
        # Loyal: Medium-high spend, good frequency
        elif m['spent'] > 0.4 and m['freq'] > 0.4:
            mapping[m['idx']] = 'Loyal'
        # High Risk: Low recent activity (high days since last order)
        elif m['avg_days_since'] > 60 or (m['spent'] < 0.3 and m['freq'] < 0.3):
            mapping[m['idx']] = 'High Risk'
        # Normal: Everything else
        else:
            mapping[m['idx']] = 'Normal'
    
    # Ensure all 5 segments are represented if possible
    used_segments = set(mapping.values())
    # FIX: Updated array to include 'Anomalous' instead of 'Fake Orders'
    all_segments = ['VIP', 'Loyal', 'Normal', 'High Risk', 'Anomalous']
    
    for seg in all_segments:
        if seg not in used_segments:
            # Find the cluster with the lowest count that hasn't been mapped
            unmapped = next((m for m in cluster_metrics if m['idx'] not in mapping), None)
            if unmapped:
                mapping[unmapped['idx']] = seg
                
    return mapping

# ─── Main Segmentation Function ─────────────────────────────────────────────
"""
Segment customers using K-Means clustering.

@param customers: Array of customer metrics
@param config: Clustering configuration
@returns Array of segmented customers with recommendations
"""
def segment_customers(
    customers: list,
    config: dict = None
) -> list:
    if config is None:
        config = {"k": 5, "max_iterations": 100, "tolerance": 0.0001}
        
    if len(customers) < config["k"]:
        # Fallback: assign all to 'Normal' if not enough data
        return [{
            "user_id": c["user_id"],
            "segment": "Normal",
            "total_spent": c["total_spent"],
            "order_count": c["order_count"],
            "confidence_score": 1,
            "recommended_discount": 10,
            "top_category": next(iter(sorted(c.get("category_preferences", {}).items(), key=lambda x: x[1], reverse=True)), ["General"])[0] if c.get("category_preferences") else "General",
        } for c in customers]
    
    # 1. Extract features: [Total Spent, Order Frequency, Order Variance]
    raw_features = [[
        c["total_spent"],
        c["order_count"],
        c["order_variance"],
    ] for c in customers]
    
    # 2. Calculate min/max for normalization
    min_vals = [min(f[i] for f in raw_features) for i in range(3)]
    max_vals = [max(f[i] for f in raw_features) for i in range(3)]
    
    # 3. Normalize features
    normalized_data = normalize_features(raw_features, min_vals, max_vals)
    
    # 4. Run K-Means
    result = k_means_cluster(
        normalized_data,
        config["k"],
        config["max_iterations"],
        config["tolerance"]
    )
    assignments = result["assignments"]
    centroids = result["centroids"]
    
    # 5. Map clusters to segments
    cluster_to_segment = map_clusters_to_segments(centroids, assignments, customers)
    
    # 6. Build final results
    results = []
    for idx, customer in enumerate(customers):
        cluster_idx = assignments[idx]
        segment = cluster_to_segment.get(cluster_idx, "Normal")
        centroid = centroids[cluster_idx]
        
        # Calculate confidence score (inverse of distance to centroid)
        dist = euclidean_distance(normalized_data[idx], centroid)
        confidence = max(0, 1 - dist)
        
        # Determine top category
        top_category = next(iter(sorted(customer.get("category_preferences", {}).items(), key=lambda x: x[1], reverse=True)), ["General"])[0] if customer.get("category_preferences") else "General"
        
        # Calculate recommended discount based on segment and value
        recommended_discount = 5
        if segment == 'VIP':
            recommended_discount = 15  # Reward VIPs
        elif segment == 'Loyal':
            recommended_discount = 10
        elif segment == 'High Risk':
            recommended_discount = 25  # Aggressive retention
        # FIX: Removed discount logic for 'Fake Orders' since it's now 'Anomalous'
        # Anomalous customers should be reviewed manually, not given automated discounts
        elif segment == 'Anomalous':
            recommended_discount = 0
            
        # Boost discount if high value but high risk
        if segment == 'High Risk' and customer["total_spent"] > (max_vals[0] * 0.7):
            recommended_discount = 30
            
        results.append({
            "user_id": customer["user_id"],
            "segment": segment,
            "total_spent": customer["total_spent"],
            "order_count": customer["order_count"],
            "confidence_score": round(confidence * 100) / 100,
            "recommended_discount": recommended_discount,
            "top_category": top_category,
        })
        
    return results

# ─── Category Discount Recommendations ──────────────────────────────────────
"""
Analyze segment purchase history to recommend category-specific discounts.
Uses mathematical analysis of category affinity vs. overall store performance.

@param segments: Segmented customers
@param all_categories: List of all available categories
@param global_category_sales: Global sales distribution by category
@returns Array of discount recommendations per segment
"""
def recommend_category_discounts(
    segments: list,
    all_categories: list,
    global_category_sales: dict
) -> list:
    recommendations = []
    
    # FIX: Excluded 'Anomalous' from discount recommendations.
    # These customers require manual review, not automated marketing.
    segment_types = ['VIP', 'Loyal', 'Normal', 'High Risk']
    
    for seg_type in segment_types:
        segment_customers = [s for s in segments if s["segment"] == seg_type]
        if not segment_customers:
            continue
            
        # Aggregate category preferences for this segment
        segment_category_counts = {}
        for c in segment_customers:
            # We don't have full category_preferences here, so we use top_category as a proxy
            # In a real implementation, you'd pass the full metrics
            cat = c["top_category"]
            segment_category_counts[cat] = segment_category_counts.get(cat, 0) + 1
            
        total_segment_customers = len(segment_customers)
        global_total = sum(global_category_sales.values())
        
        for category in all_categories:
            segment_affinity = (segment_category_counts.get(category, 0) / total_segment_customers) if total_segment_customers > 0 else 0
            global_affinity = (global_category_sales.get(category, 0) / global_total) if global_total > 0 else 0
            
            # Calculate lift: how much more likely this segment is to buy this category
            lift = (segment_affinity / global_affinity) if global_affinity > 0 else 0
            
            if lift > 1.2:
                # High affinity category - offer targeted discount
                discount = 10
                if seg_type == 'VIP':
                    discount = 20
                elif seg_type == 'Loyal':
                    discount = 15
                elif seg_type == 'High Risk':
                    discount = 30
                    
                recommendations.append({
                    "segment": seg_type,
                    "category": category,
                    "recommended_discount": discount,
                    "reasoning": f"{seg_type} customers show {round(lift * 100)}% higher affinity for {category} compared to average. Targeted discount recommended to boost conversion.",
                })
                
    return sorted(recommendations, key=lambda x: x["recommended_discount"], reverse=True)

# ─── Summary Generation ─────────────────────────────────────────────────────
"""
Generate summary statistics for each segment.
"""
def generate_segment_summary(segments: list) -> list:
    summary_map = {}
    # FIX: Updated to include 'Anomalous' instead of 'Fake Orders'
    all_segments = ['VIP', 'Loyal', 'Normal', 'High Risk', 'Anomalous']
    
    for s in all_segments:
        summary_map[s] = {"count": 0, "total_spent": 0, "total_orders": 0, "customers": []}
        
    for seg in segments:
        data = summary_map[seg["segment"]]
        data["count"] += 1
        data["total_spent"] += seg["total_spent"]
        data["total_orders"] += seg["order_count"]
        data["customers"].append(seg)
        
    # FIX: Updated action text for 'Anomalous' to reflect review status rather than fraud blocking
    actions = {
        'VIP': 'Provide exclusive early access and personalized offers. Maintain high service levels.',
        'Loyal': 'Implement loyalty rewards program. Encourage referrals with incentives.',
        'Normal': 'Send regular promotional emails. Upsell related products based on history.',
        'High Risk': 'Launch re-engagement campaign with aggressive discounts. Survey for feedback.',
        'Anomalous': 'Review for unusual behavioral patterns. Verify account legitimacy before taking action.',
    }
    
    summaries = []
    for segment, data in summary_map.items():
        summaries.append({
            "segment": segment,
            "count": data["count"],
            "avg_spent": data["total_spent"] / data["count"] if data["count"] > 0 else 0,
            "avg_orders": data["total_orders"] / data["count"] if data["count"] > 0 else 0,
            "total_revenue": data["total_spent"],
            "recommended_action": actions[segment],
        })
        
    return summaries

# ─── Data Preparation Helper ────────────────────────────────────────────────
"""
Prepare raw order data into CustomerMetrics format for clustering.
"""
def prepare_customer_metrics(
    orders: list
) -> list:
    user_map = {}
    now = datetime.now()
    
    for order in orders:
        uid = order["user_id"]
        if uid not in user_map:
            user_map[uid] = {"totals": [], "dates": [], "categories": {}}
            
        data = user_map[uid]
        data["totals"].append(order["total"])
        data["dates"].append(datetime.fromisoformat(order["created_at"]))
        
        if order.get("category"):
            cat = order["category"]
            data["categories"][cat] = data["categories"].get(cat, 0) + 1
            
    metrics = []
    for uid, data in user_map.items():
        total_spent = sum(data["totals"])
        order_count = len(data["totals"])
        avg_order_value = total_spent / order_count if order_count > 0 else 0
        
        # Calculate variance in order values (low variance = suspicious)
        mean = avg_order_value
        variance = sum((val - mean) ** 2 for val in data["totals"]) / order_count if order_count > 0 else 0
        
        # Days since last order
        last_order_date = max(data["dates"])
        days_since_last_order = (now - last_order_date).days
        
        metrics.append({
            "user_id": uid,
            "total_spent": total_spent,
            "order_count": order_count,
            "avg_order_value": avg_order_value,
            "days_since_last_order": days_since_last_order,
            "order_variance": variance,
            "category_preferences": data["categories"],
        })
        
    return metrics

# ─── Main task function ───────────────────────────────────────────────────────
def run_customer_segmentation(conn):
    """
    Runs K-Means RFM clustering and writes segments to customer_segments.
    Args:
        conn: psycopg2 connection object (passed from main.py)
    Returns:
        dict: Status and summary metrics
    """
    logger.info("📊 Starting Customer Segmentation (K-Means RFM)...")
    cursor = None
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ── 1. Fetch fulfilled orders ──────────────────────────────────────
        logger.info("   📥 Fetching fulfilled order history...")
        cursor.execute("""
            SELECT
                o.user_id,
                o.total,
                o.created_at,
                -- Recency: days since this customer's most recent order
                EXTRACT(DAY FROM (NOW() - MAX(o.created_at) OVER (PARTITION BY o.user_id)))::int
                AS recency_days
            FROM public.orders o
            WHERE o.status = 'fulfilled'
            ORDER BY o.user_id, o.created_at DESC
        """)
        orders = cursor.fetchall()

        if not orders or len(orders) < 10:
            logger.warning(
                f"   ⏭️ Insufficient data ({len(orders) if orders else 0} rows). "
                "Need at least 10 fulfilled orders."
            )
            return {
                "status": "skipped",
                "reason": "insufficient_data",
                "orders_found": len(orders) if orders else 0,
            }

        logger.info(f"   📊 {len(orders)} order rows found.")

        # ── 2. Aggregate RFM per customer ──────────────────────────────────
        logger.info("   🧮 Computing RFM features per customer...")
        customer_data: dict[str, dict] = {}
        for row in orders:
            uid = str(row['user_id'])
            if uid not in customer_data:
                customer_data[uid] = {
                    'recency': int(row['recency_days'] or 0),
                    'frequency': 0,
                    'monetary': 0.0,
                }
            customer_data[uid]['frequency'] += 1
            customer_data[uid]['monetary'] += float(row['total'] or 0)

        df = pd.DataFrame([
            {
                'customer_id': uid,
                'recency':   d['recency'],
                'frequency': d['frequency'],
                'monetary':  d['monetary'],
            }
            for uid, d in customer_data.items()
        ])

        n_customers = len(df)
        logger.info(f"   👥 {n_customers} unique customers with order history.")

        # FIX: Check for minimum data volume before running K-Means
        if n_customers < MIN_CUSTOMERS_FOR_CLUSTERING:
            logger.warning(
                f"   ⏭️ Only {n_customers} unique customers. Need at least {MIN_CUSTOMERS_FOR_CLUSTERING} for clustering."
            )
            return {
                "status": "skipped",
                "reason": "too_few_customers",
                "customers_found": n_customers,
            }

        # ── 3. Standardise features ────────────────────────────────────────
        # K-Means uses Euclidean distance, so all features must be on the same
        # scale. Without this, monetary (৳thousands) would dominate recency
        # (days) and frequency (count).
        features = ['recency', 'frequency', 'monetary']
        X = df[features].values
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # ── 4. Dynamic K selection (silhouette maximisation) ───────────────
        logger.info("   🔍 Finding optimal K via silhouette score (K=3..7)...")
        effective_max_k = min(MAX_K, n_customers - 1)
        effective_min_k = min(MIN_K, effective_max_k)

        best_k = PREFERRED_K
        best_score = -1.0
        best_labels = None
        best_model = None
        k_scores: list[tuple[int, float]] = []

        for k in range(effective_min_k, effective_max_k + 1):
            try:
                kmeans = KMeans(
                    n_clusters=k,
                    init='k-means++',  # K-Means++ reduces variance from random init
                    n_init=10,
                    max_iter=300,
                    random_state=42,
                )
                labels = kmeans.fit_predict(X_scaled)

                # Silhouette requires at least 2 distinct clusters in the output
                if len(set(labels)) < 2:
                    logger.warning(f"      K={k}: all points assigned to one cluster, skipping.")
                    continue

                score = float(silhouette_score(X_scaled, labels))
                k_scores.append((k, score))
                logger.info(f"      K={k}: silhouette = {score:.4f}")

                # Prefer K=PREFERRED_K if within tolerance of the best score.
                # This encodes the business constraint: we want exactly 5 segments
                # if the data can support them without sacrificing much quality.
                if k == PREFERRED_K:
                    if score >= best_score * (1.0 - PREFERRED_K_TOLERANCE):
                        best_k = PREFERRED_K
                        best_score = score
                        best_labels = labels
                        best_model = kmeans
                elif score > best_score:
                    # Only update best if this is strictly better than preferred K
                    if best_k != PREFERRED_K or score > best_score * (1.0 + PREFERRED_K_TOLERANCE):
                        best_score = score
                        best_k = k
                        best_labels = labels
                        best_model = kmeans

            except Exception as ex:
                logger.warning(f"      K={k} clustering failed: {ex}")
                continue

        if best_labels is None:
            logger.error("   ❌ No valid clustering found across K range. Aborting.")
            return {"status": "error", "error": "No valid clustering found"}

        logger.info(f"   🎯 Optimal K={best_k}, silhouette={best_score:.4f}")

        # ── 5. Overfitting / quality guard ────────────────────────────────
        # If the best achievable silhouette score is below the threshold,
        # the clusters are too overlapping to be useful. We log the metric
        # (so drift detection can track this) but skip writing to the DB
        # to avoid overwriting valid historical segment data with garbage.
        if best_score < MIN_SILHOUETTE_THRESHOLD:
            logger.warning(
                f"   ⚠️ Best silhouette score {best_score:.4f} is below minimum threshold "
                f"{MIN_SILHOUETTE_THRESHOLD}. Clusters are too overlapping. "
                "Logging metric but NOT overwriting customer_segments table."
            )
            # Still log the poor score so drift_detection sees it
            cursor.execute("""
                INSERT INTO public.ml_model_accuracy
                (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, ('kmeans_segmentation', 'silhouette_score', best_score, n_customers))
            conn.commit()
            return {
                "status": "skipped",
                "reason": "silhouette_too_low",
                "silhouette_score": round(best_score, 4),
                "customers": n_customers,
            }

        # ── 6. Assign business segment labels ─────────────────────────────
        logger.info("   🏷️ Assigning business segment labels...")
        df['cluster_id'] = best_labels

        # Compute per-cluster mean RFM in original (un-scaled) space
        cluster_stats = []
        for cid in range(best_k):
            mask = df['cluster_id'] == cid
            cluster_stats.append({
                'cluster': cid,
                'monetary':  df.loc[mask, 'monetary'].mean(),
                'frequency': df.loc[mask, 'frequency'].mean(),
                'recency':   df.loc[mask, 'recency'].mean(),
                'count':     int(mask.sum()),
            })

        # Sort clusters by mean monetary spend (highest = VIP)
        cluster_stats.sort(key=lambda x: x['monetary'], reverse=True)

        # FIX: Renamed 'Fake Orders' to 'Anomalous' to reflect statistical
        # outlier status rather than intent. This prevents flagging legitimate
        # customers (e.g., new users or bulk buyers) as fraudulent.
        segment_names = ['VIP', 'Loyal', 'Normal', 'High Risk', 'Anomalous']
        segment_mapping: dict[int, str] = {}

        for idx, cs in enumerate(cluster_stats):
            cid = cs['cluster']
            if idx == 0:
                # Highest spend → VIP
                segment_mapping[cid] = 'VIP'
            elif idx == 1:
                # Second highest spend → Loyal
                segment_mapping[cid] = 'Loyal'
            elif idx == len(cluster_stats) - 1:
                # Last (lowest spend/outlier): Check if it looks like anomalous behavior.
                # Characteristics: very low frequency, very small cluster,
                # anomalously low or zero spend.
                is_likely_anomalous = (
                    cs['frequency'] <= 1.2 and
                    cs['count'] <= max(2, int(n_customers * 0.05)) and
                    cs['monetary'] < df['monetary'].quantile(0.10)
                )
                # FIX: Label as 'Anomalous' instead of 'Fake Orders'
                segment_mapping[cid] = 'Anomalous' if is_likely_anomalous else 'High Risk'
            elif idx == len(cluster_stats) - 2:
                # Second from bottom → High Risk (declining/at-risk customers)
                segment_mapping[cid] = 'High Risk'
            else:
                # Middle cluster(s) → Normal
                segment_mapping[cid] = 'Normal'

        # Fill any unmapped clusters (edge case: best_k < 5)
        used = set(segment_mapping.values())
        for name in segment_names:
            if name not in used:
                for cid in range(best_k):
                    if cid not in segment_mapping:
                        segment_mapping[cid] = name
                        break

        df['segment'] = df['cluster_id'].map(segment_mapping)

        # Log cluster characteristics
        for cs in cluster_stats:
            seg = segment_mapping[cs['cluster']]
            logger.info(
                f"      Cluster {cs['cluster']} → {seg}: "
                f"N={cs['count']}, "
                f"R={cs['recency']:.0f}d, "
                f"F={cs['frequency']:.1f}, "
                f"M=৳{cs['monetary']:,.0f}"
            )

        # ── 7. Write to customer_segments ──────────────────────────────────
        logger.info("   💾 Writing segments to customer_segments...")
        
        # Note: Ensure the database constraint allows 'Anomalous'
        # If you have a CHECK constraint on the segment column, you may need
        # to update it via migration: 
        # ALTER TABLE customer_segments DROP CONSTRAINT ...; 
        # ALTER TABLE customer_segments ADD CONSTRAINT ... CHECK (segment IN (... 'Anomalous'));
        
        cursor.execute("TRUNCATE TABLE public.customer_segments;")
        insert_sql = """
            INSERT INTO public.customer_segments
            (customer_id, segment, recency, frequency, monetary, cluster_id, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        records = [
            (
                str(row['customer_id']),
                row['segment'],
                int(row['recency']),
                int(row['frequency']),
                float(row['monetary']),
                int(row['cluster_id']),
            )
            for _, row in df.iterrows()
        ]
        cursor.executemany(insert_sql, records)
        logger.info(f"   ✅ {len(records)} customer segments written.")

        # ── 8. Log accuracy metrics ────────────────────────────────────────
        logger.info("   📝 Logging silhouette score to ml_model_accuracy...")
        # Primary metric: silhouette score (monitored by drift_detection.py)
        cursor.execute("""
            INSERT INTO public.ml_model_accuracy
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, ('kmeans_segmentation', 'silhouette_score', best_score, n_customers))

        # Secondary metric: optimal K chosen (useful for debugging unexpected shifts)
        cursor.execute("""
            INSERT INTO public.ml_model_accuracy
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, ('kmeans_segmentation', 'optimal_k', float(best_k), n_customers))

        conn.commit()

        segment_counts = df['segment'].value_counts().to_dict()
        logger.info(f"✅ Segmentation complete. Distribution: {segment_counts}")

        return {
            "status": "success",
            "customers_analyzed": n_customers,
            "optimal_k": best_k,
            "silhouette_score": round(best_score, 4),
            "quality_check_passed": best_score >= MIN_SILHOUETTE_THRESHOLD,
            "segment_distribution": segment_counts,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as exc:
        logger.error(f"❌ Segmentation failed: {exc}", exc_info=True)
        try:
            conn.rollback()
        except Exception:
            pass
        return {"status": "error", "error": str(exc)}
    finally:
        # main.py owns the connection lifecycle — do NOT close conn here.
        if cursor and not cursor.closed:
            cursor.close()