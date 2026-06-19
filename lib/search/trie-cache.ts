// lib/search/trie-cache.ts

/**
 * ============================================================================
 * TRIE IN-PROCESS CACHE (MODULE-LEVEL SINGLETON)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS:
 * The Next.js /api/search/autocomplete route previously called buildTrie()
 * on every Redis cache miss. On Vercel, each serverless function invocation
 * is a fresh process, so the trie was rebuilt (5,000 row Supabase query +
 * in-memory trie construction) on every cold start.
 *
 * Even with Redis caching, there are two failure modes:
 *   1. Redis is down or slow (the try/catch in the route silently swallows
 *      the error and falls through to the slow path every time).
 *   2. The request is for a query key not yet in Redis (cache miss).
 *
 * In both cases, the route hits Supabase and rebuilds the trie from scratch.
 *
 * THE FIX:
 * This module exports a module-level singleton that stores the built trie
 * in the Node.js process memory with a configurable TTL. On Vercel, a
 * warmed serverless function instance can serve many requests without ever
 * rebuilding the trie. Only after the TTL expires (or the instance restarts)
 * does the route hit Supabase again.
 *
 * This is the standard pattern for in-process caching in Next.js serverless.
 * It is NOT a replacement for Redis — Redis covers cross-instance and
 * cross-cold-start sharing. This covers within-instance reuse.
 *
 * LAYER ORDER (fastest to slowest):
 *   1. Module-level in-process cache (this file) — ~0ms
 *   2. Redis exact-prefix precomputed cache       — ~2-5ms
 *   3. Redis standard cache                       — ~2-5ms
 *   4. Supabase query + trie rebuild              — ~100-500ms
 * ============================================================================
 */

import { ProductSearchTrie } from './trie'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrieCache {
  trie: ProductSearchTrie
  /** Total number of products indexed in the trie */
  count: number
  /** Unix timestamp (ms) when this cache entry was built */
  builtAt: number
}

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * How long to keep the in-process trie alive (milliseconds).
 * 5 minutes matches the Redis standard cache TTL.
 * Increase this for read-heavy stores with infrequent product changes.
 */
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Module-level singleton ──────────────────────────────────────────────────

/**
 * The single trie instance shared across all requests handled by this
 * serverless function process. Declared at module scope so it survives
 * across multiple invocations of the same warm Vercel function instance.
 */
let _cache: TrieCache | null = null

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the cached trie if it exists and has not expired.
 * Returns null if:
 *   - The cache has never been populated (cold start)
 *   - The TTL has elapsed since the last build
 */
export function getCachedTrie(): TrieCache | null {
  if (!_cache) return null

  const ageMs = Date.now() - _cache.builtAt
  if (ageMs > CACHE_TTL_MS) {
    // Cache has expired — evict it
    _cache = null
    return null
  }

  return _cache
}

/**
 * Stores a freshly built trie in the module-level cache.
 * Called after a successful Supabase query + trie construction.
 *
 * @param trie  - The fully built ProductSearchTrie
 * @param count - Number of products indexed
 */
export function setCachedTrie(trie: ProductSearchTrie, count: number): void {
  _cache = {
    trie,
    count,
    builtAt: Date.now(),
  }
}

/**
 * Forcibly invalidates the in-process cache.
 * Call this from admin product create/update/delete routes so the next
 * autocomplete request rebuilds the trie with fresh product data.
 *
 * Example usage in a product mutation API route:
 *   import { invalidateTrieCache } from '@/lib/search/trie-cache'
 *   invalidateTrieCache()
 */
export function invalidateTrieCache(): void {
  _cache = null
}

/**
 * Returns cache metadata without exposing the trie itself.
 * Useful for health-check or debug endpoints.
 */
export function getTrieCacheStats(): {
  isCached: boolean
  count: number
  ageSeconds: number | null
  expiresInSeconds: number | null
} {
  if (!_cache) {
    return { isCached: false, count: 0, ageSeconds: null, expiresInSeconds: null }
  }

  const ageMs = Date.now() - _cache.builtAt
  const remainingMs = CACHE_TTL_MS - ageMs

  return {
    isCached: remainingMs > 0,
    count: _cache.count,
    ageSeconds: Math.round(ageMs / 1000),
    expiresInSeconds: Math.max(0, Math.round(remainingMs / 1000)),
  }
}