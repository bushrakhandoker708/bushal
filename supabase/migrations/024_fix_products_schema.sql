-- supabase/migrations/024_fix_products_schema.sql

-- Adds missing columns to products table for soft delete functionality.
-- Also ensures proper indexing for performance.

-- Add missing columns if they don't exist
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Create index for faster queries on deleted products
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON public.products(is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);

-- Ensure all existing products have is_deleted set to false by default
UPDATE public.products SET is_deleted = false WHERE is_deleted IS NULL;
