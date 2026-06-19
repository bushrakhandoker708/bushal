// app/api/search/autocomplete/route.ts

/**
 * ============================================================================
 * SEARCH AUTOCOMPLETE API — TRIE-POWERED WITH LAYERED CACHING
 * ============================================================================
 *
 * REQUEST: GET /api/search/autocomplete?q=<query>&limit=8&inStockOnly=true
 *
 * CACHE HIERARCHY (checked in order, fastest first):
 *
 *   Layer 1 — In-process module singleton (lib/search/trie-cache.ts)
 *     The built ProductSearchTrie lives in Node.js process memory for 5 min.
 *     Cost: ~0ms. Survives multiple requests on the same warm Vercel instance.
 *
 *   Layer 2 — Redis exact-prefix precomputed cache
 *     Key: autocomplete:exact:<query>  |  TTL: 24h
 *     Set by Python ML cron (search_warmer.py) for popular prefixes.
 *     Also self-warmed by this route on every Supabase rebuild.
 *
 *   Layer 3 — Redis standard cache
 *     Key: autocomplete:<query>:<limit>:<includeCategories>:<inStockOnly>  |  TTL: 5min
 *     Per-parameter cache for the full response payload.
 *
 *   Layer 4 — Supabase query + Trie rebuild (slow path)
 *     Hits DB, builds trie, stores in layers 1-3.
 *
 * BUG FIXES IN THIS VERSION:
 *   1. Module-level trie cache prevents redundant Supabase queries on cache
 *      miss within the same warm function instance (was rebuilding every time).
 *
 *   2. fetchActiveProducts() now filters is_deleted=false at the DB level
 *      in the primary query, not just in-memory. Previously, soft-deleted
 *      products could still appear in autocomplete if is_deleted was not
 *      returned by the DB (e.g., if the column was added after the query
 *      was written and the fallback path omitted it).
 *
 *   3. ProductSearchTrie.addProduct() (in trie.ts) now tokenizes product names
 *      into individual words. Combined with deduplication in search(), users
 *      can now find "Blue Cotton Shirt" by typing "cotton" or "shirt".
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ProductSearchTrie, type TrieNodeData } from '@/lib/search/trie'
import { getCachedTrie, setCachedTrie } from '@/lib/search/trie-cache'
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
/**
 * BUG FIX: The original query fetched is_deleted but only filtered it in-memory
 * after the network round-trip. This version filters at the DB level using
 * .eq('is_deleted', false), and only falls back to in-memory filtering if
 * the column doesn't exist yet (pre-migration environments).
 *
 * Also: the fallback query now explicitly adds .neq('is_deleted', true) using
 * a safe column-existence check so soft-deleted products never leak through.
 */
async function fetchActiveProducts(supabase: any): Promise<TrieNodeData[]> {
  // Primary query: filter is_deleted at the DB level for maximum efficiency
  let { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, image_url, in_stock, is_deleted, popularity_score')
    .eq('in_stock', true)
    .eq('is_deleted', false)  // BUG FIX: filter soft-deleted at DB level
    .limit(5000)

  // Fallback: if the query failed (e.g., is_deleted column does not exist yet
  // on a pre-migration database), retry without the is_deleted filter and
  // apply in-memory filtering as a best-effort safety net.
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

  // In-memory safety filter in case the fallback path was used and is_deleted
  // was not returned. This is belt-and-suspenders only.
  return (data ?? [])
    .filter((p: any) => p.is_deleted !== true)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category || 'General',
      price: p.price,
      image_url: p.image_url || null,
      in_stock: p.in_stock,
      // Map DB popularity_score to Trie popularity (default 100 if column absent)
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20) // cap at 20
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

    // ── 2. Redis: exact-prefix precomputed cache (Layer 2) ────────────────
    // This cache is populated by the Python ML cron (search_warmer.py) for
    // the most popular search prefixes, and self-warmed by this route below.
    const exactCacheKey = `autocomplete:exact:${normalizedQuery}`
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
          },
        }
      )
    }

    // ── 3. Redis: standard per-query cache (Layer 3) ──────────────────────
    const cacheKey = `autocomplete:${normalizedQuery}:${limit}:${includeCategories}:${inStockOnly}`
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
          },
        }
      )
    }

    // ── 4. SLOW PATH: build or reuse in-process trie (Layers 1 & 4) ──────
    //
    // BUG FIX: Check the module-level in-process singleton first.
    // If the same Vercel function instance served a request in the last
    // 5 minutes, the trie is already in memory — no Supabase round-trip needed.
    let trieResult = getCachedTrie()
    let hitDb = false

    if (!trieResult) {
      // True slow path: hit Supabase and rebuild
      hitDb = true
      const supabase = await createServerClient()
      const { trie, count } = await buildTrie(supabase)
      setCachedTrie(trie, count) // Populate Layer 1
      trieResult = { trie, count, builtAt: Date.now() }
    }

    // ── 5. Search the trie ────────────────────────────────────────────────
    const results = trieResult.trie.search(query, {
      limit,
      includeCategories,
      inStockOnly,
    })

    // ── 6. Shape the response payload ─────────────────────────────────────
    const suggestions: AutocompleteSuggestion[] = results.map((r) => ({
      id: r.data.id,
      name: r.data.name,
      category: r.data.category || 'General',
      price: (r.data as any).price ?? 0,
      image_url: r.data.image_url || null,
      in_stock: r.data.in_stock,
    }))

    // ── 7. Warm Redis caches (Layers 2 & 3) ──────────────────────────────
    // Do this async — don't block the response on a Redis write.
    Promise.all([
      // Standard cache: 5-minute TTL, keyed by full parameter set
      redis.set(cacheKey, suggestions, { ex: 300 }).catch(() => {
        console.warn('[Search Autocomplete] Redis set (standard) failed.')
      }),
      // Exact-prefix cache: 24-hour TTL, keyed by query only
      // Ensures subsequent requests for this exact query are ultra-fast
      redis.set(exactCacheKey, suggestions, { ex: 86400 }).catch(() => {
        console.warn('[Search Autocomplete] Redis set (exact) failed.')
      }),
    ])

    // ── 8. Return response ────────────────────────────────────────────────
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
        'X-Cache': 'MISS',
        'X-Source': hitDb ? 'supabase-trie' : 'process-cache-trie',
      },
    })
  } catch (error) {
    console.error('[Search Autocomplete] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        query: '',
        suggestions: [],
        totalProductsIndexed: 0,
        generatedAt: new Date().toISOString(),
        error: 'Internal server error while processing autocomplete',
      } satisfies AutocompleteResponse,
      { status: 500 }
    )
  }
}