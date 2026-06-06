// components/admin/InventoryAnalytics.tsx
'use client'

import { Product } from '@/app/types/product'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  products: Product[]
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'amber' | 'rose' | 'blue'
}) {
  const colors = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  return (
    <div className={cn('rounded-xl border px-5 py-4', accent ? colors[accent] : 'bg-white border-slate-200')}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  )
}

export default function InventoryAnalytics({ products }: Props) {
  const totalProducts = products.length
  const inStock = products.filter((p) => p.in_stock).length
  const outOfStock = products.filter((p) => !p.in_stock).length
  const lowStock = products.filter(
    (p) => p.stock_quantity !== undefined && p.stock_quantity > 0 && p.stock_quantity <= 5
  ).length
  const totalInventoryValue = products.reduce((sum, p) => {
    const qty = p.stock_quantity ?? 0
    return sum + p.price * qty
  }, 0)
  const totalUnits = products.reduce((sum, p) => sum + (p.stock_quantity ?? 0), 0)

  const sorted = [...products].sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Products" value={totalProducts} accent="blue" />
        <StatCard label="In Stock" value={inStock} sub="products available" accent="green" />
        <StatCard label="Out of Stock" value={outOfStock} sub="needs restocking" accent="rose" />
        <StatCard label="Low Stock" value={lowStock} sub="≤ 5 units left" accent="amber" />
        <StatCard
          label="Inventory Value"
          value={formatPrice(totalInventoryValue)}
          sub={`${totalUnits} total units`}
        />
      </div>

      {outOfStock > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-rose-700">
              {outOfStock} product{outOfStock > 1 ? 's are' : ' is'} out of stock
            </p>
            <p className="text-xs text-rose-500 mt-0.5">
              These are hidden from customers automatically. Update stock quantity to restore visibility.
            </p>
          </div>
        </div>
      )}

      {lowStock > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-700">
              {lowStock} product{lowStock > 1 ? 's are' : ' is'} running low (≤ 5 units)
            </p>
            <p className="text-xs text-amber-500 mt-0.5">Consider restocking soon.</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Inventory Breakdown</h3>
          <span className="text-xs text-slate-400">{totalProducts} products</span>
        </div>
        <div className="divide-y divide-slate-50">
          {sorted.map((product) => {
            const qty = product.stock_quantity ?? 0
            const isOut = qty === 0
            const isLow = qty > 0 && qty <= 5
            const maxQty = Math.max(...products.map((p) => p.stock_quantity ?? 0), 1)
            const barWidth = Math.max((qty / maxQty) * 100, 0)

            return (
              <div key={product.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {(product.images?.[0] || product.image_url) ? (
                    <img
                      src={product.images?.[0] ?? product.image_url!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isOut ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
                      isOut
                        ? 'bg-rose-100 text-rose-600'
                        : isLow
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    )}
                  >
                    {isOut ? 'Out of Stock' : `${qty} units`}
                  </span>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {formatPrice(product.price * qty)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}