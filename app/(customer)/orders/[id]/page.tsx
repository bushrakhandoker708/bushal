// app/(customer)/orders/[id]/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/layout/Navbar'
import BottomNav from '@/app/components/layout/BottomNav'
import OrderTracking from '@/app/components/order/OrderTracking'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import PageWrapper from '@/app/components/layout/PageWrapper'
import { Metadata } from 'next'
import { cn } from '@/app/lib/utils/cn'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `Order #${params.id.slice(0, 8).toUpperCase()}`,
    description: 'View your order details, tracking status, and receipt on Bushal.',
    robots: { index: false, follow: true },
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  order_placed: { label: 'Order Placed', color: 'text-bushal-inkMid', bg: 'bg-bushal-ivoryDeep', border: 'border-bushal-border' },
  confirmed: { label: 'Confirmed', color: 'text-bushal-copper', bg: 'bg-bushal-copper/10', border: 'border-bushal-copper/20' },
  processing: { label: 'Processing', color: 'text-bushal-warning', bg: 'bg-bushal-warningBg', border: 'border-bushal-warning/20' },
  shipped: { label: 'Shipped', color: 'text-bushal-forest', bg: 'bg-bushal-forest/10', border: 'border-bushal-forest/20' },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-bushal-warning', bg: 'bg-bushal-warningBg', border: 'border-bushal-warning/20' },
  delivered: { label: 'Delivered', color: 'text-bushal-success', bg: 'bg-bushal-successBg', border: 'border-bushal-success/20' },
  cancelled: { label: 'Cancelled', color: 'text-bushal-danger', bg: 'bg-bushal-dangerBg', border: 'border-bushal-danger/20' },
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase =  await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      total,
      status,
      delivery_status,
      delivery_steps,
      payment_method,
      bkash_trx_id,
      bkash_invoice,
      delivery_address,
      phone,
      customer_note,
      created_at,
      order_items (
        id,
        quantity,
        unit_price,
        products (name, image_url, images)
      )
    `)
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (!order) notFound()

  const status = order.delivery_status ?? order.status
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.order_placed
  const items = order.order_items ?? []
  const totalItemsCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
  
  const date = new Date(order.created_at).toLocaleDateString('en-BD', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <PageWrapper maxWidth="2xl" className="pb-28 md:pb-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/orders" className="p-2 rounded-lg text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-surface border border-bushal-border transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="font-heading text-xl font-semibold text-bushal-forest">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-xs text-bushal-inkSoft mt-0.5">{date}</p>
            </div>
          </div>
          <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full border', config.bg, config.color, config.border)}>
            {config.label}
          </span>
        </div>

        {/* Tracking */}
        <OrderTracking currentStatus={status} orderId={order.id.slice(0, 8).toUpperCase()} />

        {/* Order Summary Card */}
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-bushal-border bg-bushal-ivoryDeep/30">
            <h2 className="font-heading font-semibold text-bushal-forest">Order Summary</h2>
            <p className="text-xs text-bushal-inkSoft mt-0.5">{totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''} ordered</p>
          </div>
          
          {/* Items List */}
          <div className="divide-y divide-bushal-ivory">
            {items.map((item: any) => {
              const cover = (Array.isArray(item.products?.images) && item.products.images[0]) || item.products?.image_url
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0">
                    {cover ? (
                      <img src={cover} alt={item.products?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-bushal-ink line-clamp-2">{item.products?.name ?? 'Product'}</p>
                    <p className="text-xs text-bushal-inkSoft mt-0.5">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                  </div>
                  <p className="text-sm font-bold text-bushal-forest flex-shrink-0">
                    {formatPrice(item.unit_price * item.quantity)}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Totals & Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-y md:divide-y-0 divide-bushal-border border-t border-bushal-border">
            {/* Left: Financials */}
            <div className="p-5 space-y-3 bg-bushal-ivory/30">
              <div className="flex justify-between text-sm text-bushal-inkSoft">
                <span>Subtotal</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-bushal-inkSoft">
                <span>Shipping</span>
                <span className="text-bushal-success font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-base font-bold text-bushal-forest pt-3 border-t border-bushal-border">
                <span>Total Paid</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              <div className="pt-2">
                <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1">Payment Method</p>
                <p className="text-sm font-medium text-bushal-ink">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'bKash'}
                  {order.bkash_trx_id && <span className="text-xs text-bushal-inkSoft ml-2 font-mono">({order.bkash_trx_id})</span>}
                </p>
              </div>
            </div>

            {/* Right: Delivery Info */}
            <div className="p-5 space-y-4">
              {order.delivery_address && (
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1">Delivery Address</p>
                  <p className="text-sm text-bushal-ink leading-relaxed">{order.delivery_address}</p>
                </div>
              )}
              {order.phone && (
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1">Contact Phone</p>
                  <p className="text-sm font-medium text-bushal-forest">{order.phone}</p>
                </div>
              )}
              {order.customer_note && (
                <div>
                  <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1">Delivery Instructions</p>
                  <p className="text-sm text-bushal-inkMid italic bg-bushal-ivoryDeep p-2 rounded-lg">"{order.customer_note}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageWrapper>
      <BottomNav />
    </div>
  )
}