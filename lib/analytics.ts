// lib/analytics.ts
// Caching wrapper for heavy Supabase analytics RPCs.
// Uses Upstash Redis to cache results, preventing database overload
// and ensuring the admin dashboard loads instantly as data scales.
// 
// If Redis fails or the cache misses, it falls back to a direct 
// Supabase RPC call and caches the result for future requests.

import { redis, CACHE_KEYS, CACHE_TTL } from './redis'
import { createServerClient } from './supabase/server'

/*
 * Generic helper to check Redis cache before hitting the database.
 * If the cache misses, it executes the fetcher function, caches the result,
 * and returns it. If Redis throws an error, it falls back to the DB.
 */
async function getOrSetCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    // 1. Try to get from Redis
    const cached = await redis.get<T>(key)
    if (cached) return cached

    // 2. Cache miss: fetch from Supabase
    const data = await fetcher()

    // 3. Set in Redis with the specified TTL (in seconds)
    await redis.set(key, data, { ex: ttl })

    return data
  } catch (error) {
    console.error(`[Analytics Cache] Error for key ${key}:`, error)
    // Fallback to direct fetch if Redis is down or throws an error
    return await fetcher()
  }
}

// ─── Core Analytics Summary ────────────────────────────────────────────────
export async function getCachedAnalyticsSummary() {
  return getOrSetCache(
    CACHE_KEYS.ANALYTICS_SUMMARY,
    CACHE_TTL.LONG, // 1 hour
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_analytics_summary')
      if (error) throw error
      return data
    }
  )
}

// ─── Daily Revenue ─────────────────────────────────────────────────────────
export async function getCachedDailyRevenue(days: number = 30) {
  // We append the 'days' param to the key so different time ranges cache separately
  const key = `${CACHE_KEYS.DAILY_REVENUE}:${days}`
  
  return getOrSetCache(
    key,
    CACHE_TTL.MEDIUM, // 30 minutes
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_daily_revenue', { days })
      if (error) throw error
      return data
    }
  )
}

// ─── RFM Segmentation ─────────────────────────────────────────────────────
export async function getCachedRFMData() {
  return getOrSetCache(
    CACHE_KEYS.RFM_SEGMENTATION,
    CACHE_TTL.LONG, // 1 hour
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_rfm_segmentation')
      if (error) throw error
      return data
    }
  )
}

// ─── Cohort Retention ─────────────────────────────────────────────────────
export async function getCachedCohortData() {
  return getOrSetCache(
    CACHE_KEYS.COHORT_RETENTION,
    CACHE_TTL.LONG, // 1 hour
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_cohort_retention')
      if (error) throw error
      return data
    }
  )
}

// ─── Predictive CLV ────────────────────────────────────────────────────────
export async function getCachedCLVData() {
  return getOrSetCache(
    CACHE_KEYS.PREDICTIVE_CLV,
    CACHE_TTL.LONG, // 1 hour
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_predictive_clv')
      if (error) throw error
      return data
    }
  )
}

// ─── Advanced Demand Forecast ──────────────────────────────────────────────
export async function getCachedForecastData() {
  return getOrSetCache(
    CACHE_KEYS.DEMAND_FORECAST,
    CACHE_TTL.LONG, // 1 hour
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_advanced_demand_forecast')
      if (error) throw error
      return data
    }
  )
}

// ─── Restock Recommendations ───────────────────────────────────────────────
export async function getCachedRestockRecommendations(limit: number = 10) {
  const key = `${CACHE_KEYS.RESTOCK_RECOMMENDATIONS}:${limit}`
  
  return getOrSetCache(
    key,
    CACHE_TTL.SHORT, // 5 minutes (inventory changes frequently)
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_restock_recommendations', { limit_count: limit })
      if (error) throw error
      return data
    }
  )
}

// ─── Category Trends ───────────────────────────────────────────────────────
export async function getCachedCategoryTrends() {
  return getOrSetCache(
    CACHE_KEYS.CATEGORY_TRENDS,
    CACHE_TTL.MEDIUM, // 30 minutes
    async () => {
      const supabase = await createServerClient()
      const { data, error } = await supabase.rpc('get_category_trends')
      if (error) throw error
      return data
    }
  )
}
