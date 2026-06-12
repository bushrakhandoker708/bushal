// app/components/ui/EmptyState.tsx
// A premium, animated Empty & Error State component designed 
// to replace generic blank spaces with branded, empathetic UI.
// Integrates Framer Motion for buttery-smooth entrance animations,
// supports multiple variants (default, error, success, taka),
// and strictly adheres to the Bushal luxury design system.

'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/app/lib/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  // 'taka' variant uses the  glyph as a premium decorative backdrop
  // 'error' variant uses danger colors for error states
  // 'success' variant uses success colors for confirmation states
  variant?: 'default' | 'taka' | 'error' | 'success'
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  // Define color palettes based on variant
  const iconBgColors = {
    default: 'bg-bushal-ivoryDeep border-bushal-border text-bushal-borderMid',
    error: 'bg-bushal-dangerBg border-bushal-danger/20 text-bushal-danger',
    success: 'bg-bushal-successBg border-bushal-success/20 text-bushal-success',
    taka: 'bg-bushal-copper/5 border-bushal-copper/10 text-bushal-copper',
  }

  const titleColors = {
    default: 'text-bushal-forest',
    error: 'text-bushal-danger',
    success: 'text-bushal-success',
    taka: 'text-bushal-forest',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} // Premium luxury easing
      className={cn(
        'relative flex flex-col items-center justify-center text-center py-20 px-6 overflow-hidden',
        'bg-bushal-surface rounded-3xl border border-dashed border-bushal-border',
        className
      )}
    >
      {variant === 'taka' ? (
        <>
          {/* Decorative Taka Sign Backdrop */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-heading italic text-[12rem] md:text-[16rem] text-bushal-copper/5 leading-none select-none pointer-events-none z-0"
          >
            ৳
          </motion.p>
          <div className="relative z-10 flex flex-col items-center">
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-heading text-3xl md:text-4xl text-bushal-forest mb-3 tracking-tight"
            >
              {title}
            </motion.h3>
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="font-heading italic text-bushal-inkSoft text-lg md:text-xl max-w-md mb-8"
              >
                {description}
              </motion.p>
            )}
          </div>
        </>
      ) : (
        <>
          {icon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 100, damping: 15 }}
              className={cn(
                'w-20 h-20 rounded-2xl border flex items-center justify-center mb-6 shadow-sm',
                iconBgColors[variant]
              )}
            >
              {icon}
            </motion.div>
          )}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn('font-heading text-2xl md:text-3xl mb-2 tracking-tight', titleColors[variant])}
          >
            {title}
          </motion.h3>
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm md:text-base text-bushal-inkSoft max-w-sm leading-relaxed mb-8 font-body"
            >
              {description}
            </motion.p>
          )}
        </>
      )}
      
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-10 mt-2"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}
