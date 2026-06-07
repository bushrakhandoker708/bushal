// components/ui/Badge.tsx
import { ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'copper' | 'forest'

interface Props {
  children: ReactNode
  variant?: Variant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variants: Record<Variant, string> = {
  success: 'bg-bushal-successBg text-bushal-success border-bushal-success/20',
  danger:  'bg-bushal-dangerBg text-bushal-danger border-bushal-danger/20',
  warning: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20',
  info:    'bg-bushal-forest/10 text-bushal-forest border-bushal-forest/20',
  neutral: 'bg-bushal-ivory text-bushal-inkMid border-bushal-border',
  copper:  'bg-bushal-copper/10 text-bushal-copper border-bushal-copper/20',
  forest:  'bg-bushal-forest text-white border-transparent',
}

const dotColors: Record<Variant, string> = {
  success: 'bg-bushal-success',
  danger:  'bg-bushal-danger',
  warning: 'bg-bushal-warning',
  info:    'bg-bushal-forest',
  neutral: 'bg-bushal-inkSoft',
  copper:  'bg-bushal-copper',
  forest:  'bg-white',
}

export default function Badge({ children, variant = 'neutral', size = 'md', dot, className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold border rounded-full',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      variants[variant],
      className
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}