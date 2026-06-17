# ml-service/tasks/forecasting.py

#Instead of a naive moving average, we are using the industry-standard statsmodels library for Triple Exponential Smoothing. We also calculate the MAPE (Mean Absolute Percentage Error) for every product so the admin dashboard can display exactly how "trustworthy" the AI's predictions are. Finally, we apply the Bangladesh festival multipliers (Eid, Pohela Boishakh) to the forecasted values.
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from psycopg2.extras import execute_batch

logger = logging.getLogger("bushal-ml.forecasting")

# ─── Bangladesh Festival Calendar ────────────────────────────────────────────
def get_bd_festivals(year: int):
    """
    Returns major Bangladeshi shopping festivals and their sales boost multipliers.
    In a production system, this would be fetched from a database or calendar API.
    """
    return [
        {"name": "Eid-ul-Fitr", "start": f"{year}-03-20", "end": f"{year}-03-22", "boost": 2.5},
        {"name": "Pohela Boishakh", "start": f"{year}-04-14", "end": f"{year}-04-16", "boost": 1.8},
        {"name": "Eid-ul-Adha", "start": f"{year}-05-27", "end": f"{year}-05-29", "boost": 2.2},
        {"name": "Valentine's Day", "start": f"{year}-02-14", "end": f"{year}-02-14", "boost": 1.6},
        {"name": "Durga Puja", "start": f"{year}-10-17", "end": f"{year}-10-21", "boost": 1.7},
        {"name": "Winter Sale", "start": f"{year}-12-15", "end": f"{year}-12-31", "boost": 2.0},
    ]

def run_demand_forecasting():
    """
    Executes the Holt-Winters demand forecasting pipeline.
    Calculates MAPE for model evaluation and applies festival multipliers.
    """
    logger.info("📈 Starting Demand Forecasting Pipeline...")
    conn = None
    try:
        from main import get_db_connection
        conn = get_db_connection()

        # 1. Fetch historical monthly sales data (last 24 months)
        query = """
        SELECT 
            oi.product_id,
            DATE_TRUNC('month', o.created_at) as month_start,
            SUM(oi.quantity) as total_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'fulfilled'
          AND o.created_at >= NOW() - INTERVAL '24 months'
        GROUP BY oi.product_id, DATE_TRUNC('month', o.created_at)
        ORDER BY oi.product_id, month_start;
        """
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            logger.warning("⚠️ No historical sales data found for forecasting.")
            return {"status": "skipped", "reason": "No sales data"}

        # Filter to top 500 products by sales volume to prevent serverless timeout
        product_volumes = df.groupby('product_id')['total_sold'].sum().sort_values(ascending=False)
        top_products = product_volumes.head(500).index.tolist()
        logger.info(f"📊 Processing top {len(top_products)} products by sales volume...")
        
        forecast_records = []
        accuracy_records = []
        valid_products = []
        
        current_year = datetime.now().year
        # Get festivals for this year and next year to cover the forecast horizon
        festivals = get_bd_festivals(current_year) + get_bd_festivals(current_year + 1)
        forecast_months = 6 # Predict 6 months into the future
        
        for pid in top_products:
            prod_df = df[df['product_id'] == pid].copy()
            if len(prod_df) < 6: # Need at least 6 months of data for seasonality
                continue
                
            # Create a continuous monthly date range
            prod_df['month_start'] = pd.to_datetime(prod_df['month_start'])
            prod_df.set_index('month_start', inplace=True)
            
            # Resample to ensure monthly frequency (fill missing months with 0)
            ts = prod_df['total_sold'].resample('MS').sum().fillna(0)
            
            if len(ts) < 6:
                continue
                
            valid_products.append(pid)
            
            try:
                # Fit Holt-Winters model (Additive trend and seasonality)
                # Seasonal period = 12 (monthly data with yearly seasonality)
                model = ExponentialSmoothing(
                    ts, 
                    trend='add', 
                    seasonal='add', 
                    seasonal_periods=12,
                    initialization_method="estimated"
                ).fit(optimized=True)
                
                # Forecast next N months
                forecast = model.forecast(forecast_months)
                
                # Calculate in-sample MAPE (Mean Absolute Percentage Error)
                fitted_values = model.fittedvalues
                mask = ts != 0 # Avoid division by zero
                if mask.sum() > 0:
                    mape = np.mean(np.abs((ts[mask] - fitted_values[mask]) / ts[mask])) * 100
                else:
                    mape = 0.0
                    
                # Apply Festival Multipliers & Generate Records
                for date, value in forecast.items():
                    is_festival = False
                    festival_name = None
                    boost_factor = 1.0
                    
                    for fest in festivals:
                        start_date = pd.to_datetime(fest['start'])
                        end_date = pd.to_datetime(fest['end'])
                        if start_date <= date <= end_date:
                            is_festival = True
                            festival_name = fest['name']
                            boost_factor = fest['boost']
                            break
                            
                    final_value = max(0, value * boost_factor)
                    
                    # Calculate 95% Confidence Intervals
                    residuals = model.resid
                    std_err = np.std(residuals)
                    lower_bound = max(0, final_value - 1.96 * std_err)
                    upper_bound = final_value + 1.96 * std_err
                    
                    forecast_records.append((
                        pid,
                        date.date(),
                        round(final_value, 2),
                        round(lower_bound, 2),
                        round(upper_bound, 2),
                        is_festival,
                        festival_name,
                        boost_factor
                    ))
                    
                    # Log accuracy metrics (Actual value is NULL for future dates)
                    accuracy_records.append((
                        pid,
                        date.date(),
                        round(final_value, 2),
                        None, 
                        f'holt_winters_v1_mape_{mape:.2f}',
                        is_festival
                    ))
                    
            except Exception as e:
                logger.error(f"❌ Forecasting failed for product {pid}: {e}")
                continue

        logger.info(f"✅ Generated forecasts for {len(valid_products)} products.")
        
        # 2. Write to database
        cursor = conn.cursor()
        
        if valid_products:
            # Clear old future forecasts for these products to avoid duplicates
            cursor.execute("""
                DELETE FROM demand_forecast_cache 
                WHERE product_id = ANY(%s) 
                AND forecast_date >= CURRENT_DATE
            """, (valid_products,))
            
            # Insert new forecasts
            insert_forecast = """
                INSERT INTO demand_forecast_cache (
                    product_id, forecast_date, predicted_value, lower_bound, upper_bound, 
                    is_festival_period, festival_name, boost_factor, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """
            execute_batch(cursor, insert_forecast, forecast_records, page_size=1000)
            
            # Insert accuracy logs
            insert_accuracy = """
                INSERT INTO forecast_accuracy_logs (
                    product_id, forecast_date, predicted_value, actual_value, 
                    algorithm_version, festival_boost_applied, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (product_id, forecast_date) DO NOTHING
            """
            execute_batch(cursor, insert_accuracy, accuracy_records, page_size=1000)
            
            conn.commit()
            cursor.close()
            
        # Calculate average MAPE across all forecasted products
        avg_mape = 0.0
        if accuracy_records:
            mapes = [float(v[4].split('_')[-1]) for v in accuracy_records if 'mape_' in v[4]]
            if mapes:
                avg_mape = sum(mapes) / len(mapes)

        logger.info(f"✅ Demand forecasting completed. Avg MAPE: {avg_mape:.2f}%")
        
        return {
            "status": "success",
            "products_forecasted": len(valid_products),
            "total_forecast_records": len(forecast_records),
            "average_mape": round(avg_mape, 2),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Forecasting pipeline failed: {e}", exc_info=True)
        if conn:
            conn.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            conn.close()