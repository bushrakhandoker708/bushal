// app/api/admin/ml-accuracy/route.ts

// This is the secure backend endpoint that feeds your new "AI Trust Score" panel. It queries the ml_model_accuracy table we created in Step 9. We order the results by evaluated_at descending and limit them to the most recent entries (e.g., top 5 per model) so the frontend can calculate the "Trend" (comparing the latest score to the previous one) without loading the entire history of the database.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

// Define the interface to match the database schema
interface MLAccuracyRecord {
  id: string
  model_name: 'kmeans_segmentation' | 'holt_winters_forecast' | 'fpgrowth_recommendations'
  metric_name: string
  metric_value: number
  records_evaluated: number
  evaluated_at: string
}

export async function GET() {
  // 1. Authentication: Only Admins can see internal AI performance metrics
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  // 2. Await the supabase client (FIX: Added await here)
  const supabase = await auth.supabase

  try {
    // 3. Fetch Accuracy Logs
    // We fetch the most recent 20 records to allow the frontend to calculate trends
    const { data, error } = await supabase
      .from('ml_model_accuracy')
      .select('*')
      .order('evaluated_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('📉 [ML Accuracy API] Failed to fetch logs:', error)
      return NextResponse.json({ error: 'Failed to fetch ML accuracy data' }, { status: 500 })
    }

    // 4. Return Data
    // The frontend component (MLPerformancePanel) expects an array of records
    return NextResponse.json<MLAccuracyRecord[]>(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 mins
      },
    })

  } catch (error) {
    console.error('📉 [ML Accuracy API] Internal Server Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}