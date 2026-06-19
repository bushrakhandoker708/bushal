-- supabase/migrations/036_add_product_details.sql
-- Adds a 'details' column for a short description/key features, 
-- keeping 'description' for the full, broader product story.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS details text;

COMMENT ON COLUMN public.products.details IS 'Short description or key details displayed near the price';
COMMENT ON COLUMN public.products.description IS 'Full, broader product description displayed further down the page';