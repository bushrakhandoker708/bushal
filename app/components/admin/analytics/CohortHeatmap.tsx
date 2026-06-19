// app/components/admin/analytics/CohortHeatmap.tsx
// Renders a month-by-month cohort retention table as a colour-coded heatmap.
// Each row is a cohort (first purchase month); each column is months since first buy.
'use client'
import { cn } from '@/app/lib/utils/cn'
import { formatPrice } from '@/app/lib/utils/formatPrice'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CohortRow {
  cohort_month: string
  months_since: number
  retention_rate: number
  revenue: number
  active_users: number
  cohort_size: number
}

// ─── Colour scale (green = high retention, copper = mid, ivory = zero) ────────
function retentionColour(rate: number): string {
  if (rate <= 0) return 'bg-bushal-ivoryDeep text-bushal-inkSoft/30'
  if (rate >= 60) return 'bg-bushal-forest text-white'
  if (rate >= 40) return 'bg-bushal-forestMid text-white'
  if (rate >= 25) return 'bg-bushal-forestLight text-white'
  if (rate >= 15) return 'bg-bushal-copper/30 text-bushal-copper'
  return 'bg-bushal-copperMuted text-bushal-copper/60'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CohortHeatmap({ data }: { data: CohortRow[] | null }) {
  // FIX: Explicit empty state for null/missing data
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bushal-ivoryDeep flex items-center justify-center">
          <svg className="w-6 h-6 text-bushal-inkSoft/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-bushal-inkSoft">No Cohort Data Available</p>
        <p className="text-xs text-bushal-inkSoft/60 mt-1 max-w-md mx-auto">
          Cohort analysis requires historical order data. 
          Run the nightly ML pipeline or wait for more repeat purchases to generate this view.
        </p>
      </div>
    )
  }

  // Build pivot
  const cohorts = Array.from(new Set(data.map(d => d.cohort_month)))
  const maxMonths = Math.max(0, ...data.map(d => d.months_since))
  const lookup = new Map(data.map(d => [`${d.cohort_month}::${d.months_since}`, d]))

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-bushal-forest">Cohort Retention</h3>
          <p className="text-[11px] text-bushal-inkSoft mt-0.5">% of each cohort still active after N months</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-bushal-inkSoft shrink-0">
          <div className="flex items-center gap-0.5">
            {[0, 15, 25, 40, 60].map((v, i) => (
              <span key={i} className={cn('w-4 h-4 rounded-sm inline-block', retentionColour(v + 1))} />
            ))}
          </div>
          <span>Low → High</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-bushal-inkSoft whitespace-nowrap">
                Cohort
              </th>
              <th className="px-3 py-2 text-center font-semibold text-bushal-inkSoft whitespace-nowrap">
                Size
              </th>
              {Array.from({ length: maxMonths + 1 }, (_, i) => (
                <th key={i} className="px-2 py-2 text-center font-semibold text-bushal-inkSoft w-12">
                  M{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map(cohort => {
              const m0 = lookup.get(`${cohort}::0`)
              return (
                <tr key={cohort}>
                  <td className="px-3 py-1.5 font-semibold text-bushal-ink whitespace-nowrap">
                    {cohort}
                  </td>
                  <td className="px-3 py-1.5 text-center text-bushal-inkSoft tabular-nums">
                    {m0?.cohort_size ?? '—'}
                  </td>
                  {Array.from({ length: maxMonths + 1 }, (_, i) => {
                    const cell = lookup.get(`${cohort}::${i}`)
                    const rate = cell?.retention_rate ?? 0
                    return (
                      <td key={i} className="px-0 py-0">
                        <div
                          className={cn(
                            'w-11 h-8 rounded-md flex items-center justify-center font-bold transition-all duration-200 hover:scale-110 hover:z-10 relative cursor-default text-[11px]',
                            retentionColour(rate)
                          )}
                          title={cell
                            ? `${cohort} · M${i}: ${rate}% · ${cell.active_users} users · ${formatPrice(cell.revenue)}`
                            : 'No data'
                          }
                        >
                          {rate > 0 ? `${rate}%` : '—'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-4 border-t border-bushal-border">
        <p className="text-[10px] text-bushal-inkSoft leading-relaxed">
          <span className="font-bold text-bushal-copper">Playbook —</span>{' '}
          Month-1 retention below 20%? Trigger an automated re-engagement email before the next month closes.
        </p>
      </div>
    </div>
  )
}