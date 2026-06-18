-- ============================================================================
-- FILE ADDRESS: supabase/migrations/031_fix_revenue_forecast_division_by_zero.sql
-- ============================================================================
-- EXPLANATION:
-- This migration fixes a critical division-by-zero bug in the `get_revenue_forecast` 
-- RPC function. If a store has identical revenue for the last 6 months, the linear 
-- regression denominator (variance of X) becomes 0, crashing the entire query.
-- 
-- We recreate the function using NULLIF() to safely return a slope of 0 (flat trend) 
-- instead of throwing a database error. We also use COALESCE to ensure downstream 
-- calculations don't break if the slope is NULL.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_revenue_forecast()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
result jsonb;
n int;
sum_x numeric;
sum_y numeric;
sum_xy numeric;
sum_x2 numeric;
slope numeric;
intercept numeric;
next_month_pred numeric;
growth_rate numeric;
last_6_months numeric[];
avg_last numeric;
avg_prev numeric;
BEGIN
-- Get last 6 months revenue
WITH monthly AS (
SELECT
date_trunc('month', created_at) AS month,
SUM(total) AS revenue
FROM orders
WHERE status = 'fulfilled'
AND created_at >= NOW() - INTERVAL '6 months'
GROUP BY date_trunc('month', created_at)
ORDER BY month
)
SELECT ARRAY_AGG(revenue ORDER BY month) INTO last_6_months
FROM monthly;

n := array_length(last_6_months, 1);

IF n < 2 THEN
RETURN jsonb_build_object(
'nextMonthRevenue', 0,
'growthRate', 0,
'confidence', 'low',
'trend', 'insufficient_data',
'monthlyData', '[]'::jsonb
);
END IF;

-- Simple linear regression: y = mx + b
sum_x := n * (n + 1) / 2.0;
sum_x2 := n * (n + 1) * (2 * n + 1) / 6.0;
SELECT SUM(v), SUM(i * v) INTO sum_y, sum_xy
FROM unnest(last_6_months) WITH ORDINALITY AS t(v, i);

-- 🔥 FIX: Use NULLIF to prevent division by zero if all revenues are identical.
-- If the denominator is 0, NULLIF returns NULL, and slope becomes NULL.
slope := (n * sum_xy - sum_x * sum_y) / NULLIF(n * sum_x2 - sum_x * sum_x, 0);

-- 🔥 FIX: Use COALESCE(slope, 0) so intercept and predictions don't crash if slope is NULL
intercept := (sum_y - COALESCE(slope, 0) * sum_x) / n;

next_month_pred := GREATEST(COALESCE(slope, 0) * (n + 1) + intercept, 0);

IF n >= 6 THEN
avg_last := (last_6_months[4] + last_6_months[5] + last_6_months[6]) / 3.0;
avg_prev := (last_6_months[1] + last_6_months[2] + last_6_months[3]) / 3.0;
growth_rate := CASE WHEN avg_prev > 0 THEN ((avg_last - avg_prev) / avg_prev) * 100 ELSE 0 END;
ELSE
growth_rate := CASE WHEN last_6_months[1] > 0 THEN ((last_6_months[n] - last_6_months[1]) / last_6_months[1]) * 100 ELSE 0 END;
END IF;

result := jsonb_build_object(
'nextMonthRevenue', ROUND(next_month_pred, 0),
'growthRate', ROUND(growth_rate, 1),
'confidence', CASE WHEN n >= 6 THEN 'high' WHEN n >= 4 THEN 'medium' ELSE 'low' END,
'trend', CASE WHEN COALESCE(slope, 0) > 0 THEN 'upward' WHEN COALESCE(slope, 0) < 0 THEN 'downward' ELSE 'flat' END,
'slope', ROUND(COALESCE(slope, 0), 2),
'monthlyData', (
SELECT jsonb_agg(jsonb_build_object('month', m, 'revenue', r))
FROM unnest(last_6_months) WITH ORDINALITY AS t(r, i),
LATERAL (SELECT to_char((CURRENT_DATE - (n - i) * INTERVAL '1 month'), 'Mon') AS m) sub
)
);

RETURN result;
END;
$$;

-- Re-grant permissions to ensure the API routes can still execute it
GRANT EXECUTE ON FUNCTION get_revenue_forecast() TO authenticated;