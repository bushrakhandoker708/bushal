// app/api/cart/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface CartItem {
  id: string
  quantity: number
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const body: { items: CartItem[] } = await request.json()

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const productIds = body.items.map((i) => i.id)

  const { data: products, error } = await (await supabase)
    .from('products')
    .select('id, name, price, in_stock, stock_quantity, discount_percent')
    .in('id', productIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const missingIds = productIds.filter(
    (id) => !(products ?? []).find((p) => p.id === id)
  )
  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: 'Some cart items no longer exist', missingIds },
      { status: 409 }
    )
  }

  const outOfStock = (products ?? []).filter((p) => !p.in_stock)
  if (outOfStock.length > 0) {
    return NextResponse.json(
      { error: 'Some items are out of stock', outOfStock: outOfStock.map((p) => p.name) },
      { status: 409 }
    )
  }

  const insufficient = body.items.filter((cartItem) => {
    const product = (products ?? []).find((p) => p.id === cartItem.id)
    if (!product) return true
    return cartItem.quantity > product.stock_quantity
  })

  if (insufficient.length > 0) {
    const details = insufficient.map((cartItem) => {
      const product = (products ?? []).find((p) => p.id === cartItem.id)
      return {
        name: product?.name ?? cartItem.id,
        requested: cartItem.quantity,
        available: product?.stock_quantity ?? 0,
      }
    })
    return NextResponse.json(
      { error: 'Requested quantity exceeds available stock', insufficient: details },
      { status: 409 }
    )
  }

  const total = body.items.reduce((sum, cartItem) => {
    const product = (products ?? []).find((p) => p.id === cartItem.id)!
    const discountedPrice =
      product.price * (1 - (product.discount_percent ?? 0) / 100)
    return sum + discountedPrice * cartItem.quantity
  }, 0)

  return NextResponse.json({ valid: true, total })
}