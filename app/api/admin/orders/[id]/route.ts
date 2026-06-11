// app/api/admin/orders/[id]/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

interface Params {
  params: { id: string }
}

// GET - Fetch order details with items and customer info
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const { data: order, error } = await auth.supabase
    .from('orders')
    .select(`
      id,
      user_id,
      total,
      status,
      delivery_status,
      delivery_steps,
      bkash_trx_id,
      bkash_invoice,
      payment_method,
      delivery_address,
      phone,
      customer_note,
      inventory_reduced,
      created_at,
      updated_at,
      order_items (
        id,
        quantity,
        unit_price,
        product_id,
        products (
          id,
          name,
          image_url,
          images,
          cost_price,
          delivery_charge
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Fetch customer profile
  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', order.user_id)
    .single()

  // Transform order_items into the format AdminOrderDetail expects
  // CRITICAL FIX: Handle products as array from Supabase join
  const items = (order.order_items ?? []).map((item: any) => {
    // Extract product data - Supabase returns array for joined relations
    let product = null
    if (item.products) {
      if (Array.isArray(item.products)) {
        product = item.products[0] ?? null
      } else {
        product = item.products
      }
    }

    const costPrice: number = product?.cost_price ?? 0
    const deliveryCharge: number = product?.delivery_charge ?? 0
    const subtotal = item.unit_price * item.quantity
    const itemProfit = subtotal - (costPrice * item.quantity) - (deliveryCharge * item.quantity)

    const productImage = 
      (Array.isArray(product?.images) && product.images[0]) ||
      product?.image_url ||
      null

    return {
      id: item.id,
      product_id: item.product_id,
      product_name: product?.name ?? 'Unknown Product',
      product_image: productImage,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: costPrice || null,
      delivery_charge: deliveryCharge || null,
      subtotal,
      item_profit: itemProfit,
    }
  })

  // Parse delivery address
  let deliveryAddressObj = null
  if (order.delivery_address) {
    try {
      deliveryAddressObj = JSON.parse(order.delivery_address)
    } catch {
      // Keep as null if not JSON
    }
  }

  const shapedOrder = {
    id: order.id,
    user_id: order.user_id,
    customer_name: profile?.full_name ?? null,
    customer_email: profile?.email ?? null,
    customer_phone: profile?.phone ?? null,
    delivery_address: order.delivery_address,
    delivery_address_obj: deliveryAddressObj,
    customer_note: order.customer_note,
    phone: order.phone,
    payment_method: order.payment_method ?? 'cod',
    bkash_invoice: order.bkash_invoice ?? null,
    total: order.total,
    status: order.status,
    delivery_status: order.delivery_status ?? 'order_placed',
    delivery_steps: order.delivery_steps ?? [],
    inventory_reduced: order.inventory_reduced ?? false,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items,
  }

  return NextResponse.json(shapedOrder)
}

// PATCH - Update order status
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()
  const { status, delivery_status } = body

  const newStatus = delivery_status || status

  if (!newStatus) {
    return NextResponse.json({ error: 'status or delivery_status is required' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('orders')
    .update({ 
      status: newStatus,
      delivery_status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}