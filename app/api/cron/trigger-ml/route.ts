// app/api/cron/trigger-ml/route.ts
import { NextResponse } from 'next/server'
// This is the bridge between your Next.js app and your new Python microservice. It uses Vercel Cron to automatically wake up your Python service once a day (at 2:00 AM UTC) to run all the heavy ML pipelines (Segmentation, Forecasting, Recommendations, Automation) without blocking your main app or hitting serverless timeouts.


// ─── Next.js 14 App Router Route Segment Config ──────────────────────────────
// FIX: Removed `export const config = { cron: ... }` as it is deprecated in App Router.
// Cron schedules are now handled in `vercel.json` at the root of the project.
export const maxDuration = 60 // Allow up to 60 seconds for the Python ML service to respond
export const dynamic = 'force-dynamic' // Prevent caching; always execute when called

export async function GET() {
  const mlServiceUrl = process.env.ML_SERVICE_URL
  const pipelineSecret = process.env.ML_PIPELINE_SECRET

  // 1. Validate Environment Variables
  if (!mlServiceUrl || !pipelineSecret) {
    console.error('❌ ML Service configuration missing. Check ML_SERVICE_URL and ML_PIPELINE_SECRET.')
    return NextResponse.json(
      { error: 'ML Service configuration missing' },
      { status: 500 }
    )
  }

  try {
    console.log('🚀 Triggering ML Pipeline at', new Date().toISOString())
    
    // 2. Call the Python Microservice on Railway
    const response = await fetch(`${mlServiceUrl}/run-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pipeline-secret': pipelineSecret,
      },
      signal: AbortSignal.timeout(55000), // 55s timeout (just under the 60s maxDuration)
    })

    // 3. Handle Python Service Response
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ ML Pipeline failed:', response.status, errorText)
      return NextResponse.json(
        { error: 'ML Pipeline failed', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ ML Pipeline completed successfully:', data)
    
    return NextResponse.json({
      success: true,
      message: 'ML Pipeline triggered successfully',
      timestamp: new Date().toISOString(),
      results: data.results,
    })
  } catch (error: any) {
    console.error('❌ Failed to trigger ML Pipeline:', error.message)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}