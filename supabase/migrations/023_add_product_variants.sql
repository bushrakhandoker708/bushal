-- supabase/migrations/023_add_product_variants.sql
 
-- Adds a product_variants table to support product variants (SKUs).
-- This allows products to have multiple options like Size, Color, Material, etc.
-- Each variant can have its own price adjustment, stock quantity, and SKU.
-- This future-proofs the inventory system for real-world premium brands.

-- 1. Create the product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku text UNIQUE NOT NULL,
  variant_name text NOT NULL, -- e.g., "Forest Green / Medium"
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"color": "Forest Green", "size": "M"}
  price_adjustment numeric DEFAULT 0 CHECK (price_adjustment >= 0),
  stock_quantity int DEFAULT 0 CHECK (stock_quantity >= 0),
  in_stock boolean GENERATED ALWAYS AS (stock_quantity > 0) STORED,
  is_default boolean DEFAULT false, -- Mark one variant as the default display option
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_in_stock ON public.product_variants(in_stock);

-- 3. Enable Row Level Security
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Public can read variants for products that are publicly readable
CREATE POLICY "Public can read product variants"
ON public.product_variants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_variants.product_id
    AND (
      -- Check if product is publicly readable (in_stock = true and not deleted)
      in_stock = true
      AND (is_deleted IS NULL OR is_deleted = false)
    )
  )
);

-- Admins can manage all variants
CREATE POLICY "Admins can manage product variants"
ON public.product_variants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_variant_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_variants_updated_at ON public.product_variants;
CREATE TRIGGER product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.handle_variant_updated_at();

-- 6. Add variant_id column to order_items (nullable for backward compatibility)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- 7. Create index on order_items.variant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- 8. Add helper function to get the effective price of a variant
CREATE OR REPLACE FUNCTION public.get_variant_effective_price(variant_id uuid)
RETURNS numeric AS $$
DECLARE
  base_price numeric;
  adjustment numeric;
BEGIN
  -- Get base product price
  SELECT p.price INTO base_price
  FROM public.products p
  JOIN public.product_variants pv ON pv.product_id = p.id
  WHERE pv.id = variant_id;
  
  -- Get price adjustment
  SELECT pv.price_adjustment INTO adjustment
  FROM public.product_variants pv
  WHERE pv.id = variant_id;
  
  -- Return effective price (base + adjustment)
  RETURN COALESCE(base_price, 0) + COALESCE(adjustment, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add helper function to reduce variant stock
CREATE OR REPLACE FUNCTION public.reduce_variant_stock(
  p_variant_id uuid,
  p_quantity int
)
RETURNS boolean AS $$
DECLARE
  current_stock int;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO current_stock
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;
  
  -- Check if sufficient stock
  IF current_stock < p_quantity THEN
    RETURN false;
  END IF;
  
  -- Reduce stock
  UPDATE public.product_variants
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_variant_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_variant_effective_price(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reduce_variant_stock(uuid, int) TO authenticated;
