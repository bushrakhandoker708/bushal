// components/order/OrderCard.tsx
'use client'

import Link from 'next/link'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface OrderItem {
  id: string
  name: string
  image_url: string | null
  quantity: number
  price: number
}

interface Order {
  id: string
  status: string
  delivery_status: string
  total: number
  created_at: string
  items: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { 
    label: 'Pending', 
    color: 'text-bushal-copper', 
    bg: 'bg-bushal-copper/10', 
    border: 'border-bushal-copper/20' 
  },
  confirmed: { 
    label: 'Confirmed', 
    color: 'text-bushal-forest', 
    bg: 'bg-bushal-forest/10', 
    border: 'border-bushal-forest/20' 
  },
  processing: { 
    label: 'Processing', 
    color: 'text-bushal-warning', 
    bg: 'bg-bushal-warningBg', 
    border: 'border-bushal-warning/20' 
  },
  shipped: { 
    label: 'Shipped', 
    color: 'text-bushal-forest', 
    bg: 'bg-bushal-forest/10', 
    border: 'border-bushal-forest/20' 
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    color: 'text-bushal-warning', 
    bg: 'bg-bushal-warningBg', 
    border: 'border-bushal-warning/20' 
  },
  delivered: { 
    label: 'Delivered', 
    color: 'text-bushal-success', 
    bg: 'bg-bushal-successBg', 
    border: 'border-bushal-success/20' 
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'text-bushal-danger', 
    bg: 'bg-bushal-dangerBg', 
    border: 'border-bushal-danger/20' 
  },
}

export default function OrderCard({ order }: { order: Order }) {
  const status = order.delivery_status || order.status
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  
  const displayItems = order.items.slice(0, 2)
  const remainingCount = order.items.length - 2

  const formattedDate = new Date(order.created_at).toLocaleDateString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-5 transition-all duration-200 hover:shadow-cardHover hover:border-bushal-borderMid group">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-bushal-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-bushal-forest font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', config.bg, config.color, config.border)}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-bushal-inkSoft">Placed on {formattedDate}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-bushal-inkSoft mb-0.5">Total Amount</p>
          <p className="text-lg font-bold text-bushal-copper">{formatPrice(order.total)}</p>
        </div>
        <Link 
          href={`/orders/${order.id}`}
          className="sm:hidden w-full mt-2 text-center bg-bushal-ivoryDeep text-bushal-forest text-sm font-semibold py-2.5 rounded-xl hover:bg-bushal-border transition-colors"
        >
          View Details
        </Link>
      </div>

      {/* Items Preview */}
      <div className="space-y-3 mb-5">
        {displayItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-bushal-ivoryDeep border border-bushal-border overflow-hidden flex-shrink-0">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-bushal-ink truncate">{item.name}</p>
              <p className="text-xs text-bushal-inkSoft mt-0.5">
                Qty: {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
          </div>
        ))}
        
        {remainingCount > 0 && (
          <p className="text-xs text-bushal-inkSoft text-center py-1 bg-bushal-ivoryDeep rounded-lg">
            + {remainingCount} more item{remainingCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="hidden sm:flex items-center justify-end gap-3 pt-2">
        <Link 
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-bushal-forest hover:text-bushal-copper transition-colors px-4 py-2 rounded-xl hover:bg-bushal-ivoryDeep"
        >
          View Details
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}