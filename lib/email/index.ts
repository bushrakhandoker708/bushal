// lib/email/index.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Use onboarding@resend.dev until your domain is verified ─────────────────
// Once bushal.com is verified in Resend dashboard, change to: noreply@bushal.com
const FROM_ORDERS = process.env.FROM_EMAIL ?? 'Bushal Orders <onboarding@resend.dev>'
const FROM_GENERAL = process.env.FROM_EMAIL_GENERAL ?? 'Bushal <onboarding@resend.dev>'

export interface OrderEmailItem {
  name: string
  quantity: number
  unitPrice: number
  deliveryCharge?: number | null
}

export interface AdminOrderEmailPayload {
  orderId: string
  customerName: string | null
  customerEmail: string | null
  phone: string | null
  total: number
  paymentMethod: string
  items: OrderEmailItem[]
  deliveryAddress?: string | null
  customerNote?: string | null
  bkashTrxId?: string | null
}

export interface CustomerOrderEmailPayload {
  orderId: string
  customerName: string | null
  customerEmail: string
  total: number
  paymentMethod: string
}

function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}

function buildItemsTable(items: OrderEmailItem[]): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding:10px 8px;font-size:14px;border-bottom:1px solid #f3f4f6;">
        ${item.name} × ${item.quantity}
      </td>
      <td style="padding:10px 8px;text-align:right;font-size:14px;border-bottom:1px solid #f3f4f6;color:#6b7280;">
        ${item.deliveryCharge ? formatBDT(item.deliveryCharge) : '—'}
      </td>
      <td style="padding:10px 8px;text-align:right;font-size:14px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#1a362d;">
        ${formatBDT(item.unitPrice * item.quantity)}
      </td>
    </tr>
  `).join('')

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="text-align:left;padding:8px;font-size:12px;color:#6b7280;">Item</th>
          <th style="text-align:right;padding:8px;font-size:12px;color:#6b7280;">Delivery</th>
          <th style="text-align:right;padding:8px;font-size:12px;color:#6b7280;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

// ─── Admin notification email ─────────────────────────────────────────────────
export async function sendAdminOrderNotification(
  data: AdminOrderEmailPayload
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !process.env.RESEND_API_KEY) {
    console.warn('[Email] Skipped admin notification: missing ADMIN_EMAIL or RESEND_API_KEY')
    return
  }

  const shortId = data.orderId.slice(0, 8).toUpperCase()
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/admin/orders/${data.orderId}`

  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
        <h1 style="color:#ea580c;margin:0 0 20px;font-size:22px;">🛒 New Order Received</h1>

        <table style="width:100%;font-size:14px;line-height:1.8;">
          <tr><td style="color:#6b7280;width:130px;">Order ID</td><td><strong>#${shortId}</strong></td></tr>
          <tr><td style="color:#6b7280;">Customer</td><td>${data.customerName ?? 'N/A'}</td></tr>
          <tr><td style="color:#6b7280;">Email</td><td>${data.customerEmail ?? 'N/A'}</td></tr>
          <tr><td style="color:#6b7280;">Phone</td><td>${data.phone ?? 'N/A'}</td></tr>
          <tr><td style="color:#6b7280;">Payment</td><td><strong>${data.paymentMethod.toUpperCase()}</strong>${data.bkashTrxId ? ` (TRX: ${data.bkashTrxId})` : ''}</td></tr>
          <tr><td style="color:#6b7280;">Total</td><td><strong style="color:#1a362d;font-size:16px;">${formatBDT(data.total)}</strong></td></tr>
        </table>

        ${buildItemsTable(data.items)}

        ${data.deliveryAddress ? `
          <div style="background:#f8f5f0;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:14px;">
            <strong>Delivery address:</strong><br/>${data.deliveryAddress}
          </div>
        ` : ''}

        ${data.customerNote ? `
          <div style="background:#fffbeb;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:14px;border-left:3px solid #f59e0b;">
            <strong>Customer note:</strong> ${data.customerNote}
          </div>
        ` : ''}

        <div style="margin-top:28px;text-align:center;">
          <a href="${adminUrl}"
             style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            View Order in Admin Panel →
          </a>
        </div>
      </div>
    </body></html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_ORDERS,
      to: [adminEmail],
      subject: `🛒 New Order #${shortId} — ${formatBDT(data.total)} (${data.paymentMethod.toUpperCase()})`,
      html,
      replyTo: data.customerEmail ?? undefined,
    })
    if (error) throw error
    console.log(`[Email] Admin notification sent for order ${shortId}`)
  } catch (err: any) {
    // Log but never throw — email failure must never break order creation
    console.error('[Email] Admin notification FAILED:', err?.message ?? err)
  }
}

// ─── Customer confirmation email ──────────────────────────────────────────────
export async function sendCustomerOrderConfirmation(
  data: CustomerOrderEmailPayload
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const shortId = data.orderId.slice(0, 8).toUpperCase()
  const ordersUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/orders`
  const paymentLabel = data.paymentMethod === 'bkash' ? 'bKash' : 'Cash on Delivery'

  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
        <h1 style="color:#1a362d;margin:0 0 16px;font-size:22px;">Order Confirmed ✓</h1>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
          Hi ${data.customerName ?? 'there'},<br/><br/>
          Thank you for your order! We've received your request and it's being processed.
        </p>
        <div style="background:#f8f5f0;padding:20px;border-radius:8px;margin:20px 0;font-size:14px;line-height:1.8;">
          <p style="margin:0 0 6px;"><strong>Order ID:</strong> #${shortId}</p>
          <p style="margin:0 0 6px;"><strong>Total:</strong> ${formatBDT(data.total)}</p>
          <p style="margin:0;"><strong>Payment:</strong> ${paymentLabel}</p>
        </div>
        <div style="margin-top:24px;text-align:center;">
          <a href="${ordersUrl}"
             style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Track My Order
          </a>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Bushal Team</p>
      </div>
    </body></html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_GENERAL,
      to: [data.customerEmail],
      subject: `Order Confirmed — #${shortId}`,
      html,
    })
    if (error) throw error
    console.log(`[Email] Customer confirmation sent to ${data.customerEmail}`)
  } catch (err: any) {
    console.error('[Email] Customer confirmation FAILED:', err?.message ?? err)
  }
}