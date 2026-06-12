// lib/redis.ts
// Initializes the Upstash Redis client for server-side caching.
// This is used to cache heavy analytics RPC results (like RFM, 
// CLV, and revenue summaries) to prevent database overload 
// and ensure the admin dashboard loads instantly as data scales.

import { Redis } from '@upstash/redis'

// Initialize the Redis client using environment variables.
// Upstash provides a REST-based Redis API, making it perfect 
// for serverless environments like Vercel (where Bushal is hosted).
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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

// Helper function to invalidate all analytics caches.
// Call this function whenever a new order is fulfilled, cancelled, 
// or a product is deleted/updated to ensure the dashboard reflects 
// the latest data immediately.
export async function invalidateAnalyticsCache() {
  const keysToDelete = Object.values(CACHE_KEYS)
  if (keysToDelete.length > 0) {
    // Upstash Redis supports deleting multiple keys in one network request
    await redis.del(...keysToDelete)
    console.log('🗑️ Analytics cache invalidated successfully.')
  }
}
