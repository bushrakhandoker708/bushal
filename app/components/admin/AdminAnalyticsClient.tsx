// app/components/admin/AdminAnalyticsClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'
import RFMMatrix, { type RFMData } from './analytics/RFMMatrix'
import CohortHeatmap, { type CohortRow } from './analytics/CohortHeatmap'
import PredictiveInsights, { type CLVData, type ForecastData } from './analytics/PredictiveInsights'
import { formatPrice } from '@/app/lib/utils/formatPrice'

// Types matching page.tsx
interface SummaryData {
  totalRevenue: number
  totalCOGS: number
  totalDeliveryCharges: number
  totalProfit: number
  fulfilledOrdersCount: number
  pendingOrders: number
  cancelledOrders: number
  totalCustomers: number
  repeatCustomers: number
  avgOrderValue: number
  avgFulfillmentDays: number
  inventoryTurnover: number
  stockOutCost: number
  newCustomers30d: number
  soldIn30d: number
  productsAdded30d: number
  totalInventoryValue: number
  outOfStock: number
  lowStock: number
  onTimeDeliveryRate: number
  cancellationRate: number
}

interface DailyRevenueRow {
  date: string
  revenue: number
  orders: number
  profit: number
}

interface ForecastDataSimple {
  nextMonthRevenue: number
  growthRate: number
  confidence: string
  trend: string
  slope: number
  monthlyData: any[]
}

interface RestockItem {
  id: string
  name: string
  price: number
  stock_quantity: number
  image_url: string
  images: string[]
  sold_30d: number
  days_until_stockout: number
  revenue_30d: number
  urgency: string
  recommended_restock: number
}

interface CategoryTrend {
  category: string
  currentRevenue: number
  previousRevenue: number
  growthRate: number
  units: number
  trend: string
}

interface CustomerInsights {
  totalCustomers: number
  activeCustomers30d: number
  newCustomers30d: number
  repeatCustomerRate: number
  avgLifetimeValue: number
  avgOrdersPerCustomer: number
  topSpender: any | null
}

interface Props {
  summary: SummaryData
  dailyRevenue: DailyRevenueRow[]
  forecast: ForecastDataSimple
  restockRecommendations: RestockItem[]
  categoryTrends: CategoryTrend[]
  customerInsights: CustomerInsights
  rfmData: RFMData | null
  cohortData: CohortRow[] | null
  clvData: CLVData | null
  advancedForecast: ForecastData | null
}

const TABS = [
  { id: 'overview', label: 'Overview & Revenue' },
  { id: 'rfm', label: 'Customer Segments' },
  { id: 'cohort', label: 'Cohort Retention' },
  { id: 'predictive', label: 'Predictive Insights' },
]

const TAB_DESCRIPTIONS: Record<string, { what: string; how: string }> = {
  overview: {
    what: "Provides a high-level snapshot of store performance, including daily revenue, profit trends, and operational health.",
    how: "Revenue and profit are calculated by aggregating fulfilled orders and subtracting COGS (cost of goods). Operational metrics track inventory turnover and fulfillment speed."
  },
  rfm: {
    what: "Segments customers using Recency, Frequency, and Monetary (RFM) analysis to identify key customer tiers.",
    how: "Customers are scored (1-5) based on their last purchase date, order count, and total spend. They are then grouped into actionable segments like 'Champions', 'Loyal', or 'At Risk'."
  },
  cohort: {
    what: "Tracks customer retention over time by grouping users by their first purchase month (cohort).",
    how: "Calculates the percentage of users from each cohort who return to make subsequent purchases in following months, highlighting long-term engagement and product stickiness."
  },
  predictive: {
    what: "Forecasts future demand and Customer Lifetime Value (CLV) using predictive algorithms.",
    how: "Demand is forecasted via a Weighted Moving Average (WMA) to react quickly to recent trends. CLV is predicted using historical purchase frequency, average order value, and customer lifespan."
  }
}

export default function AdminAnalyticsClient({
  summary,
  dailyRevenue,
  forecast,
  restockRecommendations,
  categoryTrends,
  customerInsights,
  rfmData,
  cohortData,
  clvData,
  advancedForecast,
}: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [chartData, setChartData] = useState<Array<{ date: string; Revenue: number; Profit: number }>>([])

  // Debug and transform data
  useEffect(() => {
    console.log('📊 Daily Revenue Raw Data:', dailyRevenue)
    console.log('📊 Summary Data:', summary)
    
    if (dailyRevenue && Array.isArray(dailyRevenue) && dailyRevenue.length > 0) {
      const transformed = dailyRevenue.map(d => {
        // Parse date - handle both YYYY-MM-DD and other formats
        let dateStr = d.date
        try {
          const dateObj = new Date(d.date)
          if (!isNaN(dateObj.getTime())) {
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
        } catch (e) {
          console.warn('Date parse error:', d.date, e)
        }
        
        return {
          date: dateStr,
          Revenue: Number(d.revenue) || 0,
          Profit: Number(d.profit) || 0,
        }
      })
      console.log(' Transformed Chart Data:', transformed)
      setChartData(transformed)
    } else {
      console.warn('⚠️ No daily revenue data available')
      setChartData([])
    }
  }, [dailyRevenue, summary])

  // Fix: Properly typed formatter that handles undefined values
  const formatYAxisTick = (value: number | string | undefined): string => {
    if (value === undefined || typeof value !== 'number') return '0'
    if (value >= 1000) return `৳${(value / 1000).toFixed(0)}k`
    return `৳${value}`
  }

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="border-b border-bushal-border">
        <nav className="flex gap-6 -mb-px" aria-label="Tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-bushal-forest text-bushal-forest'
                  : 'border-transparent text-bushal-inkSoft hover:text-bushal-ink hover:border-bushal-inkSoft/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Documentation Description */}
      <div className="bg-bushal-ivoryDeep/50 border border-bushal-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-bushal-forest mb-1">About this section</h3>
        <p className="text-xs text-bushal-inkSoft leading-relaxed">
          <span className="font-semibold text-bushal-ink">What it does:</span> {TAB_DESCRIPTIONS[activeTab].what}
        </p>
        <p className="text-xs text-bushal-inkSoft leading-relaxed mt-1">
          <span className="font-semibold text-bushal-ink">How it works:</span> {TAB_DESCRIPTIONS[activeTab].how}
        </p>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard title="Total Revenue" value={formatPrice(summary.totalRevenue)} />
            <SummaryCard title="Total Profit" value={formatPrice(summary.totalProfit)} />
            <SummaryCard title="Fulfilled Orders" value={summary.fulfilledOrdersCount.toString()} />
            <SummaryCard title="Avg Order Value" value={formatPrice(summary.avgOrderValue)} />
          </div>

          {/* Revenue & Profit Graph */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
            <h3 className="text-sm font-bold text-bushal-forest mb-4">Daily Revenue vs Profit (Last 30 Days)</h3>
            <div className="h-80 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-bushal-border rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-bushal-inkSoft mb-1">No revenue data available</p>
                    <p className="text-xs text-bushal-inkSoft/60">Data will appear once you have fulfilled orders in the last 30 days</p>
                    <p className="text-xs text-bushal-inkSoft/60 mt-2">
                      Total fulfilled orders: {summary.fulfilledOrdersCount}
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#065F46" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#065F46" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B87333" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#B87333" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#6B7280' }} 
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#6B7280' }} 
                      tickFormatter={formatYAxisTick}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                      formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="Revenue" 
                      stroke="#065F46" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      strokeWidth={2} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Profit" 
                      stroke="#B87333" 
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                      strokeWidth={2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
              <h3 className="text-sm font-bold text-bushal-forest mb-4">Category Trends (30d)</h3>
              <div className="space-y-3">
                {categoryTrends.slice(0, 5).map(cat => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-bushal-ink">{cat.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-bushal-inkSoft tabular-nums">{formatPrice(cat.currentRevenue)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        cat.trend === 'up' ? 'bg-bushal-forest/10 text-bushal-forest' : 
                        cat.trend === 'down' ? 'bg-bushal-dangerBg text-bushal-danger' : 
                        'bg-bushal-ivoryDeep text-bushal-inkSoft'
                      }`}>
                        {cat.trend === 'up' ? '↑' : cat.trend === 'down' ? '↓' : '→'} {cat.growthRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
              <h3 className="text-sm font-bold text-bushal-forest mb-4">Restock Recommendations</h3>
              <div className="space-y-3">
                {restockRecommendations.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-bushal-ink truncate max-w-[150px]">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-bushal-inkSoft tabular-nums">{item.stock_quantity} left</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.urgency === 'critical' ? 'bg-bushal-dangerBg text-bushal-danger' : 
                        item.urgency === 'high' ? 'bg-bushal-warningBg text-bushal-warning' : 
                        'bg-bushal-ivoryDeep text-bushal-inkSoft'
                      }`}>
                        {item.urgency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rfm' && (rfmData ? <RFMMatrix data={rfmData} /> : <EmptyState msg="No RFM data available." />)}
      {activeTab === 'cohort' && (cohortData ? <CohortHeatmap data={cohortData} /> : <EmptyState msg="No cohort data available." />)}
      {activeTab === 'predictive' && (clvData && advancedForecast ? (
        <PredictiveInsights clvData={clvData} forecastData={advancedForecast} />
      ) : <EmptyState msg="No predictive data available." />)}
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-bushal-surface rounded-xl border border-bushal-border p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-bushal-inkSoft mb-1">{title}</p>
      <p className="text-xl font-bold text-bushal-forest tabular-nums">{value}</p>
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-8 text-center">
      <p className="text-sm text-bushal-inkSoft">{msg}</p>
    </div>
  )
}