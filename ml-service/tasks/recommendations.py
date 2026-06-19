# ml-service/tasks/recommendations.py

# ============================================================================
# PRODUCT RECOMMENDATIONS — FP-GROWTH + TF-IDF CONTENT SIMILARITY
# ============================================================================
#
# WHAT THIS DOES:
#   1. FP-Growth: mines frequent itemsets from fulfilled order history to
#      find "Frequently Bought Together" product pairs.
#   2. Association rules: generates directional A→B rules with support,
#      confidence, and lift metrics.
#   3. TF-IDF + Cosine Similarity: finds "Similar Products" based on
#      text attributes (name, category, description) as a cold-start
#      fallback when transaction history is sparse.
#
# OVERFITTING PROBLEM AND FIX:
#   The previous version set min_support=0.01 and min_threshold=1.0 (lift ≥ 1.0).
#   Lift = 1.0 means the two products are STATISTICALLY INDEPENDENT — their
#   co-occurrence is exactly what you would expect by chance. A rule
#   {milk} → {bread} with lift 1.01 is useless: it does not tell you
#   anything beyond "people buy things".
#
#   This is the recommendation equivalent of overfitting: the model found
#   patterns in the data, but those patterns do not generalise — they are
#   just noise that cleared the minimum bar.
#
#   Fixes applied:
#     a. MIN_LIFT raised to 1.2 (rules must be 20% above random).
#     b. MIN_CONFIDENCE raised to 0.3 (at least 30% of A-buyers also buy B).
#     c. MIN_SUPPORT kept at 0.01 (1% of transactions) — low enough to
#        catch rare-but-strong pairs in small catalogs.
#     d. Log average_lift per run to ml_model_accuracy. If avg_lift starts
#        dropping toward 1.0, drift_detection.py will alert.
#     e. Log rules_after_quality_filter and rules_before_quality_filter
#        as separate metrics so you can see how many rules were pruned.
#
# BUG FIXES (retained from previous version):
#   1. conn parameter from main.py (no internal get_db_connection).
#   2. Correct column names: frequently_bought_together uses product_a_id,
#      product_b_id, support, confidence, lift, frequency.
#   3. product_graph_edges uses updated_at (not created_at).
#   4. ml_model_accuracy uses evaluated_at.
#   5. Graceful skip when insufficient transactions exist.
#   6. Does NOT close the connection (main.py handles lifecycle).
# ============================================================================

import logging
import pandas as pd
import numpy as np
from datetime import datetime
from psycopg2.extras import RealDictCursor, execute_values

from mlxtend.frequent_patterns import fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("bushal-ml.recommendations")

# ─── Configuration ────────────────────────────────────────────────────────────

# Minimum support: itemset must appear in at least 1% of transactions.
# Too low → spurious rare pairs; too high → miss real associations in small catalogs.
MIN_SUPPORT = 0.01

# Minimum confidence: P(B|A) ≥ 30%. Below this, the rule is too unreliable.
MIN_CONFIDENCE = 0.30

# Minimum lift: associations must be ≥ 20% above random co-occurrence.
# Lift = 1.0 means statistical independence → useless recommendation.
# Lift = 1.2 means A-buyers are 20% more likely than average to buy B.
MIN_LIFT = 1.2

# Minimum cosine similarity for TF-IDF content-based edges
MIN_COSINE_SIMILARITY = 0.20


# ─── Main task function ───────────────────────────────────────────────────────

def run_product_recommendations(conn):
    """
    Runs FP-Growth + TF-IDF recommendation pipeline.

    Args:
        conn: psycopg2 connection object (passed from main.py)

    Returns:
        dict: Status and summary metrics
    """
    logger.info("🛒 Starting Product Recommendations Pipeline (FP-Growth + TF-IDF)...")
    cursor = None

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ── 1. Fetch fulfilled order items ────────────────────────────────
        logger.info("   📥 Fetching fulfilled order history...")
        cursor.execute("""
            SELECT o.id AS order_id, oi.product_id
            FROM public.orders o
            JOIN public.order_items oi ON oi.order_id = o.id
            WHERE o.status = 'fulfilled'
            ORDER BY o.created_at DESC
        """)
        order_items = cursor.fetchall()

        fbt_count = 0
        rules_before_filter = 0
        avg_lift = 0.0

        if not order_items or len(order_items) < 5:
            logger.warning(
                f"   ⏭️ Insufficient order item data ({len(order_items) if order_items else 0} rows). "
                "Need at least 5 for FP-Growth."
            )
        else:
            # ── 2. Build transaction list ──────────────────────────────────
            transactions: dict[str, list[str]] = {}
            for row in order_items:
                oid = str(row['order_id'])
                pid = str(row['product_id'])
                if oid not in transactions:
                    transactions[oid] = []
                transactions[oid].append(pid)

            # Only keep orders with at least 2 items (single-item orders cannot
            # produce co-occurrence rules)
            transaction_list = [items for items in transactions.values() if len(items) >= 2]
            total_transactions = len(transactions)

            logger.info(
                f"   🧺 {total_transactions} transactions found, "
                f"{len(transaction_list)} with ≥ 2 items (eligible for FP-Growth)."
            )

            if len(transaction_list) < 5:
                logger.warning(
                    f"   ⏭️ Only {len(transaction_list)} multi-item transactions. "
                    "Need at least 5 for meaningful associations."
                )
            else:
                # ── 3. Encode and run FP-Growth ───────────────────────────
                logger.info(
                    f"   🧠 Running FP-Growth (min_support={MIN_SUPPORT}, "
                    f"min_lift={MIN_LIFT}, min_confidence={MIN_CONFIDENCE})..."
                )

                te = TransactionEncoder()
                te_ary = te.fit(transaction_list).transform(transaction_list)
                df_encoded = pd.DataFrame(te_ary, columns=te.columns_)

                frequent_itemsets = fpgrowth(
                    df_encoded,
                    min_support=MIN_SUPPORT,
                    use_colnames=True,
                )

                if len(frequent_itemsets) == 0:
                    logger.warning("   ⚠️ No frequent itemsets found at current min_support.")
                else:
                    # Generate ALL rules at lift ≥ 1.0 first so we can count
                    # how many exist before our quality filter — useful for
                    # monitoring drift (if rules_before >> rules_after, something changed)
                    all_rules = association_rules(
                        frequent_itemsets,
                        metric="lift",
                        min_threshold=1.0,
                    )
                    rules_before_filter = len(all_rules)

                    # ── 4. Quality filter ──────────────────────────────────
                    # FIX: Enforce MIN_LIFT > 1.0 and MIN_CONFIDENCE > 0.3 to
                    # prune statistically weak / near-random rules.
                    # Only keep single-antecedent → single-consequent rules
                    # (pairs) because multi-item rules are harder to surface in UI.
                    strong_rules = all_rules[
                        (all_rules['confidence'] >= MIN_CONFIDENCE) &
                        (all_rules['lift'] >= MIN_LIFT) &
                        (all_rules['antecedents'].apply(len) == 1) &
                        (all_rules['consequents'].apply(len) == 1)
                    ]

                    logger.info(
                        f"   📊 {rules_before_filter} raw rules → "
                        f"{len(strong_rules)} after quality filter "
                        f"(lift ≥ {MIN_LIFT}, conf ≥ {MIN_CONFIDENCE})."
                    )

                    if len(strong_rules) > 0:
                        # Compute avg lift for accuracy logging
                        avg_lift = float(strong_rules['lift'].mean())
                        logger.info(f"   📈 Average lift of surviving rules: {avg_lift:.4f}")

                        # ── 5. Upsert to frequently_bought_together ────────
                        fbt_records = []
                        for _, row in strong_rules.iterrows():
                            product_a = list(row['antecedents'])[0]
                            product_b = list(row['consequents'])[0]
                            fbt_records.append((
                                product_a,
                                product_b,
                                float(row['support']),
                                float(row['confidence']),
                                float(row['lift']),
                                int(row['support'] * len(transaction_list)),  # approx frequency count
                            ))

                        upsert_fbt_sql = """
                            INSERT INTO public.frequently_bought_together
                            (product_a_id, product_b_id, support, confidence, lift, frequency, updated_at)
                            VALUES %s
                            ON CONFLICT (product_a_id, product_b_id)
                            DO UPDATE SET
                                support    = EXCLUDED.support,
                                confidence = EXCLUDED.confidence,
                                lift       = EXCLUDED.lift,
                                frequency  = EXCLUDED.frequency,
                                updated_at = NOW()
                        """
                        execute_values(cursor, upsert_fbt_sql, fbt_records, page_size=500)
                        fbt_count = len(fbt_records)
                        logger.info(f"   ✅ {fbt_count} FBT rules upserted.")
                    else:
                        logger.warning(
                            "   ⚠️ No rules survived the quality filter. "
                            "This may indicate insufficient transaction diversity."
                        )

        # ── 6. TF-IDF content-based similarity ────────────────────────────
        logger.info("   📝 Computing TF-IDF content-based product graph...")

        cursor.execute("""
            SELECT id, name, category, COALESCE(description, '') AS description
            FROM public.products
            WHERE in_stock = true
              AND (is_deleted = false OR is_deleted IS NULL)
        """)
        products = cursor.fetchall()
        sim_count = 0

        if len(products) >= 5:
            product_ids = [str(p['id']) for p in products]
            # Combine name + category + description into a single text field.
            # Category is repeated twice to give it slightly higher weight
            # than description, since category is more reliable than free-text.
            corpus = [
                f"{p['name']} {p['category']} {p['category']} {p['description']}".lower()
                for p in products
            ]

            vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=2000,
                ngram_range=(1, 2),  # Include bigrams for "cotton shirt", "phone case" etc.
            )
            tfidf_matrix = vectorizer.fit_transform(corpus)
            cosine_sim = cosine_similarity(tfidf_matrix)

            sim_records = []
            for i in range(len(products)):
                # Sort by similarity descending, skip self (index i)
                sim_scores = [
                    (j, float(cosine_sim[i][j]))
                    for j in range(len(products))
                    if j != i and float(cosine_sim[i][j]) > MIN_COSINE_SIMILARITY
                ]
                sim_scores.sort(key=lambda x: x[1], reverse=True)

                # Keep top 5 similar products per product
                for j, score in sim_scores[:5]:
                    sim_records.append((
                        product_ids[i],
                        product_ids[j],
                        score,
                        'similar_attributes',
                    ))

            if sim_records:
                upsert_sim_sql = """
                    INSERT INTO public.product_graph_edges
                    (product_a_id, product_b_id, weight, relationship_type, updated_at)
                    VALUES %s
                    ON CONFLICT (product_a_id, product_b_id, relationship_type)
                    DO UPDATE SET
                        weight     = EXCLUDED.weight,
                        updated_at = NOW()
                """
                execute_values(cursor, upsert_sim_sql, sim_records, page_size=500)
                sim_count = len(sim_records)
                logger.info(f"   ✅ {sim_count} content-based graph edges upserted.")
        else:
            logger.info("   ⏭️ Fewer than 5 products. Skipping TF-IDF similarity.")

        conn.commit()

        # ── 7. Log accuracy metrics ────────────────────────────────────────
        logger.info("   📝 Logging recommendation quality metrics...")

        n_orders_for_log = len(order_items) if order_items else 0

        # Primary quality metric: average lift of surviving rules.
        # Drift: if avg_lift trends toward 1.0, the rule quality is degrading.
        cursor.execute("""
            INSERT INTO public.ml_model_accuracy
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, ('fpgrowth_recommendations', 'average_lift', avg_lift, n_orders_for_log))

        # Secondary: how many rules survived quality filtering.
        # If this drops to 0 repeatedly, the data is too sparse or thresholds too strict.
        cursor.execute("""
            INSERT INTO public.ml_model_accuracy
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, ('fpgrowth_recommendations', 'rules_after_quality_filter', float(fbt_count), n_orders_for_log))

        # Tertiary: rules before filtering (so you can see how many were pruned).
        cursor.execute("""
            INSERT INTO public.ml_model_accuracy
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, ('fpgrowth_recommendations', 'rules_before_quality_filter', float(rules_before_filter), n_orders_for_log))

        conn.commit()

        logger.info("✅ Product recommendations pipeline completed successfully.")
        return {
            "status": "success",
            "fbt_rules_generated": fbt_count,
            "rules_before_filter": rules_before_filter,
            "average_lift": round(avg_lift, 4),
            "content_edges_generated": sim_count,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as exc:
        logger.error(f"❌ Recommendations pipeline failed: {exc}", exc_info=True)
        try:
            conn.rollback()
        except Exception:
            pass
        return {"status": "error", "error": str(exc)}

    finally:
        # main.py owns the connection lifecycle — do NOT close conn here.
        if cursor and not cursor.closed:
            cursor.close()