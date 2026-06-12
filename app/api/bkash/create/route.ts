// app/api/bkash/create/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { CartItem } from '@/app/types/cart'
import { bkashCreatePayment } from '@/app/lib/bkash'

export async function POST(request: Request) {
  const supabase =  await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { items: CartItem[] } = await request.json()
  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const total = body.items.reduce((sum, item) => {
    const price = item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price
    return sum + price * item.quantity
  }, 0)

  const orderID = 'SAG-' + uuidv4().substring(0, 8).toUpperCase()
  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  const orderItemsPayload = body.items.map((item) => ({
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price,
  }))

  const { data: newOrderId, error: rpcError } = await supabase.rpc(
    'create_order_with_stock_check',
    {
      p_user_id: user.id,
      p_items: orderItemsPayload,
      p_total: Math.round(total),
      p_bkash_invoice: orderID,
    }
  )

  if (rpcError) {
    if (rpcError.message.includes('insufficient_stock')) {
      return NextResponse.json(
        { error: 'One or more items just went out of stock. Please refresh.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const bkashRes = await bkashCreatePayment({
    amount: Math.round(total),
    callbackURL: `${origin}/api/bkash/callback?orderId=${newOrderId}`,
    orderID,
  })

  if (!bkashRes.bkashURL) {
    return NextResponse.json(
      { error: 'bKash payment creation failed', details: bkashRes },
      { status: 500 }
    )
  }

  return NextResponse.json({ bkashURL: bkashRes.bkashURL, orderId: newOrderId })
}