-- supabase/migrations/013_advanced_customer_analytics.sql
-- Adds RFM segmentation, cohort retention, predictive CLV, and corrected
-- weighted moving average demand forecasting to the Bushal analytics suite.
--

-- ── 1. RFM Analysis & Customer Segmentation ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_rfm_segmentation()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
WITH customer_rfm AS (
  SELECT
    user_id,
    MAX(created_at)          AS last_purchase,
    COUNT(id)                AS frequency,
    SUM(total)               AS monetary
  FROM orders
  WHERE status = 'fulfilled'
  GROUP BY user_id
),
scores AS (
  SELECT
    user_id,
    last_purchase,
    frequency,
    monetary,
    NTILE(5) OVER (ORDER BY last_purchase DESC) AS r_score,
    NTILE(5) OVER (ORDER BY frequency     DESC) AS f_score,
    NTILE(5) OVER (ORDER BY monetary      DESC) AS m_score
  FROM customer_rfm
),
segmented AS (
  SELECT
    user_id,
    frequency,
    monetary,
    r_score,
    f_score,
    m_score,
    (r_score + f_score + m_score) AS rfm_total,
    CASE
      WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
      WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN 'Loyal'
      WHEN r_score >= 4 AND f_score <= 2                  THEN 'New'
      WHEN r_score <= 2 AND f_score >= 3 AND m_score >= 3 THEN 'At Risk'
      WHEN r_score <= 2 AND f_score <= 2                  THEN 'Dormant'
      ELSE 'Regular'
    END AS segment
  FROM scores
)
SELECT jsonb_build_object(
  'segments', (
    -- We do the GROUP BY and AVG/COUNT in a subquery first.
    -- Then we pass the pre-aggregated rows into jsonb_agg.
    SELECT jsonb_agg(
      jsonb_build_object(
        'segment',       segment,
        'count',         count,
        'avg_monetary',  avg_monetary,
        'avg_frequency', avg_frequency,
        'avg_rfm',       avg_rfm
      )
    )
    FROM (
      SELECT 
        segment,
        COUNT(*) AS count,
        ROUND(AVG(monetary), 0) AS avg_monetary,
        ROUND(AVG(frequency::numeric), 1) AS avg_frequency,
        ROUND(AVG(rfm_total::numeric), 1) AS avg_rfm
      FROM segmented
      GROUP BY segment
      ORDER BY AVG(monetary) DESC
    ) sub
  ),
  'top_customers', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'user_id',       s.user_id,
        'name',          p.full_name,
        'email',         p.email,
        'segment',       s.segment,
        'monetary',      s.monetary,
        'frequency',     s.frequency,
        'last_purchase', s.last_purchase,
        'rfm_total',     s.rfm_total
      ) ORDER BY s.monetary DESC
    )
    FROM (
      SELECT
        seg.user_id,
        seg.segment,
        seg.monetary,
        seg.frequency,
        seg.rfm_total,
        cr.last_purchase
      FROM segmented seg
      JOIN customer_rfm cr ON cr.user_id = seg.user_id
      ORDER BY seg.monetary DESC
      LIMIT 10
    ) s
    JOIN profiles p ON p.id = s.user_id
  ),
  'total_customers', (SELECT COUNT(*) FROM segmented)
);
$$;

-- ── 2. Cohort Retention Analysis ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_cohort_retention()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
WITH first_purchases AS (
  SELECT
    user_id,
    DATE_TRUNC('month', MIN(created_at)) AS cohort_month
  FROM orders
  WHERE status = 'fulfilled'
    AND created_at >= NOW() - INTERVAL '2 years'
  GROUP BY user_id
),
cohort_data AS (
  SELECT
    fp.cohort_month,
    (
      (EXTRACT(YEAR  FROM DATE_TRUNC('month', o.created_at)) -
       EXTRACT(YEAR  FROM fp.cohort_month)) * 12
      +
      (EXTRACT(MONTH FROM DATE_TRUNC('month', o.created_at)) -
       EXTRACT(MONTH FROM fp.cohort_month))
    )::int                              AS months_since,
    COUNT(DISTINCT o.user_id)           AS active_users,
    ROUND(SUM(o.total)::numeric, 0)     AS revenue
  FROM orders o
  JOIN first_purchases fp ON o.user_id = fp.user_id
  WHERE o.status = 'fulfilled'
  GROUP BY fp.cohort_month,
           DATE_TRUNC('month', o.created_at)
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(DISTINCT user_id) AS total_users
  FROM first_purchases
  GROUP BY cohort_month
)
SELECT jsonb_agg(
  jsonb_build_object(
    'cohort_month',   TO_CHAR(cd.cohort_month, 'Mon YYYY'),
    'months_since',   cd.months_since,
    'retention_rate', ROUND((cd.active_users::numeric / cs.total_users) * 100, 1),
    'revenue',        cd.revenue,
    'active_users',   cd.active_users,
    'cohort_size',    cs.total_users
  ) ORDER BY cd.cohort_month DESC, cd.months_since ASC
)
FROM cohort_data cd
JOIN cohort_sizes cs ON cd.cohort_month = cs.cohort_month
WHERE cd.months_since BETWEEN 0 AND 11;
$$;

-- ── 3. Predictive Customer Lifetime Value ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_predictive_clv()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
WITH customer_metrics AS (
  SELECT
    user_id,
    COUNT(id)                                                     AS total_orders,
    SUM(total)                                                    AS total_revenue,
    MIN(created_at)                                               AS first_purchase,
    MAX(created_at)                                               AS last_purchase,
    EXTRACT(DAY FROM (MAX(created_at) - MIN(created_at)))         AS lifespan_days
  FROM orders
  WHERE status = 'fulfilled'
  GROUP BY user_id
),
clv_calc AS (
  SELECT
    user_id,
    total_revenue,
    total_orders,
    (total_revenue / total_orders)                                AS aov,
    CASE
      WHEN lifespan_days > 0
        THEN total_orders::numeric / (lifespan_days / 365.0)
      ELSE total_orders::numeric
    END                                                           AS freq_yearly,
    GREATEST(lifespan_days / 365.0, 1.0)                         AS lifespan_years,
    (total_orders = 1)                                            AS is_one_time
  FROM customer_metrics
)
SELECT jsonb_build_object(
  'average_clv',           ROUND((SELECT AVG(aov * freq_yearly * lifespan_years) FROM clv_calc), 0),
  'total_projected_value', ROUND((SELECT SUM(aov * freq_yearly * lifespan_years) FROM clv_calc), 0),
  'repeat_buyer_clv',      ROUND((
    SELECT AVG(aov * freq_yearly * lifespan_years)
    FROM clv_calc WHERE NOT is_one_time
  ), 0),
  'one_time_buyer_pct',    ROUND((
    SELECT 100.0 * COUNT(*) FILTER (WHERE is_one_time) / NULLIF(COUNT(*), 0)
    FROM clv_calc
  ), 1),
  'top_clv_customers', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'user_id',          c.user_id,
        'name',             p.full_name,
        'email',            p.email,
        'historical_value', ROUND(c.total_revenue, 0),
        'predicted_clv',    ROUND(c.aov * c.freq_yearly * c.lifespan_years, 0),
        'total_orders',     c.total_orders,
        'is_one_time',      c.is_one_time
      ) ORDER BY (c.aov * c.freq_yearly * c.lifespan_years) DESC
    )
    FROM (
      SELECT * FROM clv_calc
      ORDER BY (aov * freq_yearly * lifespan_years) DESC
      LIMIT 10
    ) c
    JOIN profiles p ON p.id = c.user_id
  )
);
$$;

-- ── 4. Demand Forecast — Weighted Moving Average ──────────────────────────────
CREATE OR REPLACE FUNCTION get_advanced_demand_forecast()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
WITH monthly_sales AS (
  SELECT
    DATE_TRUNC('month', created_at)                         AS month_start,
    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY')    AS month_label,
    ROUND(SUM(total)::numeric, 0)                           AS revenue,
    COUNT(id)                                               AS orders
  FROM orders
  WHERE status = 'fulfilled'
    AND created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month_start DESC
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (ORDER BY month_start DESC) AS rn
  FROM monthly_sales
),
wma AS (
  SELECT
    ROUND(
      SUM(
        CASE rn
          WHEN 1 THEN revenue * 0.5
          WHEN 2 THEN revenue * 0.3
          WHEN 3 THEN revenue * 0.2
          ELSE 0
        END
      ) / NULLIF(
        SUM(CASE WHEN rn <= 3 THEN
          CASE rn WHEN 1 THEN 0.5 WHEN 2 THEN 0.3 WHEN 3 THEN 0.2 END
        ELSE 0 END), 0
      ), 0
    )      AS next_month_forecast,
    COUNT(*) AS months_of_data
  FROM ranked
)
SELECT jsonb_build_object(
  'next_month_forecast', COALESCE((SELECT next_month_forecast FROM wma), 0),
  'months_of_data',      COALESCE((SELECT months_of_data      FROM wma), 0),
  'confidence',
    CASE
      WHEN (SELECT months_of_data FROM wma) >= 6 THEN 'high'
      WHEN (SELECT months_of_data FROM wma) >= 3 THEN 'medium'
      ELSE 'low'
    END,
  'historical_trend', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'month',   month_label,
        'revenue', revenue,
        'orders',  orders
      ) ORDER BY month_start ASC
    )
    FROM ranked
  )
);
$$;

-- ── Permissions ───────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_rfm_segmentation()         TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_retention()         TO authenticated;
GRANT EXECUTE ON FUNCTION get_predictive_clv()           TO authenticated;
GRANT EXECUTE ON FUNCTION get_advanced_demand_forecast() TO authenticated;