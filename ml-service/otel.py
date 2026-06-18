# ml-service/otel.py

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

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
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    else:
        # Fallback: If no endpoint is configured, traces are logged to stdout
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)

    # 4. Auto-instrument psycopg2
    # FIX: Import psycopg2 first to ensure it's available, then instrument
    try:
        import psycopg2
        from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
        Psycopg2Instrumentor().instrument()
        print("✅ OpenTelemetry initialized for ML Service (with psycopg2 tracing).")
    except Exception as e:
        print(f"⚠️ OpenTelemetry initialized, but psycopg2 tracing failed: {e}")
        print("✅ OpenTelemetry initialized for ML Service (without psycopg2 tracing).")