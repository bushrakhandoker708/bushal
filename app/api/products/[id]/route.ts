// app/api/products/[id]/route.ts
// Handles GET, PUT, and DELETE for a specific product.
//
// BUG FIX (1D): PUT and DELETE now invalidate the search autocomplete cache.
// Previously, editing or soft-deleting a product updated Postgres but left
// the autocomplete Trie (in-process, 5min TTL) and Redis "exact" cache
// (24h TTL) untouched. A deleted product could keep appearing in autocomplete
// suggestions for up to 24 hours. Fix: call invalidateTrieCache() (instant,
// per-instance) and bumpCacheEpoch() (instant, cross-instance via Redis) on
// every successful mutation.

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { productSchema } from '@/lib/validations/productSchema'
import { requireAdmin } from '@/lib/auth'
import { invalidateTrieCache } from '@/lib/search/trie-cache'
import { bumpCacheEpoch } from '@/lib/search/cache-epoch'

interface Params {
  params: { id: string }
}

// GET - Fetch product details with comments
export async function GET(_req: Request, { params }: Params) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('products')
    .select(`*, comments (*)`)
    .eq('id', params.id)
    .single()

  if (error || !data || (data as any).is_deleted) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PUT - Update product details
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()
  const parsed = productSchema.partial().safeParse(body)

  if (!parsed.success) {
    console.error('Validation failed:', parsed.error.flatten())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // BUG FIX (5): productSchema.partial() exists so callers can update a
  // single field. The old code computed `stockQty = parsed.data.stock_quantity ?? 0`
  // and unconditionally wrote `in_stock: stockQty > 0` — so ANY partial update
  // that omitted stock_quantity (e.g. editing only the price) silently forced
  // in_stock to false, because `undefined ?? 0` resolves to 0. 
  // Fix: only derive in_stock when stock_quantity was actually part of THIS request.
  const stockQuantityProvided = parsed.data.stock_quantity !== undefined

  // BUG FIX (6): The previous implementation unconditionally overwrote fields
  // like `images`, `image_url`, `category`, `cost_price`, and `other_costs`
  // even if they were omitted from the partial update request. This violated
  // the partial-update contract (e.g. sending only { price: 100 } would wipe
  // out the product's images and set category to 'General').
  // Fix: Only include fields in the updatePayload if they were explicitly
  // provided in the request body or parsed data. Untouched fields stay untouched.
  const updatePayload: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updatePayload[key] = value
    }
  }

  // Ensure numeric fields are properly typed if provided
  if (updatePayload.cost_price !== undefined) {
    updatePayload.cost_price = Number(updatePayload.cost_price) || 0
  }
  if (updatePayload.other_costs !== undefined) {
    updatePayload.other_costs = Number(updatePayload.other_costs) || 0
  }
  
  // Fallback for category if it's explicitly sent as an empty string
  if (updatePayload.category !== undefined && !updatePayload.category) {
    updatePayload.category = 'General'
  }

  // Handle images and image_url from body since they might bypass standard parsing
  if (body.images !== undefined) {
    updatePayload.images = body.images
  }
  if (body.image_url !== undefined) {
    updatePayload.image_url = body.image_url
  }

  // Only set in_stock if this request actually changed stock_quantity.
  // Note: the products_sync_in_stock trigger (migration 019) also recomputes
  // in_stock from stock_quantity server-side as a second line of defense.
  if (stockQuantityProvided) {
    updatePayload.in_stock = (parsed.data.stock_quantity as number) > 0
  }

  const { data, error } = await (await auth.supabase)
    .from('products')
    .update(updatePayload)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Database update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // BUG FIX (1D): name, category, price, stock status, or image may have
  // changed — any of these affects autocomplete results. Invalidate both
  // the in-process trie (layer 1) and bump the Redis cache epoch (layers 2/3)
  // so no stale suggestion survives this edit.
  invalidateTrieCache()
  await bumpCacheEpoch()

  return NextResponse.json(data)
}

// DELETE - Soft-delete product with conditional data retention
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const supabase = await auth.supabase

  const body = await _req.json().catch(() => ({}))
  const {
    keepSalesData = true,
    keepAnalytics = true,
    keepRating = true
  } = body

  try {
    if (!keepRating) {
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('product_id', params.id)

      if (commentsError) {
        console.error('Error deleting comments:', commentsError)
      }
    }

    const shouldAnonymize = !keepSalesData || !keepAnalytics

    const updatePayload: any = {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: auth.userId, // BUG FIX: Record which admin deleted the product for audit trail (migration 021)
      in_stock: false,
      stock_quantity: 0,
    }

    if (shouldAnonymize) {
      updatePayload.name = `[Deleted Product]`
      updatePayload.description = null
      updatePayload.details = null // BUG FIX: Also clear the short description/details field (migration 036)
      updatePayload.price = 0
      updatePayload.images = []
      updatePayload.image_url = null
      updatePayload.category = 'General'
      updatePayload.cost_price = 0
      updatePayload.other_costs = 0
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', params.id)

    if (updateError) {
      console.error('Error soft-deleting product:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // BUG FIX (1D): this is the most important call site for cache
    // invalidation — a deleted product still appearing in autocomplete is
    // a worse customer-facing bug than a stale price. Without this, the
    // 24h Redis "exact" cache could keep serving a deleted product's
    // suggestion well after this DELETE request returns 200.
    invalidateTrieCache()
    await bumpCacheEpoch()

    return NextResponse.json({
      success: true,
      message: shouldAnonymize
        ? 'Product deleted and data anonymized to preserve order integrity.'
        : 'Product soft-deleted. Related data preserved.'
    })
  } catch (err) {
    console.error('Delete error:', err)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}