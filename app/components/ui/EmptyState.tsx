// components/ui/EmptyState.tsx
import { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/app/lib/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-4',
        'bg-bushal-surface rounded-3xl border border-dashed border-bushal-border',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center mb-5 text-bushal-borderMid">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-bushal-forest mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-bushal-inkSoft max-w-sm leading-relaxed mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}