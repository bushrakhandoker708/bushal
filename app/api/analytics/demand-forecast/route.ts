/**
 * ============================================================================
 * DEMAND FORECASTING API ENDPOINT (CACHE-BASED)
 * ============================================================================
 * 
 * This API endpoint reads demand forecasts from the cache table populated
 * by the Python ML microservice. It NO LONGER runs Holt-Winters algorithm
 * in the serverless function.
 * 
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed all ML algorithm imports and execution
 * - Reads from `demand_forecast_cache` table (populated by Python cron)
 * - Reads festivals from `festivals` table (dynamic, not hardcoded)
 * - Calculates stock-out risk based on cached forecasts
 * - Much faster response time (no computation, just DB reads)
 * 
 * USAGE:
 * GET /api/analytics/demand-forecast?periods=6
 * GET /api/analytics/demand-forecast?product_id=uuid&periods=3
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "forecastType": "product" | "store_revenue",
 *   "productName": "Product Name",
 *   "currentStock": 50,
 *   "forecast": [...],
 *   "stockOutRisk": "low" | "medium" | "high",
 *   "recommendedRestock": 50,
 *   "festivalsApplied": [...]
 * }
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ForecastPoint {
  date: string
  predictedValue: number
  lowerBound: number
  upperBound: number
  isFestivalPeriod: boolean
  festivalName?: string
  boostApplied: number
}

interface Festival {
  name: string
  start_date: string
  end_date: string
  boost_factor: number
}

// ─── Helper: Calculate Stock-Out Risk ───────────────────────────────────────

function calculateStockOutRisk(
  currentStock: number,
  forecast: ForecastPoint[],
  leadTimeDays: number = 14
): { risk: 'low' | 'medium' | 'high'; recommendedRestock: number } {
  if (forecast.length === 0) {
    return { risk: 'low', recommendedRestock: 0 }
  }

  // Calculate cumulative demand over lead time
  const leadTimeMonths = Math.ceil(leadTimeDays / 30)
  const leadTimeForecast = forecast.slice(0, leadTimeMonths)
  
  const cumulativeDemand = leadTimeForecast.reduce(
    (sum, f) => sum + f.predictedValue,
    0
  )

  // Calculate safety stock (1.5x max daily demand)
  const maxDailyDemand = Math.max(...forecast.map(f => f.predictedValue / 30))
  const safetyStock = maxDailyDemand * 1.5

  // Determine risk level
  let risk: 'low' | 'medium' | 'high' = 'low'
  
  if (currentStock < cumulativeDemand * 0.5) {
    risk = 'high'
  } else if (currentStock < cumulativeDemand + safetyStock) {
    risk = 'medium'
  }

  // Calculate recommended restock
  const targetStock = cumulativeDemand + safetyStock
  const recommendedRestock = Math.max(0, Math.ceil(targetStock - currentStock))

  return { risk, recommendedRestock }
}

// ─── Main API Handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication - Ensure user is an admin
    const auth = await requireAdmin()
    if (!auth.success) {
      return auth.response
    }

    const supabase = await auth.supabase

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const periodsToForecast = parseInt(searchParams.get('periods') || '6')
    const leadTimeDays = parseInt(searchParams.get('lead_time') || '14')

    // Validate parameters
    if (periodsToForecast < 1 || periodsToForecast > 24) {
      return NextResponse.json(
        { error: 'Invalid periods parameter. Must be between 1 and 24.' },
        { status: 400 }
      )
    }

    // 3. Fetch Product Details (if product_id provided)
    let currentStock = 0
    let productName = 'Overall Store'
    let forecastType: 'product' | 'store_revenue' = 'store_revenue'

    if (productId) {
      forecastType = 'product'

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, stock_quantity')
        .eq('id', productId)
        .is('is_deleted', false)
        .single()

      if (productError || !product) {
        return NextResponse.json(
          { error: 'Product not found or deleted.' },
          { status: 404 }
        )
      }

      productName = product.name
      currentStock = product.stock_quantity ?? 0
    }

    // 4. Fetch Forecasts from Cache Table
    const today = new Date()
    const forecastEndDate = new Date()
    forecastEndDate.setMonth(forecastEndDate.getMonth() + periodsToForecast)

    let forecastQuery = supabase
      .from('demand_forecast_cache')
      .select('*')
      .gte('forecast_date', today.toISOString().split('T')[0])
      .lte('forecast_date', forecastEndDate.toISOString().split('T')[0])
      .order('forecast_date', { ascending: true })

    if (productId) {
      forecastQuery = forecastQuery.eq('product_id', productId)
    }

    const { data: forecastData, error: forecastError } = await forecastQuery

    if (forecastError) {
      console.error('[Demand Forecast API] Error fetching forecast cache:', forecastError)
      return NextResponse.json(
        { error: 'Failed to fetch forecast data.' },
        { status: 500 }
      )
    }

    // 5. Transform Forecast Data
    const forecast: ForecastPoint[] = (forecastData ?? []).map((row: any) => ({
      date: row.forecast_date,
      predictedValue: row.predicted_value,
      lowerBound: row.lower_bound,
      upperBound: row.upper_bound,
      isFestivalPeriod: row.is_festival_period,
      festivalName: row.festival_name,
      boostApplied: row.boost_factor,
    }))

    // 6. Fetch Upcoming Festivals
    const { data: festivals, error: festivalsError } = await supabase
      .from('festivals')
      .select('name, start_date, end_date, boost_factor')
      .gte('start_date', today.toISOString().split('T')[0])
      .lte('start_date', forecastEndDate.toISOString().split('T')[0])
      .order('start_date', { ascending: true })

    if (festivalsError) {
      console.error('[Demand Forecast API] Error fetching festivals:', festivalsError)
    }

    const festivalsApplied = (festivals ?? []).map((f: Festival) => ({
      name: f.name,
      startDate: f.start_date,
      endDate: f.end_date,
      boostFactor: f.boost_factor,
    }))

    // 7. Calculate Stock-Out Risk
    const { risk: stockOutRisk, recommendedRestock } = calculateStockOutRisk(
      currentStock,
      forecast,
      leadTimeDays
    )

    // 8. Build Response
    return NextResponse.json({
      success: true,
      forecastType,
      productName,
      currentStock,
      forecast,
      stockOutRisk,
      recommendedRestock,
      festivalsApplied,
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[Demand Forecast API] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching forecast.',
      },
      { status: 500 }
    )
  }
}