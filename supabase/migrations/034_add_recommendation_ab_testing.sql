-- ============================================================================
-- FILE ADDRESS: supabase/migrations/034_add_recommendation_ab_testing.sql
-- ============================================================================
-- EXPLANATION:
-- This migration creates the infrastructure for A/B testing recommendation 
-- algorithms using Thompson Sampling (Multi-Armed Bandit problem).
--
-- 1. `recommendation_models`: Stores the available algorithms and their 
--    current Beta distribution parameters (alpha = successes, beta = failures).
-- 2. `recommendation_events`: Logs every impression, click, and purchase 
--    tied to a specific algorithm to measure true conversion lift.
-- 3. RPC Functions: Atomic functions to update alpha/beta parameters safely 
--    when a user interacts with a recommendation, preventing race conditions 
--    when multiple users trigger events simultaneously.
--
-- THOMPSON SAMPLING LOGIC:
-- - Initial state: alpha=1, beta=1 (Uniform prior, all algorithms equal).
-- - On Impression: No immediate change.
-- - On Conversion (Click/Purchase): alpha = alpha + 1.
-- - On Non-Conversion (Impression but no click after session): beta = beta + 1.
-- ============================================================================

-- 1. Create the models table (The "Arms" of the bandit)
CREATE TABLE IF NOT EXISTS public.recommendation_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  alpha numeric NOT NULL DEFAULT 1.0, -- Successes + 1 (Conversions)
  beta numeric NOT NULL DEFAULT 1.0,  -- Failures + 1 (Non-conversions)
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create the events table (Tracking interactions)
CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text, -- For anonymous users
  model_name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'click', 'purchase')),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_rec_events_model_type ON public.recommendation_events(model_name, event_type);
CREATE INDEX IF NOT EXISTS idx_rec_events_session ON public.recommendation_events(session_id);
CREATE INDEX IF NOT EXISTS idx_rec_events_user ON public.recommendation_events(user_id);

-- 4. Seed the initial algorithms (Uniform Prior: alpha=1, beta=1)
INSERT INTO public.recommendation_models (name, description) VALUES
  ('collaborative_filtering', 'User-based CF with Cosine Similarity & KNN'),
  ('fp_growth', 'Frequent Pattern Growth (Market Basket Analysis)'),
  ('pagerank_rwr', 'Product Graph via PageRank & Random Walk with Restart'),
  ('trending_ema', 'Exponential Moving Average Trending Items (Cold Start Fallback)'),
  ('random_baseline', 'Random selection from in-stock items (Control Group)')
ON CONFLICT (name) DO NOTHING;

-- 5. Atomic RPC to reward a model (Increment Alpha on Conversion)
CREATE OR REPLACE FUNCTION reward_recommendation_model(p_model_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.recommendation_models
  SET 
    alpha = alpha + 1,
    updated_at = now()
  WHERE name = p_model_name AND is_active = true;
END;
$$;

-- 6. Atomic RPC to penalize a model (Increment Beta on Non-Conversion)
-- This is typically called via a background job or session-end webhook 
-- if an impression did not result in a click/purchase.
CREATE OR REPLACE FUNCTION penalize_recommendation_model(p_model_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.recommendation_models
  SET 
    beta = beta + 1,
    updated_at = now()
  WHERE name = p_model_name AND is_active = true;
END;
$$;

-- 7. RPC to log an event and automatically reward on purchase
CREATE OR REPLACE FUNCTION log_recommendation_event(
  p_model_name text,
  p_event_type text,
  p_product_id uuid,
  p_session_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert the event
  INSERT INTO public.recommendation_events (user_id, session_id, model_name, event_type, product_id)
  VALUES (auth.uid(), p_session_id, p_model_name, p_event_type, p_product_id);

  -- If it's a purchase, automatically reward the model that suggested it
  IF p_event_type = 'purchase' THEN
    PERFORM reward_recommendation_model(p_model_name);
  END IF;
END;
$$;

-- 8. RLS Policies
ALTER TABLE public.recommendation_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

-- Anyone can read the active models (needed for frontend Thompson Sampling logic)
CREATE POLICY "Public can read active models"
ON public.recommendation_models FOR SELECT
USING (is_active = true);

-- Only Admins can view all models and historical events
CREATE POLICY "Admins can manage recommendation models"
ON public.recommendation_models FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read recommendation events"
ON public.recommendation_events FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Users can insert their own events (or service role can do it for them)
CREATE POLICY "Users can insert own recommendation events"
ON public.recommendation_events FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Grant execute permissions on RPCs
GRANT EXECUTE ON FUNCTION log_recommendation_event(text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_recommendation_event(text, text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION reward_recommendation_model(text) TO service_role;
GRANT EXECUTE ON FUNCTION penalize_recommendation_model(text) TO service_role;