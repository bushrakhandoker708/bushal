// app/components/layout/PageTransition.tsx
// A premium, buttery-smooth page transition wrapper using Framer Motion.
// Replaces abrupt page loads with an elegant fade-up animation,
// reinforcing the luxury, intentional feel of the Bushal brand.

'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 12 // Subtle upward shift for the "fade up" effect
      }}
      animate={{ 
        opacity: 1, 
        y: 0 
      }}
      exit={{ 
        opacity: 0, 
        y: -12 // Slight exit animation for unmounting
      }}
      transition={{ 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1], // Custom luxury easing curve (smooth deceleration)
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
