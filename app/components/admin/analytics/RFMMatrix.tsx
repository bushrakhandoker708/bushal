// app/components/admin/analytics/RFMMatrix.tsx
// Renders the RFM customer segmentation grid: a bar-chart of segment distribution
// on the left and a scrollable top-customer list on the right.

'use client'

import { cn } from '@/app/lib/utils/cn'

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

// ─── Segment colour map (all keys defined in tailwind.config.ts) ──────────────
const SEGMENT_STYLES: Record<string, { bar: string; pill: string; pillText: string; dot: string }> = {
  Champions:  { bar: 'bg-bushal-forest',      pill: 'bg-bushal-forest/10',      pillText: 'text-bushal-forest',     dot: 'bg-bushal-forest' },
  Loyal:      { bar: 'bg-bushal-forestMid',   pill: 'bg-bushal-forestMid/10',   pillText: 'text-bushal-forestMid',  dot: 'bg-bushal-forestMid' },
  New:        { bar: 'bg-bushal-copper',       pill: 'bg-bushal-copper/10',      pillText: 'text-bushal-copper',     dot: 'bg-bushal-copper' },
  Regular:    { bar: 'bg-bushal-inkSoft',      pill: 'bg-bushal-inkSoft/10',     pillText: 'text-bushal-inkSoft',    dot: 'bg-bushal-inkSoft' },
  'At Risk':  { bar: 'bg-bushal-copperLight',  pill: 'bg-bushal-copperMuted',    pillText: 'text-bushal-copper',     dot: 'bg-bushal-copperLight' },
  Dormant:    { bar: 'bg-bushal-danger',       pill: 'bg-bushal-dangerBg',       pillText: 'text-bushal-danger',     dot: 'bg-bushal-danger' },
}

function fallback(segment: string) {
  return SEGMENT_STYLES[segment] ?? SEGMENT_STYLES.Regular
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SegmentBar({ seg, total }: { seg: RFMSegment; total: number }) {
  const pct = total > 0 ? ((seg.count / total) * 100).toFixed(1) : '0'
  const styles = fallback(seg.segment)

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(
          'text-[11px] font-bold px-2 py-0.5 rounded-full border',
          styles.pill, styles.pillText,
          'border-current/20'
        )}>
          {seg.segment}
        </span>
        <span className="text-xs font-semibold text-bushal-ink tabular-nums">
          {seg.count} <span className="font-normal text-bushal-inkSoft">({pct}%)</span>
        </span>
      </div>

      <div className="h-2 bg-bushal-ivoryDeep rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', styles.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-bushal-inkSoft">
          Avg ৳{seg.avg_monetary.toLocaleString()}
        </span>
        <span className="text-[10px] text-bushal-inkSoft">
          {seg.avg_frequency} orders avg
        </span>
      </div>
    </div>
  )
}

function CustomerRow({ customer }: { customer: RFMCustomer }) {
  const styles = fallback(customer.segment)
  const daysSince = Math.floor(
    (Date.now() - new Date(customer.last_purchase).getTime()) / 86_400_000
  )

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-bushal-ivoryDeep/40 hover:bg-bushal-ivoryDeep transition-colors duration-150 group">
      <div className="flex items-center gap-3 min-w-0">
        {/* Initials avatar */}
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white',
          styles.bar
        )}>
          {(customer.name ?? customer.email).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-bushal-ink truncate">
            {customer.name ?? 'Anonymous'}
          </p>
          <p className="text-[10px] text-bushal-inkSoft truncate">{customer.email}</p>
        </div>
      </div>

      <div className="text-right shrink-0 ml-3">
        <p className="text-sm font-bold text-bushal-copper">৳{customer.monetary.toLocaleString()}</p>
        <div className="flex items-center justify-end gap-1.5 mt-0.5">
          <span className={cn(
            'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
            styles.pill, styles.pillText
          )}>
            {customer.segment}
          </span>
          <span className="text-[10px] text-bushal-inkSoft">{daysSince}d ago</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function RFMMatrix({ data }: { data: RFMData }) {
  const total = data.total_customers ?? data.segments.reduce((a, s) => a + s.count, 0)

  if (!data.segments?.length) {
    return (
      <div className="rounded-2xl border border-bushal-border bg-bushal-surface p-8 text-center">
        <p className="text-sm text-bushal-inkSoft">No fulfilled orders yet — RFM data will appear here once customers start buying.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: segment distribution */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-bushal-forest">Customer Segments</h3>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">RFM scoring · {total} customers</p>
          </div>
          {/* Mini legend */}
          <div className="flex items-center gap-1">
            {['Champions', 'Loyal', 'At Risk', 'Dormant'].map(s => (
              <span key={s} className={cn('w-2 h-2 rounded-full', fallback(s).bar)} title={s} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {data.segments.map(seg => (
            <SegmentBar key={seg.segment} seg={seg} total={total} />
          ))}
        </div>

        {/* Playbook callout */}
        <div className="mt-5 pt-4 border-t border-bushal-border">
          <p className="text-[10px] text-bushal-inkSoft leading-relaxed">
            <span className="font-bold text-bushal-copper">Playbook —</span>{' '}
            Send "At Risk" customers a 15% discount code. Move "Champions" to early-access drops.
          </p>
        </div>
      </div>

      {/* Right: top customers */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-bushal-forest">Top Customers</h3>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">By lifetime spend</p>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar pr-0.5">
          {(data.top_customers ?? []).map(c => (
            <CustomerRow key={c.user_id} customer={c} />
          ))}
        </div>
      </div>
    </div>
  )
}