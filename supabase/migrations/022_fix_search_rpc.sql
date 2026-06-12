-- supabase/migrations/022_fix_search_rpc.sql

-- FIX: PostgreSQL does not allow changing the return type of a function 
-- using CREATE OR REPLACE. We must explicitly drop the old function first.
DROP FUNCTION IF EXISTS public.search_products(text);

-- Creates or replaces the `search_products` RPC function.
-- This update ensures that soft-deleted products (where `is_deleted = true`)
-- are EXCLUDED from customer-facing search results.

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
  
  -- Order by creation date
  ORDER BY created_at DESC;
$$;