# ml-service/main.py
#This is the entry point for your Python microservice. It sets up the FastAPI server, implements a security layer (so only your Next.js app can trigger the ML pipeline), and orchestrates the execution of the different ML tasks.
import os
import logging
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv

# Load environment variables from .env file
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
        logger.error(" Unauthorized pipeline trigger attempt.")
        raise HTTPException(status_code=401, detail="Invalid pipeline secret")
    
    logger.info("🚀 ==========================================")
    logger.info("🚀 Starting Bushal ML Pipeline...")
    logger.info("🚀 ==========================================")
    
    results = {}
    
    # 2. Run Customer Segmentation (K-Means)
    try:
        logger.info("📊 [1/4] Running Customer Segmentation...")
        from tasks.segmentation import run_customer_segmentation
        results['segmentation'] = run_customer_segmentation()
    except Exception as e:
        logger.error(f"❌ Segmentation failed: {e}")
        results['segmentation'] = f"Error: {str(e)}"
        
    # 3. Run Demand Forecasting (Holt-Winters)
    try:
        logger.info("📈 [2/4] Running Demand Forecasting...")
        from tasks.forecasting import run_demand_forecasting
        results['forecasting'] = run_demand_forecasting()
    except Exception as e:
        logger.error(f"❌ Forecasting failed: {e}")
        results['forecasting'] = f"Error: {str(e)}"
        
    # 4. Run Product Recommendations (FP-Growth & Graph)
    try:
        logger.info("🛒 [3/4] Running Product Recommendations...")
        from tasks.recommendations import run_product_recommendations
        results['recommendations'] = run_product_recommendations()
    except Exception as e:
        logger.error(f" Recommendations failed: {e}")
        results['recommendations'] = f"Error: {str(e)}"
        
    # 5. Run Business Automation (Fraud detection, Auto-POs)
    try:
        logger.info("🤖 [4/4] Running Business Automation...")
        from tasks.automation import run_business_automation
        results['automation'] = run_business_automation()
    except Exception as e:
        logger.error(f" Automation failed: {e}")
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
    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    return conn