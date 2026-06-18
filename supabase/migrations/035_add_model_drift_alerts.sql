-- ============================================================================
-- FILE ADDRESS: supabase/migrations/035_add_model_drift_alerts.sql
-- ============================================================================
-- EXPLANATION:
-- This migration creates the infrastructure for automated ML Model Drift 
-- Detection. 
--
-- FIX: We cannot use DATE(created_at) in an index expression because it is 
-- not IMMUTABLE in Postgres (it depends on session timezone). 
-- We use a standard unique index instead, and handle daily deduplication 
-- in the Python script.
-- ============================================================================

-- 1. Create the drift alerts table
CREATE TABLE IF NOT EXISTS public.model_drift_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  metric_name text NOT NULL,
  current_value numeric NOT NULL,
  rolling_avg_value numeric NOT NULL,
  percent_change numeric NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning', 'critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create a UNIQUE INDEX to prevent duplicate alerts for the exact same timestamp.
-- Daily deduplication is now handled in the Python drift_detection.py script.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_drift_alert 
ON public.model_drift_alerts (model_name, metric_name, created_at);

-- 3. Enable Row Level Security
ALTER TABLE public.model_drift_alerts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Only Admins can view and manage drift alerts
CREATE POLICY "Admins can read drift alerts"
ON public.model_drift_alerts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage drift alerts"
ON public.model_drift_alerts FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- The Supabase service role (used by Python ML microservice) can insert alerts
CREATE POLICY "Service role can insert drift alerts"
ON public.model_drift_alerts FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drift_alerts_status ON public.model_drift_alerts(status);
CREATE INDEX IF NOT EXISTS idx_drift_alerts_created_at ON public.model_drift_alerts(created_at DESC);

-- 6. Helper View: Get the latest active alerts for the Admin Dashboard
CREATE OR REPLACE VIEW public.active_drift_alerts AS
SELECT 
  id,
  model_name,
  metric_name,
  current_value,
  rolling_avg_value,
  percent_change,
  severity,
  status,
  created_at
FROM public.model_drift_alerts
WHERE status = 'active'
ORDER BY 
  CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 END ASC,
  created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.active_drift_alerts TO authenticated;