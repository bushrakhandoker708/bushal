// app/api/cron/trigger-ml/route.ts
import { NextResponse } from 'next/server'
// This is the bridge between your Next.js app and your new Python microservice. It uses Vercel Cron to automatically wake up your Python service once a day (at 2:00 AM UTC) to run all the heavy ML pipelines (Segmentation, Forecasting, Recommendations, Automation) without blocking your main app or hitting serverless timeouts.
// ─── Vercel Cron Configuration ───────────────────────────────────────────────
// This tells Vercel to automatically call this route on a schedule.
// '0 2 * * *' means: Run at 2:00 AM UTC every day.
// This is the ideal time for batch ML jobs when traffic is lowest.
export const maxDuration = 60 // Allow up to 60 seconds for the request to complete
export const config = {
  cron: '0 2 * * *',
}

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
    
    // 2. Call the Python Microservice
    // We pass the secret in the header so the Python service knows it's a legitimate request.
    const response = await fetch(`${mlServiceUrl}/run-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pipeline-secret': pipelineSecret,
      },
      // Increase timeout for heavy ML workloads
      signal: AbortSignal.timeout(55000), 
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