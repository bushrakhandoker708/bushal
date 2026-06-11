// app/api/orders/route.ts

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sendAdminOrderNotification } from '@/lib/email'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { data, error } = await auth.supabase
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

  // FIX 1: Format items using the DISCOUNTED price so order_items reflect the actual paid amount
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

  // FIX 2: Round total to 2 decimal places to prevent numeric precision/overflow errors in Postgres
  const roundedTotal = Math.round((total ?? 0) * 100) / 100

  // FIX 3: Pass empty string '' instead of null for p_bkash_invoice. 
  // Supabase/PostgREST often throws type casting errors when passing `null` to `text` parameters in RPCs.
  const { data: orderId, error: rpcError } = await auth.supabase.rpc('create_order_with_stock_check', {
    p_user_id: auth.userId,
    p_items: rpcItems,
    p_total: roundedTotal,
    p_bkash_invoice: payment_method === 'bkash' ? (body.bkash_invoice || '') : ''
  })

  if (rpcError) {
    console.error('🔥 Order creation RPC failed:', rpcError)
    
    // Handle custom PL/pgSQL exceptions
    if (rpcError.message.includes('insufficient_stock') || rpcError.code === 'P0001') {
      return NextResponse.json({ error: 'One or more items are out of stock. Please adjust your cart.' }, { status: 409 })
    }
    if (rpcError.message.includes('product_not_found')) {
      return NextResponse.json({ error: 'A selected product no longer exists.' }, { status: 400 })
    }
    
    // FIX 4: Return the actual DB error message so you can see exactly what's failing in the UI
    return NextResponse.json({ error: rpcError.message || 'Failed to create order' }, { status: 500 })
  }

  // Immediately attach delivery details, phone, and payment method to the order
  const { error: updateError } = await auth.supabase
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

  // ─ Send Admin Email Notification ──────────────────────────────────────────
  const { data: orderItems } = await auth.supabase
    .from('order_items')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      products (name, image_url, images, cost_price, delivery_charge)
    `)
    .eq('order_id', orderId)

  const emailItems = (orderItems ?? []).map((item: any) => {
    const product = item.products?.[0] ?? {}
    return {
      name: product.name ?? 'Unknown Product',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      costPrice: product.cost_price ?? null,
      deliveryCharge: product.delivery_charge ?? null,
      imageUrl: product.images?.[0] ?? product.image_url ?? null
    }
  })

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', auth.userId)
    .single()

  // Fire-and-forget email notification
  sendAdminOrderNotification({
    orderId,
    customerName: profile?.full_name ?? null,
    customerEmail: profile?.email ?? null,
    customerPhone: profile?.phone ?? null,
    orderPhone: phone ?? profile?.phone ?? null,
    total: roundedTotal,
    paymentMethod: payment_method,
    items: emailItems,
    address: null,
    legacyAddress: delivery_address.trim(),
    customerNote: customer_note?.trim() ?? null,
    bkashInvoice: payment_method === 'bkash' ? (body.bkash_invoice || null) : null,
    createdAt: new Date().toISOString()
  }).then(result => {
    if (!result.success) {
      console.error('Admin email notification failed:', result.error)
    }
  }).catch(err => {
    console.error('Admin email notification exception:', err)
  })

  return NextResponse.json({ id: orderId, message: 'Order created successfully' }, { status: 201 })
}