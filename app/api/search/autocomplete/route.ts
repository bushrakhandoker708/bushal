// app/api/search/autocomplete/route.ts

// This API endpoint provides fast, prefix-based search suggestions using the
// Trie (Prefix Tree) data structure. 
//
// BUG FIX: Module-Level Caching in Vercel Serverless
// Previously, the `ProductSearchTrie` was cached in a module-level variable.
// Vercel Serverless functions do not guarantee memory persistence between 
// invocations, meaning the Trie was rebuilt from scratch on almost every cold 
// start, defeating the purpose of the cache and causing unnecessary DB load.
//
// THE FIX: We now cache the *search results* in Upstash Redis with a 5-minute 
// TTL. This ensures instant responses for repeated queries, survives cold 
// starts, and prevents redundant database fetches. If the Redis cache misses, 
// we fetch the products, build the Trie in-memory, perform the search, and 
// save the results to Redis.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ProductSearchTrie, type TrieNodeData } from '@/lib/search/trie'
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

// ─── Helper Functions ───────────────────────────────────────────────────────
/**
 * Fetch all active products from the database
 */
async function fetchActiveProducts(supabase: any): Promise<TrieNodeData[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, image_url, in_stock')
    .is('is_deleted', false)
    .eq('in_stock', true)
    .limit(5000)

  if (error) {
    console.error('[Search Autocomplete] Error fetching products:', error)
    return []
  }

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    category: p.category || 'General',
    price: p.price,
    image_url: p.image_url || null,  // FIX: Ensure null instead of undefined
    in_stock: p.in_stock,
    popularity: 100,
  }))
}

/**
 * Build the Trie in-memory from the database.
 * Note: We no longer cache the Trie object itself in module-level memory
 * because Vercel Serverless wipes memory on cold starts.
 */
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

// ─── Main API Handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // 1. Parse Query Parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''
    const limit = parseInt(searchParams.get('limit') || '8')
    const includeCategories = searchParams.get('includeCategories') === 'true'
    const inStockOnly = searchParams.get('inStockOnly') !== 'false'

    // Validate parameters
    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        query,
        suggestions: [],
        totalProductsIndexed: 0,
        generatedAt: new Date().toISOString(),
      })
    }

    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 20.' },
        { status: 400 }
      )
    }

    // 2. Check Redis for cached results FIRST (Survives cold starts)
    const cacheKey = `autocomplete:${query}:${limit}:${includeCategories}:${inStockOnly}`
    const cachedResults = await redis.get<AutocompleteSuggestion[]>(cacheKey)

    if (cachedResults) {
      return NextResponse.json(
        {
          success: true,
          query,
          suggestions: cachedResults,
          totalProductsIndexed: 0, // Not strictly needed when served from cache
          generatedAt: new Date().toISOString(),
          source: 'cache',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
            'X-Cache': 'HIT',
            'X-Source': 'redis',
          },
        }
      )
    }

    // 3. Cache miss: Initialize Supabase client and build Trie in-memory
    const supabase = await createServerClient()
    const { trie, count } = await buildTrie(supabase)

    // 4. Search the Trie
    const results = trie.search(query, {
      limit,
      includeCategories,
      inStockOnly,
    })

    // 5. Map results to response format
    // FIX: Ensure image_url is never undefined, only string or null
    const suggestions: AutocompleteSuggestion[] = results.map((r) => ({
      id: r.data.id,
      name: r.data.name,
      category: r.data.category || 'General',
      price: (r.data as any).price ?? 0,
      image_url: r.data.image_url || null,  // FIX: Convert undefined to null
      in_stock: r.data.in_stock,
    }))

    // 6. SAVE to Redis for 5 minutes (300 seconds)
    // This prevents redundant DB fetches and Trie rebuilds for popular queries
    await redis.set(cacheKey, suggestions, { ex: 300 })

    // 7. Build Response
    const response: AutocompleteResponse = {
      success: true,
      query,
      suggestions,
      totalProductsIndexed: count,
      generatedAt: new Date().toISOString(),
      source: 'db',
    }

    // 8. Return response with caching headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        'X-Total-Indexed': count.toString(),
        'X-Result-Count': suggestions.length.toString(),
        'X-Cache': 'MISS',
        'X-Source': 'supabase',
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
      },
      { status: 500 }
    )
  }
}