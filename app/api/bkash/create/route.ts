// app/api/bkash/create/route.ts
// Step 1: Customer clicks "Pay with bKash" → we create a payment and redirect them

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { bkashCreatePayment } from '@/lib/bkash'
import { CartItem } from '@/types/cart'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { items: CartItem[] } = await request.json()

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  // Calculate total in BDT
  const total = body.items.reduce((sum, item) => {
    const price = item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price
    return sum + price * item.quantity
  }, 0)

  const orderID = 'SAG-' + uuidv4().substring(0, 8).toUpperCase()
  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  // Store pending order in Supabase so we can fulfill it after callback
  const { data: pendingOrder, error } = await supabase
    .from('orders')
    .insert({
      user_id: session.user.id,
      total,
      status: 'pending',
      bkash_invoice: orderID,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Store cart items immediately so callback can create order_items
  const orderItems = body.items.map((item) => ({
    order_id: pendingOrder.id,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price,
  }))

  await supabase.from('order_items').insert(orderItems)

  // Create bKash payment
  const bkashRes = await bkashCreatePayment({
    amount: Math.round(total),
    callbackURL: `${origin}/api/bkash/callback?orderId=${pendingOrder.id}`,
    orderID,
  })

  if (!bkashRes.bkashURL) {
    // Clean up pending order if bKash fails
    await supabase.from('orders').delete().eq('id', pendingOrder.id)
    return NextResponse.json(
      { error: 'bKash payment creation failed', details: bkashRes },
      { status: 500 }
    )
  }

  return NextResponse.json({ bkashURL: bkashRes.bkashURL })
}