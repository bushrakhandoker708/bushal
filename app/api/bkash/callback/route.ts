// app/api/bkash/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// FIX: Import shared email helpers instead of initializing Resend inline
import { sendAdminOrderNotification, sendCustomerOrderConfirmation } from '@/lib/email'
import { bkashExecutePayment } from '@/lib/bkash'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentID = searchParams.get('paymentID')
  const status    = searchParams.get('status')
  const orderId   = searchParams.get('orderId')
  const origin    = new URL(request.url).origin

  // Handle bKash cancellation or failure
  if (status === 'cancel' || status === 'failure') {
    if (orderId) {
      const supabase = await createServerClient()
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('orders').delete().eq('id', orderId)
    }
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=${status}`)
  }

  if (!paymentID || !orderId) return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=missing`)

  const supabase = await createServerClient()

  // Fetch existing order details before updating
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('status, user_id, total, bkash_invoice, phone, delivery_address')
    .eq('id', orderId)
    .single()

  if (existingOrder?.status === 'fulfilled') return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
  if (existingOrder?.status === 'cancelled')  return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=cancelled`)

  // Execute bKash payment
  const executeRes = await bkashExecutePayment(paymentID)

  if (!executeRes || executeRes.statusCode !== '0000' || executeRes.transactionStatus !== 'Completed') {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=execute_failed`)
  }

  // Idempotency check to prevent double-fulfillment on bKash retries
  const { data: alreadyFulfilled } = await supabase
    .from('orders')
    .select('id')
    .eq('bkash_invoice', existingOrder?.bkash_invoice)
    .eq('status', 'fulfilled')
    .maybeSingle()

  if (alreadyFulfilled) {
    return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
  }

  // Update order status to fulfilled
  await supabase.from('orders')
    .update({
      status: 'fulfilled',
      delivery_status: 'confirmed',
      bkash_payment_id: paymentID,
      bkash_trx_id: executeRes.trxID
    })
    .eq('id', orderId)

  // ─── Fetch data for emails ───────────────────────────────────────────────
  // FIX: Fetch order items and profile to send both Admin and Customer emails
  const [{ data: profile }, { data: orderItems }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', existingOrder?.user_id)
      .single(),
    supabase
      .from('order_items')
      .select('quantity, unit_price, products(name, delivery_charge)')
      .eq('order_id', orderId),
  ])

  // FIX: Supabase join returns an object, not an array, for to-one joins
  const emailItems = (orderItems ?? []).map((item: any) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    return {
      name: product?.name ?? 'Product',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      deliveryCharge: product?.delivery_charge ?? null,
    }
  })

  // ─── Send Admin + Customer emails concurrently ───────────────────────────
  // Failures are caught inside the helpers, so they won't break the redirect flow
  await Promise.all([
    sendAdminOrderNotification({
      orderId,
      customerName: profile?.full_name ?? null,
      customerEmail: profile?.email ?? null,
      phone: existingOrder?.phone ?? null,
      total: existingOrder?.total ?? 0,
      paymentMethod: 'bkash',
      items: emailItems,
      deliveryAddress: existingOrder?.delivery_address ?? null,
      bkashTrxId: executeRes.trxID ?? null,
    }),
    profile?.email
      ? sendCustomerOrderConfirmation({
          orderId,
          customerName: profile.full_name ?? null,
          customerEmail: profile.email,
          total: existingOrder?.total ?? 0,
          paymentMethod: 'bkash',
        })
      : Promise.resolve(),
  ])

  return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
}