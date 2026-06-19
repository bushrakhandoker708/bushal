// app/api/products/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { productSchema } from '@/lib/validations/productSchema'
import { requireAdmin } from '@/lib/auth'
import { invalidateTrieCache } from '@/lib/search/trie-cache'
import { bumpCacheEpoch } from '@/lib/search/cache-epoch'

export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()
  const parsed = productSchema.safeParse(body)

  if (!parsed.success) {
    console.error('Validation failed:', parsed.error.flatten())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const payload = {
    ...parsed.data,
    details: parsed.data.details || null,
    description: parsed.data.description || null,
    category: parsed.data.category || 'General',
    cost_price: Number(parsed.data.cost_price) || 0,
    other_costs: Number(parsed.data.other_costs) || 0,
    images: body.images ?? [],
    image_url: body.image_url ?? null,
  }

  const { data, error } = await (await auth.supabase)
    .from('products')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Database insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // BUG FIX (1D, continued): A newly created product is inserted into Postgres
  // but the in-process trie and Redis caches don't know it exists, so it won't
  // appear in autocomplete until the 5-minute trie TTL naturally expires.
  // Invalidate both the in-process trie (layer 1) and bump the Redis cache
  // epoch (layers 2/3) so the new product is immediately searchable.
  invalidateTrieCache()
  await bumpCacheEpoch()

  return NextResponse.json(data, { status: 201 })
}