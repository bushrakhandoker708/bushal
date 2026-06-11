// app/(admin)/admin/orders/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminOrdersClient from '@/app/components/admin/AdminOrderClient'

export default async function AdminOrdersPage() {
  const supabase = createServerClient()

  // Fetch orders with nested order_items and products
  // IMPORTANT: Supabase returns joined 'products' as an ARRAY because of the relationship type.
  // We must handle this correctly when mapping.
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
      payment_method,
      created_at,
      user_id,
      delivery_address,
      phone,
      customer_note,
      order_items (
        id,
        quantity,
        unit_price,
        product_id,
        products (
          id,
          name,
          image_url,
          images
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
        full_name: p.full_name ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
      }
    })
  }

  // Map orders with proper null-checks and product extraction
  // CRITICAL FIX: Supabase returns 'products' as an array. We extract the first element.
  const enrichedOrders = (orders ?? []).map((o) => {
    const orderItems = (o.order_items ?? []).map((item: any) => {
      // Supabase returns products as an array due to the join structure
      // It could be: null, [], [product], or {product} depending on version/setup
      let productData = null
      
      if (item.products) {
        if (Array.isArray(item.products)) {
          productData = item.products[0] ?? null
        } else {
          productData = item.products
        }
      }

      return {
        id: item.id,
        quantity: item.quantity ?? 0,
        unit_price: item.unit_price ?? 0,
        product_id: item.product_id,
        products: productData ? {
          id: productData.id,
          name: productData.name ?? 'Unknown Product',
          image_url: productData.image_url ?? null,
          images: Array.isArray(productData.images) ? productData.images : [],
        } : null,
      }
    })

    const totalItemsCount = orderItems.reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0)
    const totalProductLines = orderItems.length

    return {
      ...o,
      payment_method: o.payment_method ?? 'cod',
      order_items: orderItems,
      customer: profilesMap[o.user_id] ?? { full_name: null, email: null, phone: null },
      total_items_count: totalItemsCount,
      total_product_lines: totalProductLines,
    }
  })

  return <AdminOrdersClient orders={enrichedOrders} />
}