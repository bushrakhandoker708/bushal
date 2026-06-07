// components/ui/SectionHeader.tsx
import { ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export default function SectionHeader({ title, subtitle, action, className }: Props) {
  return (
    <div className={cn('flex items-end justify-between mb-6', className)}>
      <div>
        <h2 className="font-heading text-2xl font-semibold text-bushal-forest leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-bushal-inkSoft mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}