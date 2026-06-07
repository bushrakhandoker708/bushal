// components/ui/StatCard.tsx
import { ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  trend?: { value: number; label?: string }
  variant?: 'default' | 'copper' | 'forest'
}

export default function StatCard({ label, value, sub, icon, trend, variant = 'default' }: Props) {
  const isPositive = trend && trend.value >= 0

  const bgStyles = {
    default: 'bg-bushal-surface border-bushal-border',
    copper: 'bg-bushal-copper text-white border-bushal-copper',
    forest: 'bg-bushal-forest text-white border-bushal-forest',
  }[variant]

  const labelColor = variant === 'default' ? 'text-bushal-inkSoft' : 'text-white/70'
  const valueColor = variant === 'default' ? 'text-bushal-forest' : 'text-white'
  const iconBg = variant === 'default' ? 'bg-bushal-forest/10 text-bushal-forest' : 'bg-white/15 text-white'

  return (
    <div className={cn('rounded-xl border shadow-card p-5 flex flex-col gap-4', bgStyles)}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-wide', labelColor)}>{label}</p>
          <p className={cn('font-heading text-2xl font-bold mt-1 leading-none', valueColor)}>{value}</p>
          {sub && <p className={cn('text-xs mt-1', labelColor)}>{sub}</p>}
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-semibold flex items-center gap-1', isPositive ? 'text-bushal-success' : 'text-bushal-danger')}>
            <svg className={cn('w-3.5 h-3.5', !isPositive && 'rotate-180')} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {Math.abs(trend.value)}%
          </span>
          {trend.label && <span className={cn('text-xs', labelColor)}>{trend.label}</span>}
        </div>
      )}
    </div>
  )
}