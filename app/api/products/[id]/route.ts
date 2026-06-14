// app/api/products/[id]/route.ts
// Handles GET, PUT, and DELETE for a specific product.
// FIX: Resolved the "null value in column category" error during deletion
// by ensuring category defaults to 'General' instead of null when anonymizing.
// Also added support for the new cost_price and other_costs fields.

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { productSchema } from '@/lib/validations/productSchema'
import { requireAdmin } from '@/lib/auth'

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

  // Check if product exists and is not soft-deleted
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

  // Use partial schema for updates (allows updating just one field)
  const parsed = productSchema.partial().safeParse(body)

  if (!parsed.success) {
    console.error('Validation failed:', parsed.error.flatten())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const stockQty = parsed.data.stock_quantity ?? 0

  const updatePayload = {
    ...parsed.data,
    // Ensure category is never null to prevent DB constraint errors
    category: parsed.data.category || 'General',
    // Ensure cost fields are numbers, defaulting to 0 if undefined
    cost_price: Number(parsed.data.cost_price) || 0,
    other_costs: Number(parsed.data.other_costs) || 0,
    in_stock: stockQty > 0,
    images: body.images ?? [],
    image_url: body.image_url ?? null,
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

  return NextResponse.json(data)
}

// DELETE - Soft-delete product with conditional data retention
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const supabase = await auth.supabase

  // 1. Parse deletion options from the request body
  const body = await _req.json().catch(() => ({}))
  const {
    keepSalesData = true,
    keepAnalytics = true,
    keepRating = true
  } = body

  try {
    // 2. Handle Ratings (Comments) deletion
    if (!keepRating) {
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('product_id', params.id)
        
      if (commentsError) {
        console.error('Error deleting comments:', commentsError)
      }
    }

    // 3. Determine if we need to anonymize the product
    const shouldAnonymize = !keepSalesData || !keepAnalytics
    
    const updatePayload: any = {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      in_stock: false,
      stock_quantity: 0,
    }

    if (shouldAnonymize) {
      updatePayload.name = `[Deleted Product]`
      updatePayload.description = null
      updatePayload.price = 0
      updatePayload.images = []
      updatePayload.image_url = null
      
      // FIX: Set category to 'General' instead of null to prevent 
      // "null value in column category violates not-null constraint" error
      updatePayload.category = 'General' 
      
      // Reset cost fields to 0 for anonymized products
      updatePayload.cost_price = 0
      updatePayload.other_costs = 0
    }

    // 4. Execute the soft-delete update
    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', params.id)

    if (updateError) {
      console.error('Error soft-deleting product:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

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