// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

// GET: Fetch full order details for the admin view
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const supabase = auth.supabase
  const { id } = params

  // Fetch order with joined customer profile data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      profiles:user_id (full_name, email, phone)
    `)
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Fetch order items with full product details (including cost_price for profit calc)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      products (
        name,
        image_url,
        images,
        cost_price,
        delivery_charge
      )
    `)
    .eq('order_id', id)

  if (itemsError) {
    return NextResponse.json({ error: 'Failed to load order items' }, { status: 500 })
  }

  // Transform items to match the AdminOrderDetail component interface
  const detailedItems = (items ?? []).map((item: any) => {
    const product = item.products?.[0] ?? {}
    const subtotal = item.quantity * item.unit_price
    const cost = (product.cost_price ?? 0) * item.quantity
    const delivery = (product.delivery_charge ?? 0) * item.quantity
    
    return {
      id: item.id,
      product_id: item.product_id,
      product_name: product.name ?? 'Unknown Product',
      product_image: product.images?.[0] ?? product.image_url ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: product.cost_price ?? null,
      delivery_charge: product.delivery_charge ?? null,
      subtotal,
      item_profit: subtotal - cost - delivery
    }
  })

  // Construct the final response object
  const response = {
    id: order.id,
    user_id: order.user_id,
    customer_name: order.profiles?.full_name ?? null,
    customer_email: order.profiles?.email ?? null,
    customer_phone: order.profiles?.phone ?? null,
    delivery_address: order.delivery_address ?? null,
    delivery_address_obj: null, // Can be populated if you link addresses table directly to orders
    customer_note: order.customer_note ?? null,
    phone: order.phone ?? null,
    payment_method: order.payment_method ?? 'cod',
    bkash_invoice: order.bkash_invoice ?? null,
    total: order.total,
    status: order.status,
    delivery_status: order.delivery_status,
    delivery_steps: order.delivery_steps ?? [],
    inventory_reduced: order.inventory_reduced ?? false,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: detailedItems
  }

  return NextResponse.json(response)
}

// PATCH: Update order status (calls the atomic stock reduction RPC)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const { id } = params
  const { status } = await request.json()

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  const supabase = auth.supabase

  // Call the atomic RPC to update status, append timeline step, and reduce stock exactly once
  const { data, error } = await supabase.rpc('confirm_order_and_reduce_stock', {
    p_order_id: id,
    p_new_status: status
  })

  if (error) {
    console.error('RPC Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}