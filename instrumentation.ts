// ============================================================================
// FILE ADDRESS: instrumentation.ts (Place this in the ROOT of your Next.js project)
// ============================================================================
// EXPLANATION:
// This file initializes OpenTelemetry for the Next.js application. 
// It automatically traces:
// 1. Incoming HTTP requests to your API routes and Server Components.
// 2. Outgoing fetch calls (which includes all Supabase JS client queries).
// 3. Outgoing fetch calls to your Python ML microservice.
// 
// We use Vercel's official OpenTelemetry SDK (@vercel/otel). If you deploy 
// to Vercel, traces will automatically appear in the Vercel Observability 
// dashboard. If you use a third-party backend (like Jaeger, Datadog, or Axiom), 
// you can configure the OTLP endpoint in your environment variables.
//
// SETUP:
// 1. Ensure you ran: npm install @vercel/otel
// 2. (Optional) Add to .env.local if using a 3rd party exporter:
//    OTEL_EXPORTER_OTLP_ENDPOINT="https://your-otlp-endpoint.com"
// ============================================================================

import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel({ 
    serviceName: 'bushal-nextjs-app',
    
    // Note: If you are using Vercel's native observability dashboard, 
    // you don't need to specify an exporter. It automatically sends traces 
    // to Vercel. If you are using a third-party like Jaeger or Datadog, 
    // uncomment the line below:
    // exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  })
}