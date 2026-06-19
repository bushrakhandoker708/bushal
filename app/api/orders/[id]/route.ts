// app/api/admin/orders/[id]/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

interface Params {
  params: { id: string }
}

// GET - Fetch order details
// BUGFIX: Use FK join query instead of separate product fetches.
// The previous version did individual supabase queries per product using the
// non-service-role client, which meant soft-deleted products (is_deleted=true)
// were blocked by RLS and returned null → "Unknown Product".
// The FK join goes through PostgREST and correctly returns the product data
// even for soft-deleted products since the admin session has read access.
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const supabase = await auth.supabase

  const { data: order, error } = await supabase
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
        variant_id,
        products (
          id,
          name,
          image_url,
          images,
          cost_price,
          delivery_charge,
          is_deleted
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !order) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Fetch customer profile separately (no FK on auth.users)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', order.user_id)
    .single()

  // Transform order_items
  // IMPORTANT: Supabase v2 PostgREST returns FK joins as a single OBJECT, not an array.
  // Do NOT use Array.isArray() here — it will always return false and break product lookup.
  const items = (order.order_items ?? []).map((item: any) => {
    // product is an object (or null), never an array
    const product = item.products ?? null

    const costPrice: number = product?.cost_price ?? 0
    const deliveryCharge: number = product?.delivery_charge ?? 0
    const subtotal = item.unit_price * item.quantity
    const itemProfit =
      subtotal - costPrice * item.quantity - deliveryCharge * item.quantity

    // Prefer first image in images[] array, fall back to image_url
    const productImage =
      (Array.isArray(product?.images) && product.images.length > 0
        ? product.images[0]
        : null) ??
      product?.image_url ??
      null

    return {
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: product?.name ?? 'Deleted Product',
      product_image: productImage,
      is_product_deleted: product?.is_deleted ?? true,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: costPrice || null,
      delivery_charge: deliveryCharge || null,
      subtotal,
      item_profit: itemProfit,
    }
  })

  // Parse delivery address — supports both JSON and legacy plain-text
  let deliveryAddressObj = null
  if (order.delivery_address) {
    try {
      deliveryAddressObj = JSON.parse(order.delivery_address)
    } catch {
      // Legacy plain-text address — keep as null, render raw string in UI
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
    bkash_trx_id: order.bkash_trx_id ?? null,
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

// PATCH - Update order status with full delivery workflow
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const supabase = await auth.supabase
  const body = await request.json()
  const { delivery_status } = body

  const DELIVERY_STATUSES: Record<string, string> = {
    order_placed: 'Order Placed',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  if (!delivery_status || !DELIVERY_STATUSES[delivery_status]) {
    return NextResponse.json(
      {
        error: 'Invalid delivery status',
        validStatuses: Object.keys(DELIVERY_STATUSES),
      },
      { status: 400 }
    )
  }

  const orderStatus =
    delivery_status === 'delivered'
      ? 'fulfilled'
      : delivery_status === 'cancelled'
      ? 'cancelled'
      : 'pending'

  // Verify order exists before calling RPC
  const { data: existingOrder, error: fetchError } = await supabase
    .from('orders')
    .select('id, user_id, total, bkash_invoice')
    .eq('id', params.id)
    .single()

  if (fetchError || !existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Atomic RPC: update status + reduce stock if confirming
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'confirm_order_and_reduce_stock',
    {
      p_order_id: params.id,
      p_new_status: delivery_status,
    }
  )

  if (rpcError) {
    console.error('RPC Error:', rpcError)
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  // Email notification to customer (non-fatal)
  if (existingOrder?.user_id) {
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', existingOrder.user_id)
      .single()

    if (customerProfile?.email) {
      const label = DELIVERY_STATUSES[delivery_status]
      const orderId = params.id.slice(0, 8).toUpperCase()

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Bushal <noreply@bushal.com>',
            to: [customerProfile.email],
            subject: `Order #${orderId} — Status Updated: ${label}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
                <h1 style="color:#f97316; font-size:24px; margin-bottom:8px;">Bushal</h1>
                <hr style="border:none; border-top:1px solid #e2e8f0; margin: 16px 0;" />
                <h2 style="color:#1e293b; font-size:18px;">Order Status Updated</h2>
                <p style="color:#475569;">Hi ${customerProfile.full_name ?? 'Customer'},</p>
                <p style="color:#475569;">Your order <strong>#${orderId}</strong> has been updated to:</p>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; margin:20px 0;">
                  <p style="font-size:20px; font-weight:bold; color:#1e293b; margin:0;">${label}</p>
                </div>
                <p style="color:#475569;">Track your order at <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bushal.com'}/orders" style="color:#f97316;">bushal.com/orders</a>.</p>
                <p style="color:#94a3b8; font-size:13px; margin-top:32px;">— The Bushal Team</p>
              </div>
            `,
          }),
        })
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr)
      }
    }
  }

  return NextResponse.json({
    delivery_status,
    status: orderStatus,
    inventory_reduced_now: rpcData?.inventory_reduced_now ?? false,
  })
}