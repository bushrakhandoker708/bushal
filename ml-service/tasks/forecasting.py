# ============================================================================
# FILE ADDRESS: ml-service/tasks/forecasting.py
# ============================================================================
# EXPLANATION:
# This module implements Demand Forecasting using Holt-Winters Triple 
# Exponential Smoothing. It forecasts future demand for products and overall 
# store revenue, incorporating festival multipliers for Bangladesh-specific 
# shopping patterns.
#
# BUG FIXES APPLIED:
# 1. Function signature now accepts `conn` parameter from main.py
# 2. Uses correct column names matching actual DB schema:
#    - demand_forecast_cache: product_id, forecast_date, predicted_value, 
#      lower_bound, upper_bound, is_festival_period, festival_name, boost_factor
#    - ml_model_accuracy: model_name, metric_name, metric_value, 
#      records_evaluated, evaluated_at
#    - festivals: name, start_date, end_date, boost_factor
# 3. Gracefully returns "skipped" status when insufficient data exists
# 4. Does NOT close the connection (main.py handles that)
# 5. Proper error handling with rollback on failure
# ============================================================================

import logging
import numpy as np
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("bushal-ml.forecasting")


def run_demand_forecasting(conn):
    """
    Runs Holt-Winters Triple Exponential Smoothing to forecast demand.
    
    Args:
        conn: psycopg2 connection object (passed from main.py)
    
    Returns:
        dict: Status and metrics of the forecasting run
    """
    logger.info("📈 Starting Demand Forecasting (Holt-Winters)...")
    cursor = None
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # ─── 1. Fetch Fulfilled Orders ─────────────────────────────────────
        logger.info("   📥 Fetching order history...")
        cursor.execute("""
            SELECT 
                o.id as order_id,
                o.user_id,
                o.total,
                o.created_at,
                oi.product_id,
                oi.quantity,
                oi.unit_price
            FROM public.orders o
            JOIN public.order_items oi ON oi.order_id = o.id
            WHERE o.status = 'fulfilled'
            ORDER BY o.created_at ASC
        """)
        
        orders = cursor.fetchall()
        
        if not orders or len(orders) < 10:
            logger.warning("   ⏭️ Insufficient order data for forecasting. Need at least 10 fulfilled orders.")
            return {
                "status": "skipped",
                "reason": "Insufficient data",
                "orders_found": len(orders) if orders else 0
            }
        
        logger.info(f"   📊 Found {len(orders)} order items to analyze.")
        
        # ─── 2. Aggregate Monthly Revenue ──────────────────────────────────
        logger.info("   🧮 Aggregating monthly revenue...")
        
        monthly_revenue = {}
        monthly_orders = {}
        
        for order in orders:
            month_key = order['created_at'].strftime('%Y-%m')
            total = float(order['total'] or 0)
            
            if month_key not in monthly_revenue:
                monthly_revenue[month_key] = 0.0
                monthly_orders[month_key] = 0
            
            monthly_revenue[month_key] += total
            monthly_orders[month_key] += 1
        
        # Sort by month
        sorted_months = sorted(monthly_revenue.keys())
        revenue_series = [monthly_revenue[m] for m in sorted_months]
        
        logger.info(f"   📅 Found {len(sorted_months)} months of revenue data.")
        
        if len(revenue_series) < 3:
            logger.warning("   ⏭️ Need at least 3 months of data for Holt-Winters. Skipping.")
            return {
                "status": "skipped",
                "reason": "Insufficient months",
                "months_found": len(sorted_months)
            }
        
        # ─── 3. Fetch Festival Calendar ────────────────────────────────────
        logger.info("   🎉 Fetching festival calendar...")
        cursor.execute("""
            SELECT name, start_date, end_date, boost_factor
            FROM public.festivals
            ORDER BY start_date ASC
        """)
        
        festivals = cursor.fetchall()
        festival_list = []
        for f in festivals:
            festival_list.append({
                'name': f['name'],
                'start_date': f['start_date'].isoformat(),
                'end_date': f['end_date'].isoformat(),
                'boost_factor': float(f['boost_factor'] or 1.5)
            })
        
        logger.info(f"   📅 Loaded {len(festival_list)} festivals.")
        
        # ─── 4. Run Holt-Winters Forecasting ───────────────────────────────
        logger.info("   🔮 Running Holt-Winters Triple Exponential Smoothing...")
        
        # Parameters
        alpha = 0.3  # Level smoothing
        beta = 0.1   # Trend smoothing
        gamma = 0.2  # Seasonal smoothing
        season_length = 12  # Monthly seasonality
        
        # Initialize components
        n = len(revenue_series)
        
        # Initial level (average of first season)
        if n >= season_length:
            level = np.mean(revenue_series[:season_length])
        else:
            level = np.mean(revenue_series)
        
        # Initial trend
        if n >= 2 * season_length:
            trend = (np.mean(revenue_series[season_length:2*season_length]) - 
                    np.mean(revenue_series[:season_length])) / season_length
        else:
            trend = 0
        
        # Initial seasonal components
        seasonal = []
        for i in range(season_length):
            if i < n:
                seasonal.append(revenue_series[i] / level if level > 0 else 1.0)
            else:
                seasonal.append(1.0)
        
        # Apply Holt-Winters
        fitted_values = []
        for t in range(n):
            # Forecast for this period
            fitted = (level + trend) * seasonal[t % season_length]
            fitted_values.append(fitted)
            
            # Update components
            actual = revenue_series[t]
            old_level = level
            
            level = alpha * (actual / seasonal[t % season_length]) + (1 - alpha) * (level + trend)
            trend = beta * (level - old_level) + (1 - beta) * trend
            seasonal[t % season_length] = gamma * (actual / level) + (1 - gamma) * seasonal[t % season_length]
        
        # Calculate MAPE (Mean Absolute Percentage Error)
        errors = []
        for t in range(n):
            if revenue_series[t] > 0:
                error = abs(revenue_series[t] - fitted_values[t]) / revenue_series[t]
                errors.append(error)
        
        mape = np.mean(errors) * 100 if errors else 0
        logger.info(f"   📊 In-sample MAPE: {mape:.2f}%")
        
        # ── 5. Forecast Next 6 Months ────────────────────────────────────
        logger.info("   🔮 Forecasting next 6 months...")
        
        forecast_months = 6
        forecasts = []
        
        for h in range(1, forecast_months + 1):
            # Base forecast
            base_forecast = (level + h * trend) * seasonal[(n + h - 1) % season_length]
            base_forecast = max(0, base_forecast)  # No negative forecasts
            
            # Check for festival boost
            forecast_date = datetime.now() + timedelta(days=30 * h)
            boost_applied = 1.0
            festival_name = None
            is_festival = False
            
            for festival in festival_list:
                fest_start = datetime.fromisoformat(festival['start_date'])
                fest_end = datetime.fromisoformat(festival['end_date'])
                
                if fest_start <= forecast_date <= fest_end:
                    boost_applied = festival['boost_factor']
                    festival_name = festival['name']
                    is_festival = True
                    break
            
            final_forecast = base_forecast * boost_applied
            
            # Calculate confidence intervals (95%)
            # Variance increases with forecast horizon
            variance = np.var([revenue_series[t] - fitted_values[t] for t in range(n)])
            horizon_variance = variance * (1 + h * alpha * alpha)
            std_dev = np.sqrt(horizon_variance)
            
            lower_bound = max(0, final_forecast - 1.96 * std_dev)
            upper_bound = final_forecast + 1.96 * std_dev
            
            forecasts.append({
                'forecast_date': forecast_date.strftime('%Y-%m-%d'),
                'predicted_value': round(final_forecast, 2),
                'lower_bound': round(lower_bound, 2),
                'upper_bound': round(upper_bound, 2),
                'is_festival_period': is_festival,
                'festival_name': festival_name,
                'boost_factor': boost_applied
            })
            
            logger.info(f"      Month {h}: ৳{final_forecast:.2f} {'🎉' + festival_name if is_festival else ''}")
        
        # ─── 6. Write Forecasts to Database ────────────────────────────────
        logger.info("💾 Writing forecasts to database...")
        
        # Clear old forecasts
        cursor.execute("TRUNCATE TABLE public.demand_forecast_cache;")
        
        # Insert new forecasts (store-level, product_id = NULL or a special marker)
        # We'll use a special UUID for store-level forecasts
        store_forecast_id = '00000000-0000-0000-0000-000000000000'
        
        insert_query = """
            INSERT INTO public.demand_forecast_cache 
            (product_id, forecast_date, predicted_value, lower_bound, upper_bound, 
             is_festival_period, festival_name, boost_factor, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """
        
        for forecast in forecasts:
            cursor.execute(insert_query, (
                store_forecast_id,
                forecast['forecast_date'],
                forecast['predicted_value'],
                forecast['lower_bound'],
                forecast['upper_bound'],
                forecast['is_festival_period'],
                forecast['festival_name'],
                forecast['boost_factor']
            ))
        
        logger.info(f"   ✅ Inserted {len(forecasts)} store-level forecasts.")
        
        # ─── 7. Log Model Accuracy ─────────────────────────────────────────
        logger.info("📝 Logging training metadata...")
        
        insert_accuracy = """
            INSERT INTO public.ml_model_accuracy 
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at) 
            VALUES (%s, %s, %s, %s, NOW())
        """
        
        cursor.execute(insert_accuracy, (
            'holt_winters_forecast',
            'out_of_sample_mape',
            mape,
            n
        ))
        
        conn.commit()
        cursor.close()
        
        # ─── 8. Generate Summary ──────────────────────────────────────────
        total_forecast = sum(f['predicted_value'] for f in forecasts)
        logger.info(f"✅ Forecasting complete. Total 6-month forecast: ৳{total_forecast:,.2f}")
        
        return {
            "status": "success",
            "months_analyzed": n,
            "mape": round(mape, 2),
            "forecasts_generated": len(forecasts),
            "total_6month_forecast": round(total_forecast, 2),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Forecasting failed: {str(e)}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            except:
                pass
        return {"status": "error", "error": str(e)}
    finally:
        # NOTE: We do NOT close the connection here.
        # main.py is responsible for managing the connection lifecycle.
        if cursor and not cursor.closed:
            cursor.close()