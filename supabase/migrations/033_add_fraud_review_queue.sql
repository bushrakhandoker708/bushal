-- ============================================================================
-- FILE ADDRESS: supabase/migrations/033_add_fraud_review_queue.sql
-- ============================================================================
-- EXPLANATION:
-- This migration creates the `fraud_review_queue` table required by the 
-- Python ML microservice's automation.py script. Previously, the system 
-- auto-cancelled orders flagged as "Fake Orders" by K-Means clustering, 
-- which was a critical customer service risk (false positives could cancel 
-- legitimate orders). 
--
-- THE FIX: We now insert flagged orders into this review queue so the admin 
-- can manually review them before taking action. This table stores:
-- - order_id: The order flagged for review
-- - customer_id: The customer who placed the order
-- - reason: Why the order was flagged (e.g., "Customer in suspicious RFM cluster")
-- - confidence_proxy: The distance from the fraud centroid (lower = more suspicious)
-- - status: pending / reviewed / cancelled
-- - flagged_at: When the order was flagged
--
-- This ensures human oversight before any order is cancelled, preventing 
-- the catastrophic bug of auto-cancelling legitimate customer orders.
-- ============================================================================

-- 1. Create the fraud_review_queue table
CREATE TABLE IF NOT EXISTS public.fraud_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  confidence_proxy numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'cancelled')),
  flagged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id) -- Prevent duplicate flags for the same order
);

-- 2. Enable Row Level Security
ALTER TABLE public.fraud_review_queue ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Only Admins can view and manage the fraud review queue
CREATE POLICY "Admins can read fraud review queue"
ON public.fraud_review_queue FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage fraud review queue"
ON public.fraud_review_queue FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- The Supabase service role (used by Python ML microservice) can insert flags
CREATE POLICY "Service role can insert fraud flags"
ON public.fraud_review_queue FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Indexes for performance
-- Index on status for filtering pending reviews
CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_status ON public.fraud_review_queue(status);

-- Index on flagged_at for sorting by most recent
CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_flagged_at ON public.fraud_review_queue(flagged_at DESC);

-- Index on customer_id for looking up all flags for a specific customer
CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_customer_id ON public.fraud_review_queue(customer_id);

-- 5. Add a comment for documentation
COMMENT ON TABLE public.fraud_review_queue IS 
  'Stores orders flagged by the ML fraud detection system for admin review. Prevents auto-cancellation of legitimate orders.';

COMMENT ON COLUMN public.fraud_review_queue.confidence_proxy IS 
  'Distance from the fraud centroid in K-Means clustering. Lower values indicate higher suspicion.';