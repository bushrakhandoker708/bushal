// ============================================================================
// FILE ADDRESS: app/components/product/RecommendedForYou.tsx
// ============================================================================
// EXPLANATION:
// This component displays personalized product recommendations for the logged-in
// user using Collaborative Filtering (User-Based KNN + SVD Hybrid).
// It integrates with the A/B Testing Framework (Thompson Sampling) to track
// user interactions and dynamically improve the recommendation engine.
//
// TRACKING INTEGRATION:
// - Impression: Fired when recommendations are successfully loaded and displayed.
// - Click: Fired when a user clicks on a recommended product (image or title).
// - Purchase (Add to Cart): Fired when a user adds a recommended product to cart.
//
// These events are sent to /api/recommendations/track, which updates the
// Beta distribution parameters (alpha/beta) for the 'collaborative_filtering'
// algorithm, allowing Thompson Sampling to dynamically allocate traffic.
// ============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { useCart } from '@/app/hooks/useCart'
import { cn } from '@/app/lib/utils/cn'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────
interface RecommendedProduct {
  product_id: string
  product: {
    id: string
    name: string
    category: string
    price: number
    image_url: string | null
    images: string[]
    in_stock: boolean
    discount_percent?: number | null
  }
  score: number
  reason: string
  similar_users_count: number
}

interface Props {
  userId: string | null
  productId?: string // The current product page ID (to exclude it from recommendations)
  className?: string
}

// The model name that generated these recommendations.
// Since this component uses the Collaborative Filtering API, we use 'collaborative_filtering'.
const MODEL_NAME = 'collaborative_filtering'

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
      console.warn('[RecForYou Tracking] Failed to log event:', err)
    })
  } catch (err) {
    console.warn('[RecForYou Tracking] Unexpected error:', err)
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function RecommendedForYou({ userId, productId, className }: Props) {
  const { addItem } = useCart()
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true)
        // Fetch hybrid recommendations (CF + SVD) with diversity enabled
        const response = await fetch(
          `/api/recommendations/user/${userId}?limit=8&useHybrid=true&enableDiversity=true`
        )
        
        if (!response.ok) throw new Error('Failed to fetch recommendations')
        
        const data = await response.json()
        
        if (data.success && data.recommendations?.length > 0) {
          // Filter out the current product if it somehow appears in the recommendations
          const filtered = data.recommendations.filter(
            (rec: RecommendedProduct) => rec.product_id !== productId
          )
          setRecommendations(filtered)
          
          //   TRACKING: Log impression events for all displayed recommendations
          // This tells Thompson Sampling that these items were shown to the user.
          filtered.forEach((rec: RecommendedProduct) => {
            trackRecommendationEvent('impression', rec.product_id)
          })
        } else {
          setRecommendations([])
        }
      } catch (err) {
        console.error('[RecForYou] Error fetching recommendations:', err)
        setRecommendations([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [userId, productId])

  const handleAddToCart = useCallback((rec: RecommendedProduct) => {
    if (!rec.product.in_stock) return
    
    // Create a Product-like object for the cart
    const productForCart = {
      id: rec.product.id,
      name: rec.product.name,
      price: rec.product.price,
      image_url: rec.product.image_url,
      images: rec.product.images,
      discount_percent: rec.product.discount_percent,
      in_stock: rec.product.in_stock,
      stock_quantity: 99, // Assume in stock
      created_at: new Date().toISOString(), // Required by Product type
    }
    
    addItem(productForCart as any)
    
    //   TRACKING: Log a 'purchase' event (Add to Cart is the conversion metric)
    // This automatically rewards the 'collaborative_filtering' model in the Thompson Sampling engine,
    // incrementing its alpha parameter (successes) and making it more likely to be
    // selected for future users.
    trackRecommendationEvent('purchase', rec.product_id)
    
    // Track which items were added for UI feedback
    setAddedIds(prev => new Set(prev).add(rec.product_id))
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev)
        next.delete(rec.product_id)
        return next
      })
    }, 2000)
  }, [addItem])

  const handleProductClick = useCallback((recommendedProductId: string) => {
    //   TRACKING: Log a 'click' event when the user navigates to the product page
    trackRecommendationEvent('click', recommendedProductId)
  }, [])

  // Don't render if not loading and no recommendations
  if (!loading && recommendations.length === 0) {
    return null
  }

  // Don't render if user is not logged in
  if (!userId) {
    return null
  }

  return (
    <section className={cn('mt-20 lg:mt-28', className)}>
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-5 mb-8"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper mb-1">
            Personalized for you
          </p>
          <h2 className="font-heading text-3xl text-bushal-forest">
            Recommended For You
          </h2>
          <p className="text-sm text-bushal-inkSoft mt-1">
            Based on your purchase history and similar customers
          </p>
        </div>
        <div className="flex-1 h-px bg-bushal-border" />
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden animate-pulse"
            >
              <div className="aspect-[3/4] bg-bushal-ivoryDeep" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-bushal-ivoryDeep rounded w-3/4" />
                <div className="h-3 bg-bushal-ivoryDeep rounded w-1/2" />
                <div className="h-10 bg-bushal-ivoryDeep rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && recommendations.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
        >
          {recommendations.map((rec, index) => {
            const cover = (Array.isArray(rec.product.images) && rec.product.images[0]) || rec.product.image_url
            const isAdded = addedIds.has(rec.product_id)
            const discountedPrice = rec.product.discount_percent
              ? rec.product.price * (1 - rec.product.discount_percent / 100)
              : null

            return (
              <motion.div
                key={rec.product_id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden shadow-card hover:shadow-cardHover transition-all duration-300"
              >
                {/* Image */}
                <Link
                  href={`/product/${rec.product_id}`}
                  className="block relative aspect-[3/4] overflow-hidden bg-bushal-ivoryDeep"
                  onClick={() => handleProductClick(rec.product_id)}
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={rec.product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Similar Buyers Badge */}
                  {rec.similar_users_count > 0 && (
                    <div className="absolute top-3 left-3 bg-bushal-forest/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {rec.similar_users_count} similar buyers
                    </div>
                  )}

                  {/* Stock Badge */}
                  {!rec.product.in_stock && (
                    <div className="absolute bottom-3 left-3 bg-bushal-danger/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md">
                      Sold Out
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div className="p-4 flex flex-col gap-3">
                  <Link
                    href={`/product/${rec.product_id}`}
                    className="group/link"
                    onClick={() => handleProductClick(rec.product_id)}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper mb-1">
                      {rec.product.category}
                    </p>
                    <h3 className="font-heading text-lg text-bushal-forest leading-tight line-clamp-2 group-hover/link:text-bushal-copper transition-colors">
                      {rec.product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-xl font-semibold text-bushal-copper">
                      {formatPrice(discountedPrice ?? rec.product.price)}
                    </span>
                    {discountedPrice && (
                      <span className="text-xs text-bushal-inkSoft line-through">
                        {formatPrice(rec.product.price)}
                      </span>
                    )}
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-bushal-inkSoft leading-relaxed line-clamp-1 italic">
                    {rec.reason}
                  </p>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(rec)}
                    disabled={!rec.product.in_stock || isAdded}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all",
                      rec.product.in_stock
                        ? isAdded
                          ? "bg-bushal-success text-white"
                          : "bg-bushal-forest text-white hover:bg-bushal-forestMid active:scale-[0.97]"
                        : "bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed"
                    )}
                  >
                    {isAdded ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Added!
                      </span>
                    ) : rec.product.in_stock ? (
                      "Add to Bag"
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
          transition={{ delay: 0.5 }}
          className="text-xs text-bushal-inkSoft text-center mt-6"
        >
          Powered by Collaborative Filtering & SVD · Optimized via Thompson Sampling
        </motion.p>
      )}
    </section>
  )
}