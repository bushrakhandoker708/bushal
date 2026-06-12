import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { Resend } from 'resend'

// Initialize Resend SDK (Much more stable than raw fetch)
const resend = new Resend(process.env.RESEND_API_KEY)

interface Params {
  params: { id: string }
}

// GET - Fetch order details with items and customer info
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const { data: order, error } = await (await auth.supabase)
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

  const { data: profile } = await (await auth.supabase)
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', order.user_id)
    .single()

  const items = (order.order_items ?? []).map((item: any) => {
    let product = null
    if (item.products) {
      product = Array.isArray(item.products) ? item.products[0] ?? null : item.products
    }
    
    const costPrice: number = product?.cost_price ?? 0
    const deliveryCharge: number = product?.delivery_charge ?? 0
    const subtotal = item.unit_price * item.quantity
    const itemProfit = subtotal - (costPrice * item.quantity) - (deliveryCharge * item.quantity)
    const productImage = (Array.isArray(product?.images) && product.images[0]) || product?.image_url || null

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

  let deliveryAddressObj = null
  if (order.delivery_address) {
    try { deliveryAddressObj = JSON.parse(order.delivery_address) } catch {}
  }

  return NextResponse.json({
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
    items,
  })
}

// PATCH - Update order status
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const body = await request.json()
  const { delivery_status } = body

  const DELIVERY_STATUSES: Record<string, string> = {
    'order_placed': 'Order Placed', 'confirmed': 'Confirmed', 'processing': 'Processing',
    'shipped': 'Shipped', 'out_for_delivery': 'Out for Delivery', 'delivered': 'Delivered', 'cancelled': 'Cancelled',
  }

  if (!delivery_status || !DELIVERY_STATUSES[delivery_status]) {
    return NextResponse.json({ error: 'Invalid delivery status' }, { status: 400 })
  }

  const orderStatus = 
    delivery_status === 'delivered' ? 'fulfilled' :
    delivery_status === 'cancelled' ? 'cancelled' : 'pending'

  // 1. Update DB (NO updated_at column!)
  const { data, error } = await(await auth.supabase)
    .from('orders')
    .update({ status: orderStatus, delivery_status: delivery_status })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('DB Update Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. Send Email (Fire-and-forget so it doesn't block the response or cause timeouts)
  sendCustomerStatusEmail(params.id, delivery_status, DELIVERY_STATUSES[delivery_status])

  // Return immediately to the client
  return NextResponse.json({ success: true, delivery_status })
}

// Helper function to handle email safely using the Resend SDK
async function sendCustomerStatusEmail(orderId: string, status: string, label: string) {
  try {
    if (!process.env.RESEND_API_KEY) return

    const supabase = await createServerClient()
    const { data: order } = await supabase.from('orders').select('user_id').eq('id', orderId).single()
    if (!order?.user_id) return

    const { data: profile } = await supabase
      .from('profiles').select('email, full_name').eq('id', order.user_id).single()
    if (!profile?.email) return

    // Use Resend SDK instead of raw fetch
    await resend.emails.send({
      from: 'Bushal <noreply@bushal.com>',
      to: [profile.email],
      subject: `Order #${orderId.slice(0, 8).toUpperCase()} — Status Updated: ${label}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="color:#f97316; font-size:24px; margin-bottom:8px;">Bushal</h1>
          <hr style="border:none; border-top:1px solid #e2e8f0; margin: 16px 0;" />
          <h2 style="color:#1e293b; font-size:18px;">Order Status Updated</h2>
          <p style="color:#475569;">Hi ${profile.full_name ?? 'Customer'},</p>
          <p style="color:#475569;">Your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been updated to:</p>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; margin:20px 0;">
            <p style="font-size:20px; font-weight:bold; color:#1e293b; margin:0;">${label}</p>
          </div>
          <p style="color:#475569;">Track your order at <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bushal.com'}/orders" style="color:#f97316;">bushal.com/orders</a>.</p>
          <p style="color:#94a3b8; font-size:13px; margin-top:32px;">— The Bushal Team</p>
        </div>
      `,
    })
  } catch (err) {
    // Catch any email errors so they never crash the app
    console.error('Email notification failed:', err)
  }
}