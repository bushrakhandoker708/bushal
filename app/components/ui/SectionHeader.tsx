'use client'

// components/ui/SectionHeader.tsx
import { ReactNode, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/app/lib/utils/cn'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
  align?: 'left' | 'center'
  /** Show decorative copper accent line (default: true) */
  accent?: boolean
}

export default function SectionHeader({
  title,
  subtitle,
  action,
  className,
  align = 'left',
  accent = true,
}: SectionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-4',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className
      )}
    >
      {/* Bottom border with animated copper reveal */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-bushal-border">
        {accent && (
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-0 w-24 h-full bg-gradient-to-r from-bushal-copper to-bushal-copperGlow"
          />
        )}
      </div>

      <div>
        <motion.h2
          initial={{ opacity: 0, x: -12 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="font-heading text-2xl md:text-3xl font-bold text-bushal-forest tracking-tight"
        >
          {title}
        </motion.h2>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-sm text-bushal-inkSoft mt-1"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {action && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}