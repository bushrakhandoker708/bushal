// app/api/orders/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
// FIX: Import the shared email helpers instead of initializing Resend inline
import { sendAdminOrderNotification, sendCustomerOrderConfirmation } from '@/lib/email'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { data, error } = await (await auth.supabase)
    .from('orders')
    .select('*, order_items(*, products(name, image_url, price))')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await request.json()
  const {
    items,
    total,
    payment_method = 'cod',
    delivery_address,
    customer_note,
    phone
  } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  if (!delivery_address?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Delivery address and phone number are required.' }, { status: 400 })
  }

  // Format items using the DISCOUNTED price
  const rpcItems = items.map((item: any) => {
    const discountedPrice = item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price
    return {
      product_id: item.id,
      quantity: item.quantity,
      unit_price: discountedPrice
    }
  })

  // Round total to 2 decimal places
  const roundedTotal = Math.round((total ?? 0) * 100) / 100

  // Create order
  const { data: orderId, error: rpcError } = await (await auth.supabase).rpc('create_order_with_stock_check', {
    p_user_id: auth.userId,
    p_items: rpcItems,
    p_total: roundedTotal,
    p_bkash_invoice: payment_method === 'bkash' ? (body.bkash_invoice || '') : ''
  })

  if (rpcError) {
    console.error('🔥 Order creation RPC failed:', rpcError)
    if (rpcError.message.includes('insufficient_stock') || rpcError.code === 'P0001') {
      return NextResponse.json({ error: 'One or more items are out of stock. Please adjust your cart.' }, { status: 409 })
    }
    if (rpcError.message.includes('product_not_found')) {
      return NextResponse.json({ error: 'A selected product no longer exists.' }, { status: 400 })
    }
    return NextResponse.json({ error: rpcError.message || 'Failed to create order' }, { status: 500 })
  }

  // Attach delivery details
  const { error: updateError } = await (await auth.supabase)
    .from('orders')
    .update({
      delivery_address: delivery_address.trim(),
      customer_note: customer_note?.trim() || null,
      phone: phone.trim(),
      payment_method
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Failed to save order delivery details:', updateError)
  }

  // ─── Fetch order details for emails ────────────────────────────────────────
  const [{ data: orderItems }, { data: profile }] = await Promise.all([
    (await auth.supabase)
      .from('order_items')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        products (name, image_url, images, cost_price, delivery_charge)
      `)
      .eq('order_id', orderId),
    (await auth.supabase)
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', auth.userId)
      .single()
  ])

  // ─── FIX: Supabase join bug ────────────────────────────────────────────────
  // When using .select() with a foreign key, Supabase returns the joined row 
  // as a plain OBJECT, not an array. The old code assumed it was always an array 
  // (item.products?.[0]), which resulted in "Unknown Product" in the emails.
  const emailItems = (orderItems ?? []).map((item: any) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    return {
      name: product?.name ?? 'Product',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      deliveryCharge: product?.delivery_charge ?? null,
    }
  })

  // ─── Fire both emails concurrently ─────────────────────────────────────────
  // Failures are caught and logged inside the shared helpers, so they will 
  // never break the order creation flow or cause a 500 error for the user.
  await Promise.all([
    sendAdminOrderNotification({
      orderId,
      customerName: profile?.full_name ?? null,
      customerEmail: profile?.email ?? null,
      phone: phone ?? null,
      total: roundedTotal,
      paymentMethod: payment_method,
      items: emailItems,
      deliveryAddress: delivery_address ?? null,
      customerNote: customer_note ?? null,
    }),
    profile?.email
      ? sendCustomerOrderConfirmation({
          orderId,
          customerName: profile.full_name ?? null,
          customerEmail: profile.email,
          total: roundedTotal,
          paymentMethod: payment_method,
        })
      : Promise.resolve(),
  ])

  return NextResponse.json({ id: orderId, message: 'Order created successfully' }, { status: 201 })
}