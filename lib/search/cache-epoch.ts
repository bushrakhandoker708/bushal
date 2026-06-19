// lib/search/cache-epoch.ts

/**
 * ============================================================================
 * SEARCH CACHE EPOCH — VERSIONED CACHE-BUSTING FOR REDIS AUTOCOMPLETE CACHE
 * ============================================================================
 *
 * PROBLEM THIS SOLVES:
 * The autocomplete route caches results in Redis under keys like
 * `autocomplete:exact:shirt` with a 24-hour TTL. When a product is edited
 * or deleted, there is no way to know which cached query keys reference it
 * — "shirt" could be cached, "blue cotton shirt" could be cached, "sh"
 * could be cached. Deleting them all would mean enumerating every possible
 * prefix, which is infeasible.
 *
 * THE FIX:
 * Every autocomplete cache key is namespaced with an epoch number, e.g.
 * `autocomplete:v7:exact:shirt`. Reads always fetch the CURRENT epoch first
 * and only read/write keys under that epoch. A product mutation calls
 * bumpCacheEpoch(), which atomically increments the epoch in Redis.
 *
 * After a bump, every previously cached key becomes permanently unreachable
 * (nothing will ever ask for `autocomplete:v6:...` again) without needing
 * to be explicitly deleted. They simply expire naturally via their existing
 * TTL and Redis reclaims the memory. This is O(1) invalidation regardless
 * of how many queries a product might be cached under.
 *
 * This is the same pattern CDNs use for cache-busting static assets via a
 * version/hash in the URL, applied to a key-value cache instead of a URL.
 * ============================================================================
 */

import { redis } from '@/lib/redis'

const EPOCH_KEY = 'autocomplete:cache-epoch'

/**
 * Returns the current cache epoch. Defaults to 0 if Redis is unreachable
 * or the key has never been set — this is safe because epoch 0 is just
 * another valid namespace, not a special "broken" state.
 */
export async function getCacheEpoch(): Promise<number> {
  try {
    const epoch = await redis.get<number>(EPOCH_KEY)
    return typeof epoch === 'number' ? epoch : 0
  } catch (err) {
    console.warn('[Cache Epoch] Redis read failed, defaulting to epoch 0:', err)
    return 0
  }
}

/**
 * Atomically increments the cache epoch. Call this from every product
 * mutation path (create, update, delete) so all previously cached
 * autocomplete results become unreachable on the next request.
 *
 * INCR is atomic in Redis — safe to call from concurrent requests without
 * a race condition where two simultaneous deletes both read epoch=5 and
 * both write epoch=6 (Redis serializes INCR operations).
 *
 * Failure is non-fatal: if Redis is down, mutations still succeed against
 * Postgres, and the cache will simply serve stale data until its TTL
 * expires naturally (worst case, the original 24h staleness window —
 * no worse than before this fix, never better than the fix when Redis works).
 */
export async function bumpCacheEpoch(): Promise<void> {
  try {
    await redis.incr(EPOCH_KEY)
  } catch (err) {
    console.warn(
      '[Cache Epoch] Failed to bump epoch — stale autocomplete entries may persist until TTL expiry.',
      err
    )
  }
}