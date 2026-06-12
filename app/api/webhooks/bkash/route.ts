// app/api/webhooks/bkash/route.ts

// Handles Instant Payment Notifications (IPN) / Webhooks from bKash.
// This guarantees that orders are fulfilled and stock is reduced server-side,
// even if the customer closes their browser before the callback route redirects them.
// It verifies the payment status and idempotently updates the order.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { 
    auth: { 
      autoRefreshToken: false, 
      persistSession: false 
    } 
  }
)

export async function POST(req: Request) {
  try {
    // 1. Verify Webhook Signature (Security Best Practice)
    // If bKash provides an IPN secret in their dashboard, verify it here.
    // const headersList = await headers()
    // const signature = headersList.get('x-bkash-signature')
    // if (process.env.BKASH_IPN_SECRET && signature !== process.env.BKASH_IPN_SECRET) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await req.json()
    const { paymentID, trxID, status } = body

    if (!paymentID) {
      return NextResponse.json({ error: 'Missing paymentID' }, { status: 400 })
    }

    // 2. Find the order associated with this bKash payment
    // We check both bkash_invoice (our internal ID) and bkash_payment_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, delivery_status, bkash_invoice, inventory_reduced')
      .or(`bkash_invoice.eq.${paymentID},bkash_payment_id.eq.${paymentID}`)
      .maybeSingle()

    if (orderError || !order) {
      console.warn('[bKash Webhook] Order not found for paymentID:', paymentID)
      // Return 200 to prevent bKash from endlessly retrying an unknown payment
      return NextResponse.json({ status: 'ignored', reason: 'order_not_found' })
    }

    // 3. Idempotency check: Only fulfill if not already fulfilled/confirmed
    if (order.status === 'fulfilled' || order.delivery_status === 'confirmed') {
      return NextResponse.json({ status: 'already_processed' })
    }

    // 4. Process based on payment status
    if (status === 'completed' || status === 'Completed') {
      // Call the atomic RPC to confirm order and reduce stock exactly once
      const { error: rpcError } = await supabaseAdmin.rpc('confirm_order_and_reduce_stock', {
        p_order_id: order.id,
        p_new_status: 'confirmed'
      })

      if (rpcError) {
        console.error('[bKash Webhook] RPC Error:', rpcError)
        return NextResponse.json({ error: 'Failed to confirm order' }, { status: 500 })
      }

      console.log(`[bKash Webhook] Order ${order.id} confirmed via IPN. TrxID: ${trxID}`)
      return NextResponse.json({ status: 'success', order_id: order.id })
    }

    // 5. If payment failed or was cancelled, update order status to cancelled
    if (status === 'cancelled' || status === 'failure') {
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'cancelled', 
          delivery_status: 'cancelled' 
        })
        .eq('id', order.id)

      console.log(`[bKash Webhook] Order ${order.id} cancelled via IPN.`)
      return NextResponse.json({ status: 'cancelled' })
    }

    // Acknowledge receipt of other statuses
    return NextResponse.json({ status: 'received' })

  } catch (err) {
    console.error('[bKash Webhook] Exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
