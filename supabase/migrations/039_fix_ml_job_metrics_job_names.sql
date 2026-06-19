-- supabase/migrations/039_fix_ml_job_metrics_job_names.sql
-- ============================================================================
-- FIX: ml_job_metrics.job_name CHECK constraint does not match the real
-- pipeline tasks, AND no code anywhere actually writes to this table.
-- ============================================================================
--
-- BUG DESCRIPTION:
--   1. The original CHECK constraint only permits:
--        'apriori_fbt', 'kmeans_segmentation', 'holt_winters_forecast',
--        'pagerank_graph', 'ema_trending'
--      But ml-service/main.py's /run-pipeline orchestrator actually runs
--      SIX tasks: segmentation, forecasting, recommendations,
--      drift_detection, automation, search_warmer. Three of those six
--      (drift_detection, automation, search_warmer) have no matching
--      allowed value — any insert attempt for them would be REJECTED by
--      Postgres even after main.py is instrumented to write job metrics.
--
--   2. Separately (fixed in the accompanying main.py change): nothing in
--      the codebase has ever executed an INSERT against this table, so
--      the admin ML Health Dashboard's "Pipeline Job History" panel has
--      been permanently empty since the table was created in migration 029,
--      despite the pipeline running nightly via cron.
--
-- FIX:
--   Drop and recreate the CHECK constraint with the six canonical job
--   names used consistently across ml_job_metrics and ml_model_accuracy
--   (where applicable). main.py is updated separately to time each task
--   and write a row here after every run, success or failure.
-- ============================================================================

ALTER TABLE public.ml_job_metrics
  DROP CONSTRAINT IF EXISTS ml_job_metrics_job_name_check;

ALTER TABLE public.ml_job_metrics
  ADD CONSTRAINT ml_job_metrics_job_name_check
  CHECK (job_name = ANY (ARRAY[
    'kmeans_segmentation'::text,
    'holt_winters_forecast'::text,
    'fpgrowth_recommendations'::text,
    'drift_detection'::text,
    'business_automation'::text,
    'search_cache_warmer'::text
  ]));

COMMENT ON CONSTRAINT ml_job_metrics_job_name_check ON public.ml_job_metrics IS
  'Six canonical pipeline task names, kept in sync with the /run-pipeline orchestrator in ml-service/main.py. Update both together if a task is renamed or added.';

-- Helpful index for the dashboard's "last run per job" queries
CREATE INDEX IF NOT EXISTS idx_ml_job_metrics_job_name_created
  ON public.ml_job_metrics(job_name, created_at DESC);