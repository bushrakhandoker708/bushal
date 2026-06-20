-- supabase/migrations/044_allow_multiple_comments_and_hide.sql
-- ============================================================================
-- EXPLANATION:
-- This migration overhauls the `comments` table to support:
-- 1. Multiple comments per user per product (removes unique constraint).
-- 2. Decoupled ratings and comments (either can exist independently).
-- 3. Admin moderation via a new `is_hidden` flag.
-- 4. A dedicated `product_ratings` table for aggregate rating calculations
--    without scanning the entire comments history.
-- ============================================================================

-- 1. Drop the old unique constraint that prevented multiple comments
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_user_product_unique;

-- 2. Add is_hidden column for admin moderation
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

COMMENT ON COLUMN public.comments.is_hidden IS 
'When true, this comment is hidden from public view but retained in DB for admin review.';

-- 3. Make rating nullable to allow comments without ratings
ALTER TABLE public.comments
ALTER COLUMN rating DROP NOT NULL;

-- 4. Create a dedicated table for product ratings (decoupled from comments)
-- This allows users to rate without commenting, and makes aggregate queries fast.
CREATE TABLE IF NOT EXISTS public.product_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Each user can only have ONE active rating per product (but unlimited comments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ratings_user_product
ON public.product_ratings(user_id, product_id);

-- Index for fast aggregate queries on product pages
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id
ON public.product_ratings(product_id);

-- Enable RLS on product_ratings
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;

-- Users can read all ratings (needed for average calculation)
CREATE POLICY "Public can read product ratings"
ON public.product_ratings FOR SELECT
USING (true);

-- Users can insert/update their own rating
CREATE POLICY "Users can manage own ratings"
ON public.product_ratings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_product_ratings_updated_at ON public.product_ratings;
CREATE TRIGGER trg_product_ratings_updated_at
BEFORE UPDATE ON public.product_ratings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Update existing RLS policies for comments to respect is_hidden
-- Public should NOT see hidden comments
DROP POLICY IF EXISTS "Comments are publicly readable" ON public.comments;
CREATE POLICY "Comments are publicly readable"
ON public.comments FOR SELECT
USING (is_hidden = false);

-- Admins can see ALL comments including hidden ones
CREATE POLICY "Admins can read all comments"
ON public.comments FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Allow admins to update is_hidden flag
CREATE POLICY "Admins can hide/unhide comments"
ON public.comments FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Create a helper function to get average rating efficiently
CREATE OR REPLACE FUNCTION public.get_product_average_rating(p_product_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM public.product_ratings
    WHERE product_id = p_product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_average_rating(uuid) TO anon, authenticated;

-- 7. Backfill: Migrate existing ratings into the new product_ratings table
-- Only migrate rows where rating IS NOT NULL to avoid polluting the new table
INSERT INTO public.product_ratings (product_id, user_id, rating, created_at)
SELECT product_id, user_id, rating, created_at
FROM public.comments
WHERE rating IS NOT NULL
ON CONFLICT (user_id, product_id) DO NOTHING;