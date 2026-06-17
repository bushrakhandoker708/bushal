# ml-service/tasks/recommendations.py

# FP-Growth: We replace the slow, candidate-generating Apriori algorithm with FP-Growth (Frequent Pattern Growth). It builds a compact tree structure (FP-Tree) to find associations exponentially faster.
# TF-IDF + Cosine Similarity: We implement a content-based fallback. By vectorizing product names, categories, and descriptions, we can recommend "Similar Products" even if a new item has zero sales history (solving the Cold Start problem).
# Database Sync: It writes the results directly into your existing frequently_bought_together and product_graph_edges cache tables.

import logging
import pandas as pd
import numpy as np
from datetime import datetime
from psycopg2.extras import execute_batch
from mlxtend.frequent_patterns import fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("bushal-ml.recommendations")

def run_product_recommendations():
    """
    Executes the product recommendation pipeline.
    1. FP-Growth for "Frequently Bought Together" (replaces slow Apriori).
    2. TF-IDF + Cosine Similarity for "Similar Products" (Cold Start fallback).
    """
    logger.info(" Starting Product Recommendations Pipeline...")
    conn = None
    try:
        from main import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # ─── TASK 1: FP-Growth (Frequently Bought Together) ─────────────────────
        logger.info(" [1/2] Running FP-Growth for FBT associations...")
        
        # Fetch fulfilled orders and their items
        cursor.execute("""
            SELECT o.id as order_id, oi.product_id 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'fulfilled'
        """)
        rows = cursor.fetchall()
        
        if not rows:
            logger.warning("️ No fulfilled orders found for FP-Growth.")
            fbt_count = 0
        else:
            # Group items by order to create transaction baskets
            baskets = {}
            for order_id, product_id in rows:
                if order_id not in baskets:
                    baskets[order_id] = []
                baskets[order_id].append(str(product_id)) # Ensure string for mlxtend
            
            transaction_list = list(baskets.values())
            total_transactions = len(transaction_list)
            logger.info(f"   Processing {total_transactions} transaction baskets...")
            
            # Encode transactions and run FP-Growth
            te = TransactionEncoder()
            te_ary = te.fit(transaction_list).transform(transaction_list)
            df = pd.DataFrame(te_ary, columns=te.columns_)
            
            # FP-Growth is significantly faster than Apriori for large datasets
            frequent_itemsets = fpgrowth(df, min_support=0.005, use_colnames=True)
            
            if not frequent_itemsets.empty:
                # Generate association rules
                rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.2)
                
                # Filter for strong associations
                strong_rules = rules[
                    (rules['confidence'] > 0.2) & 
                    (rules['lift'] > 1.2) & 
                    (rules['antecedents'].apply(len) == 1) & 
                    (rules['consequents'].apply(len) == 1)
                ]
                
                # Prepare data for upsert
                fbt_records = []
                for _, row in strong_rules.iterrows():
                    product_a = list(row['antecedents'])[0]
                    product_b = list(row['consequents'])[0]
                    fbt_records.append((
                        product_a, product_b,
                        float(row['support']), float(row['confidence']), float(row['lift']),
                        int(row['support'] * total_transactions), datetime.now()
                    ))
                
                # Upsert into frequently_bought_together
                if fbt_records:
                    execute_batch(cursor, """
                        INSERT INTO frequently_bought_together 
                        (product_a_id, product_b_id, support, confidence, lift, frequency, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (product_a_id, product_b_id) 
                        DO UPDATE SET 
                            support = EXCLUDED.support,
                            confidence = EXCLUDED.confidence,
                            lift = EXCLUDED.lift,
                            frequency = EXCLUDED.frequency,
                            updated_at = EXCLUDED.updated_at
                    """, fbt_records, page_size=1000)
                    conn.commit()
                    fbt_count = len(fbt_records)
                    logger.info(f"   ✅ Upserted {fbt_count} FBT rules.")
                else:
                    fbt_count = 0
            else:
                fbt_count = 0

        # ─── TASK 2: TF-IDF + Cosine Similarity (Cold Start Fallback) ───────────
        logger.info(" [2/2] Running TF-IDF Cosine Similarity for content-based recs...")
        
        cursor.execute("""
            SELECT id, name, category, description 
            FROM products 
            WHERE is_deleted = false AND in_stock = true
        """)
        products = cursor.fetchall()
        
        if not products:
            logger.warning("️ No active products found for TF-IDF.")
            sim_count = 0
        else:
            # Create a text corpus combining category, name, and description
            product_ids = [str(p[0]) for p in products]
            corpus = [
                f"{p[1] or ''} {p[2] or ''} {p[3] or ''}".lower() 
                for p in products
            ]
            
            # Fit TF-IDF Vectorizer
            tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
            tfidf_matrix = tfidf.fit_transform(corpus)
            
            # Compute Cosine Similarity
            cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)
            
            # Extract top 5 similar products for each product
            sim_records = []
            top_n = 5
            for i in range(len(products)):
                # Get indices of most similar products (excluding itself)
                sim_indices = np.argsort(cosine_sim[i])[::-1][1:top_n+1]
                
                for j in sim_indices:
                    # Only store if similarity is meaningful (> 0.1)
                    if cosine_sim[i][j] > 0.1:
                        sim_records.append((
                            product_ids[i], product_ids[j],
                            float(cosine_sim[i][j]), 'similar_attributes', datetime.now()
                        ))
            
            # Upsert into product_graph_edges
            if sim_records:
                execute_batch(cursor, """
                    INSERT INTO product_graph_edges 
                    (product_a_id, product_b_id, weight, relationship_type, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (product_a_id, product_b_id, relationship_type) 
                    DO UPDATE SET 
                        weight = EXCLUDED.weight,
                        updated_at = EXCLUDED.updated_at
                """, sim_records, page_size=1000)
                conn.commit()
                sim_count = len(sim_records)
                logger.info(f"   ✅ Upserted {sim_count} content-based graph edges.")
            else:
                sim_count = 0

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
            conn.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            conn.close()