# ============================================================================
# FILE ADDRESS: ml-service/otel.py
# ============================================================================
# EXPLANATION:
# This module initializes OpenTelemetry for the Python FastAPI ML microservice.
# It completes the distributed tracing chain started by the Next.js frontend.
# 
# When the Next.js app calls `/run-pipeline` on this FastAPI service, 
# OpenTelemetry will automatically:
# 1. Extract the trace context from the incoming HTTP headers (propagated by Next.js).
# 2. Create a span for the FastAPI endpoint execution.
# 3. Instrument all psycopg2 database queries (tracking execution time and SQL).
# 4. Export the traces to the configured OTLP endpoint (e.g., Jaeger, Datadog, Vercel).
#
# SETUP:
# 1. Ensure you have installed the required packages in your Python environment:
#    pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-fastapi
#    pip install opentelemetry-instrumentation-psycopg2 opentelemetry-exporter-otlp-proto-grpc
# 2. Import and call `init_otel()` at the VERY TOP of your `main.py` file, 
#    BEFORE creating the FastAPI app instance.
# ============================================================================

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor

def init_otel():
    """
    Initializes OpenTelemetry tracing for the FastAPI application.
    Must be called before the FastAPI app is instantiated.
    """
    # 1. Define the service name for the tracing dashboard
    service_name = "bushal-ml-service"
    resource = Resource.create({
        "service.name": service_name,
        "deployment.environment": os.getenv("ENVIRONMENT", "production")
    })

    # 2. Set up the Tracer Provider
    provider = TracerProvider(resource=resource)
    
    # 3. Configure the OTLP Exporter
    # If OTEL_EXPORTER_OTLP_ENDPOINT is set in Railway/Render environment variables, 
    # it will send traces to your backend (e.g., Jaeger, Datadog, Grafana Tempo).
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    else:
        # Fallback: If no endpoint is configured, traces are logged to stdout 
        # (useful for local debugging without a dedicated tracing backend).
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)

    # 4. Auto-instrument psycopg2
    # This automatically creates spans for every SQL query executed via psycopg2.
    # It tracks query execution time, parameters, and errors.
    Psycopg2Instrumentor().instrument()

    print("✅ OpenTelemetry initialized for ML Service.")