// app/(admin)/admin/analytics/page.tsx
// Server component: fetches all analytics RPCs in parallel and passes typed data
// to AdminAnalyticsClient. Migration-013 RPCs are wrapped in Promise.resolve()
// so .catch() is available — Supabase .then() returns PromiseLike, not Promise.
// app/(admin)/admin/analytics/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminAnalyticsClient from '@/app/components/admin/AdminAnalyticsClient'
import type { RFMData } from '@/app/components/admin/analytics/RFMMatrix'
import type { CohortRow } from '@/app/components/admin/analytics/CohortHeatmap'
import type { CLVData, ForecastData } from '@/app/components/admin/analytics/PredictiveInsights'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase =  await createServerClient()

  const [
    { data: summaryRaw },
    { data: dailyRevenueRaw },
    { data: forecastRaw },
    { data: restockRaw },
    { data: categoryRaw },
    { data: customerRaw },
    rfmResult,
    cohortResult,
    clvResult,
    advForecastResult,
  ] = await Promise.all([
    // Standard RPCs (these were already working)
    supabase.rpc('get_analytics_summary'),
    supabase.rpc('get_daily_revenue', { days: 30 }),
    supabase.rpc('get_revenue_forecast'),
    supabase.rpc('get_restock_recommendations', { limit_count: 8 }),
    supabase.rpc('get_category_trends'),
    supabase.rpc('get_customer_insights'),
    
    // These RPCs return `jsonb` (a single JSON object/array), not a table of rows.
    // Chaining .maybeSingle() on a jsonb return type throws a PostgREST error.
    // We also added console.error so future SQL bugs aren't silently swallowed.
    Promise.resolve(supabase.rpc('get_rfm_segmentation'))
      .then(r => r.data as RFMData | null)
      .catch((err) => { console.error('❌ get_rfm_segmentation failed:', err); return null }),
      
    Promise.resolve(supabase.rpc('get_cohort_retention'))
      .then(r => r.data as CohortRow[] | null)
      .catch((err) => { console.error('❌ get_cohort_retention failed:', err); return null }),
      
    Promise.resolve(supabase.rpc('get_predictive_clv'))
      .then(r => r.data as CLVData | null)
      .catch((err) => { console.error('❌ get_predictive_clv failed:', err); return null }),
      
    Promise.resolve(supabase.rpc('get_advanced_demand_forecast'))
      .then(r => r.data as ForecastData | null)
      .catch((err) => { console.error('❌ get_advanced_demand_forecast failed:', err); return null }),
  ])

  return (
    <AdminAnalyticsClient
      summary={summaryRaw ?? {
        totalRevenue: 0, totalCOGS: 0, totalDeliveryCharges: 0, totalProfit: 0,
        fulfilledOrdersCount: 0, pendingOrders: 0, cancelledOrders: 0,
        totalCustomers: 0, repeatCustomers: 0, avgOrderValue: 0,
        avgFulfillmentDays: 0, inventoryTurnover: 0, stockOutCost: 0,
        newCustomers30d: 0, soldIn30d: 0, productsAdded30d: 0,
        totalInventoryValue: 0, outOfStock: 0, lowStock: 0,
        onTimeDeliveryRate: 0, cancellationRate: 0,
      }}
      dailyRevenue={Array.isArray(dailyRevenueRaw) ? dailyRevenueRaw : []}
      forecast={forecastRaw ?? {
        nextMonthRevenue: 0, growthRate: 0, confidence: 'low',
        trend: 'insufficient_data', slope: 0, monthlyData: [],
      }}
      restockRecommendations={Array.isArray(restockRaw) ? restockRaw : []}
      categoryTrends={Array.isArray(categoryRaw) ? categoryRaw : []}
      customerInsights={customerRaw ?? {
        totalCustomers: 0, activeCustomers30d: 0, newCustomers30d: 0,
        repeatCustomerRate: 0, avgLifetimeValue: 0, avgOrdersPerCustomer: 0,
        topSpender: null,
      }}
      rfmData={rfmResult}
      cohortData={cohortResult}
      clvData={clvResult}
      advancedForecast={advForecastResult}
    />
  )
}