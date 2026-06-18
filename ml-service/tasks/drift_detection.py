# ============================================================================
# FILE ADDRESS: ml-service/tasks/drift_detection.py
# ============================================================================
# EXPLANATION:
# This script implements automated Model Drift Detection. It compares the 
# latest performance metric (e.g., Silhouette Score, MAPE) against a 4-week 
# rolling average. If the deviation exceeds a defined threshold, it triggers 
# an alert in the `model_drift_alerts` table.
#
# BUG FIXES APPLIED:
# 1. Fixed "column created_at does not exist" error by using `evaluated_at` 
#    when querying the `ml_model_accuracy` table.
# 2. Implemented explicit daily deduplication in Python. The database unique 
#    index is on the exact timestamp, so we must check if an alert for today 
#    already exists before inserting to prevent duplicate alerts.
# 3. Function signature now accepts `conn` parameter from main.py.
# 4. Does NOT close the connection (main.py handles that).
# ============================================================================

import logging
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("bushal-ml.drift")

def run_drift_detection(conn):
    """
    Analyzes recent model performance metrics to detect data drift or degradation.
    """
    logger.info("📉 Starting Model Drift Detection...")
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    alerts_generated = 0

    try:
        # ─── 1. Define Models and Thresholds ────────────────────────────────
        # Format: (model_name, metric_name, is_lower_better, warning_threshold, critical_threshold)
        # - is_lower_better: True for MAPE (lower error is better), False for Silhouette (higher score is better)
        models_to_check = [
            ('kmeans_segmentation', 'silhouette_score', False, 0.10, 0.20), # 10% drop = warning, 20% drop = critical
            ('holt_winters_forecast', 'out_of_sample_mape', True, 0.15, 0.30), # 15% increase = warning, 30% increase = critical
        ]

        four_weeks_ago = datetime.now() - timedelta(weeks=4)

        for model_name, metric_name, is_lower_better, warn_thresh, crit_thresh in models_to_check:
            # ─── 2. Fetch Historical Data (Last 4 Weeks) ────────────────────
            # FIX: Changed `created_at` to `evaluated_at` to match the actual DB schema
            cursor.execute("""
                SELECT metric_value, evaluated_at
                FROM public.ml_model_accuracy
                WHERE model_name = %s AND metric_name = %s AND evaluated_at >= %s
                ORDER BY evaluated_at DESC
            """, (model_name, metric_name, four_weeks_ago))
            
            history = cursor.fetchall()

            if len(history) < 2:
                logger.info(f"   ⏭️ Skipping {model_name}: Insufficient history ({len(history)} runs).")
                continue

            # The first row is the latest run
            latest_run = history[0]
            latest_value = float(latest_run['metric_value'])
            
            # Calculate average of the *previous* runs (excluding the latest one to avoid self-comparison)
            previous_runs = history[1:]
            if not previous_runs:
                continue
                
            rolling_avg = sum(float(r['metric_value']) for r in previous_runs) / len(previous_runs)

            if rolling_avg == 0:
                continue

            # ─── 3. Calculate Deviation ─────────────────────────────────────
            # Percent change: (Latest - Average) / Average
            percent_change = (latest_value - rolling_avg) / rolling_avg

            # Determine if this is a degradation
            is_degraded = False
            if is_lower_better:
                # For MAPE, an increase in value is bad (positive percent_change is bad)
                is_degraded = percent_change > 0
                severity_val = percent_change
            else:
                # For Silhouette, a decrease in value is bad (negative percent_change is bad)
                is_degraded = percent_change < 0
                severity_val = abs(percent_change)

            if not is_degraded:
                logger.info(f"   ✅ {model_name} is stable. Change: {percent_change:.2%}")
                continue

            # ─── 4. Determine Severity ─────────────────────────────────────
            severity = None
            if severity_val >= crit_thresh:
                severity = 'critical'
            elif severity_val >= warn_thresh:
                severity = 'warning'
            
            if severity:
                logger.warning(f"   🚨 DRIFT DETECTED: {model_name} ({severity}) | Current: {latest_value:.4f} | Avg: {rolling_avg:.4f} | Change: {percent_change:.2%}")
                
                # ── 5. Check for Daily Deduplication ──────────────────────
                # Since the DB unique index is on the exact timestamp, we must 
                # manually check if we already logged an alert for this model/metric today.
                cursor.execute("""
                    SELECT id FROM public.model_drift_alerts 
                    WHERE model_name = %s AND metric_name = %s AND DATE(created_at) = CURRENT_DATE
                """, (model_name, metric_name))
                
                existing_alert = cursor.fetchone()
                
                if existing_alert:
                    logger.info(f"   ⏭️ Alert for {model_name} already exists today. Skipping insert.")
                else:
                    # ─── 6. Insert Alert ────────────────────────────────────
                    cursor.execute("""
                        INSERT INTO public.model_drift_alerts 
                        (model_name, metric_name, current_value, rolling_avg_value, percent_change, severity, status)
                        VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    """, (
                        model_name,
                        metric_name,
                        latest_value,
                        rolling_avg,
                        percent_change,
                        severity
                    ))
                    
                    alerts_generated += 1
                    logger.info(f"   📝 Alert logged for {model_name}.")
            else:
                logger.info(f"   ️ {model_name} has minor deviation ({percent_change:.2%}), below threshold.")

        conn.commit()
        logger.info(f"✅ Drift Detection Complete. Generated {alerts_generated} alerts.")
        return {"status": "success", "alerts_generated": alerts_generated}

    except Exception as e:
        logger.error(f"❌ Drift Detection failed: {e}", exc_info=True)
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