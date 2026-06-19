# ml-service/tasks/forecasting.py
# ============================================================================
# DEMAND FORECASTING — HOLT-WINTERS TRIPLE EXPONENTIAL SMOOTHING
# ============================================================================
#
# WHAT THIS DOES:
#   Forecasts monthly revenue for the next 6 months using Holt-Winters
#   Triple Exponential Smoothing (additive trend + additive seasonality).
#   Applies Bangladesh-specific festival boost factors (Eid, Puja, etc.)
#   to the base forecast for festival-period months.
#
# OVERFITTING PROBLEM AND FIX:
#   The previous implementation calculated MAPE by comparing fitted values
#   to the SAME data the model was trained on (in-sample MAPE). This is
#   meaningless for detecting overfitting — a model that memorises training
#   data scores 0% in-sample MAPE but fails completely on new data.
#
#   Fix: walk-forward (out-of-sample) validation.
#     - Hold out the last `TEST_PERIODS` months from training.
#     - Train Holt-Winters on the remaining months.
#     - Forecast the held-out period.
#     - Compute MAPE on the actual vs predicted held-out values.
#     - Log this OUT-OF-SAMPLE MAPE to ml_model_accuracy.
#
#   This metric is what drift_detection.py monitors. If it starts rising
#   (model errors increasing), a drift alert is triggered.
#
#   Overfitting guard: if out-of-sample MAPE > 50%, fall back to an
#   8-period simple moving average for the actual forecast values.
#   This prevents the admin dashboard from showing garbage revenue
#   predictions when the model is miscalibrated.
#
# BUG FIXES (retained from previous version):
#   1. conn parameter passed from main.py (no internal get_db_connection).
#   2. Correct column names: demand_forecast_cache uses product_id,
#      forecast_date, predicted_value, lower_bound, upper_bound,
#      is_festival_period, festival_name, boost_factor.
#   3. ml_model_accuracy uses evaluated_at (not created_at).
#   4. Graceful skip when fewer than 3 months of history exist.
#   5. Does NOT close the connection (main.py handles lifecycle).
# ============================================================================
import logging
import numpy as np
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("bushal-ml.forecasting")

# ─── Configuration ────────────────────────────────────────────────────────────
# Number of periods held out for out-of-sample validation.
# We use 2 months: enough to measure recent accuracy without wasting too much
# training data on small datasets.
TEST_PERIODS = 2

# MAPE threshold above which we distrust the model and fall back to moving avg.
OVERFIT_MAPE_THRESHOLD = 50.0  # percent

# Holt-Winters smoothing parameters (manually tuned for monthly e-commerce data)
# alpha: level smoothing (0 = ignore new data, 1 = ignore history)
# beta:  trend smoothing (kept small — monthly e-commerce trends are slow)
# gamma: seasonal smoothing
HW_ALPHA = 0.3
HW_BETA  = 0.1
HW_GAMMA = 0.2
SEASON_LENGTH = 12  # Monthly seasonality

# ─── Helpers ─────────────────────────────────────────────────────────────────
def _holt_winters_fit(series: list[float], alpha: float, beta: float, gamma: float,
                      season_length: int) -> tuple[float, float, list[float], list[float]]:
    """
    Fit Holt-Winters Triple Exponential Smoothing (additive trend + additive seasonality).
    Returns:
    (level, trend, seasonal, fitted_values)
    We use the additive model because revenue is roughly additive — the
    seasonal swing (e.g., Eid spike) is a fixed absolute amount, not a
    percentage of the level. Multiplicative models would amplify noise when
    the level is low (e.g., first months of operation).
    """
    n = len(series)
    
    # Initial level: average of the first season (or all data if < 1 season)
    if n >= season_length:
        level = float(np.mean(series[:season_length]))
    else:
        level = float(np.mean(series))
        
    # Initial trend: average change per period over the first season
    if n >= 2 * season_length:
        trend = (np.mean(series[season_length:2 * season_length]) - 
                 np.mean(series[:season_length])) / season_length
    elif n >= 2:
        trend = (series[-1] - series[0]) / max(n - 1, 1)
    else:
        trend = 0.0
        
    # Initial seasonal components: deviation from level for each season position
    # Using additive: seasonal[i] = series[i] - level
    seasonal = []
    for i in range(season_length):
        if i < n:
            seasonal.append(series[i] - level)
        else:
            seasonal.append(0.0)
            
    # Apply the recurrence equations
    fitted_values = []
    for t in range(n):
        # One-step-ahead forecast
        fitted = level + trend + seasonal[t % season_length]
        fitted_values.append(max(0.0, fitted))  # Revenue cannot be negative
        
        # Update equations (additive form)
        actual = series[t]
        old_level = level
        
        # Level: weighted average of actual deseasonalised value and extrapolation
        level = alpha * (actual - seasonal[t % season_length]) + (1 - alpha) * (level + trend)
        
        # Trend: weighted average of observed trend and prior trend
        trend = beta * (level - old_level) + (1 - beta) * trend
        
        # Seasonal: weighted average of observed deviation and prior seasonal
        seasonal[t % season_length] = (
            gamma * (actual - level) + (1 - gamma) * seasonal[t % season_length]
        )
        
    return level, trend, seasonal, fitted_values

def _compute_mape(actuals: list[float], predictions: list[float]) -> float:
    """
    Compute Mean Absolute Percentage Error, ignoring zero-actual periods
    to avoid division by zero.
    """
    errors = []
    for a, p in zip(actuals, predictions):
        if abs(a) > 1e-6:  # Skip near-zero actuals
            errors.append(abs(a - p) / abs(a))
    if not errors:
        return 0.0
    return float(np.mean(errors)) * 100.0  # Return as percentage

def _moving_average_forecast(series: list[float], window: int = 8, 
                             horizon: int = 6) -> list[float]:
    """
    Simple moving average fallback for when Holt-Winters overfits or fails.
    Uses the last `window` periods to generate flat forecasts.
    """
    recent = series[-window:] if len(series) >= window else series
    avg = float(np.mean(recent)) if recent else 0.0
    return [max(0.0, avg)] * horizon

# ─── Main task function ───────────────────────────────────────────────────────
def run_demand_forecasting(conn):
    """
    Runs demand forecasting and writes results to demand_forecast_cache.
    Args:
        conn: psycopg2 connection object (passed from main.py)
    Returns:
        dict: Status and summary metrics
    """
    logger.info("📈 Starting Demand Forecasting (Holt-Winters with out-of-sample validation)...")
    cursor = None
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # ── 1. Fetch fulfilled order history ──────────────────────────────
        logger.info("   📥 Fetching fulfilled order history...")
        cursor.execute("""
            SELECT 
                o.id        AS order_id,
                o.user_id,
                o.total,
                o.created_at
            FROM public.orders o
            WHERE o.status = 'fulfilled'
            ORDER BY o.created_at ASC
        """)
        orders = cursor.fetchall()
        
        if not orders or len(orders) < 10:
            logger.warning(
                f"   ⏭️ Insufficient order data ({len(orders) if orders else 0} rows). "
                "Need at least 10 fulfilled orders."
            )
            return {
                "status": "skipped",
                "reason": "insufficient_data",
                "orders_found": len(orders) if orders else 0
            }
            
        logger.info(f"   📊 {len(orders)} fulfilled orders found.")
        
        # ── 2. Aggregate into monthly revenue time series ─────────────────
        monthly_revenue: dict[str, float] = {}
        for order in orders:
            month_key = order['created_at'].strftime('%Y-%m')
            monthly_revenue[month_key] = monthly_revenue.get(month_key, 0.0) + float(order['total'] or 0)
            
        sorted_months = sorted(monthly_revenue.keys())
        revenue_series = [monthly_revenue[m] for m in sorted_months]
        n = len(revenue_series)
        
        logger.info(f"   📅 {n} months of revenue history found.")
        
        if n < TEST_PERIODS + 3:
            logger.warning(f"   ⏭️ Need at least {TEST_PERIODS + 3} months. Found {n}. Skipping.")
            return {
                "status": "skipped",
                "reason": "insufficient_months",
                "months_found": n
            }
            
        # ── 3. Out-of-sample (walk-forward) validation ────────────────────
        # Split: train on all but last TEST_PERIODS months; test on those.
        # This is the ONLY meaningful way to measure Holt-Winters accuracy.
        # In-sample MAPE (fitting and evaluating on the same data) always
        # understates true error and cannot detect overfitting.
        train_series = revenue_series[:-TEST_PERIODS]
        test_actuals = revenue_series[-TEST_PERIODS:]
        
        logger.info(
            f"   🔬 Walk-forward validation: training on {len(train_series)} months, "
            f"testing on {len(test_actuals)} held-out months..."
        )
        
        # Try to fit Holt-Winters. If it fails (e.g., numerical instability),
        # we catch the exception and force a fallback to Moving Average.
        hw_failed = False
        try:
            level_v, trend_v, seasonal_v, _ = _holt_winters_fit(
                train_series, HW_ALPHA, HW_BETA, HW_GAMMA, SEASON_LENGTH
            )
            
            # Forecast TEST_PERIODS steps ahead using only training data
            test_predictions = []
            for h in range(1, TEST_PERIODS + 1):
                forecast = level_v + h * trend_v + seasonal_v[(len(train_series) + h - 1) % SEASON_LENGTH]
                test_predictions.append(max(0.0, forecast))
                
            out_of_sample_mape = _compute_mape(test_actuals, test_predictions)
        except Exception as e:
            logger.error(f"   ❌ Holt-Winters fitting failed: {e}. Forcing fallback to Moving Average.")
            hw_failed = True
            out_of_sample_mape = 100.0 # Force high error to trigger fallback logic
            
        logger.info(f"   📊 Out-of-sample MAPE: {out_of_sample_mape:.2f}%")
        
        # ── 4. Decide whether to use Holt-Winters or fall back ────────────
        # Fallback triggers if:
        # 1. MAPE exceeds threshold (overfitting/poor performance)
        # 2. HW fitting threw an exception (numerical instability)
        is_overfit = out_of_sample_mape > OVERFIT_MAPE_THRESHOLD or hw_failed
        
        if is_overfit:
            logger.warning(
                f"   ⚠️ MAPE {out_of_sample_mape:.1f}% exceeds overfitting threshold "
                f"({OVERFIT_MAPE_THRESHOLD}%) or HW failed. Falling back to 8-period moving average."
            )
        else:
            logger.info(
                f"   ✅ MAPE {out_of_sample_mape:.1f}% is within acceptable range. "
                "Using Holt-Winters for forecasts."
            )
            
        # ── 5. Fit on FULL series for the actual forward forecast ─────────
        # Note: we always fit on the full series for the production forecast,
        # regardless of the overfitting decision. The overfitting flag only
        # determines whether we trust those forecasts or use MA instead.
        
        # If HW failed earlier, we skip refitting and just use MA for everything
        if not hw_failed:
            try:
                level_f, trend_f, seasonal_f, _ = _holt_winters_fit(
                    revenue_series, HW_ALPHA, HW_BETA, HW_GAMMA, SEASON_LENGTH
                )
                
                # Residuals for confidence interval estimation
                _, _, _, fitted_full = _holt_winters_fit(
                    revenue_series, HW_ALPHA, HW_BETA, HW_GAMMA, SEASON_LENGTH
                )
                residuals = [revenue_series[t] - fitted_full[t] for t in range(n)]
                residual_variance = float(np.var(residuals)) if residuals else 0.0
            except Exception as e:
                logger.error(f"   ❌ Full-series Holt-Winters fit failed: {e}. Forcing MA fallback.")
                hw_failed = True
                residual_variance = 0.0
        else:
            residual_variance = 0.0
            
        # ── 6. Fetch festival calendar ────────────────────────────────────
        cursor.execute("""
            SELECT name, start_date, end_date, boost_factor
            FROM public.festivals
            ORDER BY start_date ASC
        """)
        festival_rows = cursor.fetchall()
        festivals = [
            {
                'name': f['name'],
                'start': f['start_date'],
                'end': f['end_date'],
                'boost': float(f['boost_factor'] or 1.5),
            }
            for f in festival_rows
        ]
        logger.info(f"   🎉 {len(festivals)} festivals loaded.")
        
        # ── 7. Generate 6-month forward forecasts ─────────────────────────
        logger.info("   🔮 Generating 6-month forward forecasts...")
        
        # Fallback series (if overfit or HW failed)
        ma_forecasts = _moving_average_forecast(revenue_series, window=8, horizon=6)
        
        forecasts = []
        for h in range(1, 7):
            # 1. Base Forecast (No Festival Boost Yet)
            if not hw_failed:
                hw_base = level_f + h * trend_f + seasonal_f[(n + h - 1) % SEASON_LENGTH]
                hw_base = max(0.0, hw_base)
            else:
                hw_base = 0.0 # Unused if hw_failed is True
            
            # Choose between HW and MA based on overfitting/check failure
            base_value = ma_forecasts[h - 1] if is_overfit else hw_base
            
            # 2. Calculate Confidence Intervals on the BASE value
            # FIX: Use simplified robust approximation for variance growth:
            # σ²_h = σ²_ε × (1 + h × α²)
            # This avoids unstable trend terms (β) which are hard to estimate 
            # reliably with small Bangladeshi market datasets.
            if not hw_failed:
                horizon_variance = residual_variance * (1 + h * HW_ALPHA * HW_ALPHA)
                margin_of_error = 1.96 * np.sqrt(horizon_variance)
            else:
                # Wide CI for MA fallback since we don't have residuals
                margin_of_error = base_value * 0.2 # 20% arbitrary margin
                
            lower_bound = max(0.0, base_value - margin_of_error)
            upper_bound = base_value + margin_of_error
            
            # 3. Apply Festival Boost to the Point Forecast ONLY
            # We apply the boost AFTER calculating the CI so the interval 
            # reflects the uncertainty of the base forecast, not the inflated value.
            forecast_date = datetime.now() + timedelta(days=30 * h)
            boost = 1.0
            festival_name = None
            is_festival = False
            
            for fest in festivals:
                if fest['start'] <= forecast_date.date() <= fest['end']:
                    boost = fest['boost']
                    festival_name = fest['name']
                    is_festival = True
                    break
                    
            final_value = base_value * boost
            
            forecasts.append({
                'forecast_date': forecast_date.strftime('%Y-%m-%d'),
                'predicted_value': round(final_value, 2),
                'lower_bound': round(lower_bound, 2),
                'upper_bound': round(upper_bound, 2),
                'is_festival_period': is_festival,
                'festival_name': festival_name,
                'boost_factor': boost,
            })
            
            flag = f"🎉 {festival_name}" if is_festival else ""
            logger.info(f"      Month +{h}: ৳{final_value:,.0f}  [{lower_bound:,.0f}–{upper_bound:,.0f}] {flag}")
            
        # ── 8. Write forecasts to demand_forecast_cache ───────────────────
        logger.info("   💾 Writing forecasts to demand_forecast_cache...")
        
        # Store-level forecast uses a sentinel product_id of all zeros
        store_sentinel_id = '00000000-0000-0000-0000-000000000000'
        
        # Clear previous store-level forecasts only
        cursor.execute(
            "DELETE FROM public.demand_forecast_cache WHERE product_id = %s",
            (store_sentinel_id,)
        )
        
        insert_sql = """
            INSERT INTO public.demand_forecast_cache
            (product_id, forecast_date, predicted_value, lower_bound, upper_bound,
             is_festival_period, festival_name, boost_factor, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """
        for fc in forecasts:
            cursor.execute(insert_sql, (
                store_sentinel_id,
                fc['forecast_date'],
                fc['predicted_value'],
                fc['lower_bound'],
                fc['upper_bound'],
                fc['is_festival_period'],
                fc['festival_name'],
                fc['boost_factor'],
            ))
            
        logger.info(f"   ✅ {len(forecasts)} forecast rows written.")
        
        # ── 9. Log model accuracy to ml_model_accuracy ────────────────────
        logger.info("   📝 Logging out-of-sample MAPE to ml_model_accuracy...")
        cursor.execute("""
            INSERT INTO public.ml_model_accuracy
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (
            'holt_winters_forecast',
            'out_of_sample_mape',
            out_of_sample_mape,
            n,   # months of training data
        ))
        
        # Also log whether we used the fallback, as a separate boolean metric
        cursor.execute("""
            INSERT INTO public.ml_model_accuracy
            (model_name, metric_name, metric_value, records_evaluated, evaluated_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (
            'holt_winters_forecast',
            'used_fallback_ma',
            1.0 if is_overfit else 0.0,
            n,
        ))
        
        conn.commit()
        
        total_forecast = sum(fc['predicted_value'] for fc in forecasts)
        logger.info(f"✅ Forecasting complete. 6-month total: ৳{total_forecast:,.0f}")
        
        return {
            "status": "success",
            "months_analyzed": n,
            "out_of_sample_mape": round(out_of_sample_mape, 2),
            "used_fallback_ma": is_overfit,
            "forecasts_generated": len(forecasts),
            "total_6month_forecast": round(total_forecast, 2),
            "timestamp": datetime.now().isoformat(),
        }
        
    except Exception as exc:
        logger.error(f"❌ Forecasting failed: {exc}", exc_info=True)
        try:
            conn.rollback()
        except Exception:
            pass
        return {"status": "error", "error": str(exc)}
    finally:
        # main.py owns the connection lifecycle — do NOT close conn here.
        if cursor and not cursor.closed:
            cursor.close()