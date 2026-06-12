
-- supabase/migrations/022_add_soft_delete_and_deletion_log.sql
-- This migration adds soft-delete capabilities to the products table.
-- It also introduces a product_deletion_log table to maintain an audit trail 
-- of what related data (sales, analytics, reviews) was preserved or removed 
-- when an admin deletes a product.


-- 1. Add soft delete tracking columns to the products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- 2. Create an index on is_deleted for performant filtering in search and admin views
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON public.products(is_deleted);

-- 3. Create the deletion log table to audit admin deletion choices
CREATE TABLE IF NOT EXISTS public.product_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  keep_sales_data boolean DEFAULT true,
  keep_analytics boolean DEFAULT true,
  keep_reviews boolean DEFAULT true
);

-- 4. Enable Row Level Security (RLS) on the new log table
ALTER TABLE public.product_deletion_log ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for the deletion log
-- Only admins can view the audit logs
CREATE POLICY "Admins can read deletion logs"
ON public.product_deletion_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- The Supabase service role (used by Next.js API routes) can insert logs
CREATE POLICY "Service role can insert deletion logs"
ON public.product_deletion_log FOR INSERT
TO service_role
WITH CHECK (true);

