// app/api/products/[id]/route.ts

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { productSchema } from '@/lib/validations/productSchema'

interface Params {
  params: { id: string }
}

// GET /api/products/:id
export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      comments (
        *
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PUT /api/products/:id — update product (admin only)
export async function PUT(request: Request, { params }: Params) {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = productSchema.partial().safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('products')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/products/:id — delete product (admin only)
export async function DELETE(_req: Request, { params }: Params) {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}