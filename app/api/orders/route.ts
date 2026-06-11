// app/api/orders/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
  const { data: orderId, error: rpcError } = await auth.supabase.rpc('create_order_with_stock_check', {
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
  
  // Fetch order details for emails
  console.log('📦 Fetching order details for order:', orderId)
  
  const { data: orderItems, error: itemsError } = await auth.supabase
    .from('order_items')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      products (name, image_url, images, cost_price, delivery_charge)
    `)
    .eq('order_id', orderId)
  
  if (itemsError) {
    console.error('❌ Failed to fetch order items:', itemsError)
  }
  
  console.log('📦 Order items fetched:', orderItems?.length ?? 0)
  
  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', auth.userId)
    .single()
  
  if (profileError) {
    console.error('❌ Failed to fetch profile:', profileError)
  }
  
  // Prepare items for email
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
  
  console.log('📧 Prepared email items:', emailItems)
  
  // SEND ADMIN EMAIL
  try {
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      console.log('📧 Sending admin email to:', process.env.ADMIN_EMAIL)
      
      const adminEmailResult = await resend.emails.send({
        from: 'Bushal Orders <noreply@bushal.com>',
        to: [process.env.ADMIN_EMAIL],
        subject: `🛒 New Order #${orderId.slice(0, 8).toUpperCase()} — ৳${roundedTotal} (${payment_method.toUpperCase()})`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
            <h1 style="color:#ea580c; margin: 0 0 16px;">🛒 New Order Received</h1>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              <strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}<br/>
              <strong>Customer:</strong> ${profile?.full_name ?? 'N/A'}<br/>
              <strong>Email:</strong> ${profile?.email ?? 'N/A'}<br/>
              <strong>Phone:</strong> ${phone ?? 'N/A'}<br/>
              <strong>Payment:</strong> ${payment_method.toUpperCase()}<br/>
              <strong>Total:</strong> ৳${roundedTotal.toLocaleString('en-BD')}
            </p>
            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/orders/${orderId}"
                style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                View in Admin Panel →
              </a>
            </div>
          </div>
        `,
        replyTo: profile?.email ?? undefined,
      })
      
      console.log('✅ Admin email sent successfully:', adminEmailResult)
    } else {
      console.warn('⚠️ Email not sent - Missing RESEND_API_KEY or ADMIN_EMAIL')
    }
  } catch (emailErr) {
    console.error('❌ Admin email notification failed:', emailErr)
  }
  
  // SEND CUSTOMER CONFIRMATION EMAIL
  try {
    if (process.env.RESEND_API_KEY && profile?.email) {
      console.log('📧 Sending customer email to:', profile.email)
      
      const customerEmailResult = await resend.emails.send({
        from: 'Bushal <noreply@bushal.com>',
        to: [profile.email],
        subject: `Order Confirmed — #${orderId.slice(0, 8).toUpperCase()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
            <h1 style="color:#ea580c; margin: 0 0 16px;">Order Confirmed ✓</h1>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Hi ${profile?.full_name ?? 'Customer'},<br/><br/>
              Thank you for your order! We've received your order and it's being processed.
            </p>
            <div style="background:#f8f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px;"><strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
              <p style="margin: 0 0 8px;"><strong>Total:</strong> ৳${roundedTotal.toLocaleString('en-BD')}</p>
              <p style="margin: 0;"><strong>Payment:</strong> ${payment_method === 'cod' ? 'Cash on Delivery' : 'bKash'}</p>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              You can track your order status anytime in your dashboard.
            </p>
            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/orders"
                style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                View My Orders
              </a>
            </div>
            <p style="color:#94a3b8; font-size:13px; margin-top:32px;">— The Bushal Team</p>
          </div>
        `,
      })
      
      console.log('✅ Customer email sent successfully:', customerEmailResult)
    } else {
      console.warn('⚠️ Customer email not sent - Missing RESEND_API_KEY or customer email')
    }
  } catch (emailErr) {
    console.error('❌ Customer email notification failed:', emailErr)
  }
  
  return NextResponse.json({ id: orderId, message: 'Order created successfully' }, { status: 201 })
}