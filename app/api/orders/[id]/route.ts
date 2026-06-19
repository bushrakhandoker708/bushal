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
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', order.user_id)
    .single()

  // Transform order_items
  const items = (order.order_items ?? []).map((item: any) => {
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

// PATCH - Update order status with full delivery workflow
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response
  
  const supabase = await auth.supabase
  const body = await request.json()
  const { delivery_status } = body

  // Define valid delivery statuses with their labels
  const DELIVERY_STATUSES: Record<string, string> = {
    'order_placed':     'Order Placed',
    'confirmed':        'Confirmed',
    'processing':       'Processing',
    'shipped':          'Shipped',
    'out_for_delivery': 'Out for Delivery',
    'delivered':        'Delivered',
    'cancelled':        'Cancelled',
  }

  if (!delivery_status || !DELIVERY_STATUSES[delivery_status]) {
    return NextResponse.json({ 
      error: 'Invalid delivery status',
      validStatuses: Object.keys(DELIVERY_STATUSES)
    }, { status: 400 })
  }

  // Map delivery_status to order status
  const orderStatus = 
    delivery_status === 'delivered' ? 'fulfilled' :
    delivery_status === 'cancelled' ? 'cancelled' :
    'pending'

  // SECURITY FIX: Verify order exists and get user_id BEFORE calling the RPC.
  // This prevents unauthorized calls from manipulating stock if the RPC's 
  // internal security is ever compromised.
  const { data: existingOrder, error: fetchError } = await supabase
    .from('orders')
    .select('id, user_id, total, bkash_invoice')
    .eq('id', params.id)
    .single()

  if (fetchError || !existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Call the atomic RPC to update status and reduce stock if confirming
  // NOTE: The SQL function itself still needs to be patched in migration 040
  // to remove SECURITY DEFINER or add explicit ownership checks.
  const { data: rpcData, error: rpcError } = await supabase.rpc('confirm_order_and_reduce_stock', {
    p_order_id: params.id,
    p_new_status: delivery_status,
  })

  if (rpcError) {
    console.error('RPC Error:', rpcError)
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  // Send email notification to customer via Resend (non-fatal)
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
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
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
    inventory_reduced_now: rpcData?.inventory_reduced_now ?? false 
  })
}