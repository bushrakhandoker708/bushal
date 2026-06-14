// app/api/products/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { productSchema } from '@/lib/validations/productSchema'
import { requireAdmin } from '@/lib/auth'

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
  // Enforce admin role for product creation
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()

  // Validate the incoming data against our updated schema
  const parsed = productSchema.safeParse(body)

  if (!parsed.success) {
    console.error('Validation failed:', parsed.error.flatten())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Explicitly construct the payload to ensure no nulls for critical columns
  // This fixes the "null value in column category" and 400 Bad Request bugs
  const payload = {
    ...parsed.data,
    // Ensure category is never null
    category: parsed.data.category || 'General',
    // Ensure cost fields are numbers, defaulting to 0 if undefined/null
    cost_price: Number(parsed.data.cost_price) || 0,
    other_costs: Number(parsed.data.other_costs) || 0,
    // Handle images safely
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

  return NextResponse.json(data, { status: 201 })
}