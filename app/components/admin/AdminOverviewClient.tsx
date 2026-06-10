// app/components/admin/AdminOverviewClient.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  productCount: number; orderCount: number; userCount: number; totalRevenue: number;
  fulfilledOrdersCount: number; pendingOrders: number; cancelledOrders: number;
  outOfStock: number; lowStock: number; healthyStock: number;
}

interface Props {
  stats: Stats;
  revenueBarData: { label: string; value: number }[];
  revenuePoints: number[];
  orderPoints: number[];
  orderSegments: { value: number; color: string; label: string }[];
  catEntries: { label: string; value: number; color: string }[];
  inventorySegments: { value: number; color: string; label: string }[];
  topByValue: any[];
  recentOrders: any[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useAnimatedNumber(target: number, duration: number = 1200) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const startTime = performance.now()
    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCurrent(Math.floor(easeProgress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return current
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  revenue: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  orders: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  products: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  customers: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  plus: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
}

// ─── Sparkline Chart ──────────────────────────────────────────────────────────
function SparkLine({ points, color = '#B87333' }: { points: number[]; color?: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points, 1)
  const min = Math.min(...points)
  const range = max - min || 1
  const w = 100, h = 32
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#grad-${color})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Animated Bar Chart ───────────────────────────────────────────────────────
function AnimatedBarChart({ data }: { data: { label: string; value: number }[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="relative h-48 w-full mt-6">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="border-b border-dashed border-bushal-border/40 w-full" />
        ))}
      </div>
      
      <div className="relative flex items-end gap-3 h-full w-full px-2 pb-6">
        {data.map((d, i) => {
          const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <div className="relative w-full h-full flex items-end">
                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-bushal-forest text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10 shadow-xl scale-95 group-hover:scale-100">
                  <p className="text-bushal-copperGlow">{formatPrice(d.value)}</p>
                </div>
                {/* Bar */}
                <div 
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-1000 ease-out relative overflow-hidden",
                    d.value > 0 
                      ? "bg-gradient-to-t from-bushal-copper to-bushal-copperLight group-hover:from-bushal-copperLight group-hover:to-bushal-copperGlow" 
                      : "bg-bushal-ivoryDeep"
                  )}
                  style={{ height: mounted ? `${Math.max(pct, 2)}%` : '0%', transitionDelay: `${i * 100}ms` }}
                >
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
              </div>
              <span className="text-[10px] font-semibold text-bushal-inkSoft text-center leading-tight">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Animated Donut Chart ─────────────────────────────────────────────────────
function AnimatedDonut({ segments, size = 120, centerLabel, centerSub }: any) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  
  const total = segments.reduce((s: number, seg: any) => s + seg.value, 0) || 1
  const r = 40, cx = 60, cy = 60
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" className="-rotate-90">
        {segments.map((arc: any, i: number) => {
          const pct = arc.value / total
          const dash = pct * circumference
          const gap = circumference - dash
          const currentOffset = offset
          offset += dash
          return (
            <circle
              key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={mounted ? `${dash} ${gap}` : `0 ${circumference}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-1000 ease-out"
              style={{ transitionDelay: `${i * 150}ms` }}
            />
          )
        })}
        <circle cx={cx} cy={cy} r="28" fill="var(--bg, #F9F6F0)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in" style={{ animationDelay: '800ms' }}>
        <p className="text-xl font-extrabold text-bushal-forest leading-none tabular-nums">{centerLabel}</p>
        <p className="text-[9px] font-bold text-bushal-inkSoft mt-1 uppercase tracking-widest">{centerSub}</p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminOverviewClient({
  stats, revenueBarData, revenuePoints, orderPoints, orderSegments,
  catEntries, inventorySegments, topByValue, recentOrders
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const maxRev = Math.max(...revenueBarData.map(d => d.value), 1)
  const maxValue = Math.max(...topByValue.map(p => p.price * p.stock_quantity), 1)

  const kpis = [
    { label: 'Total Revenue', value: stats.totalRevenue, sub: `${stats.fulfilledOrdersCount} fulfilled`, icon: Icons.revenue, accent: 'bg-bushal-copper/5', iconBg: 'bg-bushal-copper/10 text-bushal-copper', trend: revenuePoints, trendColor: '#B87333', isPrice: true },
    { label: 'Total Orders', value: stats.orderCount, sub: `${stats.pendingOrders} pending`, icon: Icons.orders, accent: 'bg-bushal-forest/5', iconBg: 'bg-bushal-forest/10 text-bushal-forest', trend: orderPoints, trendColor: '#1B3A2D', isPrice: false },
    { label: 'Products', value: stats.productCount, sub: `${stats.outOfStock} out of stock`, icon: Icons.products, accent: 'bg-blue-50', iconBg: 'bg-blue-100 text-blue-600', trend: null, trendColor: '#3b82f6', isPrice: false },
    { label: 'Customers', value: stats.userCount, sub: 'Registered accounts', icon: Icons.customers, accent: 'bg-violet-50', iconBg: 'bg-violet-100 text-violet-600', trend: null, trendColor: '#8b5cf6', isPrice: false },
  ]

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up" style={{ animationDelay: '0ms' }}>
        <div>
          <h1 className="text-2xl font-extrabold text-bushal-forest tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-bushal-inkSoft mt-0.5">Real-time store performance · Bushal Admin</p>
        </div>
        <Link
          href="/admin/products/new"
          className="group inline-flex items-center gap-2 bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-bushal-copper/20 hover:shadow-bushal-copper/40 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
        >
          <span className="group-hover:rotate-90 transition-transform duration-300">{Icons.plus}</span>
          Add Product
        </Link>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const animatedVal = useAnimatedNumber(kpi.value)
          return (
            <div
              key={kpi.label}
              className={cn(
                "animate-fade-up group relative bg-bushal-surface rounded-2xl border border-bushal-border p-5 overflow-hidden",
                "hover:shadow-xl hover:border-bushal-copper/30 hover:-translate-y-1 transition-all duration-300"
              )}
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              {/* Subtle gradient background on hover */}
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500", kpi.accent)} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110", kpi.iconBg)}>
                    {kpi.icon}
                  </div>
                  {kpi.trend && kpi.trend.length > 1 && (
                    <div className="w-16 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
                      <SparkLine points={kpi.trend} color={kpi.trendColor} />
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-bushal-forest tracking-tight tabular-nums">
                  {kpi.isPrice ? formatPrice(animatedVal) : animatedVal.toLocaleString()}
                </p>
                <p className="text-sm font-semibold text-bushal-inkSoft mt-1">{kpi.label}</p>
                {kpi.sub && <p className="text-xs text-bushal-inkSoft/70 mt-0.5">{kpi.sub}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Main Charts Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-bushal-surface rounded-2xl border border-bushal-border p-6 animate-fade-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-bushal-forest">Revenue Trend</h2>
              <p className="text-xs text-bushal-inkSoft mt-0.5">Last 7 days · Fulfilled orders only</p>
            </div>
            <span className="text-xs font-bold text-bushal-copper bg-bushal-copper/10 px-3 py-1.5 rounded-full">
              {formatPrice(stats.totalRevenue)}
            </span>
          </div>
          <AnimatedBarChart data={revenueBarData} />
        </div>

        {/* Order Status Donut */}
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 animate-fade-up" style={{ animationDelay: '600ms' }}>
          <h2 className="text-sm font-bold text-bushal-forest mb-1">Order Status</h2>
          <p className="text-xs text-bushal-inkSoft mb-6">Distribution of recent orders</p>
          
          <div className="flex items-center justify-center mb-6">
            <AnimatedDonut segments={orderSegments} size={140} centerLabel={stats.orderCount} centerSub="Total" />
          </div>
          
          <div className="space-y-3">
            {orderSegments.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between animate-fade-up" style={{ animationDelay: `${800 + i * 100}ms` }}>
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full flex-shrink-0 ring-4 ring-white" style={{ background: s.color }} />
                  <span className="text-xs font-semibold text-bushal-ink">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-bushal-forest tabular-nums">{s.value}</span>
                  <span className="text-[10px] text-bushal-inkSoft tabular-nums">
                    {Math.round((s.value / (stats.orderCount || 1)) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Secondary Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 animate-fade-up" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-bushal-forest">Category Distribution</h2>
              <p className="text-xs text-bushal-inkSoft mt-0.5">{stats.productCount} total products</p>
            </div>
            <Link href="/admin/categories" className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors">
              Manage →
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <AnimatedDonut segments={catEntries} size={100} centerLabel={catEntries.length} centerSub="Categories" />
            <div className="flex-1 space-y-2.5 overflow-hidden">
              {catEntries.slice(0, 5).map((c, i) => (
                <div key={c.label} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${900 + i * 50}ms` }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-xs font-semibold text-bushal-ink truncate flex-1">{c.label}</span>
                  <span className="text-xs font-bold text-bushal-forest tabular-nums">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Health */}
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 animate-fade-up" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-bushal-forest">Inventory Health</h2>
              <p className="text-xs text-bushal-inkSoft mt-0.5">Stock status across all products</p>
            </div>
            <Link href="/admin/products" className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <AnimatedDonut segments={inventorySegments} size={100} centerLabel={stats.healthyStock} centerSub="Healthy" />
            <div className="flex-1 space-y-4">
              {[
                { label: 'In Stock', count: stats.healthyStock, color: 'bg-bushal-forest', pct: (stats.healthyStock / (stats.productCount || 1)) * 100 },
                { label: 'Low Stock', count: stats.lowStock, color: 'bg-bushal-copper', pct: (stats.lowStock / (stats.productCount || 1)) * 100 },
                { label: 'Out of Stock', count: stats.outOfStock, color: 'bg-bushal-danger', pct: (stats.outOfStock / (stats.productCount || 1)) * 100 },
              ].map((s, i) => (
                <div key={s.label} className="animate-fade-up" style={{ animationDelay: `${1000 + i * 100}ms` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-bushal-ink">{s.label}</span>
                    <span className="text-xs font-bold text-bushal-forest tabular-nums">{s.count}</span>
                  </div>
                  <div className="h-2 bg-bushal-ivoryDeep rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000 ease-out", s.color)} 
                      style={{ width: mounted ? `${s.pct}%` : '0%', transitionDelay: `${1200 + i * 150}ms` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Top Products */}
        <div className="lg:col-span-3 bg-bushal-surface rounded-2xl border border-bushal-border p-6 animate-fade-up" style={{ animationDelay: '900ms' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-bushal-forest">Top Products by Value</h2>
              <p className="text-xs text-bushal-inkSoft mt-0.5">Price × Stock Quantity</p>
            </div>
          </div>
          <div className="space-y-4">
            {topByValue.map((p, i) => {
              const val = p.price * p.stock_quantity
              const pct = (val / maxValue) * 100
              const cover = (Array.isArray(p.images) && p.images[0]) || p.image_url
              const isOut = p.stock_quantity === 0
              const isLow = p.stock_quantity > 0 && p.stock_quantity <= 5
              
              return (
                <div key={p.id} className="flex items-center gap-4 group animate-fade-up" style={{ animationDelay: `${1100 + i * 50}ms` }}>
                  <span className="w-6 text-[11px] font-bold text-bushal-inkSoft/50 text-center flex-shrink-0 tabular-nums">{i + 1}</span>
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-bushal-ivoryDeep flex-shrink-0 border border-bushal-border group-hover:scale-105 transition-transform duration-300">
                    {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-bushal-borderMid text-sm">🏷</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-bushal-ink truncate pr-2">{p.name}</span>
                      <span className="text-sm font-bold text-bushal-forest flex-shrink-0 tabular-nums">{formatPrice(val)}</span>
                    </div>
                    <div className="h-1.5 bg-bushal-ivoryDeep rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-700 ease-out", isOut ? 'bg-bushal-danger' : isLow ? 'bg-bushal-copper' : 'bg-bushal-forest')}
                        style={{ width: mounted ? `${pct}%` : '0%', transitionDelay: `${1300 + i * 100}ms` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", isOut ? 'bg-bushal-dangerBg text-bushal-danger' : isLow ? 'bg-bushal-copper/10 text-bushal-copper' : 'bg-bushal-successBg text-bushal-success')}>
                        {isOut ? 'Out of stock' : `${p.stock_quantity} units`}
                      </span>
                      <span className="text-[10px] text-bushal-inkSoft tabular-nums">{formatPrice(p.price)} each</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Recent Orders & Quick Actions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Recent Orders */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 flex-1 animate-fade-up" style={{ animationDelay: '1000ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-bushal-forest">Recent Orders</h2>
              <Link href="/admin/orders" className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors">
                All orders →
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-xs text-bushal-inkSoft text-center py-6">No orders yet.</p>
              ) : (
                recentOrders.map((o: any, i: number) => {
                  const statusColors: Record<string, string> = {
                    fulfilled: 'bg-bushal-successBg text-bushal-success',
                    pending: 'bg-bushal-copper/10 text-bushal-copper',
                    cancelled: 'bg-bushal-dangerBg text-bushal-danger',
                  }
                  const label = o.status.charAt(0).toUpperCase() + o.status.slice(1)
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-xl hover:bg-bushal-ivoryDeep/50 transition-colors group animate-fade-up" style={{ animationDelay: `${1200 + i * 50}ms` }}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-bushal-ink font-mono truncate">#{o.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-bushal-inkSoft mt-0.5">
                          {new Date(o.created_at).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", statusColors[o.status] ?? 'bg-bushal-ivoryDeep text-bushal-inkSoft')}>
                        {label}
                      </span>
                      <span className="text-xs font-bold text-bushal-forest flex-shrink-0 tabular-nums">{formatPrice(o.total)}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 animate-fade-up" style={{ animationDelay: '1100ms' }}>
            <h2 className="text-sm font-bold text-bushal-forest mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add Product', href: '/admin/products/new', icon: Icons.plus, gradient: 'from-bushal-copper to-bushal-copperLight', shadow: 'shadow-bushal-copper/20' },
                { label: 'Orders', href: '/admin/orders', icon: Icons.orders, gradient: 'from-bushal-forest to-bushal-forestMid', shadow: 'shadow-bushal-forest/20' },
                { label: 'Products', href: '/admin/products', icon: Icons.products, gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
                { label: 'Categories', href: '/admin/categories', icon: Icons.customers, gradient: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20' },
              ].map((a, i) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold text-white transition-all duration-300",
                    "hover:-translate-y-1 active:scale-[0.97] bg-gradient-to-br shadow-lg",
                    a.gradient, a.shadow
                  )}
                  style={{ animationDelay: `${1300 + i * 50}ms` }}
                >
                  <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    {a.icon}
                  </span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}