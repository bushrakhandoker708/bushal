// app/(admin)/admin/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminOverviewClient from '@/app/components/admin/AdminOverviewClient'

export default async function AdminDashboardPage() {
  const supabase = createServerClient()
  
  const [
    { count: productCount },
    { count: orderCount },
    { count: userCount },
    { data: products },
    { data: orders },
    { data: recentOrdersRaw },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('id, name, price, stock_quantity, in_stock, images, image_url, category').order('stock_quantity', { ascending: true }).limit(50),
    supabase.from('orders').select('total, status, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('orders').select('id, total, status, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  // ── Revenue metrics ──────────────────────────────────────────────────────────
  const fulfilledOrders = (orders ?? []).filter((o) => o.status === 'fulfilled')
  const totalRevenue = fulfilledOrders.reduce((sum, o) => sum + Number(o.total), 0)
  const pendingOrders = (orders ?? []).filter((o) => o.status === 'pending').length
  const cancelledOrders = (orders ?? []).filter((o) => o.status === 'cancelled').length

  // ── Stock metrics ────────────────────────────────────────────────────────────
  const outOfStock = (products ?? []).filter((p) => !p.in_stock).length
  const lowStock = (products ?? []).filter((p) => p.in_stock && p.stock_quantity <= 5).length
  const healthyStock = (productCount ?? 0) - outOfStock - lowStock

  // ── Category breakdown ───────────────────────────────────────────────────────
  const catMap: Record<string, number> = {}
  for (const p of products ?? []) {
    const cat = p.category ?? 'General'
    catMap[cat] = (catMap[cat] ?? 0) + 1
  }
  const catColors = ['#B87333', '#1B3A2D', '#2D5A42', '#3D7A5A', '#D4954A', '#6B6B65']
  const catEntries = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: catColors[i % catColors.length],
    }))

  // ── Revenue by day (last 7 days) ─────────────────────────────────────────────
  const revenueByDay: Record<string, number> = {}
  const dayLabels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-BD', { weekday: 'short' })
    revenueByDay[key] = 0
    dayLabels.push(label)
  }
  for (const o of orders ?? []) {
    const day = o.created_at.slice(0, 10)
    if (day in revenueByDay && o.status === 'fulfilled') {
      revenueByDay[day] += Number(o.total)
    }
  }
  
  const revenuePoints = Object.values(revenueByDay)
  const revenueBarData = Object.entries(revenueByDay).map(([, v], i) => ({
    label: dayLabels[i],
    value: Math.round(v),
  }))

  // ── Orders by day ────────────────────────────────────────────────────────────
  const ordersByDay: Record<string, number> = {}
  for (const key of Object.keys(revenueByDay)) ordersByDay[key] = 0
  for (const o of orders ?? []) {
    const day = o.created_at.slice(0, 10)
    if (day in ordersByDay) ordersByDay[day]++
  }
  const orderPoints = Object.values(ordersByDay)

  // ── Top products by stock value ──────────────────────────────────────────────
  const topByValue = [...(products ?? [])]
    .sort((a, b) => b.price * b.stock_quantity - a.price * a.stock_quantity)
    .slice(0, 8)

  // ── Segments for Donuts ──────────────────────────────────────────────────────
  const inventorySegments = [
    { value: healthyStock, color: '#1B3A2D', label: 'Healthy' },
    { value: lowStock, color: '#D4954A', label: 'Low' },
    { value: outOfStock, color: '#C0392B', label: 'Out' },
  ]

  const orderSegments = [
    { value: fulfilledOrders.length, color: '#1B3A2D', label: 'Fulfilled' },
    { value: pendingOrders, color: '#D4954A', label: 'Pending' },
    { value: cancelledOrders, color: '#C0392B', label: 'Cancelled' },
  ]

  return (
    <AdminOverviewClient
      stats={{
        productCount: productCount ?? 0,
        orderCount: orderCount ?? 0,
        userCount: userCount ?? 0,
        totalRevenue,
        fulfilledOrdersCount: fulfilledOrders.length,
        pendingOrders,
        cancelledOrders,
        outOfStock,
        lowStock,
        healthyStock,
      }}
      revenueBarData={revenueBarData}
      revenuePoints={revenuePoints}
      orderPoints={orderPoints}
      orderSegments={orderSegments}
      catEntries={catEntries}
      inventorySegments={inventorySegments}
      topByValue={topByValue}
      recentOrders={recentOrdersRaw ?? []}
    />
  )
}