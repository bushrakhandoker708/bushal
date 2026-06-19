// app/components/product/ProductRecommendations.tsx
/**
 * ============================================================================
 * SMART AI RECOMMENDATIONS ORCHESTRATOR
 * ============================================================================
 * 
 * This is the unified, fallback-aware recommendation engine for the product page.
 * It replaces the need for separate FBT, Similar, and Trending components by 
 * fetching all three in parallel and intelligently rendering what's available.
 * 
 * FIXES THE "EMPTY PAGE" ISSUE:
 * - If the ML pipeline hasn't generated FBT or Similar data yet, this component 
 *   gracefully falls back to showing "Trending Now" products so the page is 
 *   never empty.
 * - If ALL APIs return empty, it renders a beautiful "Discover More" fallback 
 *   with a call-to-action, maintaining a premium UX even with zero data.
 * 
 * TRACKING:
 * - Integrates with the Thompson Sampling A/B testing framework.
 * - Tracks impressions, clicks, and purchases for each algorithm separately
 *   to dynamically optimize which recommendation engine performs best.
 * 
 * USAGE:
 * <ProductRecommendations productId={product.id} userId={currentUserId} />
 * ============================================================================
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { useCart } from '@/app/hooks/useCart'
import { cn } from '@/app/lib/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────
interface Recommendation {
  product_id: string
  name: string
  price: number
  image_url: string | null
  images: string[]
  category: string
  in_stock: boolean
  discount_percent?: number | null
  score?: number
  reason?: string
  algorithm: 'fbt' | 'similar' | 'trending'
}

interface Props {
  productId?: string
  userId?: string | null
  className?: string
}

// API Response Types
interface FBTResponse {
  success: boolean
  recommendations: Array<{
    product_id: string
    name?: string
    price?: number
    image_url?: string | null
    images?: string[]
    category?: string
    in_stock?: boolean
    discount_percent?: number | null
    confidence?: number
    reason?: string
    product?: {
      name: string
      price: number
      image_url: string | null
      images: string[]
      category: string
      in_stock: boolean
      discount_percent: number | null
    }
  }>
}

interface SimilarResponse {
  success: boolean
  recommendations: Array<{
    productId?: string
    product_id?: string
    name?: string
    price?: number
    image_url?: string | null
    images?: string[]
    category?: string
    in_stock?: boolean
    discount_percent?: number | null
    rwrProbability?: number
    score?: number
    product?: {
      name: string
      price: number
      image_url: string | null
      images: string[]
      category: string
      in_stock: boolean
      discount_percent: number | null
    }
  }>
}

interface TrendingResponse {
  success: boolean
  trendingProducts: Array<{
    product_id: string
    product_name?: string
    name?: string
    price: number
    image_url: string | null
    images?: string[]
    category?: string
    in_stock?: boolean
    discount_percent?: number | null
    trend_score?: number
    trend_status?: string
  }>
}

// Model names for Thompson Sampling tracking
const MODEL_NAMES: Record<string, string> = {
  fbt: 'fp_growth',
  similar: 'pagerank_rwr',
  trending: 'trending_ema',
}

// ─── Tracking Helper ────────────────────────────────────────────────────────
function trackEvent(
  algorithm: 'fbt' | 'similar' | 'trending', 
  eventType: 'impression' | 'click' | 'purchase', 
  productId: string
) {
  const modelName = MODEL_NAMES[algorithm]
  if (!modelName) return
  try {
    fetch('/api/recommendations/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName, eventType, productId }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

// ─── Data Mappers ───────────────────────────────────────────────────────────
const mapFBT = (rec: FBTResponse['recommendations'][0]): Recommendation => ({
  product_id: rec.product_id,
  name: rec.name || rec.product?.name || 'Unknown Product',
  price: rec.price ?? rec.product?.price ?? 0,
  image_url: rec.image_url ?? rec.product?.image_url ?? null,
  images: rec.images || rec.product?.images || [],
  category: rec.category || rec.product?.category || 'General',
  in_stock: rec.in_stock ?? rec.product?.in_stock ?? true,
  discount_percent: rec.discount_percent ?? rec.product?.discount_percent ?? null,
  score: rec.confidence,
  reason: rec.reason,
  algorithm: 'fbt',
})

const mapSimilar = (rec: SimilarResponse['recommendations'][0]): Recommendation => ({
  product_id: rec.productId || rec.product_id || '',
  name: rec.name || rec.product?.name || 'Unknown Product',
  price: rec.price ?? rec.product?.price ?? 0,
  image_url: rec.image_url ?? rec.product?.image_url ?? null,
  images: rec.images || rec.product?.images || [],
  category: rec.category || rec.product?.category || 'General',
  in_stock: rec.in_stock ?? rec.product?.in_stock ?? true,
  discount_percent: rec.discount_percent ?? rec.product?.discount_percent ?? null,
  score: rec.rwrProbability ?? rec.score,
  reason: `Similarity: ${((rec.rwrProbability ?? rec.score ?? 0) * 100).toFixed(0)}%`,
  algorithm: 'similar',
})

const mapTrending = (rec: TrendingResponse['trendingProducts'][0]): Recommendation => ({
  product_id: rec.product_id,
  name: rec.product_name || rec.name || 'Unknown Product',
  price: rec.price ?? 0,
  image_url: rec.image_url ?? null,
  images: rec.images || [],
  category: rec.category || 'General',
  in_stock: rec.in_stock ?? true,
  discount_percent: rec.discount_percent ?? null,
  score: rec.trend_score,
  reason: `Trending: ${rec.trend_status || 'HOT'}`,
  algorithm: 'trending',
})

// ─── Sub-Component: Recommendation Card ─────────────────────────────────────
function RecommendationCard({ 
  item, 
  onAddToCart, 
  isAdded, 
  onClick 
}: { 
  item: Recommendation
  onAddToCart: (item: Recommendation) => void
  isAdded: boolean
  onClick: () => void
}) {
  const cover = (Array.isArray(item.images) && item.images[0]) || item.image_url
  const discountedPrice = item.discount_percent 
    ? item.price * (1 - item.discount_percent / 100) 
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden shadow-card hover:shadow-cardHover transition-all duration-300"
    >
      <Link href={`/product/${item.product_id}`} onClick={onClick} className="block relative aspect-[3/4] overflow-hidden bg-bushal-ivoryDeep">
        {cover ? (
          <img 
            src={cover} 
            alt={item.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Algorithm Badges */}
        {item.algorithm === 'fbt' && (
          <div className="absolute top-3 left-3 bg-bushal-forest/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md">
            Frequently Bought
          </div>
        )}
        {item.algorithm === 'similar' && item.score && (
          <div className="absolute top-3 left-3 bg-bushal-copper/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {Math.round(item.score * 100)}% Match
          </div>
        )}
        {item.algorithm === 'trending' && (
          <div className="absolute top-3 left-3 bg-bushal-danger/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
            </svg>
            Trending
          </div>
        )}
        
        {/* Stock Badge */}
        {!item.in_stock && (
          <div className="absolute bottom-3 left-3 bg-bushal-ink/80 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md">
            Sold Out
          </div>
        )}
      </Link>
      
      <div className="p-4 flex flex-col gap-2">
        <Link href={`/product/${item.product_id}`} onClick={onClick} className="group/link">
          <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper mb-1">
            {item.category}
          </p>
          <h3 className="font-heading text-base text-bushal-forest leading-tight line-clamp-2 group-hover/link:text-bushal-copper transition-colors">
            {item.name}
          </h3>
        </Link>
        
        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="font-heading text-lg font-semibold text-bushal-copper">
            {formatPrice(discountedPrice ?? item.price)}
          </span>
          {discountedPrice && (
            <span className="text-xs text-bushal-inkSoft line-through">
              {formatPrice(item.price)}
            </span>
          )}
        </div>
        
        <button
          onClick={() => onAddToCart(item)}
          disabled={!item.in_stock || isAdded}
          className={cn(
            "w-full py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all mt-1",
            item.in_stock
              ? isAdded
                ? "bg-bushal-success text-white"
                : "bg-bushal-forest text-white hover:bg-bushal-forestMid active:scale-[0.97]"
              : "bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed"
          )}
        >
          {isAdded ? 'Added!' : item.in_stock ? 'Add to Bag' : 'Unavailable'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Sub-Component: Recommendation Section ──────────────────────────────────
function RecommendationSection({ 
  title, 
  subtitle, 
  items, 
  onAddToCart, 
  addedIds, 
  onProductClick 
}: { 
  title: string
  subtitle: string
  items: Recommendation[]
  onAddToCart: (item: Recommendation) => void
  addedIds: Set<string>
  onProductClick: (item: Recommendation) => void
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper mb-1">
            {subtitle}
          </p>
          <h2 className="font-heading text-2xl lg:text-3xl text-bushal-forest">
            {title}
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((item) => (
          <RecommendationCard
            key={item.product_id}
            item={item}
            onAddToCart={onAddToCart}
            isAdded={addedIds.has(item.product_id)}
            onClick={() => onProductClick(item)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ProductRecommendations({ productId, userId, className }: Props) {
  const { addItem } = useCart()
  const [fbt, setFbt] = useState<Recommendation[]>([])
  const [similar, setSimilar] = useState<Recommendation[]>([])
  const [trending, setTrending] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  // Fetch all recommendation types in parallel
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [fbtRes, similarRes, trendingRes] = await Promise.allSettled([
          productId 
            ? fetch(`/api/recommendations/frequently-bought/${productId}?limit=4`).then(r => r.json()) 
            : Promise.resolve(null),
          productId 
            ? fetch(`/api/products/graph-similar/${productId}?limit=4&alpha=0.7`).then(r => r.json()) 
            : Promise.resolve(null),
          fetch(`/api/products/trending?limit=8&status=HOT`).then(r => r.json())
        ])

        // Process FBT
        if (fbtRes.status === 'fulfilled' && fbtRes.value?.success) {
          const fbtData = fbtRes.value as FBTResponse
          const mapped = fbtData.recommendations.map((rec: FBTResponse['recommendations'][0]) => mapFBT(rec))
          setFbt(mapped)
          mapped.forEach(rec => trackEvent('fbt', 'impression', rec.product_id))
        }

        // Process Similar
        if (similarRes.status === 'fulfilled' && similarRes.value?.success) {
          const similarData = similarRes.value as SimilarResponse
          const mapped = similarData.recommendations.map((rec: SimilarResponse['recommendations'][0]) => mapSimilar(rec))
          setSimilar(mapped)
          mapped.forEach(rec => trackEvent('similar', 'impression', rec.product_id))
        }

        // Process Trending
        if (trendingRes.status === 'fulfilled' && trendingRes.value?.success) {
          const trendingData = trendingRes.value as TrendingResponse
          const mapped = trendingData.trendingProducts.map((rec: TrendingResponse['trendingProducts'][0]) => mapTrending(rec))
          setTrending(mapped)
          mapped.forEach(rec => trackEvent('trending', 'impression', rec.product_id))
        }
      } catch (err) {
        console.error('[ProductRecommendations] Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [productId, userId])

  const handleAddToCart = useCallback((rec: Recommendation) => {
    if (!rec.in_stock) return
    
    const productForCart = {
      id: rec.product_id,
      name: rec.name,
      price: rec.price,
      image_url: rec.image_url,
      images: rec.images,
      discount_percent: rec.discount_percent,
      in_stock: rec.in_stock,
      stock_quantity: 99,
      category: rec.category,
      created_at: new Date().toISOString(),
    }
    
    addItem(productForCart as any)
    trackEvent(rec.algorithm, 'purchase', rec.product_id)
    
    setAddedIds(prev => new Set(prev).add(rec.product_id))
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev)
        next.delete(rec.product_id)
        return next
      })
    }, 2000)
  }, [addItem])

  const handleProductClick = useCallback((rec: Recommendation) => {
    trackEvent(rec.algorithm, 'click', rec.product_id)
  }, [])

  // Skeleton Loader
  if (loading) {
    return (
      <section className={cn('mt-20 lg:mt-28 space-y-12', className)}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-6">
            <div className="h-4 w-24 bg-bushal-ivoryDeep rounded animate-pulse" />
            <div className="h-8 w-64 bg-bushal-ivoryDeep rounded animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-bushal-ivoryDeep" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-1/2 bg-bushal-ivoryDeep rounded" />
                    <div className="h-4 w-3/4 bg-bushal-ivoryDeep rounded" />
                    <div className="h-8 w-full bg-bushal-ivoryDeep rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    )
  }

  // Absolute Fallback if EVERYTHING is empty
  if (fbt.length === 0 && similar.length === 0 && trending.length === 0) {
    return (
      <section className={cn('mt-20 lg:mt-28', className)}>
        <div className="text-center py-16 bg-bushal-ivoryDeep/40 rounded-3xl border border-dashed border-bushal-border">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-bushal-copper/10 flex items-center justify-center text-bushal-copper">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-heading text-2xl text-bushal-forest mb-2">Discover More</h3>
          <p className="text-bushal-inkSoft max-w-md mx-auto mb-6">
            Our AI is currently analyzing purchase patterns to personalize your recommendations. In the meantime, explore our trending products!
          </p>
          <Link 
            href="/dashboard" 
            className="btn-copper text-white px-6 py-2.5 rounded-xl inline-flex items-center gap-2"
          >
            Browse All Products
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={cn('mt-20 lg:mt-28 space-y-16', className)}>
      <AnimatePresence mode="wait">
        {/* Section 1: Frequently Bought Together */}
        {fbt.length > 0 && (
          <motion.div
            key="fbt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <RecommendationSection
              title="Frequently Bought Together"
              subtitle="Products commonly purchased with this item"
              items={fbt}
              onAddToCart={handleAddToCart}
              addedIds={addedIds}
              onProductClick={handleProductClick}
            />
          </motion.div>
        )}

        {/* Section 2: Similar Products */}
        {similar.length > 0 && (
          <motion.div
            key="similar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <RecommendationSection
              title="Similar Products"
              subtitle="Discovered via PageRank & Random Walk"
              items={similar}
              onAddToCart={handleAddToCart}
              addedIds={addedIds}
              onProductClick={handleProductClick}
            />
          </motion.div>
        )}

        {/* Section 3: Trending Now (Fallback / Discovery) */}
        {trending.length > 0 && (
          <motion.div
            key="trending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <RecommendationSection
              title="Trending Now"
              subtitle="Hot items based on recent sales velocity"
              items={trending}
              onAddToCart={handleAddToCart}
              addedIds={addedIds}
              onProductClick={handleProductClick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-bushal-inkSoft text-center pt-4 border-t border-bushal-border/50"
      >
        Powered by Bushal AI · Optimized via Thompson Sampling
      </motion.p>
    </section>
  )
}