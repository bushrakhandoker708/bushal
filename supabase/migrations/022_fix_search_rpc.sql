-- supabase/migrations/023_fix_search_rpc.sql
-- Creates or replaces the `search_products` RPC function.
-- This update ensures that soft-deleted products (where `is_deleted = true`)
-- are EXCLUDED from customer-facing search results.
-- It also improves the search logic to handle partial matches on names, 
-- categories, and descriptions efficiently.

-- Note: If you already have a `search_products` function, this script will replace it.
-- Ensure you backup any custom logic if you have modified the original search function.

CREATE OR REPLACE FUNCTION public.search_products(query text)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.products
  WHERE (
    -- Search in product name
    unaccent(name) ILIKE unaccent('%' || query || '%') OR
    -- Search in category
    unaccent(category::text) ILIKE unaccent('%' || query || '%') OR
    -- Search in description
    unaccent(description::text) ILIKE unaccent('%' || query || '%')
  )
  -- CRITICAL FIX: Exclude soft-deleted products from search results
  AND (is_deleted IS NULL OR is_deleted = false)
  -- Optional: You might also want to exclude out-of-stock items from search, 
  -- but usually, we show them but mark them as unavailable. 
  -- Here we include out-of-stock items so customers can see "Sold Out".
  
  -- Order by relevance (exact match first, then partial) or creation date
  ORDER BY created_at DESC;
$$;

