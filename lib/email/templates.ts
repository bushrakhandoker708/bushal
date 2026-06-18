// lib/email/templates.ts
// 
// This file centralizes all HTML email templates for the Bushal application.
// Previously, massive blocks of inline HTML strings were scattered across
// API routes (orders, bkash callback, admin status updates). This made them
// unmaintainable and prone to breaking. By extracting them here, we ensure
// consistent branding, easier updates, and cleaner API route logic.
//
// BUG FIX: ADMIN EMAILS ON ORDER CONFIRMATION
// We have explicitly verified the email triggers. The admin notification 
// email (`adminOrderNotificationHtml`) is ONLY sent during initial order 
// creation (POST /api/orders for COD, and GET /api/bkash/callback for bKash).
// It is NEVER sent when an order status is updated to 'confirmed' or any 
// other status via PATCH routes. This prevents the admin from receiving 
// duplicate/spam emails every time they manually update an order's delivery 
// status in the dashboard. Status update emails are strictly sent to the 
// customer only (`customerStatusUpdateHtml`).

export interface OrderEmailItem {
  name: string;
  quantity: number;
  unitPrice: number;
  deliveryCharge?: number | null;
}

export interface AdminOrderEmailPayload {
  orderId: string;
  customerName: string | null;
  customerEmail: string | null;
  phone: string | null;
  total: number;
  paymentMethod: string;
  items: OrderEmailItem[];
  deliveryAddress?: string | null;
  customerNote?: string | null;
  bkashTrxId?: string | null;
}

export interface CustomerOrderEmailPayload {
  orderId: string;
  customerName: string | null;
  customerEmail: string;
  total: number;
  paymentMethod: string;
}

export interface CustomerStatusUpdatePayload {
  orderId: string;
  customerName: string | null;
  statusLabel: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

function buildItemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (item) => `
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
  `
    )
    .join('');

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
  `;
}

// ─── 1. ADMIN ORDER NOTIFICATION ───────────────────────────────────────────
/**
 * Sent ONLY when a new order is placed (COD or bKash).
 * NEVER sent when the admin manually confirms or updates the order status.
 */
export function adminOrderNotificationHtml(data: AdminOrderEmailPayload): string {
  const shortId = data.orderId.slice(0, 8).toUpperCase();
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/admin/orders/${data.orderId}`;

  return `
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
      <a href="${adminUrl}" style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        View Order in Admin Panel →
      </a>
    </div>
  </div>
</body></html>
  `;
}

// ─── 2. CUSTOMER ORDER CONFIRMATION ────────────────────────────────────────
/**
 * Sent to the customer immediately after they place an order.
 */
export function customerOrderConfirmationHtml(data: CustomerOrderEmailPayload): string {
  const shortId = data.orderId.slice(0, 8).toUpperCase();
  const ordersUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/orders`;
  const paymentLabel = data.paymentMethod === 'bkash' ? 'bKash' : 'Cash on Delivery';

  return `
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
      <a href="${ordersUrl}" style="display:inline-block;background:#1a362d;color:#f8f5f0;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Track My Order
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Bushal Team</p>
  </div>
</body></html>
  `;
}

// ─── 3. CUSTOMER STATUS UPDATE ─────────────────────────────────────────────
/**
 * Sent to the customer when the admin updates the order delivery status.
 * NOTE: This email is ONLY sent to the customer. The admin does NOT receive
 * an email when they manually update the status, preventing duplicate notifications.
 */
export function customerStatusUpdateHtml(data: CustomerStatusUpdatePayload): string {
  const shortId = data.orderId.slice(0, 8).toUpperCase();
  const ordersUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/orders`;

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h1 style="color:#ea580c;font-size:24px;margin-bottom:8px;">Bushal</h1>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
    <h2 style="color:#1e293b;font-size:18px;">Order Status Updated</h2>
    <p style="color:#475569;">Hi ${data.customerName ?? 'Customer'},</p>
    <p style="color:#475569;">Your order <strong>#${shortId}</strong> has been updated to:</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="font-size:20px;font-weight:bold;color:#1e293b;margin:0;">${data.statusLabel}</p>
    </div>
    <p style="color:#475569;">Track your order at <a href="${ordersUrl}" style="color:#ea580c;">bushal.com/orders</a>.</p>
    <p style="color:#94a3b8;font-size:13px;margin-top:32px;">— The Bushal Team</p>
  </div>
</body></html>
  `;
}