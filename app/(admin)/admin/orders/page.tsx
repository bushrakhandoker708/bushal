// app/(admin)/admin/orders/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminOrdersClient from '@/app/components/admin/AdminOrderClient'

export default async function AdminOrdersPage() {
  const supabase = createServerClient()
  
  // Fetch orders with all necessary data including order items and products
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      total,
      status,
      delivery_status,
      delivery_steps,
      bkash_trx_id,
      bkash_invoice,
      created_at,
      user_id,
      delivery_address,
      phone,
      customer_note,
      payment_method,
      order_items (
        id,
        quantity,
        unit_price,
        product_id,
        products (
          id,
          name,
          image_url,
          images,
          price
        )
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
  const enrichedOrders = (orders ?? []).map((o) => {
    const orderItems = (o.order_items ?? []).map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_id: item.product_id,
      products: item.products ? {
        id: item.products.id,
        name: item.products.name,
        image_url: item.products.image_url,
        images: item.products.images ?? [],
        price: item.products.price
      } : null
    }))

    const totalItemsCount = orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0)

    return {
      ...o,
      order_items: orderItems,
      customer: profilesMap[o.user_id] ?? { full_name: null, email: null, phone: null },
      total_items_count: totalItemsCount
    }
  })

  return <AdminOrdersClient orders={enrichedOrders} />
}