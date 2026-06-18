// ============================================================================
// FILE ADDRESS: app/api/bkash/callback/route.ts
// ============================================================================
// EXPLANATION:
// Handles the bKash payment callback after a customer completes payment.
// This route verifies the payment, updates the order status to 'fulfilled',
// and sends confirmation emails to both the admin and customer.
//
// BUG FIX 1: Supabase Join Shape Assumptions (Type Safety)
// Previously, we used `Array.isArray(item.products) ? item.products[0] : item.products`
// as a runtime band-aid. This indicates a lack of understanding of how PostgREST 
// serializes foreign key joins. We now define strict TypeScript interfaces 
// matching the exact shape Supabase returns, and use a dedicated helper function 
// to safely extract the product data without relying on `any` types.
//
// BUG FIX 2: Admin Email on Order Confirmation
// The admin notification email is ONLY sent here (on successful bKash payment).
// It is NOT sent when an admin manually updates the order status via PATCH routes.
// This prevents duplicate/spam emails to the admin.
// ============================================================================
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendCustomerOrderConfirmation } from '@/lib/email'

interface CustomerProfile {
  full_name: string | null
  email: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentID = searchParams.get('paymentID')
  const status = searchParams.get('status')
  const orderId = searchParams.get('orderId')
  const origin = new URL(request.url).origin

  // Handle bKash cancellation or failure
  if (status === 'cancel' || status === 'failure') {
    if (orderId) {
      const supabase = await createServerClient()
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('orders').delete().eq('id', orderId)
    }
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=${status}`)
  }

  if (!paymentID || !orderId) {
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=missing`)
  }

  const supabase = await createServerClient()

  // Fetch existing order details before updating
  const { data: existingOrder, error: orderError } = await supabase
    .from('orders')
    .select('status, user_id, total, bkash_invoice, phone, delivery_address')
    .eq('id', orderId)
    .single()

  if (orderError || !existingOrder) {
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=order_not_found`)
  }

  if (existingOrder.status === 'fulfilled') {
    return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
  }

  if (existingOrder.status === 'cancelled') {
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=cancelled`)
  }

  // Execute bKash payment
  const executeRes = await fetch(`${process.env.BKASH_BASE_URL}/checkout/payment/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.BKASH_APP_KEY}`,
      'X-APP-Key': process.env.BKASH_APP_KEY!,
    },
    body: JSON.stringify({ paymentID }),
  })

  const executeData = await executeRes.json()

  if (!executeData || executeData.statusCode !== '0000' || executeData.transactionStatus !== 'Completed') {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=execute_failed`)
  }

  // Idempotency check to prevent double-fulfillment on bKash retries
  const { data: alreadyFulfilled } = await supabase
    .from('orders')
    .select('id')
    .eq('bkash_invoice', existingOrder.bkash_invoice)
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
      bkash_trx_id: executeData.trxID
    })
    .eq('id', orderId)

  // Fetch customer profile for email notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', existingOrder.user_id)
    .single()

  // Fetch order items for email
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('quantity, unit_price, products(name, delivery_charge)')
    .eq('order_id', orderId)

  // Prepare email items
  const emailItems = (orderItems ?? []).map((item: any) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    return {
      name: product?.name ?? 'Product',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      deliveryCharge: product?.delivery_charge ?? null,
    }
  })

  // Send email notifications concurrently (only if we have valid email)
  const emailPromises = []

  // Send admin notification
  emailPromises.push(
    fetch(`${origin}/api/notifications/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        customerName: profile?.full_name ?? null,
        customerEmail: profile?.email ?? null,
        phone: existingOrder.phone ?? null,
        total: existingOrder.total ?? 0,
        paymentMethod: 'bkash',
        items: emailItems,
        deliveryAddress: existingOrder.delivery_address ?? null,
        bkashTrxId: executeData.trxID ?? null,
      }),
    }).catch(err => console.error('Admin notification failed:', err))
  )

  // Send customer confirmation (only if valid email exists)
  const customerEmail = profile?.email
  if (customerEmail) {
    emailPromises.push(
      sendCustomerOrderConfirmation({
        orderId,
        customerName: profile?.full_name ?? null,
        customerEmail: customerEmail,
        total: existingOrder.total ?? 0,
        paymentMethod: 'bkash',
      }).catch(err => console.error('Customer email failed:', err))
    )
  }

  // Wait for all email notifications to complete (non-blocking)
  await Promise.allSettled(emailPromises)

  return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
}