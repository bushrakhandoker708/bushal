// lib/email/index.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface OrderItemEmail {
  name: string
  quantity: number
  unitPrice: number
  costPrice?: number | null
  deliveryCharge?: number | null
  imageUrl?: string | null
}

interface CustomerAddress {
  division: string
  zilla: string
  upazilla: string
  detailed_address: string
  delivery_instructions?: string | null
}

interface OrderEmailData {
  orderId: string
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  orderPhone: string | null
  total: number
  paymentMethod: string
  items: OrderItemEmail[]
  address: CustomerAddress | null
  legacyAddress: string | null
  customerNote: string | null
  bkashInvoice: string | null
  createdAt: string
}

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}

export async function sendAdminOrderNotification(data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL
  const fromEmail = process.env.FROM_EMAIL || 'noreply@bushal.com'

  if (!adminEmail || !process.env.RESEND_API_KEY) {
    return { success: false, error: 'Missing ADMIN_EMAIL or RESEND_API_KEY environment variables.' }
  }

  try {
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding:12px 8px;font-size:14px;">${item.name} × ${item.quantity}</td>
        <td style="padding:12px 8px;text-align:right;font-size:14px;color:#6b7280;">${item.deliveryCharge ? formatCurrency(item.deliveryCharge) : '—'}</td>
        <td style="padding:12px 8px;text-align:right;font-weight:600;color:#1a362d;font-size:14px;">${formatCurrency(item.unitPrice * item.quantity)}</td>
      </tr>
    `).join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>New Order - Bushal</title></head>
      <body style="font-family: system-ui, sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h1 style="color: #ea580c; margin: 0 0 16px;">🛒 New Order Received</h1>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            <strong>Order ID:</strong> #${data.orderId.slice(0, 8).toUpperCase()}<br/>
            <strong>Customer:</strong> ${data.customerName || 'N/A'}<br/>
            <strong>Email:</strong> ${data.customerEmail || 'N/A'}<br/>
            <strong>Phone:</strong> ${data.orderPhone || 'N/A'}<br/>
            <strong>Payment:</strong> ${data.paymentMethod.toUpperCase()}<br/>
            <strong>Total:</strong> ${formatCurrency(data.total)}
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead><tr style="background: #f3f4f6;">
              <th style="text-align: left; padding: 8px; font-size: 12px;">Item</th>
              <th style="text-align: right; padding: 8px; font-size: 12px;">Delivery</th>
              <th style="text-align: right; padding: 8px; font-size: 12px;">Subtotal</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          ${data.legacyAddress ? `<div style="background:#f8f5f0;padding:12px;border-radius:8px;margin:12px 0;"><strong>Delivery Address:</strong><br/>${data.legacyAddress}</div>` : ''}
          <div style="margin-top: 24px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/orders/${data.orderId}" 
               style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              View in Admin Panel →
            </a>
          </div>
        </div>
      </body></html>
    `

    const { data: resendData, error } = await resend.emails.send({
      from: `Bushal Orders <${fromEmail}>`,
      to: [adminEmail],
      subject: `🛒 New Order #${data.orderId.slice(0, 8).toUpperCase()} — ${formatCurrency(data.total)} (${data.paymentMethod.toUpperCase()})`,
      html: emailHtml,
      replyTo: data.customerEmail ?? undefined,
    })

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Failed to send admin email:', err)
    return { success: false, error: err.message }
  }
}