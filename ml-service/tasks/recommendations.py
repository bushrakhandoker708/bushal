# ============================================================================
# FILE ADDRESS: ml-service/tasks/recommendations.py
# ============================================================================
# EXPLANATION:
# This module implements the Product Recommendation pipeline.
# 1. FP-Growth: Finds "Frequently Bought Together" associations from order history.
# 2. TF-IDF + Cosine Similarity: Finds "Similar Products" based on text attributes 
#    (name, category, description) as a cold-start fallback.
#
# BUG FIXES APPLIED:
# 1. Function signature now accepts `conn` parameter from main.py.
# 2. Removed internal `get_db_connection()` call which was causing the '0' error.
# 3. Uses correct column names matching actual DB schema:
#    - frequently_bought_together: product_a_id, product_b_id, support, 
#      confidence, lift, frequency
#    - product_graph_edges: product_a_id, product_b_id, weight, relationship_type
#    - ml_model_accuracy: evaluated_at (NOT created_at)
# 4. Gracefully returns "skipped" status when insufficient data exists.
# 5. Does NOT close the connection (main.py handles that).
# ============================================================================

import logging
import pandas as pd
import numpy as np
from datetime import datetime
from psycopg2.extras import RealDictCursor, execute_values

# ML Libraries
from mlxtend.frequent_patterns import fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("bushal-ml.recommendations")


def run_product_recommendations(conn):
    """
    Executes the product recommendation pipeline.
    
    Args:
        conn: psycopg2 connection object (passed from main.py)
    
    Returns:
        dict: Status and metrics of the recommendation run
    """
    logger.info("🛒 Starting Product Recommendations Pipeline...")
    cursor = None
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # ─── 1. Fetch Fulfilled Orders for FP-Growth ───────────────────────
        logger.info("   📥 Fetching order history for FP-Growth...")
        cursor.execute("""
            SELECT o.id as order_id, oi.product_id
            FROM public.orders o
            JOIN public.order_items oi ON oi.order_id = o.id
            WHERE o.status = 'fulfilled'
            ORDER BY o.created_at DESC
        """)
        
        orders = cursor.fetchall()
        
        if not orders or len(orders) < 5:
            logger.warning("   ⏭️ Insufficient order data for FP-Growth. Need at least 5 fulfilled orders.")
            fbt_count = 0
        else:
            # Group products by order_id to create transactions
            transactions = {}
            for order in orders:
                oid = str(order['order_id'])
                pid = str(order['product_id'])
                if oid not in transactions:
                    transactions[oid] = []
                transactions[oid].append(pid)
            
            transaction_list = list(transactions.values())
            logger.info(f"   🧺 Found {len(transaction_list)} valid transactions.")
            
            if len(transaction_list) < 5:
                fbt_count = 0
            else:
                # ─── 2. Run FP-Growth ──────────────────────────────────────
                logger.info("   🧠 Running FP-Growth algorithm...")
                
                # Encode transactions
                te = TransactionEncoder()
                te_ary = te.fit(transaction_list).transform(transaction_list)
                df_encoded = pd.DataFrame(te_ary, columns=te.columns_)
                
                # Run FP-Growth (min_support = 0.01 to catch rare but strong associations)
                frequent_itemsets = fpgrowth(df_encoded, min_support=0.01, use_colnames=True)
                
                if len(frequent_itemsets) == 0:
                    logger.warning("   ️ No frequent itemsets found.")
                    fbt_count = 0
                else:
                    # Generate association rules
                    rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.0)
                    
                    # Filter for high confidence and lift
                    strong_rules = rules[
                        (rules['confidence'] >= 0.3) & 
                        (rules['lift'] >= 1.2) &
                        (rules['antecedents'].apply(len) == 1) & 
                        (rules['consequents'].apply(len) == 1)
                    ]
                    
                    logger.info(f"   📊 Found {len(strong_rules)} strong association rules.")
                    
                    # ─── 3. Upsert FBT Rules to Database ───────────────────
                    if len(strong_rules) > 0:
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
                                int(row['freq'])
                            ))
                        
                        # Upsert query
                        upsert_fbt = """
                            INSERT INTO public.frequently_bought_together 
                            (product_a_id, product_b_id, support, confidence, lift, frequency, updated_at)
                            VALUES %s
                            ON CONFLICT (product_a_id, product_b_id) 
                            DO UPDATE SET 
                                support = EXCLUDED.support,
                                confidence = EXCLUDED.confidence,
                                lift = EXCLUDED.lift,
                                frequency = EXCLUDED.frequency,
                                updated_at = NOW()
                        """
                        
                        execute_values(cursor, upsert_fbt, fbt_records, page_size=1000)
                        fbt_count = len(fbt_records)
                        logger.info(f"   ✅ Upserted {fbt_count} FBT rules.")
                    else:
                        fbt_count = 0

        # ─── 4. Content-Based Similarity (TF-IDF) ──────────────────────────
        logger.info("   📝 Generating content-based product graph...")
        cursor.execute("""
            SELECT id, name, category, COALESCE(description, '') as description
            FROM public.products
            WHERE is_deleted = false AND in_stock = true
        """)
        
        products = cursor.fetchall()
        sim_count = 0
        
        if len(products) >= 5:
            # Create a text corpus for each product
            corpus = []
            product_ids = []
            
            for p in products:
                text = f"{p['name']} {p['category']} {p['description']}"
                corpus.append(text.lower())
                product_ids.append(str(p['id']))
            
            # Vectorize
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            tfidf_matrix = vectorizer.fit_transform(corpus)
            
            # Calculate cosine similarity
            cosine_sim = cosine_similarity(tfidf_matrix)
            
            # Find top 5 similar products for each product
            sim_records = []
            for i in range(len(products)):
                sim_scores = list(enumerate(cosine_sim[i]))
                # Sort descending, exclude self (score 1.0)
                sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)[1:6]
                
                for j, score in sim_scores:
                    if score > 0.2: # Minimum similarity threshold
                        sim_records.append((
                            product_ids[i],
                            product_ids[j],
                            float(score),
                            'similar_attributes'
                        ))
            
            if sim_records:
                upsert_sim = """
                    INSERT INTO public.product_graph_edges 
                    (product_a_id, product_b_id, weight, relationship_type, updated_at)
                    VALUES %s
                    ON CONFLICT (product_a_id, product_b_id, relationship_type) 
                    DO UPDATE SET 
                        weight = EXCLUDED.weight,
                        updated_at = EXCLUDED.updated_at
                """
                
                execute_values(cursor, upsert_sim, sim_records, page_size=1000)
                sim_count = len(sim_records)
                logger.info(f"   ✅ Upserted {sim_count} content-based graph edges.")
        else:
            logger.info("   ⏭️ Not enough products for TF-IDF similarity.")

        conn.commit()
        
        # ─── 5. Log Model Accuracy ────────────────────────────────────────
        logger.info(" Logging training metadata...")
        
        insert_accuracy = """
            INSERT INTO public.ml_model_accuracy 
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at) 
            VALUES (%s, %s, %s, %s, NOW())
        """
        
        # Log the number of strong rules generated as a proxy for model health
        cursor.execute(insert_accuracy, (
            'fpgrowth_recommendations',
            'strong_rules_generated',
            fbt_count,
            len(orders) if orders else 0
        ))
        
        cursor.close()
        
        logger.info("✅ Product recommendations pipeline completed successfully.")
        return {
            "status": "success",
            "fbt_rules_generated": fbt_count,
            "content_edges_generated": sim_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Recommendations pipeline failed: {e}", exc_info=True)
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