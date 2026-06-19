//  app/api/bkash/callback/route.ts

// Handles the bKash payment callback after a customer completes payment.
// This route verifies the payment, updates the order status to 'fulfilled',
// and sends confirmation emails to both the admin and customer.

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendCustomerOrderConfirmation, sendAdminOrderNotification } from '@/lib/email'

interface CustomerProfile {
  full_name: string | null
  email: string | null
}

interface OrderItemProduct {
  name: string
  delivery_charge: number | null
}

interface OrderItemWithProduct {
  quantity: number
  unit_price: number
  products: OrderItemProduct[] | null
}

// Helper to safely extract product data from Supabase join response
const getProductData = (item: OrderItemWithProduct): OrderItemProduct | null => {
  if (!item.products || item.products.length === 0) return null
  return item.products[0]
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
      // Clean up pending order items and the order itself
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

  // ─── IDEMPOTENCY CHECK ───────────────────────────────────────────────────
  // If the order is already fulfilled (likely due to a previous webhook or callback),
  // redirect to thank you page immediately without re-processing.
  if (existingOrder.status === 'fulfilled') {
    return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
  }

  if (existingOrder.status === 'cancelled') {
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=cancelled`)
  }

  // ─── SERVER-SIDE VERIFICATION ────────────────────────────────────────────
  // Do not trust the callback 'status' parameter alone. 
  // Call bKash Execute API to definitively confirm the transaction.
  let executeData: any = null
  try {
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

    executeData = await executeRes.json()

    if (!executeData || executeData.statusCode !== '0000' || executeData.transactionStatus !== 'Completed') {
      console.error('[bKash Callback] Execution failed:', executeData)
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
      return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=execute_failed`)
    }
  } catch (err) {
    console.error('[bKash Callback] Network error during execution:', err)
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=network_error`)
  }

  // ─── SECONDARY IDEMPOTENCY CHECK (Post-Verification) ─────────────────────
  // Double-check that another process hasn't fulfilled this order while we were 
  // verifying with bKash. We check against bkash_invoice to be robust.
  const { data: alreadyFulfilled } = await supabase
    .from('orders')
    .select('id')
    .eq('bkash_invoice', existingOrder.bkash_invoice)
    .eq('status', 'fulfilled')
    .maybeSingle()

  if (alreadyFulfilled) {
    return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
  }

  // ─── ATOMIC ORDER FULFILLMENT ────────────────────────────────────────────
  // Use the atomic RPC to update status AND reduce stock in one transaction.
  // This prevents race conditions where two callbacks try to fulfill the same order.
  const { error: rpcError } = await supabase.rpc('confirm_order_and_reduce_stock', {
    p_order_id: orderId,
    p_new_status: 'confirmed' // Maps to 'confirmed' delivery status in the RPC
  })

  if (rpcError) {
    console.error('[bKash Callback] RPC failed:', rpcError)
    // If RPC fails, we don't redirect to thank you. We log it for manual review.
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=system_error`)
  }

  // Update specific bKash fields that the generic RPC might not cover fully 
  // or to ensure we have the latest trxID from the execute call
  await supabase.from('orders')
    .update({
      bkash_payment_id: paymentID,
      bkash_trx_id: executeData.trxID,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  // ─── EMAIL NOTIFICATIONS ─────────────────────────────────────────────────
  // Fetch customer profile for email notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', existingOrder.user_id)
    .single()

  // Fetch order items for email using strict typing
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('quantity, unit_price, products(name, delivery_charge)')
    .eq('order_id', orderId)

  // Prepare email items safely
  const emailItems = (orderItems ?? []).map((item) => {
    const product = getProductData(item as OrderItemWithProduct)
    return {
      name: product?.name ?? 'Product',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      deliveryCharge: product?.delivery_charge ?? null,
    }
  })

  // Send email notifications concurrently (non-blocking)
  const emailPromises = []

  // 1. Send Admin Notification (ONLY here, not on status updates)
  emailPromises.push(
    sendAdminOrderNotification({
      orderId,
      customerName: profile?.full_name ?? null,
      customerEmail: profile?.email ?? null,
      phone: existingOrder.phone ?? null,
      total: existingOrder.total ?? 0,
      paymentMethod: 'bkash',
      items: emailItems,
      deliveryAddress: existingOrder.delivery_address ?? null,
      bkashTrxId: executeData.trxID ?? null,
    }).catch(err => console.error('Admin notification failed:', err))
  )

  // 2. Send Customer Confirmation
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

  // Wait for emails to settle (don't block redirect if they fail)
  await Promise.allSettled(emailPromises)

  return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
}