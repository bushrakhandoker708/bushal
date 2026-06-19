// app/components/ui/EmptyState.tsx
// A premium, animated Empty & Error State component designed 
// to replace generic blank spaces with branded, empathetic UI.
// Integrates Framer Motion for buttery-smooth entrance animations,
// supports multiple variants including recommendation-specific states,
// and strictly adheres to the Bushal luxury design system.

'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/app/lib/utils/cn'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  // 'taka' variant uses the ৳ glyph as a premium decorative backdrop
  // 'error' variant uses danger colors for error states
  // 'success' variant uses success colors for confirmation states
  // 'recommendation' variant for ML-powered recommendation empty states
  // 'compare' variant for product comparison empty states
  // 'wishlist' variant for wishlist empty states
  // 'recently-viewed' variant for browsing history
  variant?: 'default' | 'taka' | 'error' | 'success' | 'recommendation' | 'compare' | 'wishlist' | 'recently-viewed'
  // Additional context for recommendation variants
  recommendationType?: 'frequently-bought' | 'similar-products' | 'recommended-for-you' | 'trending' | 'personalized'
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
  recommendationType,
}: EmptyStateProps) {
  // Define color palettes based on variant
  const iconBgColors = {
    default: 'bg-bushal-ivoryDeep border-bushal-border text-bushal-borderMid',
    error: 'bg-bushal-dangerBg border-bushal-danger/20 text-bushal-danger',
    success: 'bg-bushal-successBg border-bushal-success/20 text-bushal-success',
    taka: 'bg-bushal-copper/5 border-bushal-copper/10 text-bushal-copper',
    recommendation: 'bg-bushal-copper/10 border-bushal-copper/20 text-bushal-copper',
    compare: 'bg-bushal-forest/10 border-bushal-forest/20 text-bushal-forest',
    wishlist: 'bg-bushal-rose-50 border-rose-200 text-rose-400',
    'recently-viewed': 'bg-bushal-violet-50 border-violet-200 text-violet-400',
  }

  const titleColors = {
    default: 'text-bushal-forest',
    error: 'text-bushal-danger',
    success: 'text-bushal-success',
    taka: 'text-bushal-forest',
    recommendation: 'text-bushal-forest',
    compare: 'text-bushal-forest',
    wishlist: 'text-bushal-forest',
    'recently-viewed': 'text-bushal-forest',
  }

  // Recommendation-specific content
  const getRecommendationContent = () => {
    switch (recommendationType) {
      case 'frequently-bought':
        return {
          icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          ),
          title: 'No frequent combinations yet',
          description: 'As more customers shop, we\'ll discover which products are frequently bought together.',
          cta: (
            <Link href="/dashboard" className="btn-copper text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
              Explore Products
            </Link>
          ),
        }
      case 'similar-products':
        return {
          icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          ),
          title: 'No similar products found',
          description: 'This product is unique in our collection. Check out our other premium offerings.',
          cta: (
            <Link href="/dashboard" className="btn-copper text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
              Browse All Products
            </Link>
          ),
        }
      case 'recommended-for-you':
        return {
          icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
          title: 'Start shopping to get personalized picks',
          description: 'Our AI will learn your preferences and recommend products you\'ll love based on your browsing and purchase history.',
          cta: (
            <Link href="/dashboard" className="btn-copper text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
              Start Exploring
            </Link>
          ),
        }
      case 'trending':
        return {
          icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
          title: 'No trending products right now',
          description: 'Check back soon for the hottest items everyone\'s talking about.',
          cta: (
            <Link href="/dashboard" className="btn-forest text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
              View All Products
            </Link>
          ),
        }
      default:
        return {
          icon: icon || (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
          title,
          description,
          cta: action,
        }
    }
  }

  // Variant-specific content
  const getVariantContent = () => {
    if (variant === 'recommendation') {
      return getRecommendationContent()
    }
    
    switch (variant) {
      case 'compare':
        return {
          icon: icon || (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          title: title || 'No products to compare',
          description: description || 'Select up to 4 products from the catalog to compare them side-by-side.',
          cta: action || (
            <Link href="/dashboard" className="btn-forest text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
              Browse Products
            </Link>
          ),
        }
      case 'wishlist':
        return {
          icon: icon || (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          ),
          title: title || 'Your wishlist is empty',
          description: description || 'Save your favorite heritage pieces here to keep track of them.',
          cta: action || (
            <Link href="/dashboard" className="btn-copper text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
              Explore Collection
            </Link>
          ),
        }
      case 'recently-viewed':
        return {
          icon: icon || (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: title || 'No recently viewed products',
          description: description || 'Products you view will appear here for easy access.',
          cta: action || (
            <Link href="/dashboard" className="btn-copper text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
              Start Browsing
            </Link>
          ),
        }
      default:
        return {
          icon,
          title,
          description,
          cta: action,
        }
    }
  }

  const content = getVariantContent()

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
              {content.title}
            </motion.h3>
            {content.description && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="font-heading italic text-bushal-inkSoft text-lg md:text-xl max-w-md mb-8"
              >
                {content.description}
              </motion.p>
            )}
          </div>
        </>
      ) : (
        <>
          {content.icon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 100, damping: 15 }}
              className={cn(
                'w-20 h-20 rounded-2xl border flex items-center justify-center mb-6 shadow-sm',
                iconBgColors[variant]
              )}
            >
              {content.icon}
            </motion.div>
          )}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn('font-heading text-2xl md:text-3xl mb-2 tracking-tight', titleColors[variant])}
          >
            {content.title}
          </motion.h3>
          {content.description && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm md:text-base text-bushal-inkSoft max-w-sm leading-relaxed mb-8 font-body"
            >
              {content.description}
            </motion.p>
          )}
        </>
      )}
      
      {content.cta && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-10 mt-2"
        >
          {content.cta}
        </motion.div>
      )}
    </motion.div>
  )
}