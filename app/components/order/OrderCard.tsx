// components/order/OrderCard.tsx
'use client'

import Link from 'next/link'
import { cn } from '@/app/lib/utils/cn'
import Badge from '@/app/components/ui/Badge'
import { formatPrice } from '@/app/lib/utils/formatPrice'

type OrderStatus = 'order_placed' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'

interface OrderItem {
  id: string
  name: string
  image_url: string | null
  quantity: number
  price: number
}

interface Order {
  id: string
  status: OrderStatus
  created_at: string
  total: number
  items: OrderItem[]
}

const statusConfig: Record<OrderStatus, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'copper' }> = {
  order_placed:     { label: 'Placed',           variant: 'info' },
  confirmed:        { label: 'Confirmed',         variant: 'copper' },
  processing:       { label: 'Processing',        variant: 'warning' },
  shipped:          { label: 'Shipped',           variant: 'copper' },
  out_for_delivery: { label: 'Out for Delivery',  variant: 'warning' },
  delivered:        { label: 'Delivered',         variant: 'success' },
  cancelled:        { label: 'Cancelled',         variant: 'danger' },
}

export default function OrderCard({ order }: { order: Order }) {
  const config = statusConfig[order.status] ?? { label: order.status, variant: 'neutral' as const }
  const date = new Date(order.created_at).toLocaleDateString('en-BD', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const previewImages = order.items.slice(0, 3)

  return (
    <div className="bg-bushal-surface rounded-xl border border-bushal-border shadow-card hover:shadow-cardHover hover:border-bushal-borderMid transition-all duration-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-bushal-border">
        <div>
          <p className="text-[11px] text-bushal-inkSoft uppercase tracking-wide font-semibold mb-0.5">Order</p>
          <p className="text-sm font-mono font-semibold text-bushal-ink">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Badge variant={config.variant} dot>{config.label}</Badge>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          {previewImages.map((item, i) => (
            <div
              key={item.id}
              className={cn('w-12 h-12 rounded-lg border border-bushal-border bg-bushal-ivoryDeep overflow-hidden flex-shrink-0', i > 0 && '-ml-3 ring-2 ring-bushal-surface')}
            >
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="w-12 h-12 rounded-lg bg-bushal-ivory border border-bushal-border flex items-center justify-center -ml-3 ring-2 ring-bushal-surface flex-shrink-0">
              <span className="text-xs font-bold text-bushal-inkSoft">+{order.items.length - 3}</span>
            </div>
          )}
          <div className="ml-auto text-right">
            <p className="text-[11px] text-bushal-inkSoft">{date}</p>
            <p className="font-heading text-base font-bold text-bushal-forest">{formatPrice(order.total)}</p>
          </div>
        </div>

        <p className="text-xs text-bushal-inkSoft line-clamp-1 mb-4">
          {order.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
        </p>

        <Link
          href={`/orders/${order.id}`}
          className={cn(
            'block w-full text-center text-sm font-semibold py-2.5 rounded-lg border transition-all duration-150 active:scale-[0.97]',
            order.status === 'delivered'
              ? 'bg-bushal-successBg text-bushal-success border-bushal-success/20 hover:bg-bushal-success/15'
              : 'bg-bushal-ivory text-bushal-forest border-bushal-border hover:bg-bushal-ivoryDeep hover:border-bushal-forestLight'
          )}
        >
          {order.status === 'delivered' ? 'View Receipt' : 'Track Order'}
        </Link>
      </div>
    </div>
  )
}