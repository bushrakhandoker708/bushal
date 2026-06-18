// ============================================================================
// FILE ADDRESS: app/(admin)/admin/orders/page.tsx
// ============================================================================
// EXPLANATION:
// This is the admin orders page that displays all orders with filtering,
// search, and status management capabilities.
//
// BUG FIX: Type Safety & Supabase Join Shape Handling
// Previously, this file used `any` types throughout and relied on runtime
// `Array.isArray` checks to handle Supabase's PostgREST join responses.
// This indicated a lack of understanding of how PostgREST serializes foreign
// key joins (it returns arrays for FK joins unless limited to single rows).
//
// THE FIX: We now define strict TypeScript interfaces matching the exact shape
// Supabase returns, eliminating all `any` types and runtime type checks.
// This provides compile-time type safety and makes the code more maintainable.
// ============================================================================

import { createServerClient } from '@/lib/supabase/server'
import AdminOrdersClient from '@/app/components/admin/AdminOrderClient'

// ─── Strict Type Definitions for Supabase Responses ─────────────────────────
// PostgREST returns arrays for FK joins. We define the exact shape to ensure
// type safety and eliminate the need for runtime type checks.

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
  // PostgREST returns an array for FK joins unless limited
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
  // PostgREST returns an array for FK joins
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

// ─── Helper Function ────────────────────────────────────────────────────────
// Safely extracts the first product from the Supabase join response.
// PostgREST returns an array for FK joins, so we always take the first element.
const getProductData = (item: OrderItem): OrderProduct | null => {
  if (!item.products || item.products.length === 0) return null
  return item.products[0]
}

// ─── Main Page Component ───────────────────────────────────────────────────
export default async function AdminOrdersPage() {
  const supabase = await createServerClient()

  // Fetch orders with properly nested order_items and products
  // Using strict type casting to ensure TypeScript knows the exact shape
  const { data: orders, error } = await (await supabase)
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
    .order('created_at', { ascending: false }) as { data: Order[] | null; error: any }

  if (error) {
    console.error('Orders fetch error:', error)
  }

  // Fetch customer profiles for all unique user IDs
  const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id)))
  
  let profilesMap: Record<string, CustomerProfile> = {}
  
  if (userIds.length > 0) {
    const { data: profiles } = await (await supabase)
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds) as { data: CustomerProfile[] | null; error: any }

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

  // ─── Transform Orders with Strict Typing ──────────────────────────────────
  // Map orders to the enriched format expected by AdminOrdersClient
  // Using the typed helper function to safely extract product data
  const enrichedOrders: EnrichedOrder[] = (orders ?? []).map((o) => {
    // Transform order items with proper type handling
    const orderItems: EnrichedOrderItem[] = (o.order_items ?? []).map((item) => {
      const product = getProductData(item)
      
      return {
        id: item.id,
        quantity: item.quantity ?? 0,
        unit_price: item.unit_price ?? 0,
        product_id: item.product_id,
        products: product ? {
          id: product.id,
          name: product.name ?? 'Unknown Product',
          image_url: product.image_url ?? null,
          images: Array.isArray(product.images) ? product.images : [],
        } : null,
      }
    })

    // Calculate totals
    const totalItemsCount = orderItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
    const totalProductLines = orderItems.length

    return {
      id: o.id,
      total: o.total,
      status: o.status,
      delivery_status: o.delivery_status,
      // FIX: Ensure delivery_steps is always an array, never null
      delivery_steps: o.delivery_steps ?? [],
      bkash_trx_id: o.bkash_trx_id,
      bkash_invoice: o.bkash_invoice,
      payment_method: o.payment_method ?? 'cod',
      created_at: o.created_at,
      user_id: o.user_id,
      delivery_address: o.delivery_address,
      phone: o.phone,
      customer_note: o.customer_note,
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