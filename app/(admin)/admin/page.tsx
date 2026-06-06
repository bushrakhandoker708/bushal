// app/(admin)/admin/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = createServerClient()

  const [
    { count: productCount },
    { count: orderCount },
    { count: userCount },
    { data: products },
    { data: orders },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('id, name, price, stock_quantity, in_stock, discount_percent, images, image_url').order('stock_quantity', { ascending: true }).limit(20),
    supabase.from('orders').select('total, status, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  const totalRevenue = (orders ?? [])
    .filter((o) => o.status === 'fulfilled')
    .reduce((sum, o) => sum + Number(o.total), 0)

  const pendingOrders = (orders ?? []).filter((o) => o.status === 'pending').length
  const fulfilledOrders = (orders ?? []).filter((o) => o.status === 'fulfilled').length

  const outOfStock = (products ?? []).filter((p) => !p.in_stock).length
  const lowStock = (products ?? []).filter((p) => p.in_stock && p.stock_quantity <= 5).length

  const ordersByStatus = [
    { label: 'Fulfilled', count: fulfilledOrders, color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Pending', count: pendingOrders, color: 'bg-amber-400', textColor: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Cancelled', count: (orders ?? []).filter((o) => o.status === 'cancelled').length, color: 'bg-rose-400', textColor: 'text-rose-700', bg: 'bg-rose-50' },
  ]

  const totalOrders = (orders ?? []).length || 1

  const topProducts = [...(products ?? [])]
    .sort((a, b) => b.stock_quantity - a.stock_quantity)
    .slice(0, 8)

  const maxStock = Math.max(...(products ?? []).map((p) => p.stock_quantity), 1)

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Your store at a glance</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue',
            value: formatPrice(totalRevenue),
            color: 'bg-violet-500',
            icon: (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            label: 'Total Products',
            value: productCount ?? 0,
            color: 'bg-blue-500',
            icon: (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            ),
          },
          {
            label: 'Total Orders',
            value: orderCount ?? 0,
            color: 'bg-emerald-500',
            icon: (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
          },
          {
            label: 'Total Customers',
            value: userCount ?? 0,
            color: 'bg-orange-500',
            icon: (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Order Breakdown</h2>
          <p className="text-xs text-slate-400 mb-5">Last 50 orders by status</p>

          <div className="space-y-4">
            {ordersByStatus.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.textColor}`}>{s.label}</span>
                  <span className="text-sm font-bold text-slate-900">{s.count}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${s.color} rounded-full transition-all duration-700`}
                    style={{ width: `${(s.count / totalOrders) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{Math.round((s.count / totalOrders) * 100)}% of total</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Inventory Health</h2>
          <p className="text-xs text-slate-400 mb-5">Stock status overview</p>

          <div className="space-y-3 mb-6">
            {[
              { label: 'In Stock', count: (productCount ?? 0) - outOfStock - lowStock, color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Low Stock (≤5)', count: lowStock, color: 'bg-amber-400', textColor: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Out of Stock', count: outOfStock, color: 'bg-rose-400', textColor: 'text-rose-700', bg: 'bg-rose-50' },
            ].map((s) => (
              <div key={s.label} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${s.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className={`text-xs font-semibold ${s.textColor}`}>{s.label}</span>
                </div>
                <span className={`text-sm font-bold ${s.textColor}`}>{s.count}</span>
              </div>
            ))}
          </div>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
            {[
              { count: (productCount ?? 0) - outOfStock - lowStock, color: 'bg-emerald-500' },
              { count: lowStock, color: 'bg-amber-400' },
              { count: outOfStock, color: 'bg-rose-400' },
            ].map((s, i) => (
              <div
                key={i}
                className={`h-full ${s.color} transition-all duration-700`}
                style={{ width: `${(s.count / (productCount || 1)) * 100}%` }}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Quick Actions</h2>
          <p className="text-xs text-slate-400 mb-5">Common admin tasks</p>
          <div className="space-y-2.5">
            {[
              { label: 'Add New Product', href: '/admin/products/new', color: 'bg-orange-600 text-white hover:bg-orange-700' },
              { label: 'View All Orders', href: '/admin/orders', color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
              { label: 'Manage Products', href: '/admin/products', color: 'bg-blue-600 text-white hover:bg-blue-700' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className={`flex items-center justify-between w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all ${a.color}`}>
                {a.label}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {(outOfStock > 0 || lowStock > 0) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-700">
                ⚠ {outOfStock > 0 ? `${outOfStock} out of stock` : ''}{outOfStock > 0 && lowStock > 0 ? ', ' : ''}{lowStock > 0 ? `${lowStock} running low` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Stock Levels</h2>
            <p className="text-xs text-slate-400 mt-0.5">Top products by quantity on hand</p>
          </div>
          <Link href="/admin/products" className="text-xs font-semibold text-orange-600 hover:underline">
            View all →
          </Link>
        </div>

        <div className="space-y-3">
          {topProducts.map((p) => {
            const pct = Math.round((p.stock_quantity / maxStock) * 100)
            const barColor = p.stock_quantity === 0
              ? 'bg-rose-400'
              : p.stock_quantity <= 5
              ? 'bg-amber-400'
              : 'bg-emerald-500'
            const cover = (Array.isArray(p.images) && p.images[0]) || p.image_url

            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                  {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-800 truncate pr-2">{p.name}</span>
                    <span className={`text-xs font-bold flex-shrink-0 ${p.stock_quantity === 0 ? 'text-rose-500' : p.stock_quantity <= 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                      {p.stock_quantity}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}