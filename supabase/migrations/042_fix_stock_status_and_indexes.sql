-- supabase/migrations/042_fix_stock_status_and_indexes.sql

-- ============================================================================
-- FIX 1: Replace flawed GENERATED ALWAYS AS stock_status with a Trigger
-- ============================================================================
-- The previous implementation used a GENERATED ALWAYS AS column which relies
-- on immutable functions. Since stock_quantity changes, we need a trigger
-- to ensure stock_status is always consistent with the quantity.

-- 1. Drop the existing generated column if it exists
ALTER TABLE public.products DROP COLUMN IF EXISTS stock_status;

-- 2. Add the column back as a regular text column
ALTER TABLE public.products ADD COLUMN stock_status text DEFAULT 'in_stock';

-- 3. Create the trigger function
CREATE OR REPLACE FUNCTION public.update_stock_status_trigger()
RETURNS trigger AS $$
BEGIN
    NEW.stock_status := CASE
        WHEN NEW.stock_quantity = 0 THEN 'out_of_stock'
        WHEN NEW.stock_quantity <= 5 THEN 'low_stock'
        ELSE 'in_stock'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Attach the trigger to the products table
DROP TRIGGER IF EXISTS trg_update_stock_status ON public.products;
CREATE TRIGGER trg_update_stock_status
BEFORE INSERT OR UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_stock_status_trigger();

-- 5. Backfill existing data to ensure consistency immediately
UPDATE public.products 
SET stock_status = CASE
    WHEN stock_quantity = 0 THEN 'out_of_stock'
    WHEN stock_quantity <= 5 THEN 'low_stock'
    ELSE 'in_stock'
END;

-- ============================================================================
-- FIX 2: Add Cardinality Constraints to Array Fields
-- ============================================================================
-- Prevents resource exhaustion and ensures data integrity by limiting the
-- number of images per product or comment.

ALTER TABLE public.products 
ADD CONSTRAINT chk_products_images_limit 
CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 10);

ALTER TABLE public.comments 
ADD CONSTRAINT chk_comments_images_limit 
CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 10);

-- ============================================================================
-- FIX 3: Create GIN Indexes for Array Search Performance
-- ============================================================================
-- Accelerates queries that filter by specific elements within the images array.

CREATE INDEX IF NOT EXISTS idx_products_images_gin 
ON public.products USING GIN (images);

CREATE INDEX IF NOT EXISTS idx_comments_images_gin 
ON public.comments USING GIN (images);

-- ============================================================================
-- FIX 4: Add B-tree Indexes for RLS Policy Performance
-- ============================================================================
-- Row-Level Security policies often filter on user_id. Without indexes,
-- these policies force sequential scans on large tables, causing significant
-- latency. These indexes ensure O(log n) lookups for authenticated users.

CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON public.orders (user_id);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id 
ON public.addresses (user_id);

-- Note: profiles.id is already the Primary Key, so it is indexed by default.
-- However, if RLS policies filter on other columns in profiles, add them here.
-- For notifications, we index user_id to speed up fetching user-specific alerts.

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications (user_id);

-- Additionally, index common status columns used in admin dashboards
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status 
ON public.orders (delivery_status);

CREATE INDEX IF NOT EXISTS idx_products_is_deleted 
ON public.products (is_deleted);