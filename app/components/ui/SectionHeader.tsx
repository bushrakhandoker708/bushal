// components/ui/SectionHeader.tsx
import { ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
  align?: 'left' | 'center'
}

export default function SectionHeader({
  title,
  subtitle,
  action,
  className,
  align = 'left',
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-3 border-b border-bushal-border',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className
      )}
    >
      <div>
        <h2 className="font-heading text-2xl font-bold text-bushal-forest tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-bushal-inkSoft mt-1">
            {subtitle}
          </p>
        )}
      </div>
      
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}