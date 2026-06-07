// app/(admin)/admin/analytics/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { formatPrice } from '@/app/lib/utils/formatPrice'

// ── Enhanced Chart Components ──────────────────────────────────────────────

// Line Chart for Trends
function LineChart({ 
  data, 
  color = '#ea580c',
  height = 120 
}: { 
  data: number[]
  color?: string
  height?: number
}) {
  if (data.length < 2) return null
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const width = 100
  const h = height
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = h - ((val - min) / range) * (h - 20) - 10
    return `${x},${y}`
  }).join(' ')
  
  const areaPoints = `0,${h} ${points} ${width},${h}`
  
  return (
    <svg viewBox={`0 0 ${width} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon 
        points={areaPoints} 
        fill={`url(#gradient-${color.replace('#', '')})`} 
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
      {data.map((_, i) => {
        const x = (i / (data.length - 1)) * width
        const y = h - ((data[i] - min) / range) * (h - 20) - 10
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            className="hover:r-3 transition-all"
          />
        )
      })}
    </svg>
  )
}

// Radial Progress Ring
function RadialProgress({ 
  value, 
  max, 
  size = 100, 
  strokeWidth = 8,
  color = "#ea580c",
  label,
  sublabel
}: { 
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  label: string
  sublabel?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / max, 1)
  const offset = circumference - progress * circumference
  
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-100"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-900">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
      <span className="text-xs font-semibold text-slate-700 mt-2 text-center">{label}</span>
      {sublabel && <span className="text-[10px] text-slate-400">{sublabel}</span>}
    </div>
  )
}

// Horizontal Bar Chart
function HorizontalBarChart({ 
  data, 
  maxValue 
}: { 
  data: { label: string; value: number; color: string }[]
  maxValue: number
}) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = (item.value / maxValue) * 100
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="font-bold text-slate-900">{formatPrice(item.value)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: item.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Stats Grid with Sparklines
function StatCard({ 
  title, 
  value, 
  change, 
  changeType,
  icon,
  trend,
  color
}: { 
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: string
  trend?: number[]
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-base shadow-md`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            changeType === 'positive' ? 'bg-emerald-100 text-emerald-700' :
            changeType === 'negative' ? 'bg-rose-100 text-rose-600' :
            'bg-slate-100 text-slate-600'
          }`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
      <p className="text-xs text-slate-400 font-medium mt-0.5">{title}</p>
      {trend && trend.length > 0 && (
        <div className="mt-3 h-10">
          <LineChart data={trend} color={color.includes('orange') ? '#ea580c' : color.includes('blue') ? '#3b82f6' : '#10b981'} height={40} />
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

export default async function AdminAnalyticsPage() {
  const supabase = createServerClient()
  
  // Fetch all data
  const [
    { data: products },
    { data: orders },
    { data: orderItems },
    { data: expenses },
    { count: totalCustomers },
    { data: categories },
  ] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('order_items').select('*'),
    supabase.from('product_expenses').select('*'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('categories').select('*'),
  ])

  const allProducts = products ?? []
  const allOrders = orders ?? []
  const allItems = orderItems ?? []
  const allExpenses = expenses ?? []

  // Revenue metrics
  const fulfilledOrders = allOrders.filter((o) => o.status === 'fulfilled')
  const totalRevenue = fulfilledOrders.reduce((s, o) => s + Number(o.total), 0)
  const pendingOrders = allOrders.filter((o) => o.status === 'pending').length
  const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled').length

  // Calculate costs
  const productCostMap: Record<string, number> = {}
  const productDeliveryMap: Record<string, number> = {}
  allProducts.forEach((p) => {
    productCostMap[p.id] = Number(p.cost_price ?? 0)
    productDeliveryMap[p.id] = Number(p.delivery_charge ?? 0)
  })

  const fulfilledOrderIds = new Set(fulfilledOrders.map((o) => o.id))
  const fulfilledItems = allItems.filter((i) => fulfilledOrderIds.has(i.order_id))

  const totalCOGS = fulfilledItems.reduce((s, item) => {
    const cost = productCostMap[item.product_id] ?? 0
    return s + cost * item.quantity
  }, 0)

  const totalDeliveryCharges = fulfilledItems.reduce((s, item) => {
    const dc = productDeliveryMap[item.product_id] ?? 0
    return s + dc * item.quantity
  }, 0)

  const totalExtraCosts = allExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalProfit = totalRevenue - totalCOGS - totalDeliveryCharges - totalExtraCosts
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'

  // Stock metrics
  const outOfStock = allProducts.filter((p) => !p.in_stock).length
  const lowStock = allProducts.filter((p) => p.in_stock && p.stock_quantity <= 5).length
  const healthyStock = allProducts.length - outOfStock - lowStock

  // Time series data (last 14 days)
  const dailyData: { date: string; revenue: number; orders: number; customers: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayOrders = allOrders.filter((o) => o.created_at.startsWith(key))
    const dayFulfilled = dayOrders.filter((o) => o.status === 'fulfilled')
    
    dailyData.push({
      date: d.toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric' }),
      revenue: dayFulfilled.reduce((s, o) => s + Number(o.total), 0),
      orders: dayOrders.length,
      customers: new Set(dayOrders.map((o) => o.user_id)).size,
    })
  }

  // Monthly data (last 6 months)
  const monthlyData: { label: string; revenue: number; orders: number; profit: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-BD', { month: 'short', year: '2-digit' })
    
    const monthOrders = allOrders.filter((o) => o.created_at.startsWith(key))
    const monthFulfilled = monthOrders.filter((o) => o.status === 'fulfilled')
    const monthRevenue = monthFulfilled.reduce((s, o) => s + Number(o.total), 0)
    
    const monthOrderIds = new Set(monthFulfilled.map((o) => o.id))
    const monthItems = allItems.filter((i) => monthOrderIds.has(i.order_id))
    const monthCOGS = monthItems.reduce((s, i) => s + (productCostMap[i.product_id] ?? 0) * i.quantity, 0)
    const monthDelivery = monthItems.reduce((s, i) => s + (productDeliveryMap[i.product_id] ?? 0) * i.quantity, 0)
    const monthProfit = monthRevenue - monthCOGS - monthDelivery

    monthlyData.push({
      label,
      revenue: monthRevenue,
      orders: monthOrders.length,
      profit: monthProfit,
    })
  }

  // Category performance
  const categoryPerformance = categories?.map((cat) => {
    const catProducts = allProducts.filter((p) => p.category === cat.name)
    const catProductIds = new Set(catProducts.map((p) => p.id))
    const catItems = fulfilledItems.filter((i) => catProductIds.has(i.product_id))
    const revenue = catItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
    return {
      name: cat.name,
      revenue,
      products: catProducts.length,
      color: cat.color || '#ea580c',
    }
  }).sort((a, b) => b.revenue - a.revenue) || []

  // Top products
  const productRevenue: Record<string, number> = {}
  const productUnits: Record<string, number> = {}
  fulfilledItems.forEach((item) => {
    productRevenue[item.product_id] = (productRevenue[item.product_id] ?? 0) + (item.unit_price * item.quantity)
    productUnits[item.product_id] = (productUnits[item.product_id] ?? 0) + item.quantity
  })

  const topProducts = allProducts
    .map((p) => ({
      ...p,
      revenue: productRevenue[p.id] ?? 0,
      units: productUnits[p.id] ?? 0,
      value: p.price * p.stock_quantity,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Payment method breakdown
  const bkashOrders = allOrders.filter((o) => o.bkash_trx_id && o.status === 'fulfilled')
  const codOrders = allOrders.filter((o) => !o.bkash_trx_id && o.status === 'fulfilled')
  const bkashRevenue = bkashOrders.reduce((s, o) => s + Number(o.total), 0)
  const codRevenue = codOrders.reduce((s, o) => s + Number(o.total), 0)

  // Recent activity
  const recentOrders = allOrders.slice(0, 10)

  // Revenue trends
  const revenueTrend = dailyData.map((d) => d.revenue)
  const orderTrend = dailyData.map((d) => d.orders)

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time business insights and performance metrics</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatPrice(totalRevenue)}
          change="+12.5%"
          changeType="positive"
          icon="৳"
          trend={revenueTrend}
          color="bg-blue-500"
        />
        <StatCard
          title="Net Profit"
          value={formatPrice(totalProfit)}
          change={`${profitMargin}% margin`}
          changeType={totalProfit >= 0 ? 'positive' : 'negative'}
          icon="📈"
          trend={monthlyData.map((m) => m.profit)}
          color="bg-emerald-500"
        />
        <StatCard
          title="Total Orders"
          value={allOrders.length}
          change="+5.3%"
          changeType="positive"
          icon="📦"
          trend={orderTrend}
          color="bg-orange-500"
        />
        <StatCard
          title="Customers"
          value={totalCustomers ?? 0}
          change="+15.7%"
          changeType="positive"
          icon="👥"
          trend={dailyData.map((d) => d.customers)}
          color="bg-violet-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 14 days performance</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-slate-400">Revenue</span>
            </div>
          </div>
          <LineChart data={revenueTrend} color="#ea580c" height={200} />
          <div className="flex justify-between mt-4">
            {dailyData.map((d, i) => (
              <div key={i} className="text-[10px] text-slate-400 text-center">
                {d.date.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Payment Methods</h3>
          <p className="text-xs text-slate-400 mb-6">Revenue by payment type</p>
          
          <div className="flex justify-center mb-6">
            <RadialProgress 
              value={bkashRevenue}
              max={totalRevenue}
              size={140}
              color="#ea580c"
              label="bKash"
              sublabel={`${((bkashRevenue / totalRevenue) * 100).toFixed(0)}%`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs font-semibold text-slate-700">bKash</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{formatPrice(bkashRevenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-700">COD</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{formatPrice(codRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Category Performance</h3>
          <p className="text-xs text-slate-400 mb-6">Revenue by category</p>
          <HorizontalBarChart 
            data={categoryPerformance.slice(0, 5).map((c) => ({
              label: c.name,
              value: c.revenue,
              color: c.color,
            }))}
            maxValue={Math.max(...categoryPerformance.map((c) => c.revenue), 1)}
          />
        </div>

        {/* Stock Health */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Inventory Health</h3>
          <p className="text-xs text-slate-400 mb-6">Stock status overview</p>
          
          <div className="grid grid-cols-3 gap-4">
            <RadialProgress 
              value={healthyStock}
              max={allProducts.length}
              size={100}
              color="#10b981"
              label="Healthy"
              sublabel={`${healthyStock} products`}
            />
            <RadialProgress 
              value={lowStock}
              max={allProducts.length}
              size={100}
              color="#f59e0b"
              label="Low Stock"
              sublabel={`${lowStock} products`}
            />
            <RadialProgress 
              value={outOfStock}
              max={allProducts.length}
              size={100}
              color="#f43f5e"
              label="Out of Stock"
              sublabel={`${outOfStock} products`}
            />
          </div>
        </div>
      </div>

      {/* Top Products & Monthly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Top Products</h3>
          <div className="space-y-3">
            {topProducts.map((p, i) => {
              const cover = (Array.isArray(p.images) && p.images[0]) || p.image_url
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {cover ? (
                      <img src={cover} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.units} units sold</p>
                  </div>
                  <span className="text-xs font-bold text-orange-600">{formatPrice(p.revenue)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Monthly Performance</h3>
          <div className="space-y-4">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-600 w-16">{m.label}</span>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(m.revenue / Math.max(...monthlyData.map((x) => x.revenue), 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-900 w-20 text-right">{formatPrice(m.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(m.profit / Math.max(...monthlyData.map((x) => x.profit), 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-900 w-20 text-right">{formatPrice(m.profit)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide py-2">Order ID</th>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide py-2">Date</th>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide py-2">Status</th>
                <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 text-xs font-mono font-semibold text-slate-700">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="py-3 text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString('en-BD', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                      order.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      order.status === 'cancelled' ? 'bg-rose-100 text-rose-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 text-xs font-bold text-slate-900 text-right">
                    {formatPrice(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}