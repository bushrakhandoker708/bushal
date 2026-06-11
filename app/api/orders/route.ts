// app/api/orders/route.ts


import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sendAdminOrderNotification } from '@/lib/email'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { delivery_address, customer_note, phone, payment_method, items } = body

    // 1. Create the order (Your existing order creation logic)
    const { data: newOrder, error: orderError } = await auth.supabase
      .from('orders')
      .insert({
        user_id: auth.userId,
        total: items.reduce((sum: number, i: any) => sum + (i.unit_price * i.quantity), 0),
        status: 'pending',
        delivery_status: 'order_placed',
        payment_method: payment_method ?? 'cod',
      })
      .select()
      .single()

    if (orderError || !newOrder) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const orderId = newOrder.id

    // 2. Create order items
    if (items?.length > 0) {
      const orderItemsData = items.map((item: any) => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
      await auth.supabase.from('order_items').insert(orderItemsData)
    }

    // 3. Attach delivery details
    await auth.supabase.from('orders').update({
      delivery_address: delivery_address?.trim() ?? null,
      customer_note: customer_note?.trim() ?? null,
      phone: phone?.trim() ?? null,
      payment_method: payment_method ?? 'cod',
    }).eq('id', orderId)

    // 4. Prepare email data
    const { data: orderItems } = await auth.supabase.from('order_items').select(`
      id, product_id, quantity, unit_price,
      products (name, image_url, images, cost_price, delivery_charge)
    `).eq('order_id', orderId)

    const emailItems = (orderItems ?? []).map((item: any) => {
      const product = item.products?.[0] ?? {}
      return {
        name: product.name ?? 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        costPrice: product.cost_price ?? null,
        deliveryCharge: product.delivery_charge ?? null,
        imageUrl: product.images?.[0] ?? product.image_url ?? null,
      }
    })

    const { data: profile } = await auth.supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', auth.userId)
      .single()

    // ✅ FIX: AWAIT the email notification. 
    // Serverless environments kill fire-and-forget promises when the response returns.
    const emailResult = await sendAdminOrderNotification({
      orderId,
      customerName: profile?.full_name ?? null,
      customerEmail: profile?.email ?? null,
      customerPhone: profile?.phone ?? null,
      orderPhone: phone ?? profile?.phone ?? null,
      total: newOrder.total,
      paymentMethod: payment_method ?? 'cod',
      items: emailItems,
      address: null,
      legacyAddress: delivery_address?.trim() ?? '',
      customerNote: customer_note?.trim() ?? null,
      bkashInvoice: payment_method === 'bkash' ? (body.bkash_invoice || null) : null,
      createdAt: new Date().toISOString(),
    })

    if (!emailResult.success) {
      console.error('[Admin Email] Failed to send notification:', emailResult.error)
    }

    return NextResponse.json({ success: true, orderId }, { status: 201 })

  } catch (err: any) {
    console.error('[Order POST] Critical error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}