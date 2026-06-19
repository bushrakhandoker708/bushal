# ml-service/tasks/segmentation.py
# ============================================================================
# CUSTOMER SEGMENTATION — K-MEANS CLUSTERING ON RFM FEATURES
# ============================================================================
#
# WHAT THIS DOES:
#   Clusters customers into segments (VIP, Loyal, Normal, High Risk,
#   Anomalous) using K-Means on RFM (Recency, Frequency, Monetary)
#   features derived from fulfilled order history.
#
# OVERFITTING PROBLEM AND FIX:
#   K-Means cannot overfit in the gradient-descent sense, but it can produce
#   degenerate results:
#
#   1. Too many clusters for the data density.
#      With 20 customers and K=5, each cluster has ~4 people. The "VIP"
#      segment might be a single outlier order, and the "Loyal" segment
#      3 regular customers — an artificial distinction the business cannot
#      act on. The silhouette score captures this: clusters that barely
#      separate get scores near 0 or negative.
#
#   2. Segment label assignment is arbitrary (random init).
#      K-Means++ initialization reduces variance, but the labels (0,1,2,3,4)
#      don't mean anything — we assign business names based on centroid
#      characteristics (highest monetary = VIP, etc.).
#
#   Fixes applied:
#     a. Dynamic K selection: test K=3..7, pick the K that maximises
#        silhouette score, with a preference for K=5 if it's within 10%
#        of the best score (business requirement: 5 named segments).
#     b. Minimum data guard: if fewer than 5 unique customers exist,
#        skip clustering (not enough data for meaningful groups).
#     c. Silhouette quality check: if the best achievable silhouette
#        score is below MIN_SILHOUETTE_THRESHOLD (0.15), skip writing
#        results and log a warning — the clusters are too noisy to be
#        useful. This prevents overwriting good historical segments with
#        garbage clusters from a bad run.
#     d. Log silhouette score to ml_model_accuracy after every run so
#        drift_detection.py can alert when clustering quality degrades.
#
# BUG FIXES (retained from previous version):
#   1. conn parameter from main.py (no internal get_db_connection).
#   2. Correct column names: customer_segments uses customer_id, segment,
#      recency, frequency, monetary, cluster_id.
#   3. ml_model_accuracy uses evaluated_at (not created_at).
#   4. Does NOT close the connection (main.py handles lifecycle).
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

        if n_customers < 5:
            logger.warning(
                f"   ⏭️ Only {n_customers} unique customers. Need at least 5 for clustering."
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