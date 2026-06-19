// app/components/admin/analytics/RFMMatrix.tsx
'use client'

import { cn } from '@/app/lib/utils/cn'
import { formatPrice } from '@/app/lib/utils/formatPrice'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RFMSegment {
  segment: string
  count: number
  avg_monetary: number
  avg_frequency: number
  avg_rfm: number
}

export interface RFMCustomer {
  user_id: string
  name: string | null
  email: string
  segment: string
  monetary: number
  frequency: number
  last_purchase: string
  rfm_total: number
}

export interface RFMData {
  segments: RFMSegment[]
  top_customers: RFMCustomer[]
  total_customers: number
}

// ─── Segment colour map ─────────────────────────────────────────────────────
// Updated to match the actual K-Means output segments (VIP, Loyal, Normal, High Risk, Anomalous)
const SEGMENT_STYLES: Record<string, { bar: string; pill: string; pillText: string; dot: string }> = {
  VIP:        { bar: 'bg-bushal-copper',    pill: 'bg-bushal-copper/10',    pillText: 'text-bushal-copper',    dot: 'bg-bushal-copper' },
  Loyal:      { bar: 'bg-bushal-forestMid', pill: 'bg-bushal-forestMid/10', pillText: 'text-bushal-forestMid', dot: 'bg-bushal-forestMid' },
  Normal:     { bar: 'bg-bushal-inkSoft',   pill: 'bg-bushal-ivoryDeep',    pillText: 'text-bushal-inkSoft',   dot: 'bg-bushal-inkSoft' },
  'High Risk':{ bar: 'bg-bushal-warning',   pill: 'bg-bushal-warning/10',   pillText: 'text-bushal-warning',   dot: 'bg-bushal-warning' },
  Anomalous:  { bar: 'bg-slate-500',        pill: 'bg-slate-100',           pillText: 'text-slate-600',        dot: 'bg-slate-500' },
  // Fallback for any unexpected segment names
  default:    { bar: 'bg-bushal-border',    pill: 'bg-bushal-ivoryDeep',    pillText: 'text-bushal-inkSoft',   dot: 'bg-bushal-border' },
}

function getSegmentStyle(segment: string) {
  return SEGMENT_STYLES[segment] ?? SEGMENT_STYLES.default
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RFMMatrix({ data }: { data: RFMData | null }) {
  // FIX: Explicit empty state for null/missing data
  if (!data || !data.segments || data.segments.length === 0) {
    return (
      <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bushal-ivoryDeep flex items-center justify-center">
          <svg className="w-6 h-6 text-bushal-inkSoft/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-bushal-inkSoft">No RFM Data Available</p>
        <p className="text-xs text-bushal-inkSoft/60 mt-1 max-w-md mx-auto">
          Customer segmentation requires fulfilled order history. 
          Run the nightly ML pipeline or wait for more orders to generate segments.
        </p>
      </div>
    )
  }

  const total = data.total_customers ?? data.segments.reduce((a, s) => a + s.count, 0)
  const maxCount = Math.max(...data.segments.map(s => s.count))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Segment Distribution Bar Chart */}
      <div className="lg:col-span-1 bg-bushal-surface rounded-2xl border border-bushal-border p-6">
        <h3 className="text-sm font-bold text-bushal-forest mb-6">Customer Segments</h3>
        <div className="space-y-5">
          {data.segments.map((seg) => {
            const style = getSegmentStyle(seg.segment)
            const pct = total > 0 ? ((seg.count / total) * 100).toFixed(1) : '0'
            const barWidth = maxCount > 0 ? (seg.count / maxCount) * 100 : 0
            
            return (
              <div key={seg.segment}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    <span className="text-xs font-semibold text-bushal-ink">{seg.segment}</span>
                  </div>
                  <span className="text-[10px] font-bold text-bushal-inkSoft tabular-nums">
                    {seg.count} ({pct}%)
                  </span>
                </div>
                
                {/* Bar */}
                <div className="h-2 w-full bg-bushal-ivoryDeep rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ease-out ${style.bar}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                
                {/* Micro-stats */}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-bushal-inkSoft/70">
                    Avg Spend: <span className="font-medium text-bushal-ink">{formatPrice(seg.avg_monetary)}</span>
                  </span>
                  <span className="text-[10px] text-bushal-inkSoft/70">
                    Avg Orders: <span className="font-medium text-bushal-ink">{seg.avg_frequency.toFixed(1)}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-bushal-border">
          <p className="text-[10px] text-bushal-inkSoft/60 text-center">
            Based on Recency, Frequency, and Monetary value of fulfilled orders.
          </p>
        </div>
      </div>

      {/* Right Column: Top Customers List */}
      <div className="lg:col-span-2 bg-bushal-surface rounded-2xl border border-bushal-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-bushal-forest">Top Customers by Value</h3>
          <span className="text-[10px] font-medium text-bushal-inkSoft bg-bushal-ivoryDeep px-2 py-1 rounded-full">
            Showing top {data.top_customers?.length ?? 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bushal-border">
                <th className="text-left py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-bushal-inkSoft">Customer</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-bushal-inkSoft">Segment</th>
                <th className="text-right py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-bushal-inkSoft">Total Spend</th>
                <th className="text-right py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-bushal-inkSoft">Orders</th>
                <th className="text-right py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-bushal-inkSoft">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bushal-border/50">
              {(data.top_customers ?? []).map((customer) => {
                const style = getSegmentStyle(customer.segment)
                const daysSince = customer.last_purchase 
                  ? Math.floor((Date.now() - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <tr key={customer.user_id} className="hover:bg-bushal-ivoryDeep/30 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-bushal-ink truncate max-w-[150px]">
                          {customer.name ?? 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-bushal-inkSoft/60 truncate max-w-[150px]">
                          {customer.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${style.pill} ${style.pillText}`}>
                        {customer.segment}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums font-medium text-bushal-ink">
                      {formatPrice(customer.monetary)}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums text-bushal-inkSoft">
                      {customer.frequency}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-bushal-inkSoft tabular-nums">
                          {daysSince !== null ? `${daysSince}d ago` : 'N/A'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              
              {(!data.top_customers || data.top_customers.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-bushal-inkSoft">
                    No customer data available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}