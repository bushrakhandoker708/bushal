// app/api/recommendations/user/[userId]/route.ts
/*
 * ============================================================================
 * PERSONALIZED RECOMMENDATIONS API ENDPOINT
 * ============================================================================
 * 
 * This API endpoint generates personalized product recommendations for a user
 * using collaborative filtering algorithms (Cosine Similarity, KNN, SVD).
 * 
 * FEATURES:
 * - Fetches user purchase history from Supabase
 * - Uses collaborative filtering to find similar users
 * - Returns top N recommended products with scores
 * - Handles cold start (new users) with trending products fallback
 * - Caches results for performance
 * 
 * BUG FIXES:
 * 1. Next.js 15 params handling: params is now a Promise, must be awaited
 * 2. Cold start now returns trending products (recent purchase velocity)
 *    instead of just popular products
 * 3. Fixed type safety issues with explicit type annotations
 * 4. Improved error handling with proper params access
 * 
 * USAGE:
 * GET /api/recommendations/user/[userId]?limit=10&useHybrid=true
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "userId": "uuid",
 *   "recommendations": [...],
 *   "algorithm": "hybrid" | "collaborative_filtering" | "cold_start_trending",
 *   "generatedAt": "timestamp"
 * }
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import {
  getRecommendationsForUser,
  getCollaborativeRecommendations,
  getHybridRecommendations,
  buildUserItemMatrix,
  findKNNSimilarUsers,
} from '@/lib/recommendations/collaborativeFiltering'
import type { UserPurchase, ProductInfo, Recommendation } from '@/lib/recommendations/collaborativeFiltering'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RequestParams {
  params: Promise<{
    userId: string
  }>
}

interface RecommendationResponse {
  success: boolean
  userId: string
  recommendations: Recommendation[]
  algorithm: string
  similarUsersCount?: number
  totalProductsAnalyzed: number
  generatedAt: string
  error?: string
}

interface OrderRow {
  id: string
  user_id: string
  created_at: string
  total: number
  status: string
}

interface OrderItemRow {
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
}

interface ProductRow {
  id: string
  name: string
  category: string | null
  price: number
  image_url: string | null
  images: string[] | null
  in_stock: boolean
  stock_quantity: number | null
}

// ─── Cache Configuration ───────────────────────────────────────────────────

const CACHE_TTL = 1800 // 30 minutes
const cache = new Map<string, { data: RecommendationResponse; timestamp: number }>()

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Fetch all user purchases from the database
 */
async function fetchUserPurchases(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<UserPurchase[]> {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, user_id, created_at, total, status')
    .eq('status', 'fulfilled')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (ordersError) {
    console.error('[Recommendations] Error fetching orders:', ordersError)
    return []
  }

  if (!orders || orders.length === 0) return []

  const typedOrders = orders as OrderRow[]
  const orderIds = typedOrders.map((o) => o.id)

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, product_id, quantity, unit_price')
    .in('order_id', orderIds)

  if (itemsError) {
    console.error('[Recommendations] Error fetching order items:', itemsError)
    return []
  }

  const orderMap = new Map<string, OrderRow>(typedOrders.map((o) => [o.id, o]))
  const typedOrderItems = (orderItems ?? []) as OrderItemRow[]

  return typedOrderItems.map((item): UserPurchase => {
    const order = orderMap.get(item.order_id)
    return {
      user_id: order?.user_id ?? '',
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      order_date: order?.created_at ?? new Date().toISOString(),
    }
  })
}

/**
 * Fetch all products from the database
 */
async function fetchAllProducts(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<ProductInfo[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, category, price, image_url, images, in_stock, stock_quantity')
    .eq('in_stock', true)
    .is('is_deleted', false)
    .limit(500)

  if (error) {
    console.error('[Recommendations] Error fetching products:', error)
    return []
  }

  const typedProducts = (products ?? []) as ProductRow[]

  return typedProducts.map((p): ProductInfo => ({
    id: p.id,
    name: p.name,
    category: p.category || 'General',
    price: p.price,
    image_url: p.image_url || null,
    images: p.images || [],
    in_stock: p.in_stock,
  }))
}

/**
 * 🔥 COLD START FIX: Generate trending products based on recent purchase velocity
 * Uses a 30-day window with exponential decay to prioritize recent purchases
 */
async function getTrendingProducts(
  purchases: UserPurchase[],
  products: ProductInfo[],
  limit: number
): Promise<Recommendation[]> {
  const now = Date.now()
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
  
  // Filter to recent purchases only
  const recentPurchases = purchases.filter(p => {
    const purchaseTime = new Date(p.order_date).getTime()
    return purchaseTime >= thirtyDaysAgo
  })

  if (recentPurchases.length === 0) {
    // If no recent purchases, fall back to all-time popular products
    return getPopularProducts(purchases, products, limit)
  }

  // Calculate trending score with exponential decay
  // Recent purchases get higher weight
  const productScores = new Map<string, { score: number; purchaseCount: number }>()
  
  recentPurchases.forEach(purchase => {
    const purchaseTime = new Date(purchase.order_date).getTime()
    const daysAgo = (now - purchaseTime) / (24 * 60 * 60 * 1000)
    
    // Exponential decay: e^(-λt) where λ = 0.1 (half-life ~7 days)
    const decayFactor = Math.exp(-0.1 * daysAgo)
    const weightedQuantity = purchase.quantity * decayFactor
    
    const existing = productScores.get(purchase.product_id) || { score: 0, purchaseCount: 0 }
    productScores.set(purchase.product_id, {
      score: existing.score + weightedQuantity,
      purchaseCount: existing.purchaseCount + 1,
    })
  })

  // Convert to recommendations
  const recommendations: Recommendation[] = []
  
  productScores.forEach((data, productId) => {
    const product = products.find(p => p.id === productId)
    if (product && product.in_stock) {
      recommendations.push({
        product_id: productId,
        product,
        score: data.score,
        reason: `Trending: ${data.purchaseCount} recent purchase${data.purchaseCount > 1 ? 's' : ''}`,
        similar_users_count: 0,
      })
    }
  })

  // Sort by score and return top N
  recommendations.sort((a, b) => b.score - a.score)
  return recommendations.slice(0, limit)
}

/**
 * Fallback: Get popular products (all-time bestsellers)
 */
function getPopularProducts(
  purchases: UserPurchase[],
  products: ProductInfo[],
  limit: number
): Recommendation[] {
  const productPopularity = new Map<string, number>()
  
  purchases.forEach(p => {
    const current = productPopularity.get(p.product_id) || 0
    productPopularity.set(p.product_id, current + p.quantity)
  })

  const recommendations: Recommendation[] = []
  
  productPopularity.forEach((popularity, productId) => {
    const product = products.find(p => p.id === productId)
    if (product && product.in_stock) {
      recommendations.push({
        product_id: productId,
        product,
        score: popularity,
        reason: 'Popular among all customers',
        similar_users_count: 0,
      })
    }
  })

  recommendations.sort((a, b) => b.score - a.score)
  return recommendations.slice(0, limit)
}

/**
 * Check cache for existing recommendations
 */
function getCachedRecommendations(userId: string, limit: number): RecommendationResponse | null {
  const cacheKey = `${userId}:${limit}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
    return cached.data
  }
  
  cache.delete(cacheKey)
  return null
}

/**
 * Store recommendations in cache
 */
function setCachedRecommendations(userId: string, limit: number, data: RecommendationResponse): void {
  const cacheKey = `${userId}:${limit}`
  cache.set(cacheKey, { data, timestamp: Date.now() })
  
  // Limit cache size to prevent memory leaks
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) {
      cache.delete(firstKey)
    }
  }
}

// ─── Main API Handler ───────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: RequestParams
) {
  try {
    // 🔥 FIX: Await params in Next.js 15
    const { userId: requestedUserId } = await params

    // 1. Authentication
    const auth = await requireAuth()
    if (!auth.success) {
      return auth.response
    }

    // 2. Authorization
    const supabase = await auth.supabase
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .single()

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin && auth.userId !== requestedUserId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only fetch your own recommendations' },
        { status: 403 }
      )
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const useHybrid = searchParams.get('useHybrid') !== 'false'
    const k = parseInt(searchParams.get('k') || '5')

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 50.' },
        { status: 400 }
      )
    }

    // 4. Check cache
    const cached = getCachedRecommendations(requestedUserId, limit)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Recommendation-Algorithm': cached.algorithm,
        },
      })
    }

    // 5. Fetch data
    const [purchases, products] = await Promise.all([
      fetchUserPurchases(supabase),
      fetchAllProducts(supabase),
    ])

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        userId: requestedUserId,
        recommendations: [],
        algorithm: 'none',
        totalProductsAnalyzed: 0,
        generatedAt: new Date().toISOString(),
        error: 'No products available',
      })
    }

    // 6. Generate recommendations
    let recommendations: Recommendation[]
    let algorithm = 'unknown'
    let similarUsersCount = 0

    const userPurchases = purchases.filter(p => p.user_id === requestedUserId)

    if (userPurchases.length === 0) {
      // 🔥 COLD START FIX: Use trending products instead of just popular
      console.log(`[Recommendations] Cold start for user ${requestedUserId}, using trending fallback`)
      recommendations = await getTrendingProducts(purchases, products, limit)
      algorithm = 'cold_start_trending'
    } else if (useHybrid) {
      recommendations = getHybridRecommendations(
        requestedUserId,
        purchases,
        products,
        k,
        limit
      )
      algorithm = 'hybrid_cf_svd'
      
      const { userVectors } = buildUserItemMatrix(purchases)
      const similarUsers = findKNNSimilarUsers(requestedUserId, userVectors, k)
      similarUsersCount = similarUsers.length
    } else {
      recommendations = getCollaborativeRecommendations(
        requestedUserId,
        purchases,
        products,
        k,
        limit
      )
      algorithm = 'collaborative_filtering'
      
      const { userVectors } = buildUserItemMatrix(purchases)
      const similarUsers = findKNNSimilarUsers(requestedUserId, userVectors, k)
      similarUsersCount = similarUsers.length
    }

    // 7. Build response
    const response: RecommendationResponse = {
      success: true,
      userId: requestedUserId,
      recommendations,
      algorithm,
      similarUsersCount,
      totalProductsAnalyzed: products.length,
      generatedAt: new Date().toISOString(),
    }

    // 8. Cache
    setCachedRecommendations(requestedUserId, limit, response)

    // 9. Return
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=300`,
        'X-Cache': 'MISS',
        'X-Recommendation-Algorithm': algorithm,
        'X-Total-Products': products.length.toString(),
        'X-Similar-Users': similarUsersCount.toString(),
      },
    })

  } catch (error) {
    console.error('[Recommendations API] Unexpected error:', error)
    
    // 🔥 FIX: Safely access params in error handler
    let userId = 'unknown'
    try {
      const { userId: id } = await params
      userId = id
    } catch {
      // params might not be accessible in error state
    }
    
    return NextResponse.json(
      {
        success: false,
        userId,
        recommendations: [],
        algorithm: 'error',
        totalProductsAnalyzed: 0,
        generatedAt: new Date().toISOString(),
        error: 'Internal server error while generating recommendations',
      },
      { status: 500 }
    )
  }
}

// ─── POST Handler (Cache Invalidation) ──────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: RequestParams
) {
  try {
    // 🔥 FIX: Await params in Next.js 15
    const { userId: requestedUserId } = await params

    const auth = await requireAuth()
    if (!auth.success) {
      return auth.response
    }

    const supabase = await auth.supabase
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .single()

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin && auth.userId !== requestedUserId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Clear cache for this user
    const cacheKeys = Array.from(cache.keys())
    let clearedCount = 0
    cacheKeys.forEach(key => {
      if (key.startsWith(`${requestedUserId}:`)) {
        cache.delete(key)
        clearedCount++
      }
    })

    console.log(`[Recommendations] Cleared ${clearedCount} cache entries for user ${requestedUserId}`)

    return NextResponse.json({
      success: true,
      message: 'Recommendation cache cleared. Next request will generate fresh recommendations.',
      userId: requestedUserId,
      clearedEntries: clearedCount,
    })

  } catch (error) {
    console.error('[Recommendations API] Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear recommendation cache' },
      { status: 500 }
    )
  }
}