// app/api/bkash/callback/route.ts
// Step 2: bKash redirects the user back here after they pay (or cancel/fail)
// This is a GET request with ?paymentID=...&status=...&orderId=...

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { bkashExecutePayment, bkashQueryPayment } from '@/app/lib/bkash'


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentID = searchParams.get('paymentID')
  const status = searchParams.get('status')
  const orderId = searchParams.get('orderId')
  const origin = new URL(request.url).origin

  // User cancelled or payment failed at bKash side
  if (status === 'cancel' || status === 'failure') {
    // Delete the pending order
    if (orderId) {
      const supabase = createServerClient()
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('orders').delete().eq('id', orderId)
    }
    return NextResponse.redirect(
      `${origin}/cart?bkash=failed&reason=${status}`
    )
  }

  if (!paymentID || !orderId) {
    return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=missing`)
  }

  // Step 3: Execute the payment to capture the funds
  const executeRes = await bkashExecutePayment(paymentID)

  if (executeRes.statusCode !== '0000' && executeRes.transactionStatus !== 'Completed') {
    // Execute failed — query to double-check
    const queryRes = await bkashQueryPayment(paymentID)

    if (queryRes.transactionStatus !== 'Completed') {
      const supabase = createServerClient()
      await supabase
        .from('orders')
        .update({ status: 'cancelled', bkash_payment_id: paymentID })
        .eq('id', orderId)
      return NextResponse.redirect(`${origin}/cart?bkash=failed&reason=execute`)
    }
  }

  // Step 4: Payment confirmed — mark order as fulfilled
  const supabase = createServerClient()

  await supabase
    .from('orders')
    .update({
      status: 'fulfilled',
      bkash_payment_id: paymentID,
      bkash_trx_id: executeRes.trxID,
    })
    .eq('id', orderId)

  return NextResponse.redirect(`${origin}/thank-you?orderId=${orderId}`)
}