// app/api/products/[id]/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { productSchema } from '@/lib/validations/productSchema'
import { requireAdmin } from '@/lib/auth'

interface Params {
  params: { id: string }
}

export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('products')
    .select(`*, comments (*)`)
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: Params) {
  // Enforce admin role for product updates
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()
  
  // Parse using the updated schema that now includes stock_quantity and images
  const parsed = productSchema.partial().safeParse(body)
  
  if (!parsed.success) {
    console.error('Validation failed:', parsed.error.flatten())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Ensure in_stock is explicitly synced with stock_quantity 
  // (The DB trigger also handles this, but this ensures the API response is accurate)
  const stockQty = parsed.data.stock_quantity ?? 0
  
  const updatePayload = {
    ...parsed.data,
    in_stock: stockQty > 0,
    images: body.images ?? [],
    image_url: body.image_url ?? null,
  }

  const { data, error } = await auth.supabase
    .from('products')
    .update(updatePayload)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Database update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  // Enforce admin role for product deletion
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const { error } = await auth.supabase.from('products').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}