-- supabase/migrations/029_add_ml_model_accuracy.sql
-- Tracks the historical accuracy of our ML models (MAPE, Silhouette Score, etc.)
-- This allows the admin to monitor if the AI is improving or degrading over time.

CREATE TABLE IF NOT EXISTS public.ml_model_accuracy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name text NOT NULL CHECK (model_name IN (
        'kmeans_segmentation', 
        'holt_winters_forecast', 
        'fpgrowth_recommendations'
    )),
    metric_name text NOT NULL, -- e.g., 'silhouette_score', 'mape_percentage', 'avg_lift'
    metric_value numeric NOT NULL,
    records_evaluated int NOT NULL DEFAULT 0,
    evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_model_accuracy_name ON public.ml_model_accuracy(model_name);
CREATE INDEX IF NOT EXISTS idx_ml_model_accuracy_date ON public.ml_model_accuracy(evaluated_at DESC);

ALTER TABLE public.ml_model_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ML model accuracy"
ON public.ml_model_accuracy FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.role() = 'service_role'
);

CREATE POLICY "Service Role can manage ML model accuracy"
ON public.ml_model_accuracy FOR ALL
USING (auth.role() = 'service_role');