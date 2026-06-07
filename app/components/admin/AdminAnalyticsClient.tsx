// app/components/admin/AdminAnalyticsClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface Summary {
  totalRevenue: number
  totalCOGS: number
  totalDeliveryCharges: number
  totalExtraCosts: number
  totalProfit: number
  productsAdded30d: number
  soldIn30d: number
  recentProfit30d: number
  totalInventoryValue: number
  fulfilledOrdersCount: number
  pendingOrders: number
  cancelledOrders: number
  outOfStock: number
  lowStock: number
  totalCustomers: number
  avgOrderValue: number
  conversionRate: number
}

interface DailyRevenue {
  date: string
  revenue: number
  orders: number
}

interface MonthlyPoint {
  label: string
  revenue: number
  cost: number
  profit: number
}

interface TopProduct {
  id: string
  name: string
  revenue: number
  units: number
  image_url?: string | null
  images?: string[] | null
}

interface CategoryPerformance {
  name: string
  revenue: number
  units: number
  products: number
}

interface RecentActivity {
  id: string
  total: number
  status: string
  created_at: string
  itemCount: number
  customer: string
}

interface Product {
  id: string
  name: string
  cost_price?: number
  delivery_charge?: number
  price: number
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
  monthlyData: MonthlyPoint[]
  topProducts: TopProduct[]
  categoryPerformance: CategoryPerformance[]
  recentActivity: RecentActivity[]
  products: Product[]
  expenses: Expense[]
}

// Animated Number Component - FIXED
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    const duration = 1000
    const steps = 60
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return (
    <span>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  )
}

// Progress Ring Component
function ProgressRing({ progress, size = 80, strokeWidth = 8, color = "stroke-bushal-copper" }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-bushal-ivoryDeep"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(color, "transition-all duration-1000 ease-out")}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-bushal-forest">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// KPI Card with Trend
function KPICard({ 
  label, 
  value, 
  sub, 
  trend, 
  trendUp, 
  accent, 
  icon,
  delay = 0 
}: { 
  label: string
  value: string | number
  sub?: string
  trend?: string
  trendUp?: boolean
  accent: string
  icon: React.ReactNode
  delay?: number
}) {
  const styles: Record<string, string> = {
    green:  'from-emerald-50 to-emerald-100/60 border-emerald-200',
    orange: 'from-orange-50 to-orange-100/60 border-orange-200',
    rose:   'from-rose-50 to-rose-100/60 border-rose-200',
    blue:   'from-blue-50 to-blue-100/60 border-blue-200',
    violet: 'from-violet-50 to-violet-100/60 border-violet-200',
    amber:  'from-amber-50 to-amber-100/60 border-amber-200',
    cyan:   'from-cyan-50 to-cyan-100/60 border-cyan-200',
    forest: 'from-bushal-forest/5 to-bushal-forest/10 border-bushal-border',
  }
  
  const textStyles: Record<string, string> = {
    green:  'text-emerald-700',
    orange: 'text-orange-700',
    rose:   'text-rose-600',
    blue:   'text-blue-700',
    violet: 'text-violet-700',
    amber:  'text-amber-700',
    cyan:   'text-cyan-700',
    forest: 'text-bushal-forest',
  }

  return (
    <div 
      className={cn(
        'bg-gradient-to-br rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in-up',
        styles[accent]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-md', `bg-${accent}-200/50`)}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-bold px-2 py-1 rounded-full',
            trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
          )}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div>
        <p className={cn('text-2xl font-extrabold tracking-tight', textStyles[accent])}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-bushal-inkSoft mt-1">{label}</p>
        {sub && <p className="text-xs text-bushal-inkSoft mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// Area Chart Component
function AreaChart({ data }: { data: DailyRevenue[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - (d.revenue / maxRevenue) * 100
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,100 ${points} 100,100`

  return (
    <div className="bg-white rounded-2xl border border-bushal-border p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-bushal-forest">Revenue Trend</h3>
          <p className="text-[11px] text-bushal-inkSoft mt-0.5">Last 14 days performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-bushal-copper" />
          <span className="text-[11px] text-bushal-inkSoft">Revenue</span>
        </div>
      </div>
      
      <div className="relative h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B87333" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#B87333" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#areaGradient)" />
          <polyline
            points={points}
            fill="none"
            stroke="#B87333"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
          {data.map((_, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - (data[i].revenue / maxRevenue) * 100
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={hoveredIndex === i ? "1.5" : "1"}
                fill="#B87333"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>
        
        {hoveredIndex !== null && (
          <div 
            className="absolute bg-bushal-forest text-white text-xs px-2 py-1 rounded-lg shadow-lg pointer-events-none animate-scale-in"
            style={{
              left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
              top: `${100 - (data[hoveredIndex].revenue / maxRevenue) * 100 - 15}%`,
              transform: 'translateX(-50%)'
            }}
          >
            {formatPrice(data[hoveredIndex].revenue)}
            <div className="text-[10px] opacity-80">{data[hoveredIndex].orders} orders</div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <div key={i} className="text-[10px] text-bushal-inkSoft text-center flex-1">
            {d.date.split(' ')[0]}
          </div>
        ))}
      </div>
    </div>
  )
}

// Donut Chart Component
function DonutChart({ 
  data, 
  size = 160 
}: { 
  data: { label: string; value: number; color: string }[]
  size?: number 
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  let cumulativePercent = 0
  
  return (
    <div className="bg-white rounded-2xl border border-bushal-border p-6 animate-fade-in-up">
      <h3 className="text-sm font-bold text-bushal-forest mb-4">Category Performance</h3>
      
      <div className="flex items-center gap-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
            {data.map((segment, i) => {
              const percent = segment.value / total
              const circumference = 2 * Math.PI * 40
              const strokeDasharray = `${percent * circumference} ${circumference}`
              const strokeDashoffset = -cumulativePercent * circumference
              cumulativePercent += percent
              
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth={hoveredIndex === i ? "12" : "10"}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-bushal-forest">{data.length}</div>
              <div className="text-[10px] text-bushal-inkSoft">Categories</div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          {data.map((d, i) => (
            <div 
              key={i} 
              className={cn(
                'flex items-center justify-between p-2 rounded-lg transition-all duration-200',
                hoveredIndex === i ? 'bg-bushal-ivory scale-105' : ''
              )}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs font-medium text-bushal-forest">{d.label}</span>
              </div>
              <span className="text-xs font-bold text-bushal-ink">
                {formatPrice(d.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Activity Feed Component
function ActivityFeed({ activities }: { activities: RecentActivity[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return 'bg-emerald-100 text-emerald-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'cancelled': return 'bg-rose-100 text-rose-600'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-bushal-border p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-bushal-forest">Recent Activity</h3>
        <span className="text-[11px] text-bushal-inkSoft bg-bushal-ivory px-2 py-1 rounded-full">
          Last 10 orders
        </span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity, i) => (
          <div 
            key={activity.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-bushal-ivory transition-all duration-200 group animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bushal-copper/20 to-bushal-copper/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <span className="text-sm font-bold text-bushal-copper">
                {activity.itemCount}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-bushal-forest truncate">
                  Order #{activity.id.slice(0, 8).toUpperCase()}
                </p>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', getStatusColor(activity.status))}>
                  {activity.status}
                </span>
              </div>
              <p className="text-[11px] text-bushal-inkSoft">
                {new Date(activity.created_at).toLocaleDateString('en-BD', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-bushal-forest">
                {formatPrice(activity.total)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Top Products List
function TopProductsList({ products }: { products: TopProduct[] }) {
  return (
    <div className="bg-white rounded-2xl border border-bushal-border p-6 animate-fade-in-up">
      <h3 className="text-sm font-bold text-bushal-forest mb-4">Top Performing Products</h3>
      
      <div className="space-y-3">
        {products.map((product, i) => {
          const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
          return (
            <div 
              key={product.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-bushal-ivory transition-all duration-200 group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-xs font-bold text-bushal-inkSoft w-5">
                #{i + 1}
              </div>
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-bushal-ivoryDeep flex-shrink-0 group-hover:scale-110 transition-transform">
                {cover ? (
                  <img src={cover} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-bushal-forest truncate">{product.name}</p>
                <p className="text-[11px] text-bushal-inkSoft">{product.units} units sold</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-bushal-copper">{formatPrice(product.revenue)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Stock Alert Component
function StockAlert({ summary }: { summary: Summary }) {
  const alerts = [
    { 
      label: 'Out of Stock', 
      count: summary.outOfStock, 
      color: 'bg-rose-500', 
      bgColor: 'bg-rose-50', 
      textColor: 'text-rose-700',
      icon: '⚠️'
    },
    { 
      label: 'Low Stock (≤5)', 
      count: summary.lowStock, 
      color: 'bg-amber-500', 
      bgColor: 'bg-amber-50', 
      textColor: 'text-amber-700',
      icon: '⚡'
    },
  ].filter(a => a.count > 0)

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-xl">✓</span>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">Inventory Healthy</p>
            <p className="text-xs text-emerald-600">All products are well stocked</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      {alerts.map((alert, i) => (
        <div 
          key={i}
          className={cn('rounded-2xl border p-4 flex items-center justify-between', alert.bgColor, alert.textColor.replace('700', '200'))}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{alert.icon}</span>
            <div>
              <p className={cn('text-sm font-bold', alert.textColor)}>{alert.label}</p>
              <p className="text-xs opacity-80">Requires immediate attention</p>
            </div>
          </div>
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold', alert.color)}>
            {alert.count}
          </div>
        </div>
      ))}
    </div>
  )
}

function AddExpenseModal({ products, onClose, onSaved }: { products: Product[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ label: '', amount: '', product_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.label.trim() || !form.amount) { setError('Label and amount are required'); return }
    setSaving(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: form.label.trim(), amount: parseFloat(form.amount), product_id: form.product_id || null }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-bushal-border shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-bushal-forest">Add Expense</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-bushal-inkSoft hover:text-bushal-forest hover:bg-bushal-ivory transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-bushal-ink mb-1.5">Expense Label *</label>
            <input type="text" placeholder="e.g. Packaging cost, Marketing, Shipping fee"
              value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full rounded-xl border border-bushal-border px-4 py-2.5 text-sm focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-bushal-ink mb-1.5">Amount (৳) *</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-xl border border-bushal-border px-4 py-2.5 text-sm focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-bushal-ink mb-1.5">Related Product (optional)</label>
            <select value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
              className="w-full rounded-xl border border-bushal-border px-4 py-2.5 text-sm focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
            >
              <option value="">General expense (all products)</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-bushal-border text-sm font-semibold text-bushal-ink hover:bg-bushal-ivory transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-bushal-copper text-white text-sm font-semibold hover:bg-bushal-copperLight disabled:opacity-50 transition-all shadow-lg shadow-bushal-copper/20">
            {saving ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminAnalyticsClient({ 
  summary, 
  dailyRevenue, 
  monthlyData, 
  topProducts, 
  categoryPerformance,
  recentActivity,
  products, 
  expenses 
}: Props) {
  const router = useRouter()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null)

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    setDeletingExpense(id)
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    setDeletingExpense(null)
    router.refresh()
  }

  const profitMargin = summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : '0'
  const orderFulfillmentRate = summary.fulfilledOrdersCount + summary.pendingOrders > 0 
    ? ((summary.fulfilledOrdersCount / (summary.fulfilledOrdersCount + summary.pendingOrders)) * 100).toFixed(1) 
    : '0'

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-extrabold text-bushal-forest tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-bushal-inkSoft mt-1">Real-time business insights and performance metrics</p>
        </div>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="inline-flex items-center gap-2 bg-bushal-copper text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-bushal-copperLight transition-all shadow-lg shadow-bushal-copper/25 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={formatPrice(summary.totalRevenue)}
          sub={`${summary.fulfilledOrdersCount} fulfilled orders`}
          trend="12.5%"
          trendUp={true}
          accent="blue"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          delay={0}
        />
        <KPICard
          label="Net Profit"
          value={formatPrice(summary.totalProfit)}
          sub={`${profitMargin}% margin`}
          trend="8.2%"
          trendUp={summary.totalProfit > 0}
          accent={summary.totalProfit >= 0 ? 'green' : 'rose'}
          icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          delay={100}
        />
        <KPICard
          label="Total Orders"
          value={summary.fulfilledOrdersCount + summary.pendingOrders}
          sub={`${summary.pendingOrders} pending`}
          trend="5.3%"
          trendUp={true}
          accent="orange"
          icon={<svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
          delay={200}
        />
        <KPICard
          label="Customers"
          value={summary.totalCustomers}
          sub={`${summary.conversionRate}% conversion`}
          trend="15.7%"
          trendUp={true}
          accent="violet"
          icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          delay={300}
        />
      </div>

      {/* Second Row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Avg Order Value"
          value={formatPrice(summary.avgOrderValue)}
          sub="per order"
          accent="cyan"
          icon={<svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          delay={400}
        />
        <KPICard
          label="Inventory Value"
          value={formatPrice(summary.totalInventoryValue)}
          sub="total stock"
          accent="amber"
          icon={<svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          delay={500}
        />
        <KPICard
          label="Products (30d)"
          value={summary.productsAdded30d}
          sub="new additions"
          accent="forest"
          icon={<svg className="w-5 h-5 text-bushal-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          delay={600}
        />
        <KPICard
          label="Units Sold (30d)"
          value={summary.soldIn30d}
          sub="from fulfilled orders"
          accent="green"
          icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
          delay={700}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AreaChart data={dailyRevenue} />
        </div>
        <div>
          <StockAlert summary={summary} />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DonutChart 
          data={categoryPerformance.map((cat, i) => ({
            label: cat.name,
            value: cat.revenue,
            color: ['#B87333', '#1B3A2D', '#2D5A42', '#3D7A5A', '#D4954A'][i % 5]
          }))}
        />
        <TopProductsList products={topProducts} />
        <ActivityFeed activities={recentActivity} />
      </div>

      {/* Profit Breakdown with Progress Rings */}
      <div className="bg-white rounded-2xl border border-bushal-border p-6 animate-fade-in-up">
        <h3 className="text-sm font-bold text-bushal-forest mb-6">Financial Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <ProgressRing progress={100} color="stroke-blue-500" />
            <div>
              <p className="text-xs text-bushal-inkSoft">Revenue</p>
              <p className="text-lg font-bold text-bushal-forest">{formatPrice(summary.totalRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing progress={summary.totalRevenue > 0 ? (summary.totalCOGS / summary.totalRevenue) * 100 : 0} color="stroke-rose-500" />
            <div>
              <p className="text-xs text-bushal-inkSoft">Product Costs</p>
              <p className="text-lg font-bold text-bushal-forest">{formatPrice(summary.totalCOGS)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing progress={summary.totalRevenue > 0 ? (summary.totalDeliveryCharges / summary.totalRevenue) * 100 : 0} color="stroke-amber-500" />
            <div>
              <p className="text-xs text-bushal-inkSoft">Delivery</p>
              <p className="text-lg font-bold text-bushal-forest">{formatPrice(summary.totalDeliveryCharges)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing progress={summary.totalRevenue > 0 ? Math.abs(summary.totalProfit / summary.totalRevenue) * 100 : 0} color={summary.totalProfit >= 0 ? "stroke-emerald-500" : "stroke-rose-500"} />
            <div>
              <p className="text-xs text-bushal-inkSoft">Net Profit</p>
              <p className={cn('text-lg font-bold', summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {formatPrice(summary.totalProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white rounded-2xl border border-bushal-border p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-bushal-forest">Monthly Performance</h3>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">Revenue, costs, and profit trends</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" />Profit</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-400" />Cost</span>
          </div>
        </div>
        
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map((d, i) => {
            const maxVal = Math.max(...monthlyData.map(m => Math.max(m.revenue, m.profit, m.cost)), 1)
            const revH = (d.revenue / maxVal) * 100
            const profH = Math.max((d.profit / maxVal) * 100, 0)
            const costH = (d.cost / maxVal) * 100
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex gap-1 items-end h-full">
                  <div 
                    className="flex-1 bg-blue-400 rounded-t-md transition-all duration-500 hover:bg-blue-500 relative"
                    style={{ height: `${revH}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bushal-forest text-white text-[10px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatPrice(d.revenue)}
                    </div>
                  </div>
                  <div 
                    className="flex-1 bg-rose-400 rounded-t-md transition-all duration-500 hover:bg-rose-500 relative"
                    style={{ height: `${costH}%` }}
                  />
                  <div 
                    className={cn('flex-1 rounded-t-md transition-all duration-500 relative', d.profit >= 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600')}
                    style={{ height: `${profH}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bushal-forest text-white text-[10px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatPrice(d.profit)}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-bushal-inkSoft font-medium">{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl border border-bushal-border overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-bushal-border">
          <div>
            <h3 className="text-sm font-bold text-bushal-forest">Extra Expenses</h3>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">Additional costs beyond product and delivery</p>
          </div>
          <button onClick={() => setShowExpenseModal(true)} className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight flex items-center gap-1 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
        {expenses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-bushal-ivoryDeep rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-bushal-inkSoft">No extra expenses recorded yet.</p>
            <button onClick={() => setShowExpenseModal(true)} className="mt-3 text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors">Add your first expense →</button>
          </div>
        ) : (
          <div className="divide-y divide-bushal-ivory">
            {expenses.map((exp, i) => (
              <div key={exp.id} className="flex items-center gap-4 px-6 py-4 hover:bg-bushal-ivory transition-all duration-200 group" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-bushal-forest truncate">{exp.label}</p>
                  <p className="text-[11px] text-bushal-inkSoft mt-0.5">
                    {new Date(exp.created_at).toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm font-bold text-bushal-forest">{formatPrice(exp.amount)}</p>
                <button
                  onClick={() => handleDeleteExpense(exp.id)}
                  disabled={deletingExpense === exp.id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-bushal-borderMid hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showExpenseModal && (
        <AddExpenseModal
          products={products}
          onClose={() => setShowExpenseModal(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}