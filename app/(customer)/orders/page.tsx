// app/(customer)/orders/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { formatDate } from '@/app/lib/utils/formatDate'
import Link from 'next/link'

const statusStyles: Record<string, { pill: string; dot: string; label: string }> = {
  fulfilled: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Delivered' },
  pending:   { pill: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400',   label: 'Pending'   },
  cancelled: { pill: 'bg-rose-50 text-rose-600 border-rose-200',     dot: 'bg-rose-500',   label: 'Cancelled' },
  refunded:  { pill: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400',  label: 'Refunded'  },
}

export default async function OrdersPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, image_url, images, price))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) console.error('Orders error:', error)

  const allOrders = orders ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-400 mt-1">
            {allOrders.length === 0
              ? 'No orders yet'
              : `${allOrders.length} order${allOrders.length !== 1 ? 's' : ''} placed`}
          </p>
        </div>

        {allOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No orders yet</h2>
            <p className="text-sm text-slate-400 mb-7 max-w-xs">
              Looks like you haven't placed any orders. Start shopping to see them here.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {allOrders.map((order) => {
              const style = statusStyles[order.status] ?? statusStyles.pending
              const items = order.order_items ?? []

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200">
                  {/* Order header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Order ID</p>
                        <p className="font-mono font-bold text-slate-800">{order.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                      <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Placed</p>
                        <p className="font-medium text-slate-700">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                      <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Total</p>
                        <p className="font-bold text-slate-900">{formatPrice(order.total)}</p>
                      </div>
                      {order.bkash_trx_id && (
                        <>
                          <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                          <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">bKash TxnID</p>
                            <p className="font-mono text-slate-600 text-xs">{order.bkash_trx_id}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${style.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                  </div>

                  {/* Order items */}
                  <div className="divide-y divide-slate-50">
                    {items.map((item: any) => {
                      const product = item.products
                      const cover =
                        (Array.isArray(product?.images) && product.images[0]) ||
                        product?.image_url ||
                        null
                      return (
                        <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0">
                            {cover ? (
                              <img src={cover} alt={product?.name ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {product?.name ?? 'Product'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-slate-900 flex-shrink-0">
                            {formatPrice(item.unit_price * item.quantity)}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      {order.status === 'fulfilled' ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Order delivered
                        </span>
                      ) : order.status === 'pending' ? (
                        <span className="text-amber-600 font-medium">Processing your order...</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}