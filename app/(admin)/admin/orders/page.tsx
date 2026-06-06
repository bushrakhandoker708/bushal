// app/(admin)/admin/orders/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { formatDate } from '@/app/lib/utils/formatDate'
import AdminReplyForm from '@/app/components/comments/AdminReplyForm'

export default async function AdminOrdersPage() {
  const supabase = createServerClient()

  // Fetch orders — join profiles separately to avoid RLS join issues
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('Orders error:', ordersError)
  }

  // Fetch profile info for each order's user_id
    const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id)))
  let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {}
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
    
    profiles?.forEach((p) => {
      profilesMap[p.id] = { full_name: p.full_name, email: p.email }
    })
  }

  // Fetch ALL comments (not just unreplied) so admin can see everything
  const { data: allComments } = await supabase
    .from('comments')
    .select(`
      id,
      body,
      rating,
      admin_reply,
      created_at,
      user_id,
      product_id,
      products ( name )
    `)
    .order('created_at', { ascending: false })

  // Get profile names for comment authors
  const commentUserIds = Array.from(new Set((allComments ?? []).map((c) => c.user_id)))
  let commentProfilesMap: Record<string, string> = {}

  if (commentUserIds.length > 0) {
    const { data: commentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', commentUserIds)

    commentProfiles?.forEach((p) => {
      commentProfilesMap[p.id] = p.full_name ?? 'Anonymous'
    })
  }

  const unrepliedComments = (allComments ?? []).filter((c) => !c.admin_reply)

  return (
    <div className="space-y-12">
      {/* Orders section */}
      <section>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Orders
          {orders && orders.length > 0 && (
            <span className="ml-3 text-base font-normal text-gray-500">
              ({orders.length} total)
            </span>
          )}
        </h1>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order ID', 'Customer', 'Total', 'Status', 'bKash TxnID', 'Date'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(orders ?? []).map((order) => {
                const profile = profilesMap[order.user_id]
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                      {order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {profile?.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">{profile?.email ?? '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'fulfilled'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {order.bkash_trx_id ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!orders || orders.length === 0) && (
            <p className="text-center text-gray-400 py-12">No orders yet.</p>
          )}
        </div>
      </section>

      {/* All comments section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Customer Comments
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {unrepliedComments.length} awaiting reply · {(allComments ?? []).length} total
        </p>

        {(!allComments || allComments.length === 0) ? (
          <p className="text-gray-400">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {(allComments ?? []).map((comment) => (
              <div key={comment.id} className="bg-white rounded-xl shadow p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {commentProfilesMap[comment.user_id] ?? 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-400">
                      on{' '}
                      <span className="font-medium text-gray-600">
                        {(comment.products as any)?.name ?? 'Unknown product'}
                      </span>
                      {' · '}
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                  {comment.rating && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-4 h-4 fill-current ${
                          i < comment.rating ? 'text-yellow-400' : 'text-gray-200'
                        }`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-gray-700 mb-4">{comment.body}</p>

                {comment.admin_reply ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-orange-600 mb-1">Your reply:</p>
                    <p className="text-sm text-gray-700">{comment.admin_reply}</p>
                  </div>
                ) : (
                  <AdminReplyForm commentId={comment.id} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}