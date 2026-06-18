# ============================================================================
# FILE ADDRESS: ml-service/main.py
# ============================================================================
# EXPLANATION:
# This is the main entry point for the Bushal ML Microservice. It defines the
# FastAPI application, the master pipeline orchestrator endpoint, and the 
# database connection helper.
#
# OBSERVABILITY INTEGRATION:
# OpenTelemetry is initialized at the very top of this file to ensure that 
# all incoming HTTP requests and outgoing database queries are automatically 
# traced. This completes the distributed tracing chain started by the Next.js 
# frontend, allowing you to see the entire request lifecycle in your tracing 
# dashboard (e.g., Jaeger, Datadog, Vercel).
#
# PIPELINE ORCHESTRATION:
# The pipeline now runs 5 sequential tasks:
# 1. Customer Segmentation (K-Means)
# 2. Demand Forecasting (Holt-Winters)
# 3. Product Recommendations (FP-Growth & Graph)
# 4. Model Drift Detection (NEW - Alerts admin if models degrade)
# 5. Business Automation (Fraud detection, Auto-POs, Retention emails)
# ============================================================================

# 1. Initialize OpenTelemetry FIRST (before any other imports that might use tracing)
from otel import init_otel
init_otel()

# 2. Import FastAPIInstrumentor to automatically trace HTTP endpoints
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

import os
import logging
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv

# Load environment variables from .env file (for local development)
load_dotenv()

# Configure logging for the microservice
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
# This automatically creates spans for every incoming HTTP request,
# capturing headers, status codes, and execution time.
FastAPIInstrumentor.instrument_app(app)

# ─── Security Configuration ──────────────────────────────────────────────────
# This secret must match the one in your Next.js .env.local (ML_PIPELINE_SECRET)
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
    
    # 2. Run Customer Segmentation (K-Means)
    try:
        logger.info("📊 [1/5] Running Customer Segmentation...")
        from tasks.segmentation import run_customer_segmentation
        results['segmentation'] = run_customer_segmentation()
    except Exception as e:
        logger.error(f"❌ Segmentation failed: {e}")
        results['segmentation'] = f"Error: {str(e)}"
        
    # 3. Run Demand Forecasting (Holt-Winters)
    try:
        logger.info("📈 [2/5] Running Demand Forecasting...")
        from tasks.forecasting import run_demand_forecasting
        results['forecasting'] = run_demand_forecasting()
    except Exception as e:
        logger.error(f"❌ Forecasting failed: {e}")
        results['forecasting'] = f"Error: {str(e)}"
        
    # 4. Run Product Recommendations (FP-Growth & Graph)
    try:
        logger.info("🛒 [3/5] Running Product Recommendations...")
        from tasks.recommendations import run_product_recommendations
        results['recommendations'] = run_product_recommendations()
    except Exception as e:
        logger.error(f"❌ Recommendations failed: {e}")
        results['recommendations'] = f"Error: {str(e)}"

    # 5. Run Model Drift Detection (NEW)
    # This analyzes the metrics logged by the previous steps to detect if 
    # the models are degrading (e.g., Silhouette Score dropping, MAPE rising).
    try:
        logger.info("📉 [4/5] Running Model Drift Detection...")
        from tasks.drift_detection import run_drift_detection
        # Drift detection requires a DB connection to query ml_model_accuracy
        conn = get_db_connection()
        try:
            results['drift_detection'] = run_drift_detection(conn)
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"❌ Drift Detection failed: {e}")
        results['drift_detection'] = f"Error: {str(e)}"
        
    # 6. Run Business Automation (Fraud detection, Auto-POs, Retention)
    try:
        logger.info("🤖 [5/5] Running Business Automation...")
        from tasks.automation import run_business_automation
        results['automation'] = run_business_automation()
    except Exception as e:
        logger.error(f"❌ Automation failed: {e}")
        results['automation'] = f"Error: {str(e)}"
        
    logger.info("✅ ==========================================")
    logger.info("✅ ML Pipeline Completed Successfully.")
    logger.info("✅ ==========================================")
    
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
        
    # Use RealDictCursor to get rows as dictionaries (like Supabase JS client)
    # Note: Because we ran Psycopg2Instrumentor().instrument() in otel.py, 
    # every query executed through this connection will automatically be traced!
    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    return conn

# ─── Railway / Production Server Startup ─────────────────────────────────────
# FIX: This block ensures the server starts and listens on the correct port
# regardless of whether Railway uses Docker or Nixpacks to run the app.
if __name__ == "__main__":
    # Railway dynamically injects the PORT environment variable.
    # We default to 8000 for local development.
    port = int(os.environ.get("PORT", 8000))
    
    logger.info(f"🚀 Starting Uvicorn server on port {port}...")
    
    # Start the server on 0.0.0.0 so Railway's router can connect to it
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)