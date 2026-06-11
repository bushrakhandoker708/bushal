// app/components/admin/AdminOrderDetail.tsx
'use client'

import { useState } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import Badge from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'
import ConfirmModal from '@/app/components/ui/ComfirmModal'

// Types matching your schema
interface OrderItemDetail {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  quantity: number
  unit_price: number
  cost_price: number | null
  delivery_charge: number | null
  subtotal: number
  item_profit: number
}

interface OrderAddress {
  division: string
  zilla: string
  upazilla: string
  detailed_address: string
  delivery_instructions?: string | null
}

interface OrderDetail {
  id: string
  user_id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  delivery_address: string | null        // legacy fallback
  delivery_address_obj: OrderAddress | null // structured from addresses table
  customer_note: string | null
  phone: string | null                     // order phone snapshot
  payment_method: string
  bkash_invoice: string | null
  total: number
  status: string
  delivery_status: string
  delivery_steps: any[]
  inventory_reduced: boolean
  created_at: string
  updated_at: string
  items: OrderItemDetail[]
}

interface Props {
  order: OrderDetail
  onStatusChange: (newStatus: string) => void
  onConfirm: () => void
  loading?: boolean
}

const STATUS_FLOW = [
  { key: 'order_placed', label: 'Order Placed', next: 'confirmed', variant: 'info' as const },
  { key: 'confirmed', label: 'Confirmed', next: 'processing', variant: 'copper' as const },
  { key: 'processing', label: 'Processing', next: 'shipped', variant: 'warning' as const },
  { key: 'shipped', label: 'Shipped', next: 'out_for_delivery', variant: 'copper' as const },
  { key: 'out_for_delivery', label: 'Out for Delivery', next: 'delivered', variant: 'warning' as const },
  { key: 'delivered', label: 'Delivered', next: null, variant: 'success' as const },
  { key: 'cancelled', label: 'Cancelled', next: null, variant: 'danger' as const },
] as const

export default function AdminOrderDetail({ order, onStatusChange, onConfirm, loading }: Props) {
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; action: string; label: string } | null>(null)

  const currentStatusIdx = STATUS_FLOW.findIndex(s => s.key === order.delivery_status)
  const currentStatus = STATUS_FLOW[currentStatusIdx]
  const canProgress = currentStatus?.next !== null && order.delivery_status !== 'cancelled'

  // Calculate totals
  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0)
  const totalCost = order.items.reduce((sum, item) => sum + ((item.cost_price ?? 0) * item.quantity), 0)
  const totalDelivery = order.items.reduce((sum, item) => sum + ((item.delivery_charge ?? 0) * item.quantity), 0)
  const totalProfit = itemsSubtotal - totalCost - totalDelivery

  // Parse address
  const parsedAddress = (() => {
    if (order.delivery_address_obj) return order.delivery_address_obj
    if (!order.delivery_address) return null
    // Try to parse legacy string format
    try { return JSON.parse(order.delivery_address) } catch { return null }
  })()

  const handleConfirmAction = () => {
    if (!confirmModal) return
    if (confirmModal.action === 'confirm') {
      onConfirm()
    } else {
      onStatusChange(confirmModal.action)
    }
    setConfirmModal(null)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bushal-surface rounded-2xl border border-bushal-border p-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-heading text-2xl font-bold text-bushal-forest">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <Badge variant={currentStatus?.variant ?? 'neutral'} dot>
              {currentStatus?.label ?? order.delivery_status}
            </Badge>
            {order.inventory_reduced && (
              <Badge variant="success" size="sm">Stock Deducted</Badge>
            )}
          </div>
          <p className="text-sm text-bushal-inkSoft">
            Placed on {new Date(order.created_at).toLocaleDateString('en-BD', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {order.delivery_status === 'order_placed' && !order.inventory_reduced && (
            <Button
              variant="copper"
              onClick={() => setConfirmModal({ open: true, action: 'confirm', label: 'Confirm Order & Deduct Stock' })}
              loading={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm Order
            </Button>
          )}
          
          {canProgress && (
            <Button
              variant="forest"
              onClick={() => setConfirmModal({ 
                open: true, 
                action: currentStatus.next!, 
                label: `Mark as ${STATUS_FLOW.find(s => s.key === currentStatus.next)?.label}` 
              })}
              loading={loading}
            >
              Next: {STATUS_FLOW.find(s => s.key === currentStatus.next)?.label}
            </Button>
          )}

          {order.delivery_status !== 'cancelled' && order.delivery_status !== 'delivered' && (
            <Button
              variant="outline"
              onClick={() => setConfirmModal({ open: true, action: 'cancelled', label: 'Cancel Order' })}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Order Items & Financials */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Items Table */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
            <div className="px-6 py-4 border-b border-bushal-border">
              <h2 className="font-heading text-lg font-semibold text-bushal-forest">Order Items</h2>
              <p className="text-xs text-bushal-inkSoft mt-0.5">{order.items.length} product{order.items.length !== 1 ? 's' : ''}</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bushal-ivoryDeep/50 text-bushal-inkSoft text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Product</th>
                    <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
                    <th className="text-right px-4 py-3 font-semibold">Qty</th>
                    <th className="text-right px-4 py-3 font-semibold">Delivery</th>
                    <th className="text-right px-6 py-3 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bushal-ivory">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-bushal-ivoryDeep/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-bushal-ivoryDeep border border-bushal-border overflow-hidden flex-shrink-0">
                            {item.product_image ? (
                              <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-bushal-ink truncate">{item.product_name}</p>
                            <p className="text-xs text-bushal-inkSoft">ID: {item.product_id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-medium text-bushal-ink">{formatPrice(item.unit_price)}</p>
                        {item.cost_price && (
                          <p className="text-xs text-bushal-inkSoft">Cost: {formatPrice(item.cost_price)}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-bushal-ivoryDeep font-bold text-bushal-forest">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.delivery_charge ? (
                          <span className="text-bushal-inkSoft">{formatPrice(item.delivery_charge)}</span>
                        ) : (
                          <span className="text-bushal-borderMid">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-bushal-forest">{formatPrice(item.subtotal)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-bushal-border px-6 py-5 bg-bushal-ivoryDeep/30">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-bushal-inkSoft">Items Subtotal</span>
                  <span className="font-medium">{formatPrice(itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-bushal-inkSoft">Total Cost</span>
                  <span className="font-medium text-bushal-danger">{formatPrice(totalCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-bushal-inkSoft">Delivery Charges</span>
                  <span className="font-medium">{formatPrice(totalDelivery)}</span>
                </div>
                <div className="h-px bg-bushal-border my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-bushal-forest">Order Total</span>
                  <span className="font-bold text-xl text-bushal-copper">{formatPrice(order.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-bushal-inkSoft">Est. Profit</span>
                  <span className={cn(
                    "font-semibold",
                    totalProfit >= 0 ? 'text-bushal-success' : 'text-bushal-danger'
                  )}>
                    {totalProfit >= 0 ? '+' : ''}{formatPrice(totalProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Timeline */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
            <h2 className="font-heading text-lg font-semibold text-bushal-forest mb-4">Delivery Timeline</h2>
            <div className="space-y-0">
              {order.delivery_steps.map((step: any, idx: number) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== order.delivery_steps.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-bushal-border" />
                  )}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                    idx === order.delivery_steps.length - 1 
                      ? 'bg-bushal-copper text-white' 
                      : 'bg-bushal-ivoryDeep text-bushal-inkSoft'
                  )}>
                    {idx + 1}
                  </div>
                  <div className="pb-6">
                    <p className="font-semibold text-bushal-ink">{step.label}</p>
                    <p className="text-xs text-bushal-inkSoft">
                      {new Date(step.timestamp).toLocaleString('en-BD')}
                    </p>
                  </div>
                </div>
              ))}
              {order.delivery_steps.length === 0 && (
                <p className="text-sm text-bushal-inkSoft">No updates yet</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Customer & Delivery Info */}
        <div className="space-y-6">
          
          {/* Customer Details */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
            <h2 className="font-heading text-lg font-semibold text-bushal-forest mb-4">Customer Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-bushal-inkSoft uppercase tracking-wider font-semibold mb-1">Name</p>
                <p className="text-sm font-medium text-bushal-ink">{order.customer_name ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-bushal-inkSoft uppercase tracking-wider font-semibold mb-1">Email</p>
                <p className="text-sm font-medium text-bushal-ink">{order.customer_email ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-bushal-inkSoft uppercase tracking-wider font-semibold mb-1">Phone (at checkout)</p>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <p className="text-sm font-bold text-bushal-forest">{order.phone ?? order.customer_phone ?? 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
            <h2 className="font-heading text-lg font-semibold text-bushal-forest mb-4">Delivery Address</h2>
            
            {parsedAddress ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-bushal-copper flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-bushal-ink">{parsedAddress.detailed_address}</p>
                    <p className="text-sm text-bushal-inkSoft">
                      {parsedAddress.upazilla}, {parsedAddress.zilla}, {parsedAddress.division}
                    </p>
                  </div>
                </div>
                
                {parsedAddress.delivery_instructions && (
                  <div className="mt-3 p-3 bg-bushal-copper/5 rounded-xl border border-bushal-copper/10">
                    <p className="text-xs font-semibold text-bushal-copper uppercase tracking-wider mb-1">Instructions</p>
                    <p className="text-sm text-bushal-inkMid italic">{parsedAddress.delivery_instructions}</p>
                  </div>
                )}
              </div>
            ) : order.delivery_address ? (
              <p className="text-sm text-bushal-ink">{order.delivery_address}</p>
            ) : (
              <p className="text-sm text-bushal-inkSoft italic">No address provided</p>
            )}
          </div>

          {/* Order Notes */}
          {order.customer_note && (
            <div className="bg-bushal-warningBg rounded-2xl border border-bushal-warning/20 p-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-bushal-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-xs font-bold text-bushal-warning uppercase tracking-wider">Customer Note</p>
              </div>
              <p className="text-sm text-bushal-ink">{order.customer_note}</p>
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
            <h2 className="font-heading text-lg font-semibold text-bushal-forest mb-4">Payment</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-bushal-inkSoft">Method</span>
                <Badge variant="copper" size="sm">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                </Badge>
              </div>
              {order.bkash_invoice && (
                <div className="flex justify-between">
                  <span className="text-sm text-bushal-inkSoft">bKash Invoice</span>
                  <span className="text-sm font-mono text-bushal-ink">{order.bkash_invoice}</span>
                </div>
              )}
              <div className="h-px bg-bushal-border" />
              <div className="flex justify-between">
                <span className="font-semibold text-bushal-forest">Total Paid</span>
                <span className="font-bold text-bushal-copper">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal?.open ?? false}
        onClose={() => setConfirmModal(null)}
        onConfirm={handleConfirmAction}
        title={confirmModal?.label ?? ''}
        description={
          confirmModal?.action === 'confirm' 
            ? 'This will deduct stock from inventory. Make sure all items are available before confirming.'
            : confirmModal?.action === 'cancelled'
            ? 'This will cancel the order. Stock will NOT be restored automatically.'
            : `Update order status to ${confirmModal?.label}?`
        }
        confirmLabel={confirmModal?.action === 'cancelled' ? 'Cancel Order' : 'Confirm'}
        variant={confirmModal?.action === 'cancelled' ? 'danger' : 'info'}
        loading={loading}
      />
    </div>
  )
}