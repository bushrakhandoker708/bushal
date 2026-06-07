// components/order/OrderTracking.tsx
'use client'

import { cn } from '@/app/lib/utils/cn'
import Badge from '@/app/components/ui/Badge'

type OrderStatus = 'order_placed' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'

const STEPS: { key: OrderStatus; label: string; description: string }[] = [
  { key: 'order_placed',      label: 'Order Placed',      description: 'We received your order' },
  { key: 'confirmed',         label: 'Confirmed',          description: 'Payment verified' },
  { key: 'processing',        label: 'Processing',         description: 'Being prepared for dispatch' },
  { key: 'shipped',           label: 'Shipped',            description: 'On its way to you' },
  { key: 'out_for_delivery',  label: 'Out for Delivery',   description: 'With delivery agent' },
  { key: 'delivered',         label: 'Delivered',          description: 'Enjoy your order!' },
]

const statusBadgeVariant: Record<OrderStatus, 'success' | 'danger' | 'warning' | 'info' | 'copper'> = {
  order_placed:     'info',
  confirmed:        'copper',
  processing:       'warning',
  shipped:          'copper',
  out_for_delivery: 'warning',
  delivered:        'success',
  cancelled:        'danger',
}

interface Props {
  currentStatus: OrderStatus
  orderId?: string
  estimatedDelivery?: string
}

export default function OrderTracking({ currentStatus, orderId, estimatedDelivery }: Props) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-bushal-surface rounded-xl border border-bushal-danger/20 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-bushal-dangerBg flex items-center justify-center">
            <svg className="w-5 h-5 text-bushal-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-heading font-semibold text-bushal-danger">Order Cancelled</p>
            {orderId && <p className="text-xs text-bushal-inkSoft">#{orderId}</p>}
          </div>
        </div>
        <p className="text-sm text-bushal-inkSoft">This order was cancelled. Refund will be processed within 3–5 business days.</p>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus)
  const visibleSteps = STEPS

  return (
    <div className="bg-bushal-surface rounded-xl border border-bushal-border shadow-card p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-heading font-semibold text-bushal-forest text-lg">Delivery Status</h3>
          {orderId && <p className="text-xs text-bushal-inkSoft mt-0.5">Order #{orderId}</p>}
        </div>
        <Badge variant={statusBadgeVariant[currentStatus]} dot>
          {STEPS[currentIndex]?.label ?? currentStatus}
        </Badge>
      </div>

      {estimatedDelivery && (
        <div className="flex items-center gap-2 bg-bushal-successBg rounded-lg px-3 py-2 mb-5 border border-bushal-success/20">
          <svg className="w-4 h-4 text-bushal-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs font-semibold text-bushal-success">Est. delivery: {estimatedDelivery}</p>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-bushal-border" />
        <div
          className="absolute left-[17px] top-3 w-0.5 bg-bushal-success transition-all duration-700"
          style={{ height: currentIndex > 0 ? `${(currentIndex / (visibleSteps.length - 1)) * 100}%` : '0%' }}
        />

        <div className="space-y-6">
          {visibleSteps.map((step, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                <div className={cn(
                  'relative z-10 w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-500',
                  isCompleted && 'bg-bushal-success border-bushal-success text-white',
                  isCurrent && 'bg-bushal-surface border-bushal-copper text-bushal-copper ring-4 ring-bushal-copper/15',
                  isPending && 'bg-bushal-surface border-bushal-border text-bushal-borderMid',
                )}>
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[11px] font-bold">{index + 1}</span>
                  )}
                </div>

                <div className="pt-1.5">
                  <p className={cn(
                    'text-sm font-semibold transition-colors',
                    (isCompleted || isCurrent) ? 'text-bushal-ink' : 'text-bushal-inkSoft/50'
                  )}>
                    {step.label}
                  </p>
                  <p className={cn(
                    'text-xs mt-0.5 transition-colors',
                    isCurrent ? 'text-bushal-inkSoft' : isPending ? 'text-bushal-inkSoft/40' : 'text-bushal-inkSoft'
                  )}>
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}