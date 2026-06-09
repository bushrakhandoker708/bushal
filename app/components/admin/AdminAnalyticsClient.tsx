// app/components/admin/AdminAnalyticsClient.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import { useToast } from '@/app/components/ui/Toast'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Summary {
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

interface DailyRevenue {
  date: string
  revenue: number
  orders: number
  profit: number
}

interface Forecast {
  nextMonthRevenue: number
  growthRate: number
  confidence: 'high' | 'medium' | 'low'
  trend: 'upward' | 'downward' | 'flat' | 'insufficient_data'
  slope: number
  monthlyData: { month: string; revenue: number }[]
}

interface RestockRec {
  id: string
  name: string
  price: number
  stock_quantity: number
  image_url?: string | null
  images?: string[] | null
  sold_30d: number
  days_until_stockout: number
  revenue_30d: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
  recommended_restock: number
}

interface CategoryTrend {
  category: string
  currentRevenue: number
  previousRevenue: number
  growthRate: number
  units: number
  trend: 'up' | 'down' | 'stable'
}

interface CustomerInsights {
  totalCustomers: number
  activeCustomers30d: number
  newCustomers30d: number
  repeatCustomerRate: number
  avgLifetimeValue: number
  avgOrdersPerCustomer: number
  topSpender: { name: string; email: string; totalSpent: number; orderCount: number } | null
}

interface TopProduct {
  id: string
  name: string
  price: number
  stock_quantity: number
  in_stock: boolean
  discount_percent?: number | null
  image_url?: string | null
  images?: string[] | null
}

interface RecentActivity {
  id: string
  total: number
  status: string
  created_at: string
  itemCount: number
  customer: string
}

interface Expense {
  id: string
  product_id?: string | null
  label: string
  amount: number
  created_at: string
}

interface Props {
  summary: Summary
  dailyRevenue: DailyRevenue[]
  forecast: Forecast
  restockRecommendations: RestockRec[]
  categoryTrends: CategoryTrend[]
  customerInsights: CustomerInsights
  topProducts: TopProduct[]
  recentActivity: RecentActivity[]
  expenses: Expense[]
}

// ─── Animated Number Counter Hook ────────────────────────────────────────────
function useAnimatedNumber(target: number, duration: number = 1500): number {
  const [current, setCurrent] = useState(0)
  const startTime = useRef<number | null>(null)
  const animationFrame = useRef<number>()

  useEffect(() => {
    startTime.current = null
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(target * eased)
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      }
    }
    animationFrame.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
    }
  }, [target, duration])

  return current
}

// ─── Animated KPI Card ───────────────────────────────────────────────────────
function AnimatedKPI({ 
  label, value, sub, trend, trendUp, accent, icon, delay = 0, prefix = '', suffix = '' 
}: { 
  label: string; value: number; sub?: string; trend?: string; trendUp?: boolean; 
  accent: string; icon: React.ReactNode; delay?: number; prefix?: string; suffix?: string 
}) {
  const animatedValue = useAnimatedNumber(value, 1200 + delay)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const styles: Record<string, string> = {
    green: 'from-emerald-50 to-emerald-50/30 border-emerald-200/60',
    copper: 'from-amber-50 to-amber-50/30 border-amber-200/60',
    danger: 'from-rose-50 to-rose-50/30 border-rose-200/60',
    blue: 'from-blue-50 to-blue-50/30 border-blue-200/60',
    violet: 'from-violet-50 to-violet-50/30 border-violet-200/60',
    forest: 'from-bushal-forest/5 to-bushal-forest/10 border-bushal-forest/20',
    cyan: 'from-cyan-50 to-cyan-50/30 border-cyan-200/60',
    warning: 'from-amber-50 to-amber-50/30 border-amber-200/60',
  }

  const textStyles: Record<string, string> = {
    green: 'text-emerald-700',
    copper: 'text-bushal-copper',
    danger: 'text-rose-700',
    blue: 'text-blue-700',
    violet: 'text-violet-700',
    forest: 'text-bushal-forest',
    cyan: 'text-cyan-700',
    warning: 'text-amber-700',
  }

  const iconBgStyles: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-600',
    copper: 'bg-bushal-copper/10 text-bushal-copper',
    danger: 'bg-rose-100 text-rose-600',
    blue: 'bg-blue-100 text-blue-600',
    violet: 'bg-violet-100 text-violet-600',
    forest: 'bg-bushal-forest/10 text-bushal-forest',
    cyan: 'bg-cyan-100 text-cyan-600',
    warning: 'bg-amber-100 text-amber-600',
  }

  const formatValue = (v: number): string => {
    if (v >= 1000000) return `${prefix}${(v / 1000000).toFixed(1)}M${suffix}`
    if (v >= 1000) return `${prefix}${Math.round(v).toLocaleString()}${suffix}`
    if (v % 1 !== 0) return `${prefix}${v.toFixed(1)}${suffix}`
    return `${prefix}${Math.round(v)}${suffix}`
  }

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-500',
        'hover:shadow-xl hover:-translate-y-1 hover:border-bushal-copper/30',
        styles[accent] || styles.forest,
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 hover:scale-110', iconBgStyles[accent] || iconBgStyles.forest)}>
            {icon}
          </div>
          {trend && (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full animate-fade-in',
              trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            )}>
              <svg className={cn('w-3 h-3', !trendUp && 'rotate-180')} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {trend}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className={cn('text-2xl font-bold tracking-tight tabular-nums', textStyles[accent] || textStyles.forest)}>
            {formatValue(animatedValue)}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-bushal-inkSoft/70">{label}</p>
          {sub && <p className="text-xs text-bushal-inkSoft/60 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Prediction Card ────────────────────────────────────────────────────────
function PredictionCard({ forecast, totalRevenue }: { forecast: Forecast; totalRevenue: number }) {
  const predictedRevenue = useAnimatedNumber(forecast.nextMonthRevenue || 0, 2000)
  const growthRate = useAnimatedNumber(forecast.growthRate || 0, 1500)

  const confidenceColors = {
    high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-rose-100 text-rose-700 border-rose-200',
  }

  const trendIcons = {
    upward: '',
    downward: '↘',
    flat: '→',
    insufficient_data: '?',
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-bushal-copper/20 bg-gradient-to-br from-bushal-forest to-bushal-forestMid p-6 text-white">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '20px 20px',
          animation: 'pulse 4s ease-in-out infinite',
        }} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bushal-copperGlow">AI Prediction</p>
            <h3 className="text-lg font-bold mt-1">Next Month Revenue</h3>
          </div>
          <div className="text-4xl animate-pulse-soft">{trendIcons[forecast.trend]}</div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-4xl font-bold tabular-nums">
              ৳{Math.round(predictedRevenue).toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border',
                forecast.growthRate >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              )}>
                {forecast.growthRate >= 0 ? '↑' : '↓'} {Math.abs(growthRate).toFixed(1)}% vs last period
              </span>
              <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full border', confidenceColors[forecast.confidence])}>
                {forecast.confidence} confidence
              </span>
            </div>
          </div>

          {/* Mini sparkline of monthly data */}
          {forecast.monthlyData && forecast.monthlyData.length > 0 && (
            <div className="flex items-end gap-1 h-12 pt-2 border-t border-white/10">
              {forecast.monthlyData.map((m, i) => {
                const max = Math.max(...forecast.monthlyData.map(x => x.revenue), 1)
                const height = (m.revenue / max) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-bushal-copper/40 rounded-t transition-all duration-500 hover:bg-bushal-copper"
                      style={{ height: `${height}%`, animationDelay: `${i * 100}ms` }}
                    />
                    <span className="text-[8px] text-white/60">{m.month}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Restock Alert Card ──────────────────────────────────────────────────────
function RestockAlert({ rec }: { rec: RestockRec }) {
  const urgencyConfig = {
    critical: { bg: 'bg-rose-500', text: 'text-rose-700', label: 'CRITICAL', pulse: true },
    high: { bg: 'bg-amber-500', text: 'text-amber-700', label: 'HIGH', pulse: true },
    medium: { bg: 'bg-blue-500', text: 'text-blue-700', label: 'MEDIUM', pulse: false },
    low: { bg: 'bg-slate-400', text: 'text-slate-700', label: 'LOW', pulse: false },
  }

  const config = urgencyConfig[rec.urgency]
  const cover = (Array.isArray(rec.images) && rec.images[0]) || rec.image_url

  return (
    <div className="group relative overflow-hidden rounded-xl border border-bushal-border bg-bushal-surface p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      {config.pulse && (
        <div className={cn('absolute top-3 right-3 w-2 h-2 rounded-full animate-ping', config.bg)} />
      )}
      
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-bushal-ivoryDeep flex-shrink-0 border border-bushal-border group-hover:scale-110 transition-transform duration-300">
          {cover ? (
            <img src={cover} alt={rec.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">📦</div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-bushal-forest truncate">{rec.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', config.text, config.bg + '/10')}>
              {config.label}
            </span>
            <span className="text-[10px] text-bushal-inkSoft">
              {rec.days_until_stockout} days left
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-bushal-border/50 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-bushal-inkSoft">Stock: {rec.stock_quantity}</p>
          <p className="text-[10px] text-bushal-inkSoft">Sold: {rec.sold_30d}/30d</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-bushal-inkSoft">Restock</p>
          <p className="text-xs font-bold text-bushal-copper">{rec.recommended_restock} units</p>
        </div>
      </div>
    </div>
  )
}

// ─── Category Trend Row ──────────────────────────────────────────────────────
function CategoryTrendRow({ trend }: { trend: CategoryTrend }) {
  const isPositive = trend.growthRate > 0
  const isNegative = trend.growthRate < 0

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-bushal-ivoryDeep/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-bushal-forest truncate">{trend.category}</p>
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            isPositive ? 'bg-emerald-100 text-emerald-700' : isNegative ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
          )}>
            {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(trend.growthRate)}%
          </span>
        </div>
        <p className="text-[11px] text-bushal-inkSoft mt-0.5">{trend.units} units · {formatPrice(trend.currentRevenue)}</p>
      </div>
      
      {/* Mini bar showing relative performance */}
      <div className="w-16 h-8 flex items-end gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i}
            className={cn(
              'flex-1 rounded-t transition-all duration-500',
              isPositive ? 'bg-emerald-400' : isNegative ? 'bg-rose-400' : 'bg-slate-300'
            )}
            style={{ 
              height: `${20 + Math.random() * 80}%`,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Customer Insight Card ───────────────────────────────────────────────────
function CustomerInsightCard({ insights }: { insights: CustomerInsights }) {
  const repeatRate = useAnimatedNumber(insights.repeatCustomerRate || 0, 1500)
  const clv = useAnimatedNumber(insights.avgLifetimeValue || 0, 1500)

  return (
    <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-bushal-forest">Customer Intelligence</h3>
        <span className="text-[10px] text-bushal-inkSoft bg-bushal-ivoryDeep px-2 py-1 rounded-full">
          {insights.totalCustomers} total
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-bushal-forest tabular-nums">{repeatRate.toFixed(1)}%</p>
          <p className="text-[11px] text-bushal-inkSoft">Repeat Customer Rate</p>
          <div className="h-1.5 bg-bushal-ivoryDeep rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-bushal-copper to-bushal-copperLight rounded-full transition-all duration-1000"
              style={{ width: `${repeatRate}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold text-bushal-forest tabular-nums">৳{Math.round(clv).toLocaleString()}</p>
          <p className="text-[11px] text-bushal-inkSoft">Avg Lifetime Value</p>
          <p className="text-[10px] text-bushal-inkSoft">{insights.avgOrdersPerCustomer} orders/customer</p>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold text-emerald-600 tabular-nums">{insights.newCustomers30d}</p>
          <p className="text-[11px] text-bushal-inkSoft">New This Month</p>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold text-blue-600 tabular-nums">{insights.activeCustomers30d}</p>
          <p className="text-[11px] text-bushal-inkSoft">Active This Month</p>
        </div>
      </div>

      {insights.topSpender && (
        <div className="mt-4 pt-4 border-t border-bushal-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-bushal-inkSoft mb-2">🏆 Top Customer</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-bushal-forest">{insights.topSpender.name}</p>
              <p className="text-[11px] text-bushal-inkSoft">{insights.topSpender.orderCount} orders</p>
            </div>
            <p className="text-sm font-bold text-bushal-copper">{formatPrice(insights.topSpender.totalSpent)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Operational Metrics ─────────────────────────────────────────────────────
function OperationalMetrics({ summary }: { summary: Summary }) {
  const fulfillmentDays = useAnimatedNumber(summary.avgFulfillmentDays || 0, 1500)
  const onTimeRate = useAnimatedNumber(summary.onTimeDeliveryRate || 0, 1500)

  return (
    <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
      <h3 className="text-sm font-bold text-bushal-forest mb-4">Operational Efficiency</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-bushal-inkSoft">Avg Fulfillment Time</span>
            <span className="text-xs font-bold text-bushal-forest tabular-nums">{fulfillmentDays.toFixed(1)} days</span>
          </div>
          <div className="h-2 bg-bushal-ivoryDeep rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-bushal-forest to-bushal-forestLight rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((fulfillmentDays / 7) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-bushal-inkSoft mt-1">
            {fulfillmentDays < 2 ? '🚀 Excellent' : fulfillmentDays < 4 ? '✓ Good' : '⚠ Needs improvement'}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-bushal-inkSoft">On-Time Delivery Rate</span>
            <span className="text-xs font-bold text-emerald-600 tabular-nums">{onTimeRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-bushal-ivoryDeep rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
              style={{ width: `${onTimeRate}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-bushal-ivoryDeep/50 rounded-lg p-3">
            <p className="text-[10px] text-bushal-inkSoft">Stock-Out Cost</p>
            <p className="text-sm font-bold text-rose-600">{formatPrice(summary.stockOutCost)}</p>
            <p className="text-[9px] text-bushal-inkSoft">Estimated monthly loss</p>
          </div>
          <div className="bg-bushal-ivoryDeep/50 rounded-lg p-3">
            <p className="text-[10px] text-bushal-inkSoft">Inventory Turnover</p>
            <p className="text-sm font-bold text-bushal-copper">{summary.inventoryTurnover}x</p>
            <p className="text-[9px] text-bushal-inkSoft">Per quarter</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Revenue Chart ──────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-bushal-forest">Revenue Trend</h3>
          <p className="text-[11px] text-bushal-inkSoft mt-0.5">Last 30 days · Daily breakdown</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-bushal-copper" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-bushal-forest" />
            Profit
          </span>
        </div>
      </div>

      <div className="relative h-64">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B87333" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#B87333" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1B3A2D" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1B3A2D" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#E0D9CE" strokeWidth="0.2" strokeDasharray="1,1" />
          ))}

          {/* Revenue area */}
          <polygon
            points={`0,100 ${data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.revenue / maxRevenue) * 100}`).join(' ')} 100,100`}
            fill="url(#revenueGradient)"
          />
          <polyline
            points={data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.revenue / maxRevenue) * 100}`).join(' ')}
            fill="none"
            stroke="#B87333"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Profit line */}
          <polyline
            points={data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.profit / maxRevenue) * 100}`).join(' ')}
            fill="none"
            stroke="#1B3A2D"
            strokeWidth="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1,1"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - (d.revenue / maxRevenue) * 100
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={hoveredIndex === i ? 1.5 : 0.8}
                fill="#B87333"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div 
            className="absolute bg-bushal-forest text-white text-xs px-3 py-2 rounded-lg shadow-xl pointer-events-none animate-scale-in z-10"
            style={{ 
              left: `${(hoveredIndex / (data.length - 1)) * 100}%`, 
              top: `${100 - (data[hoveredIndex].revenue / maxRevenue) * 100 - 20}%`, 
              transform: 'translateX(-50%)' 
            }}
          >
            <p className="font-bold">{formatPrice(data[hoveredIndex].revenue)}</p>
            <p className="text-[10px] opacity-80">{data[hoveredIndex].orders} orders · {formatPrice(data[hoveredIndex].profit)} profit</p>
            <p className="text-[9px] opacity-60 mt-0.5">{data[hoveredIndex].date}</p>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[9px] text-bushal-inkSoft">
        {data.filter((_, i) => i % 5 === 0).map((d, i) => (
          <span key={i}>{d.date.slice(5)}</span>
        ))}
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminAnalyticsClient({
  summary, dailyRevenue, forecast, restockRecommendations, categoryTrends,
  customerInsights, topProducts, recentActivity, expenses
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'customers' | 'predictions'>('overview')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null)

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    setDeletingExpense(id)
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast('Expense deleted', 'success')
        router.refresh()
      }
    } catch {
      toast('Failed to delete', 'error')
    } finally {
      setDeletingExpense(null)
    }
  }

  const profitMargin = summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : '0'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'inventory', label: 'Inventory', icon: '' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'predictions', label: 'Predictions', icon: '🔮' },
  ]

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-bushal-forest tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-bushal-inkSoft mt-1">Real-time business intelligence · Powered by PostgreSQL</p>
        </div>
        <button 
          onClick={() => setShowExpenseModal(true)}
          className="inline-flex items-center gap-2 bg-bushal-copper text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-bushal-copperLight transition-all shadow-lg shadow-bushal-copper/25 hover:-translate-y-0.5 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-bushal-forest text-white shadow-lg shadow-bushal-forest/20'
                : 'bg-bushal-surface text-bushal-inkSoft border border-bushal-border hover:border-bushal-copper/30 hover:text-bushal-forest'
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedKPI 
              label="Total Revenue" 
              value={summary.totalRevenue || 0} 
              sub={`${summary.fulfilledOrdersCount} fulfilled orders`}
              accent="copper"
              icon={<span className="text-xl"></span>}
              delay={0}
            />
            <AnimatedKPI 
              label="Net Profit" 
              value={summary.totalProfit || 0} 
              sub={`${profitMargin}% margin`}
              accent={summary.totalProfit >= 0 ? 'green' : 'danger'}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
              delay={100}
            />
            <AnimatedKPI 
              label="Total Orders" 
              value={summary.fulfilledOrdersCount + summary.pendingOrders} 
              sub={`${summary.pendingOrders} pending`}
              accent="blue"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
              delay={200}
            />
            <AnimatedKPI 
              label="Customers" 
              value={summary.totalCustomers} 
              sub={`${summary.newCustomers30d} new this month`}
              accent="violet"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              delay={300}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueChart data={dailyRevenue} />
            </div>
            <PredictionCard forecast={forecast} totalRevenue={summary.totalRevenue} />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CustomerInsightCard insights={customerInsights} />
            <OperationalMetrics summary={summary} />
            
            {/* Financial Breakdown */}
            <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
              <h3 className="text-sm font-bold text-bushal-forest mb-4">Financial Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: 'Revenue', value: summary.totalRevenue, color: 'bg-blue-500', pct: 100 },
                  { label: 'Product Costs', value: summary.totalCOGS, color: 'bg-rose-500', pct: summary.totalRevenue > 0 ? (summary.totalCOGS / summary.totalRevenue) * 100 : 0 },
                  { label: 'Delivery', value: summary.totalDeliveryCharges, color: 'bg-amber-500', pct: summary.totalRevenue > 0 ? (summary.totalDeliveryCharges / summary.totalRevenue) * 100 : 0 },
                  { label: 'Net Profit', value: summary.totalProfit, color: summary.totalProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500', pct: summary.totalRevenue > 0 ? Math.abs(summary.totalProfit / summary.totalRevenue) * 100 : 0 },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-bushal-inkSoft">{item.label}</span>
                      <span className={cn('text-xs font-bold tabular-nums', item.value < 0 ? 'text-rose-600' : 'text-bushal-forest')}>
                        {formatPrice(item.value)}
                      </span>
                    </div>
                    <div className="h-2 bg-bushal-ivoryDeep rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full transition-all duration-1000', item.color)}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-fade-in">
          {/* Restock Recommendations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-bushal-forest">Restock Recommendations</h3>
                <p className="text-sm text-bushal-inkSoft">AI-powered predictions based on sales velocity</p>
              </div>
              <span className="text-xs font-semibold text-bushal-copper bg-bushal-copper/10 px-3 py-1 rounded-full">
                {restockRecommendations.length} products need attention
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {restockRecommendations.map((rec, i) => (
                <div key={rec.id} style={{ animationDelay: `${i * 50}ms` }}>
                  <RestockAlert rec={rec} />
                </div>
              ))}
            </div>
          </div>

          {/* Stock Alerts Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center animate-pulse">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-700">{summary.outOfStock}</p>
                  <p className="text-xs text-rose-600">Out of Stock</p>
                </div>
              </div>
              <p className="text-xs text-rose-600">Costing ~{formatPrice(summary.stockOutCost)}/month in lost revenue</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{summary.lowStock}</p>
                  <p className="text-xs text-amber-600">Low Stock (≤5)</p>
                </div>
              </div>
              <p className="text-xs text-amber-600">Restock soon to avoid stockouts</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{formatPrice(summary.totalInventoryValue)}</p>
                  <p className="text-xs text-emerald-600">Inventory Value</p>
                </div>
              </div>
              <p className="text-xs text-emerald-600">{summary.inventoryTurnover}x turnover rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fade-in">
          <CustomerInsightCard insights={customerInsights} />
          
          {/* Category Performance */}
          <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
            <h3 className="text-sm font-bold text-bushal-forest mb-4">Category Growth Trends</h3>
            <div className="space-y-2">
              {categoryTrends.map((trend, i) => (
                <div key={trend.category} style={{ animationDelay: `${i * 50}ms` }}>
                  <CategoryTrendRow trend={trend} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PredictionCard forecast={forecast} totalRevenue={summary.totalRevenue} />
            
            <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
              <h3 className="text-sm font-bold text-bushal-forest mb-4">Growth Insights</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-bushal-forest/5 to-bushal-copper/5 border border-bushal-copper/20">
                  <p className="text-xs text-bushal-inkSoft mb-1">Revenue Trend</p>
                  <p className="text-lg font-bold text-bushal-forest">
                    {forecast.trend === 'upward' ? '📈 Growing' : forecast.trend === 'downward' ? '📉 Declining' : '➡️ Stable'}
                  </p>
                  <p className="text-xs text-bushal-inkSoft mt-1">
                    {forecast.confidence === 'high' ? 'High confidence prediction' : 'More data needed for accurate prediction'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bushal-ivoryDeep/50">
                  <p className="text-xs text-bushal-inkSoft mb-1">Monthly Growth Rate</p>
                  <p className={cn('text-2xl font-bold', forecast.growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {forecast.growthRate >= 0 ? '+' : ''}{forecast.growthRate}%
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bushal-ivoryDeep/50">
                  <p className="text-xs text-bushal-inkSoft mb-1">Projected Annual Revenue</p>
                  <p className="text-2xl font-bold text-bushal-copper">
                    {formatPrice(forecast.nextMonthRevenue * 12)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Restock Predictions */}
          <div>
            <h3 className="text-lg font-bold text-bushal-forest mb-4">Products Likely to Stock Out</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {restockRecommendations.slice(0, 8).map((rec, i) => (
                <div key={rec.id} style={{ animationDelay: `${i * 50}ms` }}>
                  <RestockAlert rec={rec} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity & Expenses (always visible) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-bushal-forest">Recent Activity</h3>
            <span className="text-[10px] text-bushal-inkSoft bg-bushal-ivoryDeep px-2 py-1 rounded-full">Last 10 orders</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            {recentActivity.map((activity, i) => (
              <div 
                key={activity.id} 
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-bushal-ivoryDeep transition-all duration-200 group"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bushal-copper/20 to-bushal-copper/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-sm font-bold text-bushal-copper">{activity.itemCount}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-bushal-forest truncate">
                      Order #{activity.id.slice(0, 8).toUpperCase()}
                    </p>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      activity.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                      activity.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    )}>
                      {activity.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-bushal-inkSoft">
                    {activity.customer} · {new Date(activity.created_at).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm font-bold text-bushal-forest">{formatPrice(activity.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-bushal-forest">Extra Expenses</h3>
              <p className="text-[11px] text-bushal-inkSoft">Additional costs beyond product & delivery</p>
            </div>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-bushal-inkSoft">No extra expenses recorded</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
              {expenses.map((exp, i) => (
                <div 
                  key={exp.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-bushal-ivoryDeep transition-all group"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-bushal-forest truncate">{exp.label}</p>
                    <p className="text-[10px] text-bushal-inkSoft">
                      {new Date(exp.created_at).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-bushal-forest">{formatPrice(exp.amount)}</p>
                  <button 
                    onClick={() => handleDeleteExpense(exp.id)}
                    disabled={deletingExpense === exp.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-100 rounded"
                  >
                    <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}