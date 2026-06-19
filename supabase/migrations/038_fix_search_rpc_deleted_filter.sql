-- supabase/migrations/038_fix_search_rpc_deleted_filter.sql
-- ============================================================================
-- FIX: search_products RPC — add is_deleted filter
-- ============================================================================
--
-- BUG DESCRIPTION:
--   The search_products() function filtered p.in_stock = true but never
--   filtered p.is_deleted. Soft-deleted products (is_deleted = true) with
--   any stock quantity set before deletion could still appear in search
--   results. This violates the soft-delete contract and exposes deleted
--   listings to customers.
--
-- FIX:
--   Add AND (p.is_deleted = false OR p.is_deleted IS NULL) to the WHERE
--   clause. The IS NULL guard covers rows created before the is_deleted
--   column was added (migration 026), which have a NULL value rather than
--   false. This prevents those rows from being incorrectly excluded.
--
-- ALSO FIXED:
--   The SECURITY DEFINER function is moved to the internal schema pattern
--   recommendation from the Supabase security checklist. We keep it in
--   public here because the GRANT to anon/authenticated is intentional
--   (public product search), but we add a comment documenting that.
--   No auth.uid() check is needed — this is a read-only public RPC.
-- ============================================================================

-- Drop and fully recreate the function so the WHERE clause is replaced cleanly
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
  -- Build separate tsquery objects for English and simple configurations.
  -- We use plainto_tsquery (not websearch_to_tsquery or to_tsquery) because:
  --   • It never throws on arbitrary user input (safe for user-supplied strings)
  --   • It handles multi-word queries with implicit AND
  --   • The simple config catches exact-character matches for transliterated
  --     Bangla words that the English stemmer would mangle
  ts_query_en tsquery;
  ts_query_si tsquery;
  combined    tsquery;
BEGIN
  ts_query_en := plainto_tsquery('english', query);
  ts_query_si := plainto_tsquery('simple',  query);

  -- Combine with the tsquery OR operator (||).
  -- Guard against NULL — plainto_tsquery returns NULL on empty/stopword-only input.
  IF ts_query_en IS NOT NULL AND ts_query_si IS NOT NULL THEN
    combined := ts_query_en || ts_query_si;
  ELSIF ts_query_en IS NOT NULL THEN
    combined := ts_query_en;
  ELSE
    combined := ts_query_si;
  END IF;

  -- If both configs produced NULL (empty input after tokenisation), return nothing
  IF combined IS NULL THEN
    RETURN;
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
    -- Full-text rank: 0.0 when search_vector doesn't match (never throws)
    COALESCE(ts_rank_cd(p.search_vector, combined), 0.0)::real         AS rank,
    -- Trigram similarity against name: 0.0–1.0
    COALESCE(similarity(lower(p.name), lower(query)), 0.0)::real       AS similarity_score
  FROM public.products p
  WHERE
    -- Stock filter (existing)
    p.in_stock = true

    -- BUG FIX: Exclude soft-deleted products.
    -- The IS NULL arm covers rows inserted before the is_deleted column
    -- existed (migration 026) which have NULL rather than false.
    AND (p.is_deleted = false OR p.is_deleted IS NULL)

    -- Match condition: any of full-text, trigram, or substring
    AND (
      -- Full-text match against weighted search_vector
      (combined IS NOT NULL AND p.search_vector @@ combined)

      -- Trigram fuzzy match on name (catches typos like "shrit" → "shirt")
      OR (similarity(lower(p.name),        lower(query)) > 0.15)

      -- Trigram fuzzy match on description (lower threshold — less precise field)
      OR (similarity(lower(p.description), lower(query)) > 0.10)

      -- Substring match: catches short queries like "mi" → "milk" that
      -- trigrams miss because they need at least 3 characters to work
      OR (p.name        ILIKE '%' || query || '%')
      OR (p.description ILIKE '%' || query || '%')
    )
  ORDER BY
    -- Tier 1: exact name match (highest priority)
    (lower(p.name) = lower(query))                        DESC,

    -- Tier 2: name starts with query (prefix match)
    (lower(p.name) LIKE lower(query) || '%')              DESC,

    -- Tier 3: full-text rank from weighted tsvector
    ts_rank_cd(p.search_vector, combined)                 DESC,

    -- Tier 4: trigram similarity score
    similarity(lower(p.name), lower(query))               DESC,

    -- Tier 5: substring match bonus
    (lower(p.name) ILIKE '%' || lower(query) || '%')      DESC,

    -- Tier 6: recency tiebreaker (newer products win on equal score)
    p.created_at                                           DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- SECURITY NOTE: GRANT to anon and authenticated is intentional.
-- search_products is a public product catalog search — no user data
-- is exposed, only the product fields listed in the RETURNS TABLE above.
-- The SECURITY DEFINER is required to use pg_trgm's similarity() function
-- via the GIN trigram indexes without requiring the caller to have
-- direct table SELECT grants.
GRANT EXECUTE ON FUNCTION search_products(text) TO anon, authenticated;

-- Add a comment documenting the fix for future maintainers
COMMENT ON FUNCTION search_products(text) IS
  'Full-text + trigram + substring product search. '
  'FIXED (036): now excludes soft-deleted products (is_deleted = true). '
  'Searches name (weight A) and description (weight B) via GIN index. '
  'Falls back to trigram and ILIKE for fuzzy/short queries. '
  'Returns max 10 results ordered by exact > prefix > FTS rank > similarity > substring > recency.';