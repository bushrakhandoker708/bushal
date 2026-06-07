// app/(customer)/orders/[id]/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/layout/Navbar'
import BottomNav from '@/app/components/layout/BottomNav'
import OrderTracking from '@/app/components/order/OrderTracking'
import Badge from '@/app/components/ui/Badge'
import { formatPrice } from '@/app/lib/utils/formatPrice'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(id, quantity, unit_price, products(name, image_url, images))')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (!order) notFound()

  const status = order.delivery_status ?? order.status
  const items = order.order_items ?? []
  const date = new Date(order.created_at).toLocaleDateString('en-BD', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12 space-y-5">
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

        <OrderTracking currentStatus={status} orderId={order.id.slice(0, 8).toUpperCase()} />

        <div className="bg-bushal-surface rounded-xl border border-bushal-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-bushal-border">
            <h2 className="font-heading font-semibold text-bushal-forest">Items Ordered</h2>
          </div>
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
                    <p className="text-sm font-semibold text-bushal-ink line-clamp-1">{item.products?.name ?? 'Product'}</p>
                    <p className="text-xs text-bushal-inkSoft mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-bushal-forest flex-shrink-0">
                    {formatPrice(item.unit_price * item.quantity)}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-4 border-t border-bushal-border bg-bushal-ivory/50 space-y-2">
            <div className="flex justify-between text-sm text-bushal-inkSoft">
              <span>Subtotal</span>
              <span>{formatPrice(order.total - (order.shipping_fee ?? 0))}</span>
            </div>
            <div className="flex justify-between text-sm text-bushal-inkSoft">
              <span>Shipping</span>
              <span>{order.shipping_fee ? formatPrice(order.shipping_fee) : 'Free'}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-bushal-forest pt-2 border-t border-bushal-border">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {order.delivery_address && (
          <div className="bg-bushal-surface rounded-xl border border-bushal-border shadow-card p-5">
            <h2 className="font-heading font-semibold text-bushal-forest mb-3">Delivery Address</h2>
            <p className="text-sm text-bushal-inkMid leading-relaxed">{order.delivery_address}</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}