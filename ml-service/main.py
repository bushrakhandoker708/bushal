# ml-service/main.py
# ============================================================================
# FILE ADDRESS: ml-service/main.py
# ============================================================================
# EXPLANATION:
# Main entry point for the Bushal ML Microservice. Defines the FastAPI app,
# the master pipeline orchestrator endpoint, and the database connection
# helper.
#
# BUG FIX (this version) — ml_job_metrics was never written:
#   The orchestrator ran all six tasks, logged to stdout, and discarded the
#   timing/status data. The admin ML Health Dashboard reads ml_job_metrics
#   to render "Pipeline Job History" — with nothing writing to it, that
#   panel was permanently empty regardless of whether the pipeline actually
#   ran. Fix: every task is now wrapped in a timer, and a row is written to
#   ml_job_metrics after each task completes — whether it succeeded, failed,
#   or returned a "skipped" status (logged as 'partial').
#
#   The job_name values used below ('kmeans_segmentation',
#   'holt_winters_forecast', 'fpgrowth_recommendations', 'drift_detection',
#   'business_automation', 'search_cache_warmer') match the CHECK constraint
#   added in migration 039_fix_ml_job_metrics_job_names.sql. If you rename a
#   task here, update that migration's constraint too, or every insert for
#   the renamed task will fail with a constraint violation.
#
# RETAINED BUG FIXES FROM PREVIOUS VERSION:
#   1. All task functions receive the database connection (conn) as an argument.
#   2. Connection is created ONCE per pipeline run and shared across tasks.
#   3. Each task is wrapped in try/except so one failure doesn't stop the others.
#   4. Connection is properly closed in a finally block to prevent leaks.
#   5. search_warmer task pre-computes autocomplete prefixes into Redis.
# ============================================================================
# 1. Initialize OpenTelemetry FIRST (before any other imports)
from otel import init_otel
init_otel()

# 2. Import FastAPIInstrumentor to automatically trace HTTP endpoints
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

import os
import time
import logging
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("bushal-ml")

# Initialize FastAPI app
app = FastAPI(
    title="Bushal ML Microservice",
    description="Heavy machine learning pipelines for Bushal e-commerce",
    version="1.0.0"
)

# 3. Instrument the app immediately after creation
FastAPIInstrumentor.instrument_app(app)

# ─── Security Configuration ──────────────────────────────────────────────────
PIPELINE_SECRET = os.getenv("PIPELINE_SECRET")
if not PIPELINE_SECRET:
    logger.warning("⚠️ PIPELINE_SECRET is not set in environment variables!")

# ─── ml_job_metrics logging helper ────────────────────────────────────────────
# BUG FIX: this is the function that was missing entirely. It converts a
# task's return dict (status, records processed, optional error) plus a
# measured duration into a row in ml_job_metrics. Called once per task,
# right after that task's try/except block, so a failure inside the task
# still gets logged (it just records status='failed' instead of 'success').
def _log_job_metric(
    conn,
    job_name: str,
    started_at: float,
    result: dict,
) -> None:
    """
    Writes one row to public.ml_job_metrics summarizing a single task run.
    
    Args:
        conn: shared psycopg2 connection for this pipeline run
        job_name: one of the six canonical names allowed by the
                  ml_job_metrics_job_name_check constraint (see migration 039)
        started_at: time.monotonic() value captured before the task ran
        result: the dict returned by the task function. Expected shape varies
                slightly per task but commonly includes a "status" key
                ('success' | 'error' | 'skipped') and may include record
                counts under task-specific keys.
    """
    execution_time_ms = int((time.monotonic() - started_at) * 1000)
    
    task_status = result.get("status", "unknown") if isinstance(result, dict) else "unknown"
    
    # Map task-level statuses onto the three values ml_job_metrics allows.
    # "skipped" (e.g. insufficient data) is not a failure — it's expected
    # behavior on a fresh store with little history — so it's logged as
    # 'partial' rather than 'failed', keeping the dashboard from crying wolf.
    if task_status == "success":
        db_status = "success"
    elif task_status == "skipped":
        db_status = "partial"
    else:
        db_status = "failed"

    # Best-effort extraction of a "records processed" figure. Different
    # tasks name this differently in their return dict; check the common
    # keys in priority order and fall back to 0 rather than raising.
    records_processed = 0
    for key in (
        "records_evaluated", "months_analyzed", "fbt_rules_generated",
        "orders_found", "products_processed", "alerts_generated",
        "prefixes_warmed",
    ):
        if isinstance(result, dict) and isinstance(result.get(key), (int, float)):
            records_processed = int(result[key])
            break

    error_message = None
    if isinstance(result, dict) and db_status == "failed":
        error_message = str(result.get("error") or result.get("reason") or "Unknown error")[:500]

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            INSERT INTO public.ml_job_metrics
            (job_name, execution_time_ms, records_processed, status, error_message, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (job_name, execution_time_ms, records_processed, db_status, error_message),
        )
        conn.commit()
        cursor.close()
        
        logger.info(
            f"   📝 Logged job metric: {job_name} · {db_status} · "
            f"{execution_time_ms}ms · {records_processed} records"
        )
    except Exception as log_err:
        # Logging the metric must never take down the pipeline. If this
        # fails (e.g. transient connection issue), log a warning and move on
        # — the task's actual result was already captured in `results` above.
        logger.warning(f"   ⚠️ Failed to log job metric for {job_name}: {log_err}")
        try:
            conn.rollback()
        except Exception:
            pass

# ─── Main Pipeline Orchestrator ──────────────────────────────────────────────
@app.post("/run-pipeline")
def run_pipeline(x_pipeline_secret: str = Header(None)):
    """
    The master endpoint triggered by the Next.js Cron Job.
    It sequentially runs all ML tasks and writes results back to Supabase.
    
    Pipeline Tasks:
    1. Customer Segmentation (K-Means clustering)
    2. Demand Forecasting (Holt-Winters exponential smoothing)
    3. Product Recommendations (FP-Growth + TF-IDF graph)
    4. Model Drift Detection (performance degradation alerts)
    5. Business Automation (fraud queue, PDF POs, retention emails)
    6. Search Cache Warmer (pre-computes autocomplete prefixes in Redis)
    
    BUG FIX: every task below now records its execution time and outcome
    to ml_job_metrics via _log_job_metric(), so the admin ML Health
    Dashboard's "Pipeline Job History" panel reflects what actually ran.
    """
    # 1. Security Check
    if not PIPELINE_SECRET or x_pipeline_secret != PIPELINE_SECRET:
        logger.error("🚫 Unauthorized pipeline trigger attempt.")
        raise HTTPException(status_code=401, detail="Invalid pipeline secret")

    logger.info("🚀 ==========================================")
    logger.info("🚀 Starting Bushal ML Pipeline (6 Tasks)...")
    logger.info("🚀 ==========================================")

    results = {}
    conn = None
    
    try:
        # Create a single database connection for all tasks
        conn = get_db_connection()
        logger.info("✅ Database connection established.")

        # 2. Run Customer Segmentation (K-Means)
        task_start = time.monotonic()
        try:
            logger.info("📊 [1/6] Running Customer Segmentation...")
            from tasks.segmentation import run_customer_segmentation
            results['segmentation'] = run_customer_segmentation(conn)
        except Exception as e:
            logger.error(f"❌ Segmentation failed: {e}", exc_info=True)
            results['segmentation'] = {"status": "error", "error": str(e)}
        _log_job_metric(conn, "kmeans_segmentation", task_start, results['segmentation'])

        # 3. Run Demand Forecasting (Holt-Winters)
        task_start = time.monotonic()
        try:
            logger.info("📈 [2/6] Running Demand Forecasting...")
            from tasks.forecasting import run_demand_forecasting
            results['forecasting'] = run_demand_forecasting(conn)
        except Exception as e:
            logger.error(f"❌ Forecasting failed: {e}", exc_info=True)
            results['forecasting'] = {"status": "error", "error": str(e)}
        _log_job_metric(conn, "holt_winters_forecast", task_start, results['forecasting'])

        # 4. Run Product Recommendations (FP-Growth & Graph)
        task_start = time.monotonic()
        try:
            logger.info("🛒 [3/6] Running Product Recommendations...")
            from tasks.recommendations import run_product_recommendations
            results['recommendations'] = run_product_recommendations(conn)
        except Exception as e:
            logger.error(f"❌ Recommendations failed: {e}", exc_info=True)
            results['recommendations'] = {"status": "error", "error": str(e)}
        _log_job_metric(conn, "fpgrowth_recommendations", task_start, results['recommendations'])

        # 5. Run Model Drift Detection
        task_start = time.monotonic()
        try:
            logger.info("📉 [4/6] Running Model Drift Detection...")
            from tasks.drift_detection import run_drift_detection
            results['drift_detection'] = run_drift_detection(conn)
        except Exception as e:
            logger.error(f"❌ Drift Detection failed: {e}", exc_info=True)
            results['drift_detection'] = {"status": "error", "error": str(e)}
        _log_job_metric(conn, "drift_detection", task_start, results['drift_detection'])

        # 6. Run Business Automation (Fraud detection, Auto-POs, Retention)
        task_start = time.monotonic()
        try:
            logger.info("🤖 [5/6] Running Business Automation...")
            from tasks.automation import run_business_automation
            results['automation'] = run_business_automation(conn)
        except Exception as e:
            logger.error(f"❌ Automation failed: {e}", exc_info=True)
            results['automation'] = {"status": "error", "error": str(e)}
        _log_job_metric(conn, "business_automation", task_start, results['automation'])

        # 7. Run Search Cache Warmer (Pre-compute autocomplete prefixes)
        task_start = time.monotonic()
        try:
            logger.info("🔍 [6/6] Warming Search Autocomplete Cache...")
            from tasks.search_warmer import warm_search_cache
            results['search_warmer'] = warm_search_cache(conn)
        except Exception as e:
            logger.error(f"❌ Search Warmer failed: {e}", exc_info=True)
            results['search_warmer'] = {"status": "error", "error": str(e)}
        _log_job_metric(conn, "search_cache_warmer", task_start, results['search_warmer'])

        logger.info("✅ ==========================================")
        logger.info("✅ ML Pipeline Completed Successfully.")
        logger.info("✅ ==========================================")

    except Exception as e:
        logger.error(f"❌ Pipeline-level error: {e}", exc_info=True)
        results['pipeline_error'] = str(e)
        
    finally:
        # Always close the connection
        if conn:
            try:
                conn.close()
                logger.info("🔒 Database connection closed.")
            except Exception as e:
                logger.warning(f"⚠️ Error closing connection: {e}")

    return results

# ─── Database Connection Helper (Used by tasks) ──────────────────────────────
def get_db_connection():
    """
    Creates and returns a new psycopg2 connection using DATABASE_URL.
    Called once per pipeline run; the connection is shared across all
    six tasks and closed in the run_pipeline() finally block.
    """
    import psycopg2
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(database_url)

# ─── Railway / Production Server Startup ─────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, workers=2)