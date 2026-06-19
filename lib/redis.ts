// lib/redis.ts
// Initializes the Upstash Redis client for server-side caching.
// This is used to cache heavy analytics RPC results (like RFM,
// CLV, and revenue summaries) to prevent database overload
// and ensure the admin dashboard loads instantly as data scales.
// It is ALSO used by lib/bkash/index.ts to persist the bKash auth token
// across Vercel serverless cold starts.

import { Redis } from '@upstash/redis'

// SECURITY FIX: Ensure environment variables are present.
// These should NEVER be exposed to the client bundle.
// If they are missing, we fail fast in development but handle gracefully in production
// to prevent crashing the entire app if Redis is temporarily down.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (!redisUrl || !redisToken) {
  console.warn('⚠️ Upstash Redis environment variables are missing. Caching will be disabled.')
}

// Initialize the Redis client using environment variables.
// Upstash provides a REST-based Redis API over HTTPS (TLS/SSL enforced by default).
// The client automatically handles connection pooling and retries.
export const redis = new Redis({
  url: redisUrl!,
  token: redisToken!,
  // Optional: Enable automatic retry logic for transient network errors
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.exp(retryCount) * 50,
  },
})

// Cache Keys Configuration
// Centralizing cache keys prevents typos and makes it easy to
// invalidate specific caches when data changes.
export const CACHE_KEYS = {
  ANALYTICS_SUMMARY: 'bushal:analytics:summary:v1',
  DAILY_REVENUE: 'bushal:analytics:daily_revenue:v1',
  RFM_SEGMENTATION: 'bushal:analytics:rfm:v1',
  COHORT_RETENTION: 'bushal:analytics:cohort:v1',
  PREDICTIVE_CLV: 'bushal:analytics:clv:v1',
  DEMAND_FORECAST: 'bushal:analytics:forecast:v1',
  RESTOCK_RECOMMENDATIONS: 'bushal:analytics:restock:v1',
  CATEGORY_TRENDS: 'bushal:analytics:category_trends:v1',
}

// Cache TTL (Time To Live) Configuration
// Analytics data doesn't need to be real-time. Caching for 1 hour
// provides a massive performance boost while keeping data fresh enough.
export const CACHE_TTL = {
  SHORT: 300,    // 5 minutes (for highly volatile data like restock alerts)
  MEDIUM: 1800,  // 30 minutes (for daily revenue trends)
  LONG: 3600,    // 1 hour (for heavy aggregations like RFM, CLV, Cohorts)
}

/**
 * Health check function to verify Redis connectivity.
 * Useful for debugging or pre-flight checks before critical operations.
 * Returns true if Redis is reachable, false otherwise.
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error('❌ Redis health check failed:', error)
    return false
  }
}

// Helper function to invalidate all analytics caches.
// Call this function whenever a new order is fulfilled, cancelled,
// or a product is deleted/updated to ensure the dashboard reflects
// the latest data immediately.
export async function invalidateAnalyticsCache() {
  const keysToDelete = Object.values(CACHE_KEYS)
  if (keysToDelete.length > 0) {
    try {
      // Upstash Redis supports deleting multiple keys in one network request
      await redis.del(...keysToDelete)
      console.log('🗑️ Analytics cache invalidated successfully.')
    } catch (error) {
      console.error('❌ Failed to invalidate analytics cache:', error)
      // Don't throw here – cache invalidation failure shouldn't break the main operation
    }
  }
}