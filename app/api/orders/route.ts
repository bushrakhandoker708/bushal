// app/api/orders/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

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
  const { items, total, payment_method = 'cod', delivery_address, customer_note, phone } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }
  if (!delivery_address?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Delivery address and phone number are required.' }, { status: 400 })
  }

  // Format items for the PostgreSQL RPC
  const rpcItems = items.map((item: any) => ({
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price
  }))

  // Call atomic RPC to create order & validate stock (Stock is NOT reduced here)
  const { data: orderId, error: rpcError } = await auth.supabase.rpc('create_order_with_stock_check', {
    p_user_id: auth.userId,
    p_items: rpcItems,
    p_total: total,
    p_bkash_invoice: payment_method === 'bkash' ? (body.bkash_invoice || null) : null
  })

  if (rpcError) {
    console.error('Order creation RPC failed:', rpcError)
    // Handle custom PL/pgSQL exceptions
    if (rpcError.message.includes('insufficient_stock')) {
      return NextResponse.json({ error: 'One or more items are out of stock. Please adjust your cart.' }, { status: 409 })
    }
    if (rpcError.message.includes('product_not_found')) {
      return NextResponse.json({ error: 'A selected product no longer exists.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
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

  // Admin notification email
  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      const paymentLabel = payment_method === 'cod' ? 'Cash on Delivery' : 'bKash'
      const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/orders`
      
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Bushal <noreply@bushal.com>',
          to: [process.env.ADMIN_EMAIL],
          subject: `New Order #${orderId.slice(0, 8).toUpperCase()} — ${paymentLabel}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
              <h1 style="color:#f97316; font-size:24px; margin-bottom:8px;">Bushal Admin Alert</h1>
              <hr style="border:none; border-top:1px solid #e2e8f0; margin: 16px 0;" />
              <p style="color:#475569;">A new order has been placed.</p>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; margin:20px 0;">
                <p><strong>Order ID:</strong> ${orderId.slice(0, 8).toUpperCase()}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Address:</strong> ${delivery_address}</p>
                <p><strong>Total:</strong> ৳${Number(total).toLocaleString()}</p>
                <p><strong>Payment:</strong> ${paymentLabel}</p>
                ${customer_note ? `<p><strong>Notes:</strong> ${customer_note}</p>` : ''}
              </div>
              <a href="${adminUrl}" style="background:#1B3A2D; color:white; padding:10px 20px; border-radius:8px; text-decoration:none;">View in Admin Panel</a>
            </div>
          `,
        }),
      })
    } catch (emailErr) {
      console.error('Admin email notification failed:', emailErr)
    }
  }

  return NextResponse.json({ id: orderId, message: 'Order created successfully' }, { status: 201 })
}