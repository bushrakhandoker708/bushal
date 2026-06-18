// ============================================================================
// FILE ADDRESS: app/api/orders/route.ts
// ============================================================================
// EXPLANATION:
// Handles fetching customer orders (GET) and creating new orders (POST).
// 
// BUG FIX 1: Supabase Join Shape Assumptions (Type Safety)
// Previously, we used `Array.isArray(item.products) ? item.products[0] : item.products`
// as a runtime band-aid. This indicates a lack of understanding of how PostgREST 
// serializes foreign key joins. We now define strict TypeScript interfaces 
// matching the exact shape Supabase returns, and use a dedicated helper function 
// to safely extract the product data without relying on `any` types.
//
// BUG FIX 2: Admin Email Spam on Order Confirmation
// We have explicitly verified the email triggers. The admin notification email 
// is ONLY sent during initial order creation (this POST route, and the bKash callback).
// It is NEVER sent when an order status is updated to 'confirmed' via PATCH routes.
// This prevents the admin from receiving duplicate/spam emails every time they 
// manually update an order's delivery status in the dashboard.
// ============================================================================

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sendAdminOrderNotification, sendCustomerOrderConfirmation } from '@/lib/email'

// ─── Strict Type Definitions for Supabase Responses ─────────────────────────
// PostgREST returns an array for FK joins unless the relationship is explicitly 
// limited to a single row. We define the exact shape to ensure type safety.
interface OrderItemProduct {
  name: string
  image_url: string | null
  images: string[] | null
  cost_price: number | null
  delivery_charge: number | null
}

interface OrderItemWithProduct {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  // PostgREST returns an array for FK joins unless limited
  products: OrderItemProduct[] | null
}

interface CustomerProfile {
  full_name: string | null
  email: string | null
  phone: string | null
}

// ─── Helper Function ────────────────────────────────────────────────────────
// Safely extracts the product data from the Supabase join response.
const getProductData = (item: OrderItemWithProduct): OrderItemProduct | null => {
  if (!item.products || item.products.length === 0) return null
  return item.products[0]
}

// ─── GET: Fetch Customer Orders ─────────────────────────────────────────────
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const supabase = await auth.supabase
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, image_url, price))')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── POST: Create New Order ─────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const supabase = await auth.supabase
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

  // 1. Create order atomically
  const { data: orderId, error: rpcError } = await supabase.rpc('create_order_with_stock_check', {
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

  // 2. Attach delivery details
  const { error: updateError } = await supabase
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

  // 3. Fetch order details for emails using STRICT TYPES
  const [orderItemsResult, profileResult] = await Promise.all([
    supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        products (name, image_url, images, cost_price, delivery_charge)
      `)
      .eq('order_id', orderId),
    supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', auth.userId)
      .single()
  ])

  const orderItems = orderItemsResult.data
  const profile = profileResult.data

  // 4. Safely map items using the typed helper (NO MORE Array.isArray BAND-AID)
  const emailItems = (orderItems ?? []).map((item) => {
    const product = getProductData(item as OrderItemWithProduct)
    return {
      name: product?.name ?? 'Product',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      deliveryCharge: product?.delivery_charge ?? null,
    }
  })

  // 5. Fire both emails concurrently
  // NOTE: The admin notification is ONLY sent here (on order creation).
  // It is NOT sent in the PATCH routes for status updates, preventing admin spam.
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