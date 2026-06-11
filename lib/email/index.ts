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
  try {
    const adminEmail = process.env.ADMIN_EMAIL!
    const fromEmail = process.env.FROM_EMAIL!

    const itemsSubtotal = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const totalDelivery = data.items.reduce((sum, item) => sum + ((item.deliveryCharge ?? 0) * item.quantity), 0)
    const totalCost = data.items.reduce((sum, item) => sum + ((item.costPrice ?? 0) * item.quantity), 0)
    const estimatedProfit = itemsSubtotal - totalCost - totalDelivery

    const addressHtml = data.address
      ? `
        <div style="background:#f8f5f0;padding:16px;border-radius:12px;margin:16px 0;">
          <h3 style="color:#1a362d;font-size:14px;margin:0 0 8px 0;">📍 Delivery Address</h3>
          <p style="margin:4px 0;color:#2c2c2c;font-size:14px;"><strong>${data.address.detailed_address}</strong></p>
          <p style="margin:4px 0;color:#6b7280;font-size:13px;">${data.address.upazilla}, ${data.address.zilla}, ${data.address.division}</p>
          ${data.address.delivery_instructions ? `<p style="margin:8px 0 0 0;color:#b87333;font-size:13px;font-style:italic;">📝 ${data.address.delivery_instructions}</p>` : ''}
        </div>
      `
      : data.legacyAddress
      ? `
        <div style="background:#f8f5f0;padding:16px;border-radius:12px;margin:16px 0;">
          <h3 style="color:#1a362d;font-size:14px;margin:0 0 8px 0;">📍 Delivery Address</h3>
          <p style="margin:4px 0;color:#2c2c2c;font-size:14px;">${data.legacyAddress}</p>
        </div>
      `
      : '<p style="color:#dc2626;">⚠️ No delivery address provided</p>'

    const itemsHtml = data.items.map(item => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;" />` : ''}
            <div>
              <p style="margin:0;font-weight:600;color:#1a362d;font-size:14px;">${item.name}</p>
              ${item.costPrice ? `<p style="margin:2px 0 0 0;color:#6b7280;font-size:12px;">Cost: ${formatCurrency(item.costPrice)}</p>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:12px 8px;text-align:center;font-size:14px;color:#2c2c2c;">${item.quantity}</td>
        <td style="padding:12px 8px;text-align:right;font-size:14px;color:#2c2c2c;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding:12px 8px;text-align:right;font-size:14px;color:#6b7280;">
          ${item.deliveryCharge ? formatCurrency(item.deliveryCharge) : '—'}
        </td>
        <td style="padding:12px 8px;text-align:right;font-weight:600;color:#1a362d;font-size:14px;">
          ${formatCurrency(item.unitPrice * item.quantity)}
        </td>
      </tr>
    `).join('')

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order - Bushal</title>
</head>
<body style="margin:0;padding:0;background:#f1ede6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    
    <!-- Header -->
    <div style="background:#1a362d;padding:24px 32px;text-align:center;">
      <h1 style="color:#d49a5a;margin:0;font-size:24px;font-family:Georgia,serif;letter-spacing:-0.02em;">Bushal</h1>
      <p style="color:rgba(248,245,240,0.6);margin:4px 0 0 0;font-size:12px;letter-spacing:0.1em;">NEW ORDER RECEIVED</p>
    </div>

    <!-- Alert Banner -->
    <div style="background:#b87333;padding:16px 32px;text-align:center;">
      <p style="color:#f8f5f0;margin:0;font-size:14px;font-weight:600;">
        Order #${data.orderId.slice(0, 8).toUpperCase()} — ${data.paymentMethod === 'cod' ? 'Cash on Delivery' : data.paymentMethod}
      </p>
    </div>

    <div style="padding:32px;">
      
      <!-- Customer Info -->
      <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:24px;">
        <div style="flex:1;min-width:200px;">
          <h3 style="color:#1a362d;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px 0;">Customer</h3>
          <p style="margin:4px 0;color:#2c2c2c;font-size:14px;font-weight:600;">${data.customerName ?? 'Guest'}</p>
          <p style="margin:4px 0;color:#6b7280;font-size:13px;">${data.customerEmail ?? 'No email'}</p>
        </div>
        <div style="flex:1;min-width:200px;">
          <h3 style="color:#1a362d;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px 0;">Contact</h3>
          <p style="margin:4px 0;color:#2c2c2c;font-size:14px;font-weight:600;"> ${data.orderPhone ?? data.customerPhone ?? 'Not provided'}</p>
          ${data.bkashInvoice ? `<p style="margin:4px 0;color:#6b7280;font-size:13px;">bKash: ${data.bkashInvoice}</p>` : ''}
        </div>
      </div>

      ${addressHtml}

      ${data.customerNote ? `
        <div style="background:#fffbeb;padding:16px;border-radius:12px;margin:16px 0;border:1px solid #fcd34d;">
          <h3 style="color:#d97706;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px 0;"> Customer Note</h3>
          <p style="margin:0;color:#92400e;font-size:14px;font-style:italic;">${data.customerNote}</p>
        </div>
      ` : ''}

      <!-- Items Table -->
      <h3 style="color:#1a362d;font-size:14px;margin:24px 0 12px 0;">Order Items</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="border-bottom:2px solid #1a362d;">
            <th style="text-align:left;padding:8px;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Product</th>
            <th style="text-align:center;padding:8px;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;width:60px;">Qty</th>
            <th style="text-align:right;padding:8px;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;width:100px;">Unit</th>
            <th style="text-align:right;padding:8px;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;width:80px;">Delivery</th>
            <th style="text-align:right;padding:8px;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;width:100px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Financial Summary -->
      <div style="background:#f8f5f0;padding:20px;border-radius:12px;margin-top:24px;">
        <div style="display:flex;justify-content:space-between;margin:6px 0;">
          <span style="color:#6b7280;font-size:13px;">Items Subtotal</span>
          <span style="color:#2c2c2c;font-size:13px;">${formatCurrency(itemsSubtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin:6px 0;">
          <span style="color:#6b7280;font-size:13px;">Total Delivery</span>
          <span style="color:#2c2c2c;font-size:13px;">${formatCurrency(totalDelivery)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin:6px 0;">
          <span style="color:#6b7280;font-size:13px;">Total Cost</span>
          <span style="color:#dc2626;font-size:13px;">-${formatCurrency(totalCost)}</span>
        </div>
        <div style="height:1px;background:#e5e7eb;margin:12px 0;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#1a362d;font-weight:700;font-size:16px;">Order Total</span>
          <span style="color:#b87333;font-weight:800;font-size:24px;">${formatCurrency(data.total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin:8px 0 0 0;">
          <span style="color:#6b7280;font-size:12px;">Est. Profit</span>
          <span style="color:${estimatedProfit >= 0 ? '#059669' : '#dc2626'};font-weight:600;font-size:13px;">
            ${estimatedProfit >= 0 ? '+' : ''}${formatCurrency(estimatedProfit)}
          </span>
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align:center;margin-top:32px;">
        <a href="https://bushal.vercel.app/admin/orders/${data.orderId}" 
           style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
          View Order in Admin Panel →
        </a>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
        Received on ${new Date(data.createdAt).toLocaleString('en-BD', { dateStyle: 'full', timeStyle: 'short' })}
      </p>
    </div>
  </div>
</body>
</html>
    `

    const { error } = await resend.emails.send({
      from: `Bushal Orders <${fromEmail}>`,
      to: adminEmail,
      subject: `🛒 New Order #${data.orderId.slice(0, 8).toUpperCase()} — ${formatCurrency(data.total)} ${data.paymentMethod === 'cod' ? '(COD)' : ''}`,
      html: emailHtml,
      replyTo: data.customerEmail ?? undefined
    })

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Failed to send admin email:', err)
    return { success: false, error: err.message }
  }
}