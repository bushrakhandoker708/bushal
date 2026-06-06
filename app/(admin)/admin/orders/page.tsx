// app/(admin)/admin/orders/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { formatDate } from '@/app/lib/utils/formatDate'
import AdminReplyForm from '@/app/components/comments/AdminReplyForm'

export default async function AdminOrdersPage() {
  const supabase = createServerClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  const { data: unrepliedComments } = await supabase
    .from('comments')
    .select('*, profiles(full_name), products(name)')
    .is('admin_reply', null)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-12">
      {/* Orders section */}
      <section>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Orders</h1>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order ID', 'Customer', 'Total', 'Status', 'Date'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(orders ?? []).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {order.profiles?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.profiles?.email}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'fulfilled'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!orders || orders.length === 0) && (
            <p className="text-center text-gray-400 py-12">No orders yet.</p>
          )}
        </div>
      </section>

      {/* Unanswered comments section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Customer Comments — Awaiting Reply
        </h2>
        {(!unrepliedComments || unrepliedComments.length === 0) ? (
          <p className="text-gray-400">All comments have been replied to.</p>
        ) : (
          <div className="space-y-4">
            {unrepliedComments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-xl shadow p-6">
                <div className="mb-3">
                  <p className="font-medium text-gray-900">
                    {comment.profiles?.full_name ?? 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-400">
                    on{' '}
                    <span className="font-medium text-gray-600">
                      {comment.products?.name}
                    </span>{' '}
                    · {formatDate(comment.created_at)}
                  </p>
                </div>
                <p className="text-gray-700 mb-4">{comment.body}</p>
                <AdminReplyForm commentId={comment.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}