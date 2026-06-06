// app/api/stripe/webhook/route.ts
// Receives Stripe webhook events and fulfills orders in Supabase.
// IMPORTANT: This route must NOT parse the body — Stripe needs the raw bytes to verify the signature.

import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const config = {
  api: { bodyParser: false },
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.user_id
    const cartRaw = session.metadata?.cart
    const total = (session.amount_total ?? 0) / 100 // convert cents to dollars

    if (!userId || !cartRaw) {
      console.error('Missing metadata in Stripe session')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const cart: Array<{ id: string; quantity: number; price: number }> =
      JSON.parse(cartRaw)

    const supabase = createServerClient()

    // 1. Create the order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total,
        status: 'fulfilled',
        stripe_session_id: session.id,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Failed to create order:', orderError.message)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // 2. Insert order items
    const orderItems = cart.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Failed to insert order items:', itemsError.message)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    console.log(`✅ Order ${order.id} fulfilled for user ${userId}`)
  }

  return NextResponse.json({ received: true })
}