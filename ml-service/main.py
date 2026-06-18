# ============================================================================
# FILE ADDRESS: ml-service/main.py
# ============================================================================
# EXPLANATION:
# This is the main entry point for the Bushal ML Microservice. It defines the
# FastAPI application, the master pipeline orchestrator endpoint, and the 
# database connection helper.
#
# BUG FIXES APPLIED:
# 1. All task functions now receive the database connection (conn) as an argument.
# 2. Connection is created ONCE per pipeline run and shared across tasks to 
#    reduce overhead and prevent connection pool exhaustion.
# 3. Each task is wrapped in try/except so one failure doesn't stop the others.
# 4. Connection is properly closed in a finally block to prevent leaks.
# ============================================================================

# 1. Initialize OpenTelemetry FIRST (before any other imports)
from otel import init_otel
init_otel()

# 2. Import FastAPIInstrumentor to automatically trace HTTP endpoints
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

import os
import logging
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv

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

# ─── Health Check Endpoint ───────────────────────────────────────────────────
@app.get("/")
def read_root():
    """
    Simple health check to verify the service is running.
    Used by Railway/Render to confirm deployment success.
    """
    return {
        "status": "healthy", 
        "service": "Bushal ML Microservice",
        "docs": "/docs"
    }

# ─── Main Pipeline Orchestrator ──────────────────────────────────────────────
@app.post("/run-pipeline")
def run_pipeline(x_pipeline_secret: str = Header(None)):
    """
    The master endpoint triggered by the Next.js Cron Job.
    It sequentially runs all ML tasks and writes results back to Supabase.
    """
    # 1. Security Check
    if not PIPELINE_SECRET or x_pipeline_secret != PIPELINE_SECRET:
        logger.error("🚫 Unauthorized pipeline trigger attempt.")
        raise HTTPException(status_code=401, detail="Invalid pipeline secret")
    
    logger.info("🚀 ==========================================")
    logger.info("🚀 Starting Bushal ML Pipeline (5 Tasks)...")
    logger.info("🚀 ==========================================")
    
    results = {}
    conn = None
    
    try:
        # Create a single database connection for all tasks
        conn = get_db_connection()
        logger.info("✅ Database connection established.")
        
        # 2. Run Customer Segmentation (K-Means)
        try:
            logger.info("📊 [1/5] Running Customer Segmentation...")
            from tasks.segmentation import run_customer_segmentation
            results['segmentation'] = run_customer_segmentation(conn)
        except Exception as e:
            logger.error(f"❌ Segmentation failed: {e}", exc_info=True)
            results['segmentation'] = {"status": "error", "error": str(e)}
            
        # 3. Run Demand Forecasting (Holt-Winters)
        try:
            logger.info("📈 [2/5] Running Demand Forecasting...")
            from tasks.forecasting import run_demand_forecasting
            results['forecasting'] = run_demand_forecasting(conn)
        except Exception as e:
            logger.error(f"❌ Forecasting failed: {e}", exc_info=True)
            results['forecasting'] = {"status": "error", "error": str(e)}
            
        # 4. Run Product Recommendations (FP-Growth & Graph)
        try:
            logger.info("🛒 [3/5] Running Product Recommendations...")
            from tasks.recommendations import run_product_recommendations
            results['recommendations'] = run_product_recommendations(conn)
        except Exception as e:
            logger.error(f"❌ Recommendations failed: {e}", exc_info=True)
            results['recommendations'] = {"status": "error", "error": str(e)}

        # 5. Run Model Drift Detection
        try:
            logger.info("📉 [4/5] Running Model Drift Detection...")
            from tasks.drift_detection import run_drift_detection
            results['drift_detection'] = run_drift_detection(conn)
        except Exception as e:
            logger.error(f"❌ Drift Detection failed: {e}", exc_info=True)
            results['drift_detection'] = {"status": "error", "error": str(e)}
            
        # 6. Run Business Automation (Fraud detection, Auto-POs, Retention)
        try:
            logger.info("🤖 [5/5] Running Business Automation...")
            from tasks.automation import run_business_automation
            results['automation'] = run_business_automation(conn)
        except Exception as e:
            logger.error(f"❌ Automation failed: {e}", exc_info=True)
            results['automation'] = {"status": "error", "error": str(e)}
            
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
                logger.error(f"Error closing connection: {e}")
    
    return {
        "status": "success", 
        "message": "Pipeline executed. Check logs for details.",
        "results": results
    }

# ─── Database Connection Helper (Used by tasks) ──────────────────────────────
def get_db_connection():
    """
    Returns a psycopg2 connection to the Supabase Postgres database.
    Requires DATABASE_URL in environment variables.
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL is not set in environment variables.")
    
    # Handle pooler URLs that might have query parameters
    # psycopg2 can handle them, but we need to ensure SSL is enabled
    conn = psycopg2.connect(
        database_url, 
        cursor_factory=RealDictCursor,
        sslmode='require'  # Force SSL for Supabase
    )
    return conn

# ─── Railway / Production Server Startup ─────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    
    logger.info(f"🚀 Starting Uvicorn server on port {port}...")
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)