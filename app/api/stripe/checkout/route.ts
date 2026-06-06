// app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout Session and returns the redirect URL.

import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@/lib/supabase/server'
import { CartItem } from '@/types/cart'

export async function POST(request: Request) {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { items: CartItem[] } = await request.json()

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  // Build Stripe line items from cart
  const lineItems = body.items.map((item) => {
    const unitPrice = item.discount_percent
      ? Math.round(item.price * (1 - item.discount_percent / 100) * 100)
      : Math.round(item.price * 100) // Stripe expects cents

    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          ...(item.image_url ? { images: [item.image_url] } : {}),
        },
        unit_amount: unitPrice,
      },
      quantity: item.quantity,
    }
  })

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    customer_email: session.user.email,
    metadata: {
      user_id: session.user.id,
      // Encode cart so the webhook can create the order record
      cart: JSON.stringify(
        body.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          price: i.discount_percent
            ? i.price * (1 - i.discount_percent / 100)
            : i.price,
        }))
      ),
    },
    success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
  })

  return NextResponse.json({ url: checkoutSession.url })
}