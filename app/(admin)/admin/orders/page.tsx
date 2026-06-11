// app/(admin)/admin/orders/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminOrdersClient from '@/app/components/admin/AdminOrderClient'

export default async function AdminOrdersPage() {
  const supabase = createServerClient()

  // Verify admin session (redundant if layout.tsx handles it, but ensures safety)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  //  Fetch orders with expanded details
  // Note: Includes new columns like 'inventory_reduced' and 'payment_method'
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      total,
      status,
      delivery_status,
      delivery_steps,
      inventory_reduced,
      payment_method,
      phone,
      customer_note,
      delivery_address,
      bkash_trx_id,
      bkash_invoice,
      created_at,
      user_id,
      order_items (
        id,
        quantity,
        unit_price,
        products ( name, image_url, images )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Orders fetch error:', error)
  }

  // Enrich orders with customer profile data
  const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id)))
  let profilesMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds)

    profiles?.forEach((p) => {
      profilesMap[p.id] = {
        full_name: p.full_name,
        email: p.email,
        phone: p.phone ?? null
      }
    })
  }

  // Map and shape the data for the client component
  const enrichedOrders = (orders ?? []).map((o) => ({
    ...o,
    order_items: (o.order_items ?? []) as any[],
    customer: profilesMap[o.user_id] ?? { full_name: null, email: null, phone: null },
  }))

  return <AdminOrdersClient orders={enrichedOrders} />
}