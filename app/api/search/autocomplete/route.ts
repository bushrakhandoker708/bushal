// app/api/search/autocomplete/route.ts

/**
 * ============================================================================
 * SEARCH AUTOCOMPLETE API — TRIE-POWERED WITH LAYERED, EPOCH-VERSIONED CACHING
 * ============================================================================
 *
 * REQUEST: GET /api/search/autocomplete?q=<query>&limit=8&inStockOnly=true
 *
 * CACHE HIERARCHY (checked in order, fastest first):
 *
 *   Layer 1 — In-process module singleton (lib/search/trie-cache.ts)
 *     The built ProductSearchTrie lives in Node.js process memory for 5 min.
 *
 *   Layer 2 — Redis exact-prefix precomputed cache
 *     Key: autocomplete:v<epoch>:exact:<query>  |  TTL: 24h
 *
 *   Layer 3 — Redis standard cache
 *     Key: autocomplete:v<epoch>:<query>:<limit>:<includeCategories>:<inStockOnly>  |  TTL: 5min
 *
 *   Layer 4 — Supabase query + Trie rebuild (slow path)
 *
 * BUG FIX (cache epoch — Bug 1D):
 *   All Redis keys now include the current cache epoch (lib/search/cache-epoch.ts).
 *   Product create/update/delete routes call bumpCacheEpoch(), which makes
 *   every previously cached key permanently unreachable instantly — without
 *   needing to know which query strings might reference the mutated product.
 *   Previously, the 24h "exact" cache had no invalidation path at all, so a
 *   deleted product could still appear in autocomplete suggestions for up to
 *   24 hours after deletion.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ProductSearchTrie, type TrieNodeData } from '@/lib/search/trie'
import { getCachedTrie, setCachedTrie } from '@/lib/search/trie-cache'
import { getCacheEpoch } from '@/lib/search/cache-epoch'
import { redis } from '@/lib/redis'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutocompleteSuggestion {
  id: string
  name: string
  category: string
  price: number
  image_url: string | null
  in_stock: boolean
}

interface AutocompleteResponse {
  success: boolean
  query: string
  suggestions: AutocompleteSuggestion[]
  totalProductsIndexed: number
  generatedAt: string
  source?: 'cache' | 'db'
  error?: string
}

// ─── Helper: Fetch active (non-deleted) products from Supabase ───────────────

async function fetchActiveProducts(supabase: any): Promise<TrieNodeData[]> {
  let { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, image_url, in_stock, is_deleted, popularity_score')
    .eq('in_stock', true)
    .eq('is_deleted', false)
    .limit(5000)

  if (error) {
    console.warn(
      '[Search Autocomplete] Primary query failed (is_deleted column may not exist yet), using fallback:',
      error.message
    )

    const fallback = await supabase
      .from('products')
      .select('id, name, category, price, image_url, in_stock, popularity_score')
      .eq('in_stock', true)
      .limit(5000)

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('[Search Autocomplete] Error fetching products:', error)
    return []
  }

  return (data ?? [])
    .filter((p: any) => p.is_deleted !== true)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category || 'General',
      price: p.price,
      image_url: p.image_url || null,
      in_stock: p.in_stock,
      popularity: typeof p.popularity_score === 'number' ? p.popularity_score : 100,
    }))
}

// ─── Helper: Build Trie from Supabase data ───────────────────────────────────

async function buildTrie(supabase: any): Promise<{ trie: ProductSearchTrie; count: number }> {
  const products = await fetchActiveProducts(supabase)
  const trie = new ProductSearchTrie({
    maxSuggestions: 20,
    minPrefixLength: 2,
    caseSensitive: false,
  })
  trie.addProducts(products)
  return { trie, count: products.length }
}

// ─── Main API Handler ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // ── 1. Parse & validate query parameters ─────────────────────────────
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20)
    const includeCategories = searchParams.get('includeCategories') === 'true'
    const inStockOnly = searchParams.get('inStockOnly') !== 'false'

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        query,
        suggestions: [],
        totalProductsIndexed: 0,
        generatedAt: new Date().toISOString(),
      })
    }

    const normalizedQuery = query.toLowerCase()

    // ── 2. Resolve current cache epoch (Bug 1D fix) ───────────────────────
    // BUG FIX: all cache reads/writes below are namespaced with this epoch.
    // A product mutation bumps it, instantly orphaning every key cached
    // under the old epoch — no enumeration of affected query strings needed.
    const epoch = await getCacheEpoch()

    // ── 3. Redis: exact-prefix precomputed cache (Layer 2) ────────────────
    const exactCacheKey = `autocomplete:v${epoch}:exact:${normalizedQuery}`
    let exactCached: AutocompleteSuggestion[] | null = null

    try {
      exactCached = await redis.get<AutocompleteSuggestion[]>(exactCacheKey)
    } catch (redisError) {
      console.warn('[Search Autocomplete] Redis get (exact) failed — continuing without cache.')
    }

    if (exactCached && Array.isArray(exactCached)) {
      return NextResponse.json(
        {
          success: true,
          query,
          suggestions: exactCached.slice(0, limit),
          totalProductsIndexed: 0,
          generatedAt: new Date().toISOString(),
          source: 'cache',
        } satisfies AutocompleteResponse,
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
            'X-Cache': 'HIT-PRECOMPUTED',
            'X-Source': 'redis-exact',
            'X-Cache-Epoch': String(epoch),
          },
        }
      )
    }

    // ── 4. Redis: standard per-query cache (Layer 3) ──────────────────────
    const cacheKey = `autocomplete:v${epoch}:${normalizedQuery}:${limit}:${includeCategories}:${inStockOnly}`
    let cachedResults: AutocompleteSuggestion[] | null = null

    try {
      cachedResults = await redis.get<AutocompleteSuggestion[]>(cacheKey)
    } catch (redisError) {
      console.warn('[Search Autocomplete] Redis get (standard) failed — continuing without cache.')
    }

    if (cachedResults && Array.isArray(cachedResults)) {
      return NextResponse.json(
        {
          success: true,
          query,
          suggestions: cachedResults,
          totalProductsIndexed: 0,
          generatedAt: new Date().toISOString(),
          source: 'cache',
        } satisfies AutocompleteResponse,
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
            'X-Cache': 'HIT',
            'X-Source': 'redis-standard',
            'X-Cache-Epoch': String(epoch),
          },
        }
      )
    }

    // ── 5. SLOW PATH: build or reuse in-process trie (Layers 1 & 4) ──────
    let trieResult = getCachedTrie()
    let hitDb = false

    if (!trieResult) {
      hitDb = true
      const supabase = await createServerClient()
      const { trie, count } = await buildTrie(supabase)
      setCachedTrie(trie, count)
      trieResult = { trie, count, builtAt: Date.now() }
    }

    // ── 6. Search the trie ────────────────────────────────────────────────
    const results = trieResult.trie.search(query, {
      limit,
      includeCategories,
      inStockOnly,
    })

    // ── 7. Shape the response payload ─────────────────────────────────────
    const suggestions: AutocompleteSuggestion[] = results.map((r) => ({
      id: r.data.id,
      name: r.data.name,
      category: r.data.category || 'General',
      price: (r.data as any).price ?? 0,
      image_url: r.data.image_url || null,
      in_stock: r.data.in_stock,
    }))

    // ── 8. Warm Redis caches (Layers 2 & 3), namespaced under current epoch
    Promise.all([
      redis.set(cacheKey, suggestions, { ex: 300 }).catch(() => {
        console.warn('[Search Autocomplete] Redis set (standard) failed.')
      }),
      redis.set(exactCacheKey, suggestions, { ex: 86400 }).catch(() => {
        console.warn('[Search Autocomplete] Redis set (exact) failed.')
      }),
    ])

    // ── 9. Return response ────────────────────────────────────────────────
    const response: AutocompleteResponse = {
      success: true,
      query,
      suggestions,
      totalProductsIndexed: trieResult.count,
      generatedAt: new Date().toISOString(),
      source: 'db',
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        'X-Total-Indexed': trieResult.count.toString(),
        'X-Result-Count': suggestions.length.toString(),
        'X-Cache': hitDb ? 'MISS' : 'WARM-INSTANCE',
        'X-Cache-Epoch': String(epoch),
      },
    })
  } catch (err) {
    console.error('[Search Autocomplete] Unhandled error:', err)
    return NextResponse.json(
      {
        success: false,
        query: '',
        suggestions: [],
        totalProductsIndexed: 0,
        generatedAt: new Date().toISOString(),
        error: 'Internal search error',
      } satisfies AutocompleteResponse,
      { status: 500 }
    )
  }
}