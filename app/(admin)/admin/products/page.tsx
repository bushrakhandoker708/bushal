// app/(admin)/admin/products/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatPrice } from '@/app/lib/utils/formatPrice'

export default async function AdminProductsPage() {
  const supabase = createServerClient()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-400 mt-0.5">{products?.length ?? 0} total</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-700 transition-all duration-150 shadow-lg shadow-orange-600/20 hover:shadow-xl hover:shadow-orange-600/25 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Image', 'Name', 'Price', 'Stock', 'Discount', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(products ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-11 h-11 object-cover rounded-xl border border-slate-100"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-slate-100 rounded-xl border border-slate-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-sm font-medium">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        p.in_stock
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.in_stock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {p.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-sm">
                    {p.discount_percent ? (
                      <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                        -{p.discount_percent}%
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!products || products.length === 0) && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                />
              </svg>
            </div>
            <p className="text-slate-500 font-medium mb-1">No products yet</p>
            <p className="text-slate-400 text-sm">Add your first product to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}