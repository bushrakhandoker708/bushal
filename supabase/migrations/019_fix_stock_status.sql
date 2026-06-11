-- supabase/migrations/019_fix_stock_status.sql
-- Adds a computed stock_status column to the products table for cleaner frontend queries.
-- This ensures consistent "Out of Stock", "Low Stock", and "In Stock" logic across the app.

-- 1. Add the computed column
-- This automatically updates whenever stock_quantity changes.
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_status text 
GENERATED ALWAYS AS (
  CASE 
    WHEN stock_quantity = 0 THEN 'out_of_stock'
    WHEN stock_quantity <= 5 THEN 'low_stock'
    ELSE 'in_stock'
  END
) STORED;

-- 2. Ensure the existing sync trigger is up to date
-- The trigger already sets the `in_stock` boolean. We redefine it to be explicit.
-- Note: We DO NOT set `stock_status` here because it is a GENERATED column.
CREATE OR REPLACE FUNCTION public.sync_in_stock_from_quantity()
RETURNS trigger AS $$
BEGIN
  new.in_stock := new.stock_quantity > 0;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Re-attach the trigger to ensure it's properly linked
DROP TRIGGER IF EXISTS products_sync_in_stock ON public.products;
CREATE TRIGGER products_sync_in_stock
  BEFORE INSERT OR UPDATE OF stock_quantity ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.sync_in_stock_from_quantity();