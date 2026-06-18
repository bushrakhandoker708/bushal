// ============================================================================
// FILE ADDRESS: app/(admin)/admin/analytics/page.tsx
// ============================================================================
// EXPLANATION:
// This is the main Server Component for the Admin Analytics dashboard.
// It fetches all heavy analytics RPCs in parallel from Supabase and passes 
// the typed data to the AdminAnalyticsClient.
//
// ENHANCEMENTS:
// 1. Integrated the new MLHealthPanel component to display Model Drift Alerts 
//    and Thompson Sampling A/B Testing status directly on the analytics page.
// 2. Added a fully responsive layout wrapper to ensure the dashboard looks 
//    perfect and is easily navigable on mobile, tablet, and desktop devices.
// 3. Migration-013 RPCs are wrapped in Promise.resolve() so .catch() is 
//    available — Supabase .then() returns PromiseLike, not Promise.
// ============================================================================

import { createServerClient } from '@/lib/supabase/server'
import AdminAnalyticsClient from '@/app/components/admin/AdminAnalyticsClient'
import MLHealthPanel from '@/app/components/admin/MLHealthPanel'
import type { RFMData } from '@/app/components/admin/analytics/RFMMatrix'
import type { CohortRow } from '@/app/components/admin/analytics/CohortHeatmap'
import type { CLVData, ForecastData } from '@/app/components/admin/analytics/PredictiveInsights'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createServerClient()

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
    // Standard RPCs
    supabase.rpc('get_analytics_summary'),
    supabase.rpc('get_daily_revenue', { days: 30 }),
    supabase.rpc('get_revenue_forecast'),
    supabase.rpc('get_restock_recommendations', { limit_count: 8 }),
    supabase.rpc('get_category_trends'),
    supabase.rpc('get_customer_insights'),
    
    // JSONB RPCs wrapped in Promise.resolve() for proper .catch() handling
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
    <div className="min-h-screen bg-bushal-ivoryDeep">
      {/* Responsive Container: Adjusts padding and max-width based on screen size */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10">
        
        {/* Page Header */}
        <header className="space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-bushal-forest tracking-tight">
            Analytics & AI Performance
          </h1>
          <p className="text-sm sm:text-base text-bushal-inkSoft max-w-2xl">
            Real-time business metrics, predictive inventory insights, and live ML model health monitoring.
          </p>
        </header>

        {/* Main Analytics Dashboard Client Component */}
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

        {/* ML Health & A/B Testing Panel (Drift Alerts + Thompson Sampling) */}
        <MLHealthPanel />

      </div>
    </div>
  )
}