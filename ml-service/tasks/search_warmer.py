# ============================================================================
# FILE ADDRESS: ml-service/tasks/search_warmer.py
# ============================================================================
# EXPLANATION:
# This script acts as a "Cache Warmer" for the Next.js serverless search
# autocomplete API. 
#
# THE PROBLEM:
# The Next.js /api/search/autocomplete endpoint builds an in-memory Trie
# on a cold start and caches the results in Upstash Redis for 5 minutes.
# If the cache expires or Vercel spins down the function, the first user
# to search pays the latency penalty of fetching all products and building
# the Trie from scratch.
#
# THE FIX:
# This Python task runs periodically (e.g., daily or every few hours). It
# queries the database for the most popular product names and categories,
# extracts common 2-3 letter prefixes, and fires HTTP GET requests to the
# live Next.js API. This forces the serverless functions to wake up, build
# the Trie, and populate the Redis cache BEFORE real customers start searching.
#
# BUG FIXES & SAFETY:
# 1. Uses built-in `urllib` to avoid adding `requests` to requirements.txt.
# 2. Non-blocking timeouts (6s) ensure a slow Vercel deployment doesn't 
#    crash the entire ML pipeline.
# 3. Gracefully handles missing environment variables and network errors.
# ============================================================================

import logging
import os
import urllib.request
import urllib.parse
import urllib.error
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("bushal-ml.search_warmer")

def run_search_warmer(conn):
    """
    Warms the Next.js serverless search cache by firing HTTP requests
    to the /api/search/autocomplete endpoint with popular prefixes.
    
    Args:
        conn: psycopg2 connection object (passed from main.py)
        
    Returns:
        dict: Status and metrics of the warming run
    """
    logger.info("🔥 Starting Search Cache Warmer...")
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Fallback to production URL if not set in ML service env
    site_url = os.getenv("NEXT_PUBLIC_SITE_URL", "https://bushal.vercel.app").rstrip('/')
    
    try:
        # 1. Fetch top products and categories to generate search prefixes
        logger.info("   📥 Fetching popular products and categories...")
        cursor.execute("""
            SELECT name, category 
            FROM public.products 
            WHERE in_stock = true AND (is_deleted = false OR is_deleted IS NULL)
            ORDER BY created_at DESC 
            LIMIT 150
        """)
        products = cursor.fetchall()
        
        if not products:
            logger.warning("   ⏭️ No active products found. Skipping search warmer.")
            return {"status": "skipped", "reason": "No active products"}
            
        # 2. Extract unique prefixes (2-3 chars) and categories
        prefixes = set()
        categories = set()
        
        for p in products:
            name = p.get('name')
            if name and len(name) >= 2:
                prefixes.add(name[:2].lower())
                if len(name) >= 3:
                    prefixes.add(name[:3].lower())
            
            cat = p.get('category')
            if cat:
                categories.add(cat.lower())
                
        # Limit queries to prevent spamming the API and hitting rate limits
        queries = list(prefixes)[:40] + list(categories)[:10]
        
        logger.info(f"   🚀 Warming {len(queries)} search prefixes via {site_url}...")
        
        # 3. Fire HTTP requests to the Next.js API
        warmed_count = 0
        for q in queries:
            try:
                encoded_q = urllib.parse.quote(q)
                # Match the exact cache key parameters used in the Next.js route
                url = f"{site_url}/api/search/autocomplete?q={encoded_q}&limit=8&inStockOnly=true"
                
                req = urllib.request.Request(url, headers={
                    "User-Agent": "Bushal-ML-Warmer/1.0",
                    "Accept": "application/json"
                })
                
                # Short timeout so we don't block the pipeline if Vercel is sleeping
                with urllib.request.urlopen(req, timeout=6) as response:
                    if response.status == 200:
                        warmed_count += 1
                        
            except urllib.error.URLError as req_err:
                # Non-fatal: Vercel might be sleeping, rate-limiting, or DNS resolving
                logger.debug(f"   ⚠️ Network issue warming query '{q}': {req_err}")
            except Exception as req_err:
                logger.debug(f"   ⚠️ Failed to warm query '{q}': {req_err}")
                
        logger.info(f"   ✅ Successfully warmed {warmed_count}/{len(queries)} search queries.")
        
        return {
            "status": "success",
            "queries_warmed": warmed_count,
            "total_queries": len(queries)
        }
        
    except Exception as e:
        logger.error(f"❌ Search Warmer failed: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}
    finally:
        # NOTE: We do NOT close the connection here.
        # main.py is responsible for managing the connection lifecycle.
        if cursor and not cursor.closed:
            cursor.close()