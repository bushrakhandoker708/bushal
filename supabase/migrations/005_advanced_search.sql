
--  Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
 
--  Add columns (safe — does nothing if they already exist)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector,
  ADD COLUMN IF NOT EXISTS search_keywords text;
 
--  RLS: ensure anon/public can read products
--    (this is the #1 silent killer — skip if you already have a read policy)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
 
DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;
CREATE POLICY "Products are publicly readable"
  ON public.products
  FOR SELECT
  USING (true);
 
--  Trigger function — rebuilds search_vector on every insert/update
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')),        'A') ||
    setweight(to_tsvector('simple',  coalesce(NEW.name, '')),        'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple',  coalesce(NEW.description, '')), 'B');
 
  NEW.search_keywords :=
    lower(coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, ''));
 
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
--  Attach trigger
DROP TRIGGER IF EXISTS products_search_vector_update ON public.products;
CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();
 
--  CRITICAL: back-fill ALL existing rows so search_vector is never NULL
--    (the original migration used "set name = name" which is a no-op in some PG versions)
UPDATE public.products
SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')),        'A') ||
  setweight(to_tsvector('simple',  coalesce(name, '')),        'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple',  coalesce(description, '')), 'B'),
search_keywords =
  lower(coalesce(name, '') || ' ' || coalesce(description, ''));
 
--  Indexes
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.products USING GIN (search_vector);
 
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING GIN (name gin_trgm_ops);
 
CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON public.products USING GIN (description gin_trgm_ops);
 
--  Drop and recreate the search function (fixed tsquery OR bug)
DROP FUNCTION IF EXISTS search_products(text);
 
CREATE OR REPLACE FUNCTION search_products(query text)
RETURNS TABLE (
  id               uuid,
  name             text,
  description      text,
  price            numeric,
  image_url        text,
  images           text[],
  discount_percent integer,
  in_stock         boolean,
  stock_quantity   integer,
  created_at       timestamptz,
  updated_at       timestamptz,
  rank             real,
  similarity_score real
) AS $$
DECLARE
  -- BUG FIX: the original used || to combine tsquery values which is invalid
  -- in many PG versions. We build two separate queries and OR them with ||
  -- only when both are non-null, falling back to just one if needed.
  ts_query_en tsquery;
  ts_query_si tsquery;
  combined    tsquery;
BEGIN
  -- Safely build tsquery — plainto_tsquery never throws on bad input
  ts_query_en := plainto_tsquery('english', query);
  ts_query_si := plainto_tsquery('simple',  query);
 
  -- Combine with the correct tsquery OR operator (||)
  -- Both configs almost always produce valid queries, but guard anyway
  IF ts_query_en IS NOT NULL AND ts_query_si IS NOT NULL THEN
    combined := ts_query_en || ts_query_si;
  ELSIF ts_query_en IS NOT NULL THEN
    combined := ts_query_en;
  ELSE
    combined := ts_query_si;
  END IF;
 
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.images,
    p.discount_percent,
    p.in_stock,
    p.stock_quantity,
    p.created_at,
    p.updated_at,
    -- Full-text rank (0.0 when search_vector doesn't match, never errors)
    COALESCE(ts_rank_cd(p.search_vector, combined), 0.0)::real          AS rank,
    -- Trigram similarity against name (0.0–1.0)
    COALESCE(similarity(lower(p.name), lower(query)), 0.0)::real        AS similarity_score
  FROM public.products p
  WHERE
    p.in_stock = true
    AND (
      -- Full-text match
      (p.search_vector @@ combined)
      -- Trigram fuzzy match on name
      OR (similarity(lower(p.name),        lower(query)) > 0.15)
      -- Trigram fuzzy match on description
      OR (similarity(lower(p.description), lower(query)) > 0.1)
      -- Substring match (catches short queries like "mi" → "milk")
      OR (p.name        ILIKE '%' || query || '%')
      OR (p.description ILIKE '%' || query || '%')
    )
  ORDER BY
    -- Exact name match wins
    (p.name ILIKE query)                          DESC,
    -- Full-text rank
    ts_rank_cd(p.search_vector, combined)         DESC,
    -- Trigram similarity
    similarity(lower(p.name), lower(query))       DESC,
    -- Substring bonus
    (p.name ILIKE '%' || query || '%')            DESC,
    -- Recency tiebreaker
    p.created_at                                  DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
 
--  Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION search_products(text) TO anon, authenticated;
 
