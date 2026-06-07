// components/admin/InventoryAnalytics.tsx
'use client'

import { Product } from '@/app/types/product'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  products: Product[]
}

// ── Pure SVG donut (no external deps) ────────────────────────────────────────
function Donut({
  segments,
  size = 100,
  centerLabel,
  centerSub,
}: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  centerLabel?: string
  centerSub?: string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const r = 38
  const circumference = 2 * Math.PI * r
  let offset = 0
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circumference
    const gap = circumference - dash
    const arc = { ...seg, dash, gap, offset }
    offset += dash
    return arc
  })
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="rotate-[-90deg]">
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="18"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
          />
        ))}
        <circle cx="50" cy="50" r="28" fill="white" />
      </svg>
      {(centerLabel || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <p className="text-sm font-extrabold text-slate-900 leading-none">{centerLabel}</p>}
          {centerSub   && <p className="text-[9px] text-slate-400 mt-0.5">{centerSub}</p>}
        </div>
      )}
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 0) : 0
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'amber' | 'rose' | 'blue' | 'violet'
}) {
  const palettes = {
    green:  'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
    rose:   'bg-rose-50 border-rose-200 text-rose-800',
    blue:   'bg-blue-50 border-blue-200 text-blue-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
  }
  return (
    <div className={cn('rounded-2xl border px-5 py-4', accent ? palettes[accent] : 'bg-white border-slate-200 text-slate-800')}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-extrabold leading-none">{value}</p>
      {sub && <p className="text-[11px] mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

export default function InventoryAnalytics({ products }: Props) {
  const totalProducts      = products.length
  const inStock            = products.filter((p) => p.in_stock).length
  const outOfStock         = products.filter((p) => !p.in_stock).length
  const lowStock           = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 5).length
  const healthy            = inStock - lowStock
  const totalInventoryVal  = products.reduce((sum, p) => sum + p.price * (p.stock_quantity ?? 0), 0)
  const totalUnits         = products.reduce((sum, p) => sum + (p.stock_quantity ?? 0), 0)

  // ── Category distribution ─────────────────────────────────────────────────
  const catColors = ['#ea580c','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16']
  const catMap: Record<string, number> = {}
  for (const p of products) {
    const cat = p.category ?? 'General'
    catMap[cat] = (catMap[cat] ?? 0) + 1
  }
  const catEntries = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: catColors[i % catColors.length] }))

  const inventorySegments = [
    { value: healthy,    color: '#10b981', label: 'Healthy' },
    { value: lowStock,   color: '#f59e0b', label: 'Low'     },
    { value: outOfStock, color: '#f43f5e', label: 'Out'     },
  ]

  // ── Price range histogram ─────────────────────────────────────────────────
  const priceRanges = [
    { label: '< 500',      min: 0,    max: 500,    color: '#06b6d4' },
    { label: '500–1k',     min: 500,  max: 1000,   color: '#3b82f6' },
    { label: '1k–5k',      min: 1000, max: 5000,   color: '#8b5cf6' },
    { label: '5k+',        min: 5000, max: Infinity, color: '#ea580c' },
  ]
  const priceData = priceRanges.map((r) => ({
    label: r.label,
    value: products.filter((p) => p.price >= r.min && p.price < r.max).length,
    color: r.color,
  }))
  const maxPriceCount = Math.max(...priceData.map((d) => d.value), 1)

  const sorted = [...products].sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
  const maxQty = Math.max(...products.map((p) => p.stock_quantity ?? 0), 1)

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Products"    value={totalProducts}             accent="blue"   />
        <StatCard label="In Stock"          value={inStock}   sub="available"  accent="green"  />
        <StatCard label="Out of Stock"      value={outOfStock} sub="hidden"    accent="rose"   />
        <StatCard label="Low Stock"         value={lowStock}   sub="≤ 5 units" accent="amber"  />
        <StatCard label="Inventory Value"   value={formatPrice(totalInventoryVal)} sub={`${totalUnits} units`} accent="violet" />
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Category pie chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Category Distribution</h3>
          <p className="text-[11px] text-slate-400 mb-4">{catEntries.length} categories</p>
          <div className="flex items-center gap-5">
            <Donut
              segments={catEntries}
              size={96}
              centerLabel={String(totalProducts)}
              centerSub="products"
            />
            <div className="flex-1 space-y-1.5 overflow-hidden">
              {catEntries.slice(0, 6).map((c) => (
                <div key={c.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-[11px] text-slate-600 flex-1 truncate">{c.label}</span>
                  <span className="text-[11px] font-bold text-slate-800">{c.value}</span>
                </div>
              ))}
              {catEntries.length > 6 && (
                <p className="text-[10px] text-slate-400 pl-3.5">+{catEntries.length - 6} more</p>
              )}
            </div>
          </div>
        </div>

        {/* Inventory health donut */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Stock Health</h3>
          <p className="text-[11px] text-slate-400 mb-4">across all products</p>
          <div className="flex items-center gap-5">
            <Donut
              segments={inventorySegments}
              size={96}
              centerLabel={`${Math.round((healthy / totalProducts) * 100) || 0}%`}
              centerSub="healthy"
            />
            <div className="flex-1 space-y-3">
              {[
                { label: 'Healthy', count: healthy,    pct: (healthy / totalProducts) * 100,    color: '#10b981', txtColor: 'text-emerald-700' },
                { label: 'Low',     count: lowStock,   pct: (lowStock / totalProducts) * 100,   color: '#f59e0b', txtColor: 'text-amber-700'   },
                { label: 'Out',     count: outOfStock, pct: (outOfStock / totalProducts) * 100, color: '#f43f5e', txtColor: 'text-rose-600'    },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-[11px] font-semibold', s.txtColor)}>{s.label}</span>
                    <span className={cn('text-[11px] font-bold', s.txtColor)}>{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Price range bar chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Price Range</h3>
          <p className="text-[11px] text-slate-400 mb-4">products per price band (৳)</p>
          <div className="space-y-3">
            {priceData.map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 w-14 flex-shrink-0">{d.label}</span>
                <HBar value={d.value} max={maxPriceCount} color={d.color} />
                <span className="text-[11px] font-bold text-slate-800 w-5 text-right flex-shrink-0">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
      {(outOfStock > 0 || lowStock > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {outOfStock > 0 && (
            <div className="flex-1 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-rose-700">{outOfStock} product{outOfStock > 1 ? 's are' : ' is'} out of stock</p>
                <p className="text-xs text-rose-500 mt-0.5">Hidden from customers — update stock to restore.</p>
              </div>
            </div>
          )}
          {lowStock > 0 && (
            <div className="flex-1 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-700">{lowStock} product{lowStock > 1 ? 's are' : ' is'} running low</p>
                <p className="text-xs text-amber-500 mt-0.5">≤ 5 units remaining — restock soon.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Inventory breakdown table ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Full Inventory Breakdown</h3>
          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{totalProducts} products</span>
        </div>
        <div className="divide-y divide-slate-50">
          {sorted.map((product) => {
            const qty   = product.stock_quantity ?? 0
            const isOut = qty === 0
            const isLow = qty > 0 && qty <= 5
            const pct   = Math.max((qty / maxQty) * 100, 0)
            const val   = product.price * qty

            return (
              <div key={product.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                  {(product.images?.[0] || product.image_url) ? (
                    <img src={product.images?.[0] ?? product.image_url!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">🏷</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{product.name}</p>
                  {product.category && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{product.category}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', isOut ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    isOut ? 'bg-rose-100 text-rose-600' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  )}>
                    {isOut ? 'Out' : `${qty} units`}
                  </span>
                  <span className="text-[11px] text-slate-400 w-20 text-right font-medium">
                    {formatPrice(val)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}