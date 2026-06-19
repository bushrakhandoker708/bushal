// app/components/product/SimilarProducts.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { useCart } from '@/app/hooks/useCart'
import { cn } from '@/app/lib/utils/cn'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────
interface GraphRecommendation {
  productId: string
  name: string
  price: number
  image_url: string | null
  images: string[]
  category: string
  in_stock: boolean
  score: number
  rwrProbability: number
  pageRankScore: number
}

interface Props {
  productId: string
  className?: string
}

// The model name that generated these recommendations.
// Matches the seed data in migration 034_add_recommendation_ab_testing.sql
const MODEL_NAME = 'pagerank_rwr'

// ─── Tracking Helper ────────────────────────────────────────────────────────
// Fire-and-forget tracking event to the A/B testing API.
// Uses keepalive: true to ensure the request completes even if the user navigates away.
function trackRecommendationEvent(
  eventType: 'impression' | 'click' | 'purchase',
  recommendedProductId: string
) {
  try {
    fetch('/api/recommendations/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelName: MODEL_NAME,
        eventType,
        productId: recommendedProductId,
      }),
      keepalive: true,
    }).catch((err) => {
      // Silent fail - tracking should never break the user experience
      console.warn('[SimilarProducts Tracking] Failed to log event:', err)
    })
  } catch (err) {
    console.warn('[SimilarProducts Tracking] Unexpected error:', err)
  }
}

// ─── Animation Variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    } 
  },
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function SimilarProducts({ productId, className }: Props) {
  const { addItem } = useCart()
  const [recommendations, setRecommendations] = useState<GraphRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      // Fetch graph-based similar products (alpha=0.7 blends 70% RWR similarity + 30% PageRank popularity)
      const response = await fetch(`/api/products/graph-similar/${productId}?limit=8&alpha=0.7`)
      if (!response.ok) {
        throw new Error('Failed to fetch similar products')
      }
      const data = await response.json()
      if (data.success && data.recommendations?.length > 0) {
        setRecommendations(data.recommendations)
        // 🔥 TRACKING: Log impression events for all displayed recommendations
        data.recommendations.forEach((rec: GraphRecommendation) => {
          trackRecommendationEvent('impression', rec.productId)
        })
      } else {
        setRecommendations([])
      }
    } catch (err) {
      console.error('[SimilarProducts] Error fetching recommendations:', err)
      setError('Unable to load similar products')
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    if (productId) {
      fetchRecommendations()
    }
  }, [productId, fetchRecommendations])

  const handleAddToCart = useCallback((rec: GraphRecommendation) => {
    if (!rec.in_stock) return

    const productForCart = {
      id: rec.productId,
      name: rec.name,
      price: rec.price,
      image_url: rec.image_url,
      images: rec.images,
      in_stock: rec.in_stock,
      stock_quantity: 99, // Assume in stock
      category: rec.category,
      created_at: new Date().toISOString(),
    }

    addItem(productForCart as any)

    // 🔥 TRACKING: Log a 'purchase' event (Add to Cart is the conversion metric)
    trackRecommendationEvent('purchase', rec.productId)

    // Track which items were added for UI feedback
    setAddedIds(prev => new Set(prev).add(rec.productId))
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev)
        next.delete(rec.productId)
        return next
      })
    }, 2500)
  }, [addItem])

  const handleProductClick = useCallback((recommendedProductId: string) => {
    // 🔥 TRACKING: Log a 'click' event when the user navigates to the product page
    trackRecommendationEvent('click', recommendedProductId)
  }, [])

  // Don't render if no recommendations and not loading
  if (!loading && recommendations.length === 0) {
    return null
  }

  return (
    <section className={cn('mt-20 lg:mt-28', className)}>
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="flex items-center gap-5 mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bushal-copper/5 border border-bushal-copper/10 flex items-center justify-center text-bushal-copper flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper mb-0.5">
              Graph Intelligence
            </p>
            <h2 className="font-heading text-2xl lg:text-3xl text-bushal-forest leading-tight">
              Similar Products
            </h2>
          </div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-bushal-border to-transparent" />
      </motion.div>

      {/* Loading State (Skeleton) */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden animate-pulse flex flex-col">
              <div className="aspect-[3/4] bg-bushal-ivoryDeep" />
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="h-3 w-1/3 bg-bushal-ivoryDeep rounded" />
                <div className="h-4 w-3/4 bg-bushal-ivoryDeep rounded" />
                <div className="h-5 w-1/2 bg-bushal-ivoryDeep rounded mt-auto" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-bushal-ivoryDeep rounded-full" />
                  <div className="h-5 w-12 bg-bushal-ivoryDeep rounded-full" />
                </div>
                <div className="h-10 w-full bg-bushal-ivoryDeep rounded-xl mt-auto" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State with Retry */}
      {error && !loading && (
        <div className="bg-bushal-dangerBg border border-bushal-danger/20 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bushal-danger/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-bushal-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-bushal-danger font-medium mb-3">{error}</p>
          <button
            onClick={fetchRecommendations}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-bushal-danger bg-white hover:bg-bushal-dangerBg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && recommendations.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6"
        >
          {recommendations.map((rec) => {
            const cover = (Array.isArray(rec.images) && rec.images[0]) || rec.image_url
            const isAdded = addedIds.has(rec.productId)
            const rwrPercent = Math.round(rec.rwrProbability * 100)
            const prScore = rec.pageRankScore.toFixed(2)

            return (
              <motion.div
                key={rec.productId}
                variants={itemVariants}
                layout
                className="group bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden shadow-card hover:shadow-cardHover hover:border-bushal-borderMid transition-all duration-300 flex flex-col"
              >
                {/* Image Container */}
                <Link 
                  href={`/product/${rec.productId}`} 
                  className="block relative aspect-[3/4] overflow-hidden bg-bushal-ivoryDeep"
                  onClick={() => handleProductClick(rec.productId)}
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={rec.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* RWR Probability Badge (Glassmorphism) */}
                  <div className="absolute top-3 left-3 bg-bushal-forest/90 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {rwrPercent}% Match
                  </div>

                  {/* Stock Badge */}
                  {!rec.in_stock && (
                    <div className="absolute bottom-3 left-3 bg-bushal-danger/90 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-lg">
                      Sold Out
                    </div>
                  )}
                </Link>

                {/* Details Container */}
                <div className="p-4 flex flex-col flex-1 gap-3">
                  <Link 
                    href={`/product/${rec.productId}`} 
                    className="group/link"
                    onClick={() => handleProductClick(rec.productId)}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper mb-1.5">
                      {rec.category}
                    </p>
                    <h3 className="font-heading text-sm sm:text-base lg:text-lg text-bushal-forest leading-tight line-clamp-2 group-hover/link:text-bushal-copper transition-colors">
                      {rec.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mt-auto">
                    <span className="font-heading text-base sm:text-lg lg:text-xl font-bold text-bushal-copper">
                      {formatPrice(rec.price)}
                    </span>
                  </div>

                  {/* Algorithm Metrics Pills - Hidden on very small screens */}
                  <div className="hidden sm:flex items-center gap-2 flex-wrap">
                    <span className="bg-bushal-ivoryDeep text-bushal-inkMid px-2 py-0.5 rounded-full text-[10px] font-semibold border border-bushal-border/50">
                      PR: {prScore}
                    </span>
                    <span className="bg-bushal-copper/10 text-bushal-copper px-2 py-0.5 rounded-full text-[10px] font-bold border border-bushal-copper/20">
                      RWR: {rec.rwrProbability.toFixed(2)}
                    </span>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(rec)}
                    disabled={!rec.in_stock || isAdded}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all mt-auto",
                      "flex items-center justify-center gap-2",
                      "min-h-touch", // Touch target for mobile
                      rec.in_stock
                        ? isAdded
                          ? "bg-bushal-success text-white shadow-md shadow-bushal-success/20"
                          : "bg-bushal-forest text-white hover:bg-bushal-forestMid active:scale-[0.97] shadow-md shadow-bushal-forest/10"
                        : "bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed border border-bushal-border"
                    )}
                  >
                    {isAdded ? (
                      <>
                        <motion.svg 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </motion.svg>
                        Added
                      </>
                    ) : rec.in_stock ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Add to Bag
                      </>
                    ) : (
                      "Unavailable"
                    )}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Footer Note */}
      {!loading && recommendations.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-bushal-inkSoft text-center mt-8 font-medium"
        >
          Powered by Product Graph (PageRank + RWR) · Optimized via Thompson Sampling
        </motion.p>
      )}
    </section>
  )
}