// app/components/admin/AdminOrdersClient.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { formatDate } from '@/app/lib/utils/formatDate'
import { cn } from '@/app/lib/utils/cn'

const DELIVERY_STEPS = [
  { key: 'order_placed',     label: 'Order Placed',      icon: '📋', color: 'bg-bushal-ivoryDeep text-bushal-inkMid border-bushal-border' },
  { key: 'confirmed',        label: 'Confirmed',         icon: '✅', color: 'bg-bushal-copper/10 text-bushal-copper border-bushal-copper/20' },
  { key: 'processing',       label: 'Processing',        icon: '⚙️', color: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20' },
  { key: 'shipped',          label: 'Shipped',           icon: '📦', color: 'bg-bushal-forest/10 text-bushal-forest border-bushal-forest/20' },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: '🚚', color: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20' },
  { key: 'delivered',        label: 'Delivered',         icon: '🎉', color: 'bg-bushal-successBg text-bushal-success border-bushal-success/20' },
  { key: 'cancelled',        label: 'Cancelled',         icon: '❌', color: 'bg-bushal-dangerBg text-bushal-danger border-bushal-danger/20' },
]

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  products: { name: string; image_url: string | null; images: string[] | null } | null
}

interface Order {
  id: string
  total: number
  status: string
  delivery_status: string
  delivery_steps: any[]
  bkash_trx_id: string | null
  bkash_invoice: string | null
  created_at: string
  user_id: string
  delivery_address: string | null
  phone: string | null
  customer_note: string | null
  order_items: OrderItem[]
  customer: { full_name: string | null; email: string | null; phone: string | null }
}

function StatusBadge({ status }: { status: string }) {
  const step = DELIVERY_STEPS.find((s) => s.key === status)
  if (!step) return <span className="text-xs text-bushal-inkSoft">{status}</span>
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', step.color)}>
      {step.icon} {step.label}
    </span>
  )
}

interface OrderRowProps {
  order: Order
  onUpdateStatus: (orderId: string, status: string) => Promise<void>
}

function OrderRow({ order, onUpdateStatus }: OrderRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(order.delivery_status ?? 'order_placed')
  
  const items = order.order_items ?? []
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  const firstImg = items[0]?.products
    ? (Array.isArray(items[0].products.images) && items[0].products.images[0]) || items[0].products.image_url
    : null

  const handleUpdate = async () => {
    setUpdating(true)
    await onUpdateStatus(order.id, selectedStatus)
    setUpdating(false)
  }

  return (
    <>
      {/* Main row */}
      <tr
        className="hover:bg-bushal-ivoryDeep/50 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0">
              {firstImg ? (
                <img src={firstImg} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-bushal-borderMid text-xs">📦</div>
              )}
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-bushal-ink">#{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-[11px] text-bushal-inkSoft mt-0.5">{formatDate(order.created_at)}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 hidden sm:table-cell">
          <p className="text-sm font-semibold text-bushal-ink">{order.customer.full_name ?? '—'}</p>
          <p className="text-xs text-bushal-inkSoft truncate max-w-[180px]">{order.customer.email ?? '—'}</p>
        </td>
        <td className="px-4 py-3.5">
          <p className="text-sm font-bold text-bushal-forest">{formatPrice(order.total)}</p>
          <p className="text-[11px] text-bushal-inkSoft">{totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''}</p>
        </td>
        <td className="px-4 py-3.5">
          <StatusBadge status={order.delivery_status ?? 'order_placed'} />
        </td>
        <td className="px-4 py-3.5 hidden lg:table-cell">
          <span className="text-xs font-mono text-bushal-inkSoft">{order.bkash_trx_id ?? '—'}</span>
        </td>
        <td className="px-4 py-3.5">
          <svg
            className={cn('w-4 h-4 text-bushal-inkSoft transition-transform duration-200', expanded && 'rotate-180')}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>

      {/* Expanded panel */}
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 pb-5 pt-0">
            <div className="bg-bushal-ivoryDeep rounded-xl border border-bushal-border p-4 sm:p-5 space-y-5 animate-fade-in">
              
              {/* 1. Customer & Payment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Customer</p>
                  <p className="font-semibold text-bushal-ink">{order.customer.full_name ?? 'Unknown'}</p>
                  <p className="text-bushal-inkSoft text-xs">{order.customer.email ?? '—'}</p>
                  {order.customer.phone && <p className="text-bushal-inkSoft text-xs mt-0.5">{order.customer.phone}</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Payment</p>
                  <p className="text-xs text-bushal-ink">
                    bKash TxID: <span className="font-mono">{order.bkash_trx_id ?? '—'}</span>
                  </p>
                  <p className="text-xs text-bushal-ink mt-0.5">
                    Invoice: <span className="font-mono">{order.bkash_invoice ?? '—'}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Order Total</p>
                  <p className="text-lg font-bold text-bushal-forest">{formatPrice(order.total)}</p>
                </div>
              </div>

              {/* 2. Delivery Details (Address, Phone, Notes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-4 border-t border-bushal-border">
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Delivery Address</p>
                  <p className="text-sm text-bushal-ink leading-relaxed">{order.delivery_address || 'No address provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Contact Phone</p>
                  <p className="text-sm text-bushal-ink font-medium">{order.phone || order.customer.phone || 'No phone provided'}</p>
                </div>
                {order.customer_note && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Delivery Instructions</p>
                    <p className="text-sm text-bushal-ink italic bg-bushal-surface p-3 rounded-lg border border-bushal-border">
                      "{order.customer_note}"
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Order Items */}
              <div>
                <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-2.5">
                  Ordered Products ({totalItemsCount} total)
                </p>
                <div className="space-y-2">
                  {items.map((item) => {
                    const img = item.products 
                      ? (Array.isArray(item.products.images) && item.products.images[0]) || item.products.image_url 
                      : null
                    return (
                      <div key={item.id} className="flex items-center gap-3 bg-bushal-surface rounded-lg px-3 py-2.5 border border-bushal-border">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-bushal-ivoryDeep flex-shrink-0">
                          {img ? (
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-bushal-ivoryDeep flex items-center justify-center text-bushal-borderMid text-[10px]">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-bushal-ink truncate">{item.products?.name ?? 'Unknown Product'}</p>
                          <p className="text-xs text-bushal-inkSoft">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                        </div>
                        <p className="text-sm font-bold text-bushal-forest flex-shrink-0">
                          {formatPrice(item.quantity * item.unit_price)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 4. Delivery Status Updater */}
              <div>
                <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-2.5">Update Delivery Status</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {DELIVERY_STEPS.map((step) => (
                    <button
                      key={step.key}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedStatus(step.key) }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                        selectedStatus === step.key
                          ? 'bg-bushal-copper text-white border-bushal-copper shadow-md shadow-bushal-copper/20'
                          : step.color + ' opacity-70 hover:opacity-100'
                      )}
                    >
                      {step.icon} {step.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleUpdate() }}
                  disabled={updating || selectedStatus === (order.delivery_status ?? 'order_placed')}
                  className="inline-flex items-center gap-2 bg-bushal-copper text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-bushal-copperLight disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-bushal-copper/20"
                >
                  {updating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Status
                    </>
                  )}
                </button>
              </div>

              {/* 5. Delivery Timeline */}
              {Array.isArray(order.delivery_steps) && order.delivery_steps.length > 0 && (
                <div className="pt-4 border-t border-bushal-border">
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-2.5">Timeline</p>
                  <div className="space-y-3">
                    {[...order.delivery_steps].reverse().map((step: any, i: number) => {
                      const s = DELIVERY_STEPS.find((ds) => ds.key === step.status)
                      return (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className="text-base mt-0.5">{s?.icon ?? '📦'}</span>
                          <div>
                            <p className="font-semibold text-bushal-ink">{s?.label ?? step.status}</p>
                            <p className="text-xs text-bushal-inkSoft">{formatDate(step.timestamp)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

interface Props {
  orders: Order[]
}

export default function AdminOrdersClient({ orders }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [localOrders, setLocalOrders] = useState(orders)

  const filtered = useMemo(() => {
    let list = [...localOrders]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customer.full_name ?? '').toLowerCase().includes(q) ||
        (o.customer.email ?? '').toLowerCase().includes(q) ||
        (o.bkash_trx_id ?? '').toLowerCase().includes(q) ||
        (o.phone ?? '').toLowerCase().includes(q) ||
        (o.delivery_address ?? '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((o) => (o.delivery_status ?? 'order_placed') === statusFilter)
    }
    return list
  }, [localOrders, search, statusFilter])

  const handleUpdateStatus = async (orderId: string, status: string) => {
    const res = await fetch(`/api/orders/${orderId}/delivery`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_status: status }),
    })
    if (res.ok) {
      const data = await res.json()
      setLocalOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, delivery_status: data.delivery_status, delivery_steps: data.delivery_steps }
            : o
        )
      )
    }
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const o of localOrders) {
      const k = o.delivery_status ?? 'order_placed'
      counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
  }, [localOrders])

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-bushal-forest">Orders</h1>
          <p className="text-sm text-bushal-inkSoft mt-0.5">
            {filtered.length} of {localOrders.length} total
          </p>
        </div>
      </div>

      {/* Status quick-filter pills */}
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex-shrink-0',
            statusFilter === 'all'
              ? 'bg-bushal-forest text-white border-bushal-forest'
              : 'bg-bushal-surface text-bushal-inkMid border-bushal-border hover:border-bushal-borderMid'
          )}
        >
          All ({localOrders.length})
        </button>
        {DELIVERY_STEPS.map((step) => {
          const count = statusCounts[step.key] ?? 0
          if (count === 0) return null
          return (
            <button
              key={step.key}
              onClick={() => setStatusFilter(step.key)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex-shrink-0',
                statusFilter === step.key
                  ? 'bg-bushal-copper text-white border-bushal-copper'
                  : step.color + ' hover:opacity-100 opacity-80'
              )}
            >
              {step.icon} {step.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by ID, name, email, phone, address or bKash TxID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-bushal-border bg-bushal-surface text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-bushal-ivoryDeep border-b border-bushal-border">
                <th className="px-4 py-3 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Order</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wide hidden sm:table-cell">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wide hidden lg:table-cell">bKash</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bushal-ivoryDeep">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-bushal-inkSoft text-sm">
                    No orders found
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <OrderRow key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}