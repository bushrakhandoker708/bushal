// app/components/admin/AdminOrderList.tsx

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import Badge from '@/app/components/ui/Badge'
import { Search, Package, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import Input from '../ui/Input'

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  products: { 
    name: string
    image_url: string | null
    images: string[] | null
  }[] | null
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
  delivery_address: string | null
  profiles: { 
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
  order_items: OrderItem[]
}

const STATUS_CONFIG = {
  order_placed: { 
    label: 'Order Placed', 
    variant: 'info' as const, 
    icon: '📋',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500'
  },
  confirmed: { 
    label: 'Confirmed', 
    variant: 'copper' as const, 
    icon: '✅',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500'
  },
  processing: { 
    label: 'Processing', 
    variant: 'warning' as const, 
    icon: '⚙️',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500'
  },
  shipped: { 
    label: 'Shipped', 
    variant: 'copper' as const, 
    icon: '📦',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500'
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    variant: 'warning' as const, 
    icon: '🚚',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotColor: 'bg-indigo-500'
  },
  delivered: { 
    label: 'Delivered', 
    variant: 'success' as const, 
    icon: '🎉',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500'
  },
  cancelled: { 
    label: 'Cancelled', 
    variant: 'danger' as const, 
    icon: '❌',
    color: 'bg-red-50 text-red-700 border-red-200',
    dotColor: 'bg-red-500'
  }
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Orders', icon: Package },
  { value: 'order_placed', label: 'Placed', icon: Clock },
  { value: 'confirmed', label: 'Confirmed', icon: TrendingUp },
  { value: 'processing', label: 'Processing', icon: AlertCircle },
  { value: 'shipped', label: 'Shipped', icon: Package },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: TrendingUp },
  { value: 'delivered', label: 'Delivered', icon: TrendingUp },
  { value: 'cancelled', label: 'Cancelled', icon: AlertCircle },
]

export default function AdminOrderList({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const filteredOrders = useMemo(() => {
    let result = orders

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(o => o.delivery_status === filter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(order => {
        const orderId = order.id.toLowerCase()
        const customerName = order.profiles?.full_name?.toLowerCase() || ''
        const customerEmail = order.profiles?.email?.toLowerCase() || ''
        const phone = order.phone?.toLowerCase() || order.profiles?.phone?.toLowerCase() || ''
        const address = order.delivery_address?.toLowerCase() || ''
        
        return (
          orderId.includes(query) ||
          customerName.includes(query) ||
          customerEmail.includes(query) ||
          phone.includes(query) ||
          address.includes(query)
        )
      })
    }

    return result.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [orders, filter, searchQuery])

  const stats = useMemo(() => {
    const baseStats = {
      total: orders.length,
      pending: orders.filter(o => o.delivery_status === 'order_placed').length,
      processing: orders.filter(o => o.delivery_status === 'processing').length,
      delivered: orders.filter(o => o.delivery_status === 'delivered').length,
    }
    
    if (filter === 'all') return baseStats
    
    return {
      total: filteredOrders.length,
      pending: 0,
      processing: 0,
      delivered: 0,
    }
  }, [orders, filteredOrders, filter])

  const getProductImage = (item: OrderItem) => {
    if (item.products?.[0]?.images?.[0]) return item.products[0].images[0]
    if (item.products?.[0]?.image_url) return item.products[0].image_url
    return null
  }

  const getProductName = (item: OrderItem) => {
    return item.products?.[0]?.name || 'Unknown Product'
  }

  return (
    <div className="space-y-11 mt-10">
      {/* Stats Overview */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-gradient-to-br from-bushal-forest/10 to-bushal-forest/5 rounded-2xl p-4 border border-bushal-forest/20">
          <div className="flex items-center gap-2 text-bushal-forest mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl font-bold text-bushal-forest">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-bushal-warning/10 to-bushal-warning/5 rounded-2xl p-4 border border-bushal-warning/20">
          <div className="flex items-center gap-2 text-bushal-warning mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-bold text-bushal-warning">{stats.pending}</p>
        </div>
        <div className="bg-gradient-to-br from-bushal-copper/10 to-bushal-copper/5 rounded-2xl p-4 border border-bushal-copper/20">
          <div className="flex items-center gap-2 text-bushal-copper mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Processing</span>
          </div>
          <p className="text-2xl font-bold text-bushal-copper">{stats.processing}</p>
        </div>
        <div className="bg-gradient-to-br from-bushal-success/10 to-bushal-success/5 rounded-2xl p-4 border border-bushal-success/20">
          <div className="flex items-center gap-2 text-bushal-success mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Delivered</span>
          </div>
          <p className="text-2xl font-bold text-bushal-success">{stats.delivered}</p>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="space-y-40">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bushal-inkSoft" />
          <Input
            type="text"
            placeholder="Search by order ID, customer name, email, phone or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-white border-bushal-border focus:border-bushal-forest transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {FILTER_OPTIONS.map((opt) => {
            const count = opt.value === 'all' 
              ? orders.length 
              : orders.filter(o => o.delivery_status === opt.value).length
            
            if (opt.value !== 'all' && count === 0 && filter !== opt.value) return null
            
            const Icon = opt.icon
            const isActive = filter === opt.value
            
            return (
              <motion.button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap border',
                  isActive
                    ? 'bg-bushal-forest text-white border-bushal-forest shadow-lg shadow-bushal-forest/25'
                    : 'bg-white border-bushal-border text-bushal-inkSoft hover:border-bushal-forest/30 hover:text-bushal-forest'
                )}
              >
                <Icon className="w-4 h-4" />
                {opt.label}
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  isActive ? 'bg-white/20 text-white' : 'bg-bushal-ivoryDeep text-bushal-inkSoft'
                )}>
                  {count}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-2 border-dashed border-bushal-border p-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-bushal-ivoryDeep flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-bushal-inkSoft" />
              </div>
              <h3 className="text-lg font-bold text-bushal-forest mb-2">No orders found</h3>
              <p className="text-sm text-bushal-inkSoft max-w-md mx-auto">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : filter === 'all' 
                    ? 'No orders have been placed yet.' 
                    : `No orders with status "${FILTER_OPTIONS.find(f => f.value === filter)?.label}".`}
              </p>
            </motion.div>
          ) : (
            filteredOrders.map((order, index) => {
              const status = STATUS_CONFIG[order.delivery_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.order_placed
              const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0
              const firstItem = order.order_items?.[0]
              const isExpanded = expandedOrder === order.id

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="block bg-white rounded-2xl border border-bushal-border overflow-hidden hover:shadow-xl hover:shadow-bushal-forest/5 hover:border-bushal-forest/30 transition-all duration-300 group"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bushal-forest/10 to-bushal-forest/5 border border-bushal-forest/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">{status.icon}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-bold text-bushal-forest font-mono text-lg">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </h3>
                              <span className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                                status.color
                              )}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)} />
                                {status.label}
                              </span>
                              {!order.inventory_reduced && order.delivery_status === 'order_placed' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Pending Confirm
                                </span>
                              )}
                              {order.inventory_reduced && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <TrendingUp className="w-3 h-3" />
                                  Stock Deducted
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-bushal-ivoryDeep flex items-center justify-center text-xs font-bold text-bushal-forest">
                                  {(order.profiles?.full_name || 'G')[0].toUpperCase()}
                                </div>
                                <span className="font-semibold text-bushal-ink">
                                  {order.profiles?.full_name || 'Guest'}
                                </span>
                              </div>
                              
                              {order.phone && (
                                <div className="flex items-center gap-1.5 text-bushal-inkSoft">
                                  <span>📞</span>
                                  <span className="font-mono text-xs">{order.phone}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1.5 text-bushal-inkSoft">
                                <Package className="w-4 h-4" />
                                <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 lg:gap-1 text-right pl-16 lg:pl-0">
                          <div>
                            <p className="text-2xl font-bold text-bushal-copper">
                              {formatPrice(order.total)}
                            </p>
                            <p className="text-xs text-bushal-inkSoft mt-0.5">
                              {new Date(order.created_at).toLocaleDateString('en-BD', {
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold',
                            order.payment_method === 'cod'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          )}>
                            {order.payment_method === 'cod' ? '💵' : '💳'}
                            {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      {firstItem && (
                        <div className="mt-4 pt-4 border-t border-bushal-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-bushal-ivoryDeep border border-bushal-border overflow-hidden flex-shrink-0">
                              {getProductImage(firstItem) ? (
                                <img 
                                  src={getProductImage(firstItem)!} 
                                  alt={getProductName(firstItem)}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f0ebE1"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%236b6b65" font-family="sans-serif" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E'
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                                  <Package className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-bushal-ink truncate">
                                {getProductName(firstItem)}
                              </p>
                              <p className="text-sm text-bushal-inkSoft">
                                {formatPrice(firstItem.unit_price)} × {firstItem.quantity}
                              </p>
                            </div>
                            {order.order_items.length > 1 && (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {order.order_items.slice(1, 4).map((item, idx) => (
                                    <div 
                                      key={idx}
                                      className="w-8 h-8 rounded-lg bg-bushal-ivoryDeep border-2 border-white flex items-center justify-center text-xs font-bold text-bushal-forest"
                                    >
                                      {getProductImage(item) ? (
                                        <img 
                                          src={getProductImage(item)!} 
                                          alt=""
                                          className="w-full h-full rounded-lg object-cover"
                                        />
                                      ) : (
                                        <Package className="w-4 h-4" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {order.order_items.length > 4 && (
                                  <span className="text-xs font-bold text-bushal-inkSoft">
                                    +{order.order_items.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      {filteredOrders.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-bushal-inkSoft pb-4"
        >
          Showing {filteredOrders.length} of {orders.length} orders
          {searchQuery && ` for "${searchQuery}"`}
        </motion.div>
      )}
    </div>
  )
}