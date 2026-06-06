// app/api/cart/route.ts
// Note: Cart is managed client-side via Zustand (useCart hook).
// This route exists for server-side cart validation before checkout.

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface CartItem {
  id: string
  quantity: number
}

// POST /api/cart/validate — validate stock availability before checkout
export async function POST(request: Request) {
  const supabase = createServerClient()

  const body: { items: CartItem[] } = await request.json()

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const productIds = body.items.map((i) => i.id)

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, in_stock, discount_percent')
    .in('id', productIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check all items are in stock
  const outOfStock = products?.filter((p) => !p.in_stock) ?? []
  if (outOfStock.length > 0) {
    return NextResponse.json(
      {
        error: 'Some items are out of stock',
        outOfStock: outOfStock.map((p) => p.name),
      },
      { status: 409 }
    )
  }

  // Calculate total with discounts
  const total = body.items.reduce((sum, cartItem) => {
    const product = products?.find((p) => p.id === cartItem.id)
    if (!product) return sum
    const discountedPrice =
      product.price * (1 - (product.discount_percent ?? 0) / 100)
    return sum + discountedPrice * cartItem.quantity
  }, 0)

  return NextResponse.json({ valid: true, total })
}