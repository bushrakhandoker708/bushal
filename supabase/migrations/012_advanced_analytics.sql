-- supabase/migrations/012_advanced_analytics.sql
-- Advanced Analytics RPC Functions
-- Moves all heavy aggregation to PostgreSQL for scale

-- ── 1. Core Summary RPC ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_total_revenue numeric;
  v_total_cogs numeric;
  v_total_delivery numeric;
  v_total_profit numeric;
  v_fulfilled_count int;
  v_pending_count int;
  v_cancelled_count int;
  v_total_customers int;
  v_repeat_customers int;
  v_avg_order_value numeric;
  v_avg_fulfillment_days numeric;
  v_inventory_turnover numeric;
  v_stock_out_cost numeric;
  v_new_customers_30d int;
  v_sold_30d int;
  v_products_30d int;
  v_inventory_value numeric;
  v_out_of_stock int;
  v_low_stock int;
  v_on_time_rate numeric;
  v_cancellation_rate numeric;
BEGIN
  -- Revenue metrics
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_total_revenue, v_fulfilled_count
  FROM orders WHERE status = 'fulfilled';

  SELECT COUNT(*) INTO v_pending_count FROM orders WHERE status = 'pending';
  SELECT COUNT(*) INTO v_cancelled_count FROM orders WHERE status = 'cancelled';

  -- COGS & Delivery (Fixed: using JOIN instead of correlated subqueries for performance and correctness)
  SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0),
         COALESCE(SUM(oi.quantity * COALESCE(p.delivery_charge, 0)), 0)
  INTO v_total_cogs, v_total_delivery
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE o.status = 'fulfilled';

  v_total_profit := v_total_revenue - v_total_cogs - v_total_delivery;

  -- Customer metrics
  SELECT COUNT(*) INTO v_total_customers FROM profiles WHERE role = 'customer';
  
  SELECT COUNT(*) INTO v_repeat_customers
  FROM (
    SELECT user_id FROM orders WHERE status = 'fulfilled'
    GROUP BY user_id HAVING COUNT(*) >= 2
  ) repeat_buyers;

  v_avg_order_value := CASE WHEN v_fulfilled_count > 0 THEN v_total_revenue / v_fulfilled_count ELSE 0 END;

  -- Avg fulfillment days (from order_placed to delivered)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      (delivery_steps->-1->>'timestamp')::timestamptz - created_at
    )) / 86400
  ), 0)
  INTO v_avg_fulfillment_days
  FROM orders
  WHERE status = 'fulfilled' 
    AND jsonb_array_length(delivery_steps) > 0
    AND (delivery_steps->-1->>'timestamp') IS NOT NULL;

  -- Inventory metrics
  SELECT 
    COALESCE(SUM(price * stock_quantity), 0),
    COUNT(*) FILTER (WHERE NOT in_stock),
    COUNT(*) FILTER (WHERE in_stock AND stock_quantity <= 5)
  INTO v_inventory_value, v_out_of_stock, v_low_stock
  FROM products;

  -- Inventory turnover (units sold last 90d / avg inventory value)
  SELECT COALESCE(SUM(oi.quantity), 0) INTO v_sold_30d
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status = 'fulfilled' AND o.created_at >= NOW() - INTERVAL '90 days';

  v_inventory_turnover := CASE 
    WHEN v_inventory_value > 0 THEN (v_sold_30d::numeric * 4) / (v_inventory_value / NULLIF((SELECT AVG(price) FROM products), 0))
    ELSE 0 
  END;

  -- Stock-out cost estimation (avg daily sales × days out × avg price)
  SELECT COALESCE(SUM(
    (p.price * 2 * 7) -- estimate: 2 units/day × 7 days avg stockout
  ), 0) INTO v_stock_out_cost
  FROM products p WHERE NOT p.in_stock;

  -- 30-day metrics
  SELECT COUNT(*) INTO v_new_customers_30d
  FROM profiles WHERE role = 'customer' AND created_at >= NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_products_30d
  FROM products WHERE created_at >= NOW() - INTERVAL '30 days';

  -- Operational metrics
  v_on_time_rate := CASE 
    WHEN v_fulfilled_count > 0 THEN 
      (100.0 * (v_fulfilled_count - v_cancelled_count)) / v_fulfilled_count
    ELSE 100 
  END;

  v_cancellation_rate := CASE 
    WHEN (v_fulfilled_count + v_cancelled_count) > 0 THEN 
      (100.0 * v_cancelled_count) / (v_fulfilled_count + v_cancelled_count)
    ELSE 0 
  END;

  result := jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'totalCOGS', v_total_cogs,
    'totalDeliveryCharges', v_total_delivery,
    'totalProfit', v_total_profit,
    'fulfilledOrdersCount', v_fulfilled_count,
    'pendingOrders', v_pending_count,
    'cancelledOrders', v_cancelled_count,
    'totalCustomers', v_total_customers,
    'repeatCustomers', v_repeat_customers,
    'avgOrderValue', v_avg_order_value,
    'avgFulfillmentDays', ROUND(v_avg_fulfillment_days::numeric, 1),
    'inventoryTurnover', ROUND(v_inventory_turnover::numeric, 2),
    'stockOutCost', v_stock_out_cost,
    'newCustomers30d', v_new_customers_30d,
    'soldIn30d', v_sold_30d,
    'productsAdded30d', v_products_30d,
    'totalInventoryValue', v_inventory_value,
    'outOfStock', v_out_of_stock,
    'lowStock', v_low_stock,
    'onTimeDeliveryRate', ROUND(v_on_time_rate::numeric, 1),
    'cancellationRate', ROUND(v_cancellation_rate::numeric, 1)
  );

  RETURN result;
END;
$$;

-- ─── 2. Daily Revenue (last 30 days) ─────────────────────────────────────────
-- FIXED: Replaced broken correlated subquery with proper JOINs
CREATE OR REPLACE FUNCTION get_daily_revenue(days int DEFAULT 30)
RETURNS TABLE (
  date text,
  revenue numeric,
  orders int,
  profit numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH date_series AS (
    SELECT generate_series(
      (CURRENT_DATE - (days - 1))::date,
      CURRENT_DATE::date,
      '1 day'::interval
    )::date AS d
  ),
  daily AS (
    SELECT 
      o.created_at::date AS order_date,
      SUM(o.total) AS revenue,
      COUNT(DISTINCT o.id) AS orders,
      SUM(o.total) - COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) AS profit
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'fulfilled'
      AND o.created_at >= (CURRENT_DATE - (days - 1))::date
    GROUP BY o.created_at::date
  )
  SELECT 
    ds.d::text AS date,
    COALESCE(d.revenue, 0) AS revenue,
    COALESCE(d.orders, 0) AS orders,
    COALESCE(d.profit, 0) AS profit
  FROM date_series ds
  LEFT JOIN daily d ON d.order_date = ds.d
  ORDER BY ds.d;
$$;

-- ─── 3. Revenue Forecast (simple linear regression on last 6 months) ─────────
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

  slope := (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
  intercept := (sum_y - slope * sum_x) / n;

  next_month_pred := GREATEST(slope * (n + 1) + intercept, 0);

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
    'trend', CASE WHEN slope > 0 THEN 'upward' WHEN slope < 0 THEN 'downward' ELSE 'flat' END,
    'slope', ROUND(slope, 2),
    'monthlyData', (
      SELECT jsonb_agg(jsonb_build_object('month', m, 'revenue', r))
      FROM unnest(last_6_months) WITH ORDINALITY AS t(r, i),
           LATERAL (SELECT to_char((CURRENT_DATE - (n - i) * INTERVAL '1 month'), 'Mon') AS m) sub
    )
  );

  RETURN result;
END;
$$;

-- ─── 4. Products to Restock Soon ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_restock_recommendations(limit_count int DEFAULT 10)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH sales_velocity AS (
    SELECT 
      p.id, p.name, p.price, p.stock_quantity, p.image_url, p.images,
      COALESCE(SUM(oi.quantity), 0) AS sold_30d,
      CASE 
        WHEN COALESCE(SUM(oi.quantity), 0) > 0 
        THEN p.stock_quantity::numeric / (SUM(oi.quantity) / 30.0)
        ELSE 999
      END AS days_until_stockout,
      p.price * COALESCE(SUM(oi.quantity), 0) AS revenue_30d
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'fulfilled' 
      AND o.created_at >= NOW() - INTERVAL '30 days'
    WHERE p.in_stock
    GROUP BY p.id, p.name, p.price, p.stock_quantity, p.image_url, p.images
    HAVING p.stock_quantity > 0
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id, 'name', name, 'price', price, 'stock_quantity', stock_quantity,
      'image_url', image_url, 'images', images, 'sold_30d', sold_30d,
      'days_until_stockout', ROUND(days_until_stockout, 0), 'revenue_30d', revenue_30d,
      'urgency', CASE 
        WHEN days_until_stockout < 7 THEN 'critical'
        WHEN days_until_stockout < 14 THEN 'high'
        WHEN days_until_stockout < 30 THEN 'medium'
        ELSE 'low'
      END,
      'recommended_restock', GREATEST(CEIL(sold_30d * 1.5), stock_quantity * 2)
    )
    ORDER BY days_until_stockout ASC
  )
  FROM sales_velocity
  WHERE days_until_stockout < 60
  LIMIT limit_count;
$$;

-- ─── 5. Category Growth Trends ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_category_trends()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH current_period AS (
    SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue, SUM(oi.quantity) AS units
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'fulfilled' AND o.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY p.category
  ),
  previous_period AS (
    SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue, SUM(oi.quantity) AS units
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status = 'fulfilled'
      AND o.created_at >= NOW() - INTERVAL '60 days'
      AND o.created_at < NOW() - INTERVAL '30 days'
    GROUP BY p.category
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'category', c.category, 'currentRevenue', COALESCE(c.revenue, 0),
      'previousRevenue', COALESCE(p.revenue, 0),
      'growthRate', CASE WHEN COALESCE(p.revenue, 0) > 0 THEN ROUND(((c.revenue - p.revenue) / p.revenue) * 100, 1) ELSE 100 END,
      'units', COALESCE(c.units, 0),
      'trend', CASE WHEN COALESCE(c.revenue, 0) > COALESCE(p.revenue, 0) THEN 'up' WHEN COALESCE(c.revenue, 0) < COALESCE(p.revenue, 0) THEN 'down' ELSE 'stable' END
    )
    ORDER BY c.revenue DESC NULLS LAST
  )
  FROM current_period c
  LEFT JOIN previous_period p ON p.category = c.category;
$$;

-- ─── 6. Customer Insights ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_customer_insights()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH customer_stats AS (
    SELECT o.user_id, pr.full_name, pr.email, COUNT(*) AS order_count, SUM(o.total) AS total_spent, MAX(o.created_at) AS last_order
    FROM orders o JOIN profiles pr ON pr.id = o.user_id WHERE o.status = 'fulfilled'
    GROUP BY o.user_id, pr.full_name, pr.email
  ),
  top_spender AS (SELECT * FROM customer_stats ORDER BY total_spent DESC LIMIT 1),
  avg_clv AS (SELECT AVG(total_spent) AS clv FROM customer_stats)
  SELECT jsonb_build_object(
    'totalCustomers', (SELECT COUNT(*) FROM profiles WHERE role = 'customer'),
    'activeCustomers30d', (SELECT COUNT(DISTINCT user_id) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'),
    'newCustomers30d', (SELECT COUNT(*) FROM profiles WHERE role = 'customer' AND created_at >= NOW() - INTERVAL '30 days'),
    'repeatCustomerRate', (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE order_count >= 2) / NULLIF(COUNT(*), 0), 1) FROM customer_stats),
    'avgLifetimeValue', (SELECT ROUND(clv, 0) FROM avg_clv),
    'avgOrdersPerCustomer', (SELECT ROUND(AVG(order_count)::numeric, 1) FROM customer_stats),
    'topSpender', (SELECT jsonb_build_object('name', full_name, 'email', email, 'totalSpent', total_spent, 'orderCount', order_count) FROM top_spender)
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_analytics_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_revenue(int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_forecast() TO authenticated;
GRANT EXECUTE ON FUNCTION get_restock_recommendations(int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_trends() TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_insights() TO authenticated;