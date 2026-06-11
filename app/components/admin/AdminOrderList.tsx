// app/components/admin/AdminOrderList.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import Badge from '@/app/components/ui/Badge'

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  products: { name: string; image_url: string | null }[] | null
}

interface Order {
  id: string
  total: number
  status: string
  delivery_status: string
  inventory_reduced: boolean
  created_at: string
  phone: string | null
  payment_method: string
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null
  order_items: OrderItem[]
}

const STATUS_VARIANTS: Record<string, 'info' | 'copper' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  order_placed: 'info',
  confirmed: 'copper',
  processing: 'warning',
  shipped: 'copper',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'danger'
}

const STATUS_ICONS: Record<string, string> = {
  order_placed: '📋',
  confirmed: '✅',
  processing: '⚙️',
  shipped: '📦',
  out_for_delivery: '🚚',
  delivered: '🎉',
  cancelled: '❌'
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Orders' },
  { value: 'order_placed', label: '📋 Placed' },
  { value: 'confirmed', label: '✅ Confirmed' },
  { value: 'processing', label: '⚙️ Processing' },
  { value: 'shipped', label: '📦 Shipped' },
  { value: 'out_for_delivery', label: '🚚 Out for Delivery' },
  { value: 'delivered', label: '🎉 Delivered' },
  { value: 'cancelled', label: '❌ Cancelled' },
]

export default function AdminOrderList({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? orders
    : orders.filter(o => o.delivery_status === filter)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const count = filter === 'all'
            ? orders.length
            : orders.filter(o => o.delivery_status === opt.value).length
          
          if (opt.value !== 'all' && count === 0 && filter !== opt.value) return null
          
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
                filter === opt.value
                  ? 'bg-bushal-forest text-white shadow-md shadow-bushal-forest/20'
                  : 'bg-bushal-surface border border-bushal-border text-bushal-inkSoft hover:border-bushal-borderMid hover:text-bushal-ink'
              )}
            >
              {opt.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-md',
                filter === opt.value ? 'bg-white/20 text-white' : 'bg-bushal-ivoryDeep text-bushal-inkSoft'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Order Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-bushal-surface rounded-2xl border border-dashed border-bushal-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-bushal-ivoryDeep flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <h3 className="text-lg font-semibold text-bushal-forest mb-1">No orders found</h3>
            <p className="text-sm text-bushal-inkSoft">
              {filter === 'all' ? 'No orders have been placed yet.' : `No orders with status "${filter.replace(/_/g, ' ')}".`}
            </p>
          </div>
        ) : (
          filtered.map((order) => {
            const firstItem = order.order_items?.[0]
            const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0
            
            return (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block bg-bushal-surface rounded-2xl border border-bushal-border p-5 hover:shadow-cardHover hover:border-bushal-borderMid transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-bushal-forest font-mono text-sm">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <Badge variant={STATUS_VARIANTS[order.delivery_status] ?? 'neutral'} dot>
                        {STATUS_ICONS[order.delivery_status]} {order.delivery_status.replace(/_/g, ' ')}
                      </Badge>
                      {!order.inventory_reduced && order.delivery_status === 'order_placed' && (
                        <Badge variant="warning" size="sm">Pending Confirm</Badge>
                      )}
                      {order.inventory_reduced && (
                        <Badge variant="success" size="sm">Stock Deducted</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-bushal-inkSoft flex-wrap">
                      <span className="font-medium text-bushal-ink">
                        {order.profiles?.full_name ?? 'Guest'}
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span className="flex items-center gap-1.5">
                        <span>📞</span>
                        {order.phone ?? order.profiles?.phone ?? 'No phone'}
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                    </div>
                    {firstItem && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-bushal-inkSoft">
                        <span className="truncate max-w-[200px] font-medium">
                          {firstItem.products?.[0]?.name ?? 'Unknown Product'}
                        </span>
                        {order.order_items.length > 1 && (
                          <span className="bg-bushal-ivoryDeep px-2 py-0.5 rounded-full text-[10px] font-bold">
                            +{order.order_items.length - 1} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 text-right flex-shrink-0">
                    <p className="text-xl font-bold text-bushal-copper">{formatPrice(order.total)}</p>
                    <p className="text-xs text-bushal-inkSoft">
                      {new Date(order.created_at).toLocaleDateString('en-BD', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    <Badge variant="copper" size="sm" className="mt-1">
                      {order.payment_method === 'cod' ? '💵 COD' : '💳 ' + order.payment_method?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}