// app/api/orders/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, image_url, price))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: session.user.id,
      total: body.total,
      status: 'pending',
      payment_method: body.payment_method || 'bkash',
      stripe_session_id: body.stripe_session_id ?? null,
    })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const orderItems = body.items.map((item: { id: string; quantity: number; price: number }) => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      const paymentLabel = order.payment_method === 'cod' ? 'Cash on Delivery' : 'bKash'
      const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/orders`
      const orderId = order.id.slice(0, 8).toUpperCase()

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Bushal <onboarding@resend.dev>',
          to: process.env.ADMIN_EMAIL,
          subject: `New Order #${orderId} — ${paymentLabel}`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Order — Bushal</title>
</head>
<body style="margin:0;padding:0;background:#F9F6F0;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E0D9CE;">

          <!-- Header -->
          <tr>
            <td style="background:#1B3A2D;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#B87333;border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                          <span style="color:#ffffff;font-weight:700;font-size:14px;line-height:32px;">B</span>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="color:#ffffff;font-family:Georgia,serif;font-size:20px;font-weight:600;letter-spacing:0.02em;">Bushal</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#B87333;color:#ffffff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.05em;text-transform:uppercase;">New Order</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title row -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <h1 style="margin:0 0 4px 0;font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1B3A2D;letter-spacing:-0.01em;">
                Order Received
              </h1>
              <p style="margin:0;font-size:14px;color:#6B6B65;">
                A new order has been placed and is awaiting your action.
              </p>
            </td>
          </tr>

          <!-- Order details card -->
          <tr>
            <td style="padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F0;border-radius:12px;border:1px solid #E0D9CE;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E0D9CE;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#6B6B65;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Order ID</td>
                        <td align="right" style="font-size:13px;color:#1A1A18;font-weight:700;font-family:monospace;">#${orderId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E0D9CE;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#6B6B65;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Payment Method</td>
                        <td align="right">
                          <span style="display:inline-block;background:${order.payment_method === 'cod' ? '#FEF6E4' : '#E8F5EE'};color:${order.payment_method === 'cod' ? '#B07D2A' : '#2A7A4E'};font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid ${order.payment_method === 'cod' ? '#B07D2A33' : '#2A7A4E33'};">
                            ${paymentLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#6B6B65;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Order Total</td>
                        <td align="right" style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1B3A2D;">৳${order.total.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px 32px;" align="center">
              <a href="${adminUrl}"
                style="display:inline-block;background:#B87333;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em;box-shadow:0 6px 20px rgba(184,115,51,0.28);">
                View in Admin Panel →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F0EBE1;padding:18px 32px;border-top:1px solid #E0D9CE;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:#6B6B65;">
                    © ${new Date().getFullYear()} Bushal · Made with care in Bangladesh
                  </td>
                  <td align="right" style="font-size:11px;color:#6B6B65;">
                    bushal.com
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `,
        }),
      })
    } catch (emailError) {
      console.error('Failed to send order email:', emailError)
    }
  }

  return NextResponse.json(order, { status: 201 })
}