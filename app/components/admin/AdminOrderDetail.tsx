// app/components/admin/AdminOrderDetail.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import Badge from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'
import ConfirmModal from '@/app/components/ui/ComfirmModal'

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderItemDetail {
  id: string
  product_id: string
  product_name?: string | null
  name?: string | null
  product_image?: string | null
  image_url?: string | null
  quantity: number
  unit_price: number
  cost_price?: number | null
  delivery_charge?: number | null
  subtotal: number
  item_profit?: number | null
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
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  delivery_address?: string | null
  delivery_address_obj?: OrderAddress | null
  customer_note?: string | null
  phone?: string | null
  payment_method: string
  bkash_invoice?: string | null
  bkash_trx_id?: string | null
  total: number
  status: string
  delivery_status: string
  delivery_steps: any[]
  inventory_reduced?: boolean
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveItemName(item: OrderItemDetail): string {
  return item.product_name || item.name || 'Product Unavailable'
}

function resolveItemImage(item: OrderItemDetail): string | null {
  return item.product_image || item.image_url || null
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_FLOW = [
  {
    key: 'order_placed',
    label: 'Order Placed',
    next: 'confirmed',
    variant: 'info' as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    next: 'processing',
    variant: 'copper' as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    key: 'processing',
    label: 'Processing',
    next: 'shipped',
    variant: 'warning' as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'shipped',
    label: 'Shipped',
    next: 'out_for_delivery',
    variant: 'copper' as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    next: 'delivered',
    variant: 'warning' as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  {
    key: 'delivered',
    label: 'Delivered',
    next: null,
    variant: 'success' as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    next: null,
    variant: 'danger' as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
] as const

// ─── Micro-interaction: Stat Card ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = false,
  danger = false,
  delay = 0,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  danger?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-xl border p-4 transition-shadow duration-200 hover:shadow-md',
        accent
          ? 'border-bushal-copper/25 bg-gradient-to-br from-bushal-copper/8 to-bushal-copper/3'
          : danger
          ? 'border-bushal-danger/20 bg-gradient-to-br from-bushal-danger/5 to-transparent'
          : 'border-bushal-border bg-bushal-surface'
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-inkSoft mb-1.5">{label}</p>
      <p className={cn(
        'font-heading text-xl font-bold tabular-nums leading-none',
        accent ? 'text-bushal-copper' : danger ? 'text-bushal-danger' : 'text-bushal-forest'
      )}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-bushal-inkSoft">{sub}</p>}
    </motion.div>
  )
}

// ─── Product Image with fallback ──────────────────────────────────────────────

function ProductThumb({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = useState(false)
  const resolved = (!errored && src) ? src : null

  return (
    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-bushal-border bg-bushal-ivoryDeep flex-shrink-0 group-hover:border-bushal-copper/30 transition-colors duration-200">
      {resolved ? (
        <img
          src={resolved}
          alt={alt}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-5 h-5 text-bushal-borderMid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Section Card Wrapper ─────────────────────────────────────────────────────

function Card({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

function CardHeader({ title, sub, icon }: { title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-bushal-border/60 bg-gradient-to-r from-bushal-ivoryDeep/50 to-bushal-surface">
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bushal-copper/10 ring-1 ring-bushal-copper/20 text-bushal-copper">
          {icon}
        </div>
      )}
      <div>
        <h2 className="font-heading text-sm font-bold tracking-tight text-bushal-forest">{title}</h2>
        {sub && <p className="text-[11px] text-bushal-inkSoft mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Status Progress Bar ──────────────────────────────────────────────────────

function StatusProgress({ currentStatus }: { currentStatus: string }) {
  const mainFlow = STATUS_FLOW.filter(s => s.key !== 'cancelled')
  const cancelledStep = STATUS_FLOW.find(s => s.key === 'cancelled')!
  const isCancelled = currentStatus === 'cancelled'
  const activeIdx = mainFlow.findIndex(s => s.key === currentStatus)

  return (
    <div className="px-6 py-5 border-b border-bushal-border/60">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {isCancelled ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-bushal-danger/25 bg-bushal-dangerBg px-3 py-2">
              <span className="text-bushal-danger">{cancelledStep.icon}</span>
              <span className="text-xs font-bold text-bushal-danger">Order Cancelled</span>
            </div>
          </div>
        ) : (
          mainFlow.map((step, idx) => {
            const isDone = idx < activeIdx
            const isActive = idx === activeIdx
            const isFuture = idx > activeIdx

            return (
              <div key={step.key} className="flex items-center gap-1 shrink-0">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all duration-200',
                    isActive
                      ? 'bg-bushal-copper text-white shadow-sm shadow-bushal-copper/30'
                      : isDone
                      ? 'bg-bushal-success/10 text-bushal-success border border-bushal-success/20'
                      : 'bg-bushal-ivoryDeep text-bushal-inkSoft border border-bushal-border'
                  )}
                >
                  {isDone ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={cn('transition-colors', isActive ? 'text-white' : '')}>{step.icon}</span>
                  )}
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wide whitespace-nowrap hidden sm:block',
                    isActive ? 'text-white' : ''
                  )}>
                    {step.label}
                  </span>
                </motion.div>
                {idx < mainFlow.length - 1 && (
                  <div className={cn(
                    'h-px w-4 shrink-0 transition-colors duration-500',
                    idx < activeIdx ? 'bg-bushal-success/40' : 'bg-bushal-border'
                  )} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOrderDetail({ order, onStatusChange, onConfirm, loading }: Props) {
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    action: string
    label: string
    description: string
    variant: 'danger' | 'info'
  } | null>(null)

  const [copiedId, setCopiedId] = useState(false)

  const currentStatusIdx = STATUS_FLOW.findIndex(s => s.key === order.delivery_status)
  const currentStatus = STATUS_FLOW[currentStatusIdx]
  const canProgress = currentStatus?.next !== null && order.delivery_status !== 'cancelled'
  const nextStatus = STATUS_FLOW.find(s => s.key === currentStatus?.next)

  // Computed financials
  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0)
  const totalCost = order.items.reduce((sum, item) => sum + ((item.cost_price ?? 0) * item.quantity), 0)
  const totalDelivery = order.items.reduce((sum, item) => sum + ((item.delivery_charge ?? 0) * item.quantity), 0)
  const totalProfit = itemsSubtotal - totalCost - totalDelivery
  const profitMargin = itemsSubtotal > 0 ? (totalProfit / itemsSubtotal) * 100 : 0

  // Parse address — handles both structured and legacy string formats
  const parsedAddress = (() => {
    if (order.delivery_address_obj) return order.delivery_address_obj
    if (!order.delivery_address) return null
    try { return JSON.parse(order.delivery_address) as OrderAddress } catch { return null }
  })()

  const copyOrderId = async () => {
    await navigator.clipboard.writeText(order.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleConfirmAction = () => {
    if (!confirmModal) return
    if (confirmModal.action === 'confirm') {
      onConfirm()
    } else {
      onStatusChange(confirmModal.action)
    }
    setConfirmModal(null)
  }

  const shortId = order.id.slice(0, 8).toUpperCase()

  return (
    <div className="space-y-5">

      {/* ── Order Header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-bushal-border bg-bushal-surface overflow-hidden"
      >
        {/* Top row: ID, badge, actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-start gap-4">
            {/* Order icon mark */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bushal-copper/10 ring-1 ring-bushal-copper/20">
              <svg className="w-5 h-5 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-heading text-xl font-bold text-bushal-forest">
                  Order #{shortId}
                </h1>
                <button
                  onClick={copyOrderId}
                  title="Copy full order ID"
                  className="flex items-center gap-1 rounded-md border border-bushal-border px-2 py-0.5 text-[10px] font-medium text-bushal-inkSoft hover:border-bushal-copper/40 hover:text-bushal-copper transition-all duration-150"
                >
                  <AnimatePresence mode="wait">
                    {copiedId ? (
                      <motion.span key="copied" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-bushal-success flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </motion.span>
                    ) : (
                      <motion.span key="copy" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy ID
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <Badge variant={currentStatus?.variant ?? 'neutral'} dot>
                  {currentStatus?.label ?? order.delivery_status}
                </Badge>
                {order.inventory_reduced && (
                  <Badge variant="success" size="sm">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Stock Deducted
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-bushal-inkSoft">
                Placed on{' '}
                <span className="font-medium text-bushal-ink">
                  {new Date(order.created_at).toLocaleDateString('en-BD', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
                {' '}at{' '}
                <span className="font-medium text-bushal-ink">
                  {new Date(order.created_at).toLocaleTimeString('en-BD', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {order.delivery_status === 'order_placed' && !order.inventory_reduced && (
              <Button
                variant="copper"
                onClick={() => setConfirmModal({
                  open: true,
                  action: 'confirm',
                  label: 'Confirm Order',
                  description: 'This will deduct stock from inventory. Verify all items are available before confirming.',
                  variant: 'info',
                })}
                loading={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Order
              </Button>
            )}

            {canProgress && nextStatus && (
              <Button
                variant="forest"
                onClick={() => setConfirmModal({
                  open: true,
                  action: currentStatus.next!,
                  label: `Mark as ${nextStatus.label}`,
                  description: `Update delivery status to "${nextStatus.label}". This will notify the customer.`,
                  variant: 'info',
                })}
                loading={loading}
              >
                <span className="flex items-center gap-1.5">
                  {nextStatus.icon}
                  {nextStatus.label}
                </span>
              </Button>
            )}

            {order.delivery_status !== 'cancelled' && order.delivery_status !== 'delivered' && (
              <button
                onClick={() => setConfirmModal({
                  open: true,
                  action: 'cancelled',
                  label: 'Cancel Order',
                  description: 'This will cancel the order. Stock will NOT be automatically restored.',
                  variant: 'danger',
                })}
                className="rounded-xl border border-bushal-border px-4 py-2.5 text-sm font-semibold text-bushal-inkMid transition-all duration-150 hover:border-bushal-danger/40 hover:bg-bushal-dangerBg hover:text-bushal-danger"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Status progress strip */}
        <StatusProgress currentStatus={order.delivery_status} />

        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-bushal-border/60 border-t border-bushal-border/60">
          {[
            { label: 'Order Total', value: formatPrice(order.total), accent: true },
            { label: 'Items', value: `${order.items.length} product${order.items.length !== 1 ? 's' : ''}` },
            { label: 'Est. Profit', value: formatPrice(totalProfit), danger: totalProfit < 0 },
            { label: 'Margin', value: `${profitMargin.toFixed(1)}%`, danger: profitMargin < 0 },
          ].map((s, i) => (
            <div key={s.label} className="px-5 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-inkSoft">{s.label}</p>
              <p className={cn(
                'font-heading text-base font-bold tabular-nums mt-0.5',
                s.accent ? 'text-bushal-copper' : s.danger ? 'text-bushal-danger' : 'text-bushal-forest'
              )}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT col */}
        <div className="lg:col-span-2 space-y-5">

          {/* Order Items */}
          <Card delay={0.05}>
            <CardHeader
              title="Order Items"
              sub={`${order.items.length} product${order.items.length !== 1 ? 's' : ''}`}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
            />

            <div className="divide-y divide-bushal-border/50">
              {order.items.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-sm text-bushal-inkSoft">No items found in this order</p>
                </div>
              ) : (
                order.items.map((item, idx) => {
                  const name = resolveItemName(item)
                  const image = resolveItemImage(item)
                  const lineTotal = item.subtotal
                  const costTotal = (item.cost_price ?? 0) * item.quantity
                  const lineProfit = lineTotal - costTotal - ((item.delivery_charge ?? 0) * item.quantity)

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.08 + idx * 0.04 }}
                      className="group flex items-start gap-4 px-6 py-4 hover:bg-bushal-ivoryDeep/40 transition-colors duration-150"
                    >
                      <ProductThumb src={image} alt={name} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-bushal-ink text-sm leading-snug">{name}</p>
                            <p className="text-[11px] text-bushal-inkSoft mt-0.5 font-mono">
                              ID: {item.product_id.slice(0, 12)}…
                            </p>
                          </div>
                          <p className="font-bold text-bushal-forest shrink-0">{formatPrice(lineTotal)}</p>
                        </div>

                        {/* Item metrics row */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-bushal-ivoryDeep border border-bushal-border px-2.5 py-1 text-[11px] font-semibold text-bushal-forest">
                            <svg className="w-3 h-3 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            {item.quantity} × {formatPrice(item.unit_price)}
                          </span>

                          {item.cost_price != null && item.cost_price > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-bushal-dangerBg border border-bushal-danger/15 px-2.5 py-1 text-[11px] text-bushal-danger">
                              Cost: {formatPrice(item.cost_price)}
                            </span>
                          )}

                          {item.delivery_charge != null && item.delivery_charge > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-bushal-ivoryDeep border border-bushal-border px-2.5 py-1 text-[11px] text-bushal-inkSoft">
                              +{formatPrice(item.delivery_charge)} delivery
                            </span>
                          )}

                          {(item.cost_price ?? 0) > 0 && (
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold',
                              lineProfit >= 0
                                ? 'bg-bushal-successBg border-bushal-success/20 text-bushal-success'
                                : 'bg-bushal-dangerBg border-bushal-danger/20 text-bushal-danger'
                            )}>
                              {lineProfit >= 0 ? '+' : ''}{formatPrice(lineProfit)} profit
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>

            {/* Financial footer */}
            <div className="border-t border-bushal-border/60 bg-bushal-ivoryDeep/30 px-6 py-5">
              <div className="space-y-2 ml-auto max-w-sm">
                {[
                  { label: 'Items subtotal', value: formatPrice(itemsSubtotal) },
                  ...(totalCost > 0 ? [{ label: 'Total cost (supplier)', value: formatPrice(totalCost), danger: true }] : []),
                  ...(totalDelivery > 0 ? [{ label: 'Total delivery charges', value: formatPrice(totalDelivery) }] : []),
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-bushal-inkSoft">{row.label}</span>
                    <span className={cn('font-medium tabular-nums', (row as any).danger ? 'text-bushal-danger' : 'text-bushal-ink')}>
                      {row.value}
                    </span>
                  </div>
                ))}

                <div className="h-px bg-bushal-border/80 my-1" />

                <div className="flex items-center justify-between">
                  <span className="font-bold text-bushal-forest text-sm">Order Total</span>
                  <span className="font-heading text-xl font-bold text-bushal-copper tabular-nums">
                    {formatPrice(order.total)}
                  </span>
                </div>

                {totalCost > 0 && (
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-bushal-inkSoft">Est. profit</span>
                    <span className={cn(
                      'font-bold tabular-nums',
                      totalProfit >= 0 ? 'text-bushal-success' : 'text-bushal-danger'
                    )}>
                      {totalProfit >= 0 ? '+' : ''}{formatPrice(totalProfit)}
                      {' '}
                      <span className="text-[10px] font-normal opacity-70">({profitMargin.toFixed(1)}%)</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Delivery Timeline */}
          <Card delay={0.1}>
            <CardHeader
              title="Delivery Timeline"
              sub={`${order.delivery_steps.length} update${order.delivery_steps.length !== 1 ? 's' : ''}`}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <div className="p-6">
              {order.delivery_steps.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-bushal-border px-4 py-5 text-sm text-bushal-inkSoft">
                  <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  No delivery updates recorded yet.
                </div>
              ) : (
                <div className="space-y-0">
                  {order.delivery_steps.map((step: any, idx: number) => {
                    const isLast = idx === order.delivery_steps.length - 1
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: 0.1 + idx * 0.05 }}
                        className="flex gap-4 relative"
                      >
                        {!isLast && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-bushal-border/60" />
                        )}
                        <div className={cn(
                          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5',
                          isLast
                            ? 'bg-bushal-copper text-white shadow-sm shadow-bushal-copper/30 ring-4 ring-bushal-copper/10'
                            : 'bg-bushal-ivoryDeep border border-bushal-border text-bushal-inkSoft'
                        )}>
                          {isLast ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="pb-6 flex-1">
                          <p className={cn(
                            'text-sm font-semibold leading-tight',
                            isLast ? 'text-bushal-copper' : 'text-bushal-ink'
                          )}>
                            {step.label ?? step.status ?? `Step ${idx + 1}`}
                          </p>
                          <p className="text-[11px] text-bushal-inkSoft mt-0.5">
                            {new Date(step.timestamp).toLocaleString('en-BD', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                          {step.note && (
                            <p className="mt-1 text-xs text-bushal-inkSoft italic">{step.note}</p>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT col */}
        <div className="space-y-5">

          {/* Customer */}
          <Card delay={0.07}>
            <CardHeader
              title="Customer"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <div className="p-5 space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bushal-copper/20 to-bushal-copper/5 ring-1 ring-bushal-copper/20 text-bushal-copper font-bold text-sm">
                  {(order.customer_name ?? order.customer_email ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-bushal-ink text-sm truncate">{order.customer_name ?? 'Unknown Customer'}</p>
                  <p className="text-[11px] text-bushal-inkSoft truncate">{order.customer_email ?? '—'}</p>
                </div>
              </div>

              <div className="h-px bg-bushal-border/60" />

              {/* Phone */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-bushal-inkSoft mb-1.5">Phone</p>
                {(order.phone ?? order.customer_phone) ? (
                  <a
                    href={`tel:${order.phone ?? order.customer_phone}`}
                    className="flex items-center gap-2 text-sm font-semibold text-bushal-forest hover:text-bushal-copper transition-colors duration-150"
                  >
                    <svg className="w-4 h-4 text-bushal-copper shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {order.phone ?? order.customer_phone}
                  </a>
                ) : (
                  <p className="text-sm text-bushal-inkSoft italic">Not provided</p>
                )}
              </div>

              {/* User ID */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-bushal-inkSoft mb-1">User ID</p>
                <p className="text-[11px] font-mono text-bushal-inkSoft truncate">{order.user_id}</p>
              </div>
            </div>
          </Card>

          {/* Delivery Address */}
          <Card delay={0.1}>
            <CardHeader
              title="Delivery Address"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <div className="p-5">
              {parsedAddress ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-bushal-border bg-bushal-ivoryDeep/50 p-3.5">
                    <p className="text-sm font-semibold text-bushal-ink leading-snug">
                      {parsedAddress.detailed_address}
                    </p>
                    <p className="mt-1 text-xs text-bushal-inkSoft">
                      {[parsedAddress.upazilla, parsedAddress.zilla, parsedAddress.division]
                        .filter(Boolean).join(', ')}
                    </p>
                  </div>

                  {parsedAddress.delivery_instructions && (
                    <div className="rounded-xl border border-bushal-copper/15 bg-bushal-copper/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-bushal-copper mb-1">
                        Delivery Note
                      </p>
                      <p className="text-xs text-bushal-inkMid italic leading-relaxed">
                        {parsedAddress.delivery_instructions}
                      </p>
                    </div>
                  )}
                </div>
              ) : order.delivery_address ? (
                <p className="text-sm text-bushal-ink leading-relaxed">{order.delivery_address}</p>
              ) : (
                <p className="text-sm text-bushal-inkSoft italic">No address provided</p>
              )}
            </div>
          </Card>

          {/* Customer Note */}
          <AnimatePresence>
            {order.customer_note && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.13 }}
                className="rounded-2xl border border-bushal-warning/25 bg-bushal-warningBg overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bushal-warning/15">
                    <svg className="w-3.5 h-3.5 text-bushal-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-bushal-warning">Customer Note</p>
                </div>
                <p className="px-5 pb-4 text-sm text-bushal-ink leading-relaxed">{order.customer_note}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Payment */}
          <Card delay={0.14}>
            <CardHeader
              title="Payment"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
            />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-bushal-inkSoft">Method</span>
                <Badge variant="copper" size="sm">
                  {order.payment_method === 'cod'
                    ? 'Cash on Delivery'
                    : order.payment_method.toUpperCase()}
                </Badge>
              </div>

              {order.bkash_invoice && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-bushal-inkSoft">Invoice #</span>
                  <span className="text-xs font-mono text-bushal-ink bg-bushal-ivoryDeep border border-bushal-border rounded-lg px-2 py-1">
                    {order.bkash_invoice}
                  </span>
                </div>
              )}

              {order.bkash_trx_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-bushal-inkSoft">TxID</span>
                  <span className="text-xs font-mono text-bushal-ink bg-bushal-ivoryDeep border border-bushal-border rounded-lg px-2 py-1">
                    {order.bkash_trx_id}
                  </span>
                </div>
              )}

              <div className="h-px bg-bushal-border/60" />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-bushal-forest text-sm">Total Paid</span>
                <span className="font-heading text-xl font-bold text-bushal-copper tabular-nums">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal?.open ?? false}
        onClose={() => setConfirmModal(null)}
        onConfirm={handleConfirmAction}
        title={confirmModal?.label ?? ''}
        description={confirmModal?.description ?? ''}
        confirmLabel={confirmModal?.action === 'cancelled' ? 'Yes, cancel order' : 'Confirm'}
        variant={confirmModal?.variant ?? 'info'}
        loading={loading}
      />
    </div>
  )
}