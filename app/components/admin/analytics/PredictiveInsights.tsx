// app/components/admin/analytics/PredictiveInsights.tsx
// Two-panel component: left shows the predictive CLV banner + top CLV customers,
// right shows the corrected WMA demand forecast with a sparkline history.

'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/app/lib/utils/cn'
import { formatPrice } from '@/app/lib/utils/formatPrice'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CLVData {
  average_clv: number
  total_projected_value: number
  repeat_buyer_clv: number
  one_time_buyer_pct: number
  top_clv_customers: {
    user_id: string
    name: string | null
    email: string
    historical_value: number
    predicted_clv: number
    total_orders: number
    is_one_time: boolean
  }[]
}

export interface ForecastData {
  next_month_forecast: number
  months_of_data: number
  confidence: 'high' | 'medium' | 'low'
  historical_trend: { month: string; revenue: number; orders: number }[]
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCounter(target: number, ms = 1200): number {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number>()
  const t0 = useRef<number | null>(null)

  useEffect(() => {
    t0.current = null
    const step = (ts: number) => {
      if (!t0.current) t0.current = ts
      const p = Math.min((ts - t0.current) / ms, 1)
      const e = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setVal(target * e)
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, ms])

  return val
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ points, color = '#B87333' }: { points: number[]; color?: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points, 1)
  const min = Math.min(...points)
  const range = max - min || 1
  const W = 200
  const H = 40

  const d = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 6) - 3
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#sparkGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   'bg-bushal-successBg text-bushal-success border-bushal-success/20',
    medium: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20',
    low:    'bg-bushal-dangerBg  text-bushal-danger  border-bushal-danger/20',
  }
  return (
    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide', styles[level])}>
      {level} confidence
    </span>
  )
}

// ─── CLV Panel ────────────────────────────────────────────────────────────────
function CLVPanel({ data }: { data: CLVData }) {
  const avgCLV   = useCounter(data.average_clv ?? 0, 1400)
  const totalVal = useCounter(data.total_projected_value ?? 0, 1600)

  return (
    <div className="rounded-2xl border border-bushal-border bg-bushal-surface overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-to-br from-bushal-forest via-bushal-forestMid to-bushal-forest px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copperGlow mb-1">
          Predictive Intelligence
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-white tabular-nums font-heading">
              ৳{Math.round(avgCLV).toLocaleString()}
            </p>
            <p className="text-xs text-white/60 mt-0.5">Average predicted CLV</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-bushal-copperGlow tabular-nums">
              ৳{Math.round(totalVal).toLocaleString()}
            </p>
            <p className="text-[11px] text-white/50">Total pipeline</p>
          </div>
        </div>

        {/* Sub-metrics row */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xl font-bold text-white tabular-nums">
              ৳{(data.repeat_buyer_clv ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-white/50">Repeat buyer CLV</p>
          </div>
          <div>
            <p className="text-xl font-bold text-bushal-copperGlow tabular-nums">
              {data.one_time_buyer_pct ?? 0}%
            </p>
            <p className="text-[10px] text-white/50">One-time buyers</p>
          </div>
        </div>
      </div>

      {/* Top CLV customers */}
      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-bushal-inkSoft mb-3">
          Highest Lifetime Value
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
          {(data.top_clv_customers ?? []).map((c, idx) => (
            <div key={c.user_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-bushal-ivoryDeep/50 transition-colors">
              <span className="text-[10px] font-bold text-bushal-inkSoft/50 w-4 tabular-nums">{idx + 1}</span>
              <div className="w-7 h-7 rounded-lg bg-bushal-forest/10 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-bushal-forest">
                  {(c.name ?? c.email).slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-bushal-ink truncate">{c.name ?? 'Anonymous'}</p>
                <p className="text-[10px] text-bushal-inkSoft">{c.total_orders} orders</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-bushal-copper">৳{c.predicted_clv.toLocaleString()}</p>
                <p className="text-[10px] text-bushal-inkSoft">predicted</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Forecast Panel ───────────────────────────────────────────────────────────
function ForecastPanel({ data }: { data: ForecastData }) {
  const forecast = useCounter(data.next_month_forecast ?? 0, 1400)
  const points = (data.historical_trend ?? []).map(d => d.revenue)

  return (
    <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-bushal-forest">Demand Forecast</h3>
          <p className="text-[11px] text-bushal-inkSoft mt-0.5">Weighted Moving Average · last {data.months_of_data} months</p>
        </div>
        <ConfidenceBadge level={data.confidence} />
      </div>

      {/* Big number */}
      <div className="mb-4">
        <p className="text-4xl font-bold font-heading text-bushal-forest tabular-nums">
          ৳{Math.round(forecast).toLocaleString()}
        </p>
        <p className="text-xs text-bushal-inkSoft mt-1">Projected next-month revenue</p>
      </div>

      {/* Sparkline */}
      {points.length >= 2 && (
        <div className="mb-4">
          <Sparkline points={points} color="#B87333" />
        </div>
      )}

      {/* Monthly table */}
      {(data.historical_trend ?? []).length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
          {[...(data.historical_trend ?? [])].reverse().map((row, i) => {
            const max = Math.max(...points, 1)
            const pct = ((row.revenue / max) * 100).toFixed(0)
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-bushal-inkSoft w-16 shrink-0">{row.month}</span>
                <div className="flex-1 h-1.5 bg-bushal-ivoryDeep rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bushal-copper rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-bushal-ink tabular-nums w-20 text-right">
                  {formatPrice(row.revenue)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-bushal-border">
        <p className="text-[10px] text-bushal-inkSoft leading-relaxed">
          <span className="font-bold text-bushal-copper">Playbook —</span>{' '}
          WMA weights: 50% last month · 30% two months ago · 20% three months ago. Reacts faster to trending products than simple linear regression.
        </p>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PredictiveInsights({
  clvData,
  forecastData,
}: {
  clvData: CLVData
  forecastData: ForecastData
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CLVPanel data={clvData} />
      <ForecastPanel data={forecastData} />
    </div>
  )
}