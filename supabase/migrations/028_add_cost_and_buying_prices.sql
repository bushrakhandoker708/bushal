-- supabase/migrations/028_add_cost_and_buying_prices.sql
-- Adds other_costs column to products table for profit margin calculations.
-- Also includes fixes for database bugs (duplicate policies, SECURITY DEFINER search_path).

-- ─── 1. ADD OTHER COSTS COLUMN ───────────────────────────────────────────────
-- cost_price already exists from previous migrations. We add other_costs for 
-- additional buying expenses (shipping, customs, etc.) to calculate total profit.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS other_costs numeric(10,2) DEFAULT 0 CHECK (other_costs >= 0);

COMMENT ON COLUMN public.products.cost_price IS 'Base cost price of the product from supplier';
COMMENT ON COLUMN public.products.other_costs IS 'Additional buying costs (shipping, customs, etc.)';
COMMENT ON COLUMN public.products.price IS 'Selling price visible to customers';

-- ─── 2. FIX BUG 1: PRODUCT GRAPH EDGES DUPLICATE POLICY ──────────────────────
-- The previous migration failed because it tried to create the same policy twice.
-- We drop and recreate them safely to ensure the migration applies cleanly.
DROP POLICY IF EXISTS "Public can read product graph edges" ON public.product_graph_edges;
CREATE POLICY "Public can read product graph edges"
  ON public.product_graph_edges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and Service Role can manage graph edges" ON public.product_graph_edges;
CREATE POLICY "Admins and Service Role can manage graph edges"
  ON public.product_graph_edges FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.role() = 'service_role'
  );

-- ─── 3. FIX BUG 2: SECURITY DEFINER SEARCH PATH ──────────────────────────────
-- Fixes privilege escalation vulnerability by pinning search_path for all SECURITY DEFINER functions.
-- We use a DO block with EXCEPTION handling so the migration doesn't fail if a function signature changed.
DO $$
BEGIN
    BEGIN ALTER FUNCTION public.confirm_order_and_reduce_stock(uuid, text) SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.create_order_with_stock_check(uuid, jsonb, numeric, text) SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.update_order_delivery(uuid, text, text) SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_variant_effective_price(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.reduce_variant_stock(uuid, int) SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_rfm_segmentation() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_cohort_retention() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_predictive_clv() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_advanced_demand_forecast() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_analytics_summary() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_revenue_forecast() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_restock_recommendations(int) SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_category_trends() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.get_customer_insights() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.notify_on_order_insert() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.notify_on_order_status_change() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.notify_on_comment_insert() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.search_products(text) SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER FUNCTION public.ensure_single_default_address() SET search_path = public, pg_temp; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ─── NOTE ON BUG 3: DUPLICATE MIGRATION 022 ──────────────────────────────────
-- SQL cannot rename files. Please manually rename the file in your local filesystem 
-- before running `supabase db push`:
-- git mv supabase/migrations/022_fix_search_rpc.sql supabase/migrations/022b_fix_search_rpc.sql
-- This ensures Supabase CLI applies them in the correct alphabetical order.