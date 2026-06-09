// components/ui/EmptyState.tsx
import { ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  // 'taka' variant uses the  glyph as a premium decorative backdrop
  variant?: 'default' | 'taka' 
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center text-center py-20 px-4 overflow-hidden',
        'bg-bushal-surface rounded-3xl border border-dashed border-bushal-border',
        className
      )}
    >
      {variant === 'taka' ? (
        <>
          {/* Decorative Taka Sign Backdrop */}
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-heading italic text-[12rem] md:text-[16rem] text-bushal-copper/5 leading-none select-none pointer-events-none z-0">
            ৳
          </p>
          
          <div className="relative z-10 flex flex-col items-center animate-fade-up">
            <h3 className="font-heading text-3xl md:text-4xl text-bushal-forest mb-3 tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="font-heading italic text-bushal-inkSoft text-lg md:text-xl max-w-md mb-8">
                {description}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {icon && (
            <div className="w-20 h-20 rounded-2xl bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center mb-6 text-bushal-borderMid shadow-sm animate-scale-in">
              {icon}
            </div>
          )}
          <h3 className="font-heading text-2xl text-bushal-forest mb-2 tracking-tight animate-fade-up">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-bushal-inkSoft max-w-sm leading-relaxed mb-8 font-body animate-fade-up" style={{ animationDelay: '50ms' }}>
              {description}
            </p>
          )}
        </>
      )}

      {action && (
        <div className="relative z-10 mt-2 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {action}
        </div>
      )}
    </div>
  )
}