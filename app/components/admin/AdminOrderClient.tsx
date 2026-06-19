// app/components/admin/AdminOrderClient.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { formatDate } from '@/app/lib/utils/formatDate'
import { cn } from '@/app/lib/utils/cn'
import toast from 'react-hot-toast'

// ─── Configuration ───────────────────────────────────────────────────────────
const DELIVERY_STEPS = [
  { key: 'order_placed',     label: 'Order Placed',      icon: '📋', color: 'bg-bushal-ivoryDeep text-bushal-inkMid border-bushal-border', gradient: 'from-slate-50 to-slate-100' },
  { key: 'confirmed',        label: 'Confirmed',         icon: '✅', color: 'bg-bushal-copper/10 text-bushal-copper border-bushal-copper/20', gradient: 'from-orange-50 to-amber-50' },
  { key: 'processing',       label: 'Processing',        icon: '⚙️', color: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20', gradient: 'from-amber-50 to-yellow-50' },
  { key: 'shipped',          label: 'Shipped',           icon: '📦', color: 'bg-bushal-forest/10 text-bushal-forest border-bushal-forest/20', gradient: 'from-emerald-50 to-green-50' },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: '🚚', color: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20', gradient: 'from-amber-50 to-orange-50' },
  { key: 'delivered',        label: 'Delivered',         icon: '🎉', color: 'bg-bushal-successBg text-bushal-success border-bushal-success/20', gradient: 'from-green-50 to-emerald-50' },
  { key: 'cancelled',        label: 'Cancelled',         icon: '❌', color: 'bg-bushal-dangerBg text-bushal-danger border-bushal-danger/20', gradient: 'from-red-50 to-rose-50' },
]

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProductData {
  name: string
  image_url: string | null
  images: string[] | null
}

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  product_id: string
  products: ProductData | null
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
  payment_method: string | null
  order_items: OrderItem[]
  customer: { full_name: string | null; email: string | null; phone: string | null }
}

interface Props {
  orders: Order[]
}

// ─── Micro-Components ────────────────────────────────────────────────────────

// Animated Status Badge with pulse effect for active orders
function StatusBadge({ status, animated = false }: { status: string; animated?: boolean }) {
  const step = DELIVERY_STEPS.find((s) => s.key === status)
  if (!step) return <span className="text-xs text-bushal-inkSoft">{status}</span>
  
  return (
    <motion.span 
      initial={false}
      animate={animated ? {
        boxShadow: ['0 0 0 0 rgba(184, 115, 51, 0.4)', '0 0 0 8px rgba(184, 115, 51, 0)', '0 0 0 0 rgba(184, 115, 51, 0)'],
      } : {}}
      transition={animated ? { duration: 2, repeat: Infinity } : {}}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-300',
        step.color,
        animated && 'relative'
      )}
    >
      <motion.span
        animate={animated ? { rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 0.5, repeat: animated ? 3 : 0 }}
      >
        {step.icon}
      </motion.span>
      <span className="hidden sm:inline">{step.label}</span>
      <span className="sm:hidden">{step.label.split(' ')[0]}</span>
    </motion.span>
  )
}

// Order Summary Panel with smooth reveal animation
function OrderSummaryPanel({ items, total, paymentMethod }: {
  items: OrderItem[]
  total: number
  paymentMethod: string | null
}) {
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const shipping = Math.max(0, total - subtotal)
  
  if (!items || items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bushal-surface rounded-xl border border-bushal-border p-6 text-center text-sm text-bushal-inkSoft"
      >
        <div className="w-12 h-12 rounded-full bg-bushal-ivoryDeep flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p>No item data available for this order.</p>
      </motion.div>
    )
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ staggerChildren: 0.05 }}
      className="bg-bushal-surface rounded-xl border border-bushal-border overflow-hidden shadow-sm"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="divide-y divide-bushal-ivoryDeep"
      >
        {items.map((item, idx) => {
          const img = item.products
            ? (Array.isArray(item.products.images) && item.products.images[0]) || item.products.image_url
            : null
          const lineTotal = item.unit_price * item.quantity
          
          return (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-bushal-ivoryDeep/30 transition-colors group"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + (idx * 0.05), type: "spring" }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bushal-copper text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm"
                >
                  {item.quantity}
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-bushal-ink truncate group-hover:text-bushal-copper transition-colors">
                  {item.products?.name ?? 'Unknown Product'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-bushal-inkSoft">{formatPrice(item.unit_price)} × {item.quantity}</span>
                </div>
              </div>
              <motion.p 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + (idx * 0.05) }}
                className="text-sm font-bold text-bushal-forest flex-shrink-0 tabular-nums"
              >
                {formatPrice(lineTotal)}
              </motion.p>
            </motion.div>
          )
        })}
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="border-t border-bushal-border bg-gradient-to-b from-bushal-ivoryDeep/50 to-bushal-ivoryDeep/30 px-4 py-4 space-y-2"
      >
        <div className="flex justify-between text-xs text-bushal-inkSoft">
          <span>Subtotal</span>
          <span className="font-medium text-bushal-ink tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        {shipping > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-between text-xs text-bushal-inkSoft"
          >
            <span>Shipping</span>
            <span className="font-medium text-bushal-ink tabular-nums">{formatPrice(shipping)}</span>
          </motion.div>
        )}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-between items-center pt-2 border-t border-bushal-border"
        >
          <span className="text-sm font-bold text-bushal-forest">Total</span>
          <span className="text-lg font-bold text-bushal-copper tabular-nums">{formatPrice(total)}</span>
        </motion.div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-bushal-inkSoft">Payment</span>
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border',
              paymentMethod === 'cod'
                ? 'bg-bushal-forest/10 text-bushal-forest border-bushal-forest/20'
                : 'bg-bushal-copper/10 text-bushal-copper border-bushal-copper/20'
            )}
          >
            {paymentMethod === 'cod' ? '💵' : '💳'} {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod?.toUpperCase() ?? 'Unknown'}
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Order Row with expandable details and smooth animations
function OrderRow({ order, onUpdateStatus }: { 
  order: Order
  onUpdateStatus: (orderId: string, status: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(order.delivery_status ?? 'order_placed')
  
  const items: OrderItem[] = order.order_items ?? []
  const totalItemsCount = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
  const totalProductLines = items.length
  
  const firstImg = items[0]?.products
    ? (Array.isArray(items[0].products.images) && items[0].products.images[0]) || items[0].products.image_url
    : null
  
  const handleUpdate = async () => {
    setUpdating(true)
    try {
      await onUpdateStatus(order.id, selectedStatus)
      toast.success(`Order status updated to ${DELIVERY_STEPS.find(s => s.key === selectedStatus)?.label}`)
    } catch (error) {
      toast.error('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }
  
  const currentStep = DELIVERY_STEPS.find(s => s.key === selectedStatus)
  
  return (
    <>
      <motion.tr
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={{ backgroundColor: 'rgba(240, 235, 225, 0.5)' }}
        className="hover:bg-bushal-ivoryDeep/50 transition-colors cursor-pointer group"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative w-11 h-11 rounded-xl overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
            >
              {firstImg ? (
                <img src={firstImg} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-bushal-borderMid text-lg">📦</div>
              )}
            </motion.div>
            <div>
              <p className="text-xs font-mono font-bold text-bushal-ink">#{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-[11px] text-bushal-inkSoft mt-0.5">{formatDate(order.created_at)}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 hidden sm:table-cell">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-bushal-ink">{order.customer.full_name ?? '—'}</p>
            <p className="text-xs text-bushal-inkSoft truncate max-w-[180px]">{order.customer.email ?? '—'}</p>
          </div>
        </td>
        <td className="px-4 py-4">
          <p className="text-sm font-bold text-bushal-forest tabular-nums">{formatPrice(order.total)}</p>
          <p className="text-[11px] text-bushal-inkSoft">
            {totalProductLines > 0
              ? `${totalProductLines} product${totalProductLines !== 1 ? 's' : ''} · ${totalItemsCount} unit${totalItemsCount !== 1 ? 's' : ''}`
              : 'Loading items...'}
          </p>
        </td>
        <td className="px-4 py-4">
          <StatusBadge status={order.delivery_status ?? 'order_placed'} animated={order.delivery_status === 'processing' || order.delivery_status === 'out_for_delivery'} />
        </td>
        <td className="px-4 py-4 hidden lg:table-cell">
          <span className="text-xs font-mono text-bushal-inkSoft bg-bushal-ivoryDeep px-2 py-1 rounded">{order.bkash_trx_id?.slice(0, 12) ?? '—'}</span>
        </td>
        <td className="px-4 py-4">
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              className="w-4 h-4 text-bushal-inkSoft"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </td>
      </motion.tr>
      
      <AnimatePresence>
        {expanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <td colSpan={6} className="px-4 pb-6 pt-0">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-bushal-ivoryDeep to-bushal-surface rounded-2xl border border-bushal-border p-5 sm:p-6 space-y-6 shadow-lg"
              >
                {/* Customer & Payment Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-4 border border-bushal-border shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-bushal-copper/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Customer</p>
                    </div>
                    <p className="font-semibold text-bushal-ink">{order.customer.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-bushal-inkSoft mt-1">{order.customer.email ?? '—'}</p>
                    {order.customer.phone && <p className="text-xs text-bushal-inkSoft mt-0.5">{order.customer.phone}</p>}
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-4 border border-bushal-border shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-bushal-forest/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-bushal-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Payment</p>
                    </div>
                    <p className="text-xs text-bushal-ink">
                      Method: <span className="font-semibold">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method?.toUpperCase() ?? '—'}</span>
                    </p>
                    {order.bkash_trx_id && (
                      <p className="text-xs text-bushal-ink mt-1 font-mono bg-bushal-ivoryDeep px-2 py-1 rounded inline-block">
                        TxID: {order.bkash_trx_id}
                      </p>
                    )}
                    <p className="text-xs text-bushal-ink mt-1 font-mono bg-bushal-ivoryDeep px-2 py-1 rounded inline-block">
                      Inv: {order.bkash_invoice?.slice(0, 12)}
                    </p>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-4 border border-bushal-border shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-bushal-success/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Order Total</p>
                    </div>
                    <p className="text-2xl font-bold text-bushal-forest tabular-nums">{formatPrice(order.total)}</p>
                    <p className="text-xs text-bushal-inkSoft mt-1">
                      {totalProductLines} product{totalProductLines !== 1 ? 's' : ''} · {totalItemsCount} unit{totalItemsCount !== 1 ? 's' : ''}
                    </p>
                  </motion.div>
                </div>
                
                {/* Delivery Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-bushal-border">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl p-4 border border-bushal-border shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-bushal-warning/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-bushal-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Delivery Address</p>
                    </div>
                    <p className="text-sm text-bushal-ink leading-relaxed">
                      {order.delivery_address || <span className="text-bushal-inkSoft italic">No address provided</span>}
                    </p>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-xl p-4 border border-bushal-border shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-bushal-copper/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Contact Phone</p>
                    </div>
                    <p className="text-sm text-bushal-ink font-medium">
                      {order.phone || order.customer.phone || <span className="text-bushal-inkSoft italic">No phone provided</span>}
                    </p>
                  </motion.div>
                </div>
                
                {order.customer_note && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Customer Note</p>
                        <p className="text-sm text-amber-900 italic leading-relaxed">"{order.customer_note}"</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Order Summary */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="pt-2 border-t border-bushal-border"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-bushal-forest/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-bushal-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Order Summary</p>
                  </div>
                  <OrderSummaryPanel
                    items={items}
                    total={order.total}
                    paymentMethod={order.payment_method}
                  />
                </motion.div>
                
                {/* Status Update Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="pt-2 border-t border-bushal-border"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-bushal-copper/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Update Delivery Status</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-5">
                    {DELIVERY_STEPS.map((step, idx) => {
                      const isSelected = selectedStatus === step.key
                      return (
                        <motion.button
                          key={step.key}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); setSelectedStatus(step.key) }}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all duration-200',
                            isSelected
                              ? cn('bg-gradient-to-r', step.gradient, 'text-bushal-ink border-transparent shadow-md scale-105')
                              : step.color + ' opacity-70 hover:opacity-100 hover:scale-105'
                          )}
                        >
                          <motion.span
                            animate={isSelected ? { rotate: [0, 10, -10, 0] } : {}}
                            transition={{ duration: 0.5 }}
                          >
                            {step.icon}
                          </motion.span>
                          <span className="hidden sm:inline">{step.label}</span>
                          <span className="sm:hidden">{step.label.split(' ')[0]}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                  
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => { e.stopPropagation(); handleUpdate() }}
                    disabled={updating || selectedStatus === (order.delivery_status ?? 'order_placed')}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md',
                      updating || selectedStatus === (order.delivery_status ?? 'order_placed')
                        ? 'bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed'
                        : 'bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white hover:shadow-lg hover:shadow-bushal-copper/30 hover:-translate-y-0.5'
                    )}
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
                        Apply Status: {currentStep?.label}
                      </>
                    )}
                  </motion.button>
                </motion.div>
                
                {/* Timeline */}
                {Array.isArray(order.delivery_steps) && order.delivery_steps.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="pt-4 border-t border-bushal-border"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-bushal-inkSoft/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Timeline</p>
                    </div>
                    <div className="space-y-3">
                      {[...order.delivery_steps].reverse().map((step: any, i: number) => {
                        const s = DELIVERY_STEPS.find((ds) => ds.key === step.status)
                        const isLast = i === 0
                        return (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg transition-all",
                              isLast ? "bg-white border border-bushal-border shadow-sm" : "opacity-75"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                              isLast ? s?.color.replace('bg-', 'bg-').replace('text-', 'text-') : "bg-bushal-ivoryDeep text-bushal-inkSoft"
                            )}>
                              {s?.icon ?? '📦'}
                            </div>
                            <div className="flex-1">
                              <p className={cn("font-semibold", isLast ? "text-bushal-ink" : "text-bushal-inkSoft")}>
                                {s?.label ?? step.status}
                              </p>
                              <p className="text-xs text-bushal-inkSoft mt-0.5">{formatDate(step.timestamp)}</p>
                            </div>
                            {isLast && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 rounded-full bg-bushal-success"
                              />
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  )
}

// Main Component
export default function AdminOrdersClient({ orders }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [localOrders, setLocalOrders] = useState(orders)
  const [isAnimating, setIsAnimating] = useState(false)
  
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
    setIsAnimating(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_status: status }),
      })
      if (res.ok) {
        const stepConfig = DELIVERY_STEPS.find(s => s.key === status)
        const newStep = {
          status,
          label: stepConfig?.label ?? status,
          timestamp: new Date().toISOString(),
        }
        setLocalOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o
            return {
              ...o,
              delivery_status: status,
              delivery_steps: [...(o.delivery_steps ?? []), newStep],
            }
          })
        )
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to update order status')
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to update order status. Please try again.')
      throw error
    } finally {
      setIsAnimating(false)
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bushal-forest tracking-tight">Orders</h1>
          <p className="text-sm text-bushal-inkSoft mt-1">
            <span className="font-semibold text-bushal-forest">{filtered.length}</span> of <span className="font-semibold">{localOrders.length}</span> total orders
          </p>
        </div>
      </motion.div>
      
      {/* Filter Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 flex-wrap overflow-x-auto pb-2 no-scrollbar"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setStatusFilter('all')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all flex-shrink-0',
            statusFilter === 'all'
              ? 'bg-bushal-forest text-white border-bushal-forest shadow-md shadow-bushal-forest/20'
              : 'bg-bushal-surface text-bushal-inkMid border-bushal-border hover:border-bushal-borderMid hover:shadow-sm'
          )}
        >
          All Orders ({localOrders.length})
        </motion.button>
        {DELIVERY_STEPS.map((step) => {
          const count = statusCounts[step.key] ?? 0
          if (count === 0) return null
          return (
            <motion.button
              key={step.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStatusFilter(step.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all flex-shrink-0',
                statusFilter === step.key
                  ? cn('bg-gradient-to-r', step.gradient, 'text-bushal-ink border-transparent shadow-md')
                  : step.color + ' hover:opacity-100 opacity-80'
              )}
            >
              <span className="hidden sm:inline">{step.icon} {step.label}</span>
              <span className="sm:hidden">{step.icon}</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/30 text-[10px]">{count}</span>
            </motion.button>
          )
        })}
      </motion.div>
      
      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <motion.div 
          animate={{ scale: isAnimating ? [1, 1.02, 1] : 1 }}
          className="absolute left-4 top-1/2 -translate-y-1/2"
        >
          <svg className="w-5 h-5 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </motion.div>
        <input
          type="text"
          placeholder="Search by ID, name, email, phone, address or bKash TxID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-bushal-border bg-bushal-surface text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-4 focus:ring-bushal-copper/10 transition-all"
        />
      </motion.div>
      
      {/* Orders Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-bushal-surface rounded-2xl border-2 border-bushal-border overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-bushal-ivoryDeep to-bushal-surface border-b-2 border-bushal-border">
                <th className="px-4 py-4 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wider">Order</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wider hidden sm:table-cell">Customer</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wider">Total</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wider hidden lg:table-cell">bKash</th>
                <th className="px-4 py-4 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bushal-ivoryDeep">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={6} className="py-20 text-center">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <div className="w-20 h-20 rounded-full bg-bushal-ivoryDeep flex items-center justify-center">
                          <svg className="w-10 h-10 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-bushal-ink">No orders found</p>
                          <p className="text-xs text-bushal-inkSoft mt-1">Try adjusting your search or filters</p>
                        </div>
                      </motion.div>
                    </td>
                  </motion.tr>
                ) : (
                  filtered.map((order) => (
                    <OrderRow key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}