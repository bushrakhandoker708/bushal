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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-orange-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
        >
          + Add Product
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Image', 'Name', 'Price', 'Stock', 'Discount', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(products ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {p.name}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {formatPrice(p.price)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      p.in_stock
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {p.in_stock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {p.discount_percent ? `${p.discount_percent}%` : '—'}
                </td>
                <td className="px-6 py-4 space-x-3">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="text-blue-500 hover:underline text-sm"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!products || products.length === 0) && (
          <p className="text-center text-gray-400 py-12">
            No products yet. Add your first one!
          </p>
        )}
      </div>
    </div>
  )
}