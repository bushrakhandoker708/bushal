// components/ui/Badge.tsx
import { ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

type Variant = 
  | 'success' 
  | 'danger' 
  | 'warning' 
  | 'info' 
  | 'neutral' 
  | 'copper' 
  | 'forest'
  | 'critical'  // NEW: Urgency variants
  | 'high'
  | 'medium'
  | 'low'

interface Props {
  children: ReactNode
  variant?: Variant
  size?: 'sm' | 'md'
  dot?: boolean
  pulse?: boolean  // NEW: Enable pulse animation
  className?: string
}

// ─── Base Variants (Existing) ───────────────────────────────────────────────
const variants: Record<Variant, string> = {
  success: 'bg-bushal-successBg text-bushal-success border-bushal-success/20',
  danger:  'bg-bushal-dangerBg text-bushal-danger border-bushal-danger/20',
  warning: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20',
  info:    'bg-bushal-forest/10 text-bushal-forest border-bushal-forest/20',
  neutral: 'bg-bushal-ivory text-bushal-inkMid border-bushal-border',
  copper:  'bg-bushal-copper/10 text-bushal-copper border-bushal-copper/20',
  forest:  'bg-bushal-forest text-white border-transparent',
  
  // ─── NEW: Urgency Variants with Gradients ───────────────────────────────
  critical: 'bg-gradient-to-r from-bushal-danger/15 to-red-50 text-bushal-danger border-bushal-danger/30 shadow-sm shadow-bushal-danger/10',
  high:     'bg-gradient-to-r from-bushal-warning/15 to-amber-50 text-bushal-warning border-bushal-warning/30 shadow-sm shadow-bushal-warning/10',
  medium:   'bg-gradient-to-r from-bushal-copper/10 to-orange-50 text-bushal-copper border-bushal-copper/30',
  low:      'bg-gradient-to-r from-bushal-forest/10 to-emerald-50 text-bushal-forest border-bushal-forest/30',
}

// ─── Dot Colors ─────────────────────────────────────────────────────────────
const dotColors: Record<Variant, string> = {
  success: 'bg-bushal-success',
  danger:  'bg-bushal-danger',
  warning: 'bg-bushal-warning',
  info:    'bg-bushal-forest',
  neutral: 'bg-bushal-inkSoft',
  copper:  'bg-bushal-copper',
  forest:  'bg-white',
  
  // ─── NEW: Urgency Dot Colors ────────────────────────────────────────────
  critical: 'bg-bushal-danger',
  high:     'bg-bushal-warning',
  medium:   'bg-bushal-copper',
  low:      'bg-bushal-forest',
}

// ─── Pulse Animation Classes ────────────────────────────────────────────────
// Critical and High urgency badges get a subtle pulse to draw attention
const pulseVariants: Record<Variant, string> = {
  success: '',
  danger:  '',
  warning: '',
  info:    '',
  neutral: '',
  copper:  '',
  forest:  '',
  
  // ─── NEW: Pulse for Urgency ─────────────────────────────────────────────
  critical: 'animate-pulse-soft',
  high:     'animate-pulse-soft',
  medium:   '',
  low:      '',
}

export default function Badge({ 
  children, 
  variant = 'neutral', 
  size = 'md', 
  dot, 
  pulse = false,
  className 
}: Props) {
  // Determine if we should pulse
  // - If pulse prop is explicitly true, always pulse
  // - Otherwise, pulse for critical/high urgency variants
  const shouldPulse = pulse || (variant === 'critical' || variant === 'high')
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold border rounded-full transition-all duration-200',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      variants[variant],
      shouldPulse && pulseVariants[variant],
      className
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          dotColors[variant],
          shouldPulse && 'animate-pulse'
        )} />
      )}
      {children}
    </span>
  )
}