-- supabase/migrations/041_add_composite_indexes.sql
-- ============================================================================
-- EXPLANATION:
-- Adds composite indexes to critical tables to optimize common query patterns
-- in both the application UI and the ML pipeline.
--
-- 1. idx_orders_user_created:
--    Optimizes:
--    - Customer "My Orders" page (SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC)
--    - Admin order filtering by customer
--    Prevents sequential scans on the growing orders table.
--
-- 2. idx_interactions_product_created:
--    Optimizes:
--    - ML Pipeline: Fetching recent interactions for a specific product (Collaborative Filtering)
--    - Trending Products API: Aggregating sales velocity for specific items
--    Prevents sequential scans on the high-volume product_interactions table.
-- ============================================================================

-- Index for faster order retrieval by user, sorted by date
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON public.orders(user_id, created_at DESC);

-- Index for faster interaction retrieval by product, sorted by date
CREATE INDEX IF NOT EXISTS idx_interactions_product_created 
ON public.product_interactions(product_id, created_at DESC);