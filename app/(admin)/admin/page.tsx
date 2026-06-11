// app/(admin)/admin/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminOverviewClient from '@/app/components/admin/AdminOverviewClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboardPage() {
  const supabase = createServerClient()

  const [
    productsResult,
    ordersResult,
    usersResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, stock_quantity, in_stock, images, image_url, category, created_at'),
    supabase
      .from('orders')
      .select('id, total, status, delivery_status, created_at, user_id'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select(`
        id,
        total,
        status,
        delivery_status,
        created_at,
        user_id,
        profiles (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const products = productsResult.data ?? []
  const orders   = ordersResult.data ?? []
  const recent   = recentOrdersResult.data ?? []

  // ── Revenue ─────────────────────────────────────────────────────────────────
  const fulfilledOrders = orders.filter(
    o => o.delivery_status === 'delivered' || o.status === 'fulfilled'
  )
  const totalRevenue = fulfilledOrders.reduce((s, o) => s + Number(o.total), 0)

  const pendingOrders = orders.filter(o =>
    ['order_placed', 'confirmed', 'processing'].includes(o.delivery_status ?? o.status ?? '')
  ).length

  const cancelledOrders = orders.filter(o =>
    o.status === 'cancelled' || o.delivery_status === 'cancelled'
  ).length

  // ── Stock ────────────────────────────────────────────────────────────────────
  const outOfStock  = products.filter(p => !p.in_stock || p.stock_quantity === 0).length
  const lowStock    = products.filter(p => p.in_stock && p.stock_quantity > 0 && p.stock_quantity <= 5).length
  const healthyStock = products.length - outOfStock - lowStock

  // ── Categories ───────────────────────────────────────────────────────────────
  const catMap: Record<string, number> = {}
  for (const p of products) {
    const cat = p.category ?? 'General'
    catMap[cat] = (catMap[cat] ?? 0) + 1
  }
  const catColors = ['#B87333', '#1B3A2D', '#2D5A42', '#3D7A5A', '#D4954A', '#6B6B65', '#8B5CF6']
  const catEntries = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value], i) => ({ label, value, color: catColors[i % catColors.length] }))

  // ── Daily Metrics — last 7 days ──────────────────────────────────────────────
  const dailyMetrics = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key   = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-BD', { weekday: 'short' })

    const dayOrders  = orders.filter(o => o.created_at.slice(0, 10) === key)
    const dayRevenue = dayOrders
      .filter(o => o.status === 'fulfilled' || o.delivery_status === 'delivered')
      .reduce((s, o) => s + Number(o.total), 0)
    const dayCount   = dayOrders.length
    const avgOrderValue = dayCount > 0 ? dayRevenue / dayCount : 0

    return { label, revenue: dayRevenue, orders: dayCount, avgOrderValue }
  })

  // ── Order sparkline points ───────────────────────────────────────────────────
  const orderPoints = dailyMetrics.map(d => d.orders)

  // ── Donut segments ───────────────────────────────────────────────────────────
  const orderSegments = [
    { value: fulfilledOrders.length, color: '#1B3A2D', label: 'Fulfilled' },
    { value: pendingOrders,          color: '#D4954A', label: 'Pending'   },
    { value: cancelledOrders,        color: '#C0392B', label: 'Cancelled' },
  ]

  const inventorySegments = [
    { value: healthyStock, color: '#1B3A2D', label: 'Healthy' },
    { value: lowStock,     color: '#D4954A', label: 'Low'     },
    { value: outOfStock,   color: '#C0392B', label: 'Out'     },
  ]

  // ── Top products by stock value ──────────────────────────────────────────────
  const topByValue = [...products]
    .sort((a, b) => b.price * b.stock_quantity - a.price * a.stock_quantity)
    .slice(0, 8)

  // ── Format recent orders ─────────────────────────────────────────────────────
  const recentOrders = recent.map(o => ({
    id:         o.id,
    total:      o.total,
    status:     o.delivery_status ?? o.status,
    created_at: o.created_at,
    customer: {
      name:  (o.profiles as any)?.full_name ?? 'Guest',
      email: (o.profiles as any)?.email ?? '',
    },
  }))

  return (
    <AdminOverviewClient
      stats={{
        productCount:        products.length,
        orderCount:          orders.length,
        userCount:           usersResult.count ?? 0,
        totalRevenue,
        fulfilledOrdersCount: fulfilledOrders.length,
        pendingOrders,
        cancelledOrders,
        outOfStock,
        lowStock,
        healthyStock,
      }}
      dailyMetrics={dailyMetrics}
      orderPoints={orderPoints}
      orderSegments={orderSegments}
      catEntries={catEntries}
      inventorySegments={inventorySegments}
      topByValue={topByValue}
      recentOrders={recentOrders}
    />
  )
}