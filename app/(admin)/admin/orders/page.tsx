// app/(admin)/admin/orders/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminOrdersClient from '@/app/components/admin/AdminOrderClient'

// Type definitions
interface OrderProduct {
  id: string
  name: string
  image_url: string | null
  images: string[] | null
}

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  product_id: string
  products: OrderProduct[] | null
}

interface Order {
  id: string
  total: number
  status: string
  delivery_status: string
  delivery_steps: any[] | null
  bkash_trx_id: string | null
  bkash_invoice: string | null
  payment_method: string | null
  created_at: string
  user_id: string
  delivery_address: string | null
  phone: string | null
  customer_note: string | null
  order_items: OrderItem[] | null
}

interface CustomerProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
}

interface EnrichedOrderItem {
  id: string
  quantity: number
  unit_price: number
  product_id: string
  products: {
    id: string
    name: string
    image_url: string | null
    images: string[]
  } | null
}

interface EnrichedOrder {
  id: string
  total: number
  status: string
  delivery_status: string
  delivery_steps: any[]
  bkash_trx_id: string | null
  bkash_invoice: string | null
  payment_method: string
  created_at: string
  user_id: string
  delivery_address: string | null
  phone: string | null
  customer_note: string | null
  order_items: EnrichedOrderItem[]
  customer: CustomerProfile
  total_items_count: number
  total_product_lines: number
}

// Helper to safely get first product image
const getProductImage = (item: OrderItem): string | null => {
  if (!item.products || item.products.length === 0) return null
  
  const product = item.products[0]
  
  // Prioritize: first image in images array > image_url > null
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0]
  }
  
  return product.image_url || null
}

export default async function AdminOrdersPage() {
  const supabase = await createServerClient()

  // Fetch orders with properly nested order_items and products
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

  // Fetch customer profiles for all unique user IDs
  const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id)))
  let profilesMap: Record<string, CustomerProfile> = {}
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((p) => {
        profilesMap[p.id] = {
          id: p.id,
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
        }
      })
    }
  }

  // Transform orders with proper image handling
  const enrichedOrders: EnrichedOrder[] = (orders ?? []).map((o) => {
    // Transform order items with proper image extraction
    const orderItems: EnrichedOrderItem[] = (o.order_items ?? []).map((item) => {
      // Safely extract product data - handle null/undefined cases
      let productData = null
      
      if (item.products && Array.isArray(item.products) && item.products.length > 0) {
        const product = item.products[0]
        
        // Ensure we have valid product data
        if (product && product.id) {
          productData = {
            id: product.id,
            name: product.name ?? 'Unknown Product',
            image_url: product.image_url ?? null,
            images: Array.isArray(product.images) ? product.images : [],
          }
        }
      }
      
      return {
        id: item.id,
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        unit_price: typeof item.unit_price === 'number' ? item.unit_price : 0,
        product_id: item.product_id,
        products: productData,
      }
    })

    // Calculate totals
    const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalProductLines = orderItems.length

    return {
      id: o.id,
      total: typeof o.total === 'number' ? o.total : 0,
      status: o.status ?? 'pending',
      delivery_status: o.delivery_status ?? 'order_placed',
      delivery_steps: Array.isArray(o.delivery_steps) ? o.delivery_steps : [],
      bkash_trx_id: o.bkash_trx_id ?? null,
      bkash_invoice: o.bkash_invoice ?? null,
      payment_method: o.payment_method ?? 'cod',
      created_at: o.created_at,
      user_id: o.user_id,
      delivery_address: o.delivery_address ?? null,
      phone: o.phone ?? null,
      customer_note: o.customer_note ?? null,
      order_items: orderItems,
      customer: profilesMap[o.user_id] ?? {
        id: o.user_id,
        full_name: null,
        email: null,
        phone: null
      },
      total_items_count: totalItemsCount,
      total_product_lines: totalProductLines,
    }
  })

  return <AdminOrdersClient orders={enrichedOrders} />
}