// app/(admin)/admin/page.tsx

// Server component for the Admin Overview page.
// Computes all complex metrics (daily trends, chart segments, stats)
// and passes them to the AdminOverviewClient.

import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import AdminOverviewClient from '@/app/components/admin/AdminOverviewClient'

export default async function AdminOverviewPage() {
  // 1. Ensure the user is an admin
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const supabase = await auth.supabase

  // 2. Fetch orders cleanly (NO profile joins to prevent visibility bugs)
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  // 3. Fetch products (strictly excluding soft-deleted ones)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .is('is_deleted', false)

  // 4. Fetch user count
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')

  const allOrders = orders || []
  const allProducts = products || []

  // ─── Compute Stats ─────────────────────────────────────────────────────────
  const totalRevenue = allOrders
    .filter(o => o.status === 'fulfilled' || o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0)
  
  const fulfilledOrdersCount = allOrders.filter(o => o.status === 'fulfilled' || o.status === 'delivered').length
  const pendingOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing').length
  const cancelledOrders = allOrders.filter(o => o.status === 'cancelled').length

  const healthyStock = allProducts.filter(p => p.stock_quantity > 5).length
  const lowStock = allProducts.filter(p => p.in_stock && p.stock_quantity > 0 && p.stock_quantity <= 5).length
  const outOfStock = allProducts.filter(p => !p.in_stock).length

  const stats = {
    productCount: allProducts.length,
    orderCount: allOrders.length,
    userCount: userCount || 0,
    totalRevenue,
    fulfilledOrdersCount,
    pendingOrders,
    cancelledOrders,
    outOfStock,
    lowStock,
    healthyStock,
  }

  // ─── Compute Daily Metrics (Last 7 days) ───────────────────────────────────
  const dailyMetrics = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const label = date.toLocaleDateString('en-BD', { weekday: 'short' })
    
    const dayOrders = allOrders.filter(o => o.created_at.startsWith(dateStr))
    const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const ordersCount = dayOrders.length
    const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0

    dailyMetrics.push({ label, revenue, orders: ordersCount, avgOrderValue })
  }

  // ─── Compute Order Segments (for Donut Chart) ──────────────────────────────
  // FIX: Correct colors for Order Status (Green for Fulfilled, Copper for Pending, Red for Cancelled)
  const orderSegments = [
    { value: fulfilledOrdersCount, color: '#2A7A4E', label: 'Fulfilled' }, // Green
    { value: pendingOrders, color: '#B07D2A', label: 'Pending' },         // Copper/Warning
    { value: cancelledOrders, color: '#C0392B', label: 'Cancelled' },     // Red
  ].filter(s => s.value > 0)

  // ─── Compute Category Entries (for Horizontal Bar Chart) ───────────────────
  const catMap: Record<string, number> = {}
  allProducts.forEach(p => {
    const cat = p.category || 'Uncategorized'
    catMap[cat] = (catMap[cat] || 0) + 1
  })
  const catColors = ['#B87333', '#1B3A2D', '#3B82F6', '#8B5CF6', '#F43F5E', '#10B981']
  const catEntries = Object.entries(catMap)
    .map(([label, value], i) => ({ label, value, color: catColors[i % catColors.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // ─── Compute Inventory Segments ────────────────────────────────────────────
  const inventorySegments = [
    { value: healthyStock, color: '#2A7A4E', label: 'Healthy' },
    { value: lowStock, color: '#B07D2A', label: 'Low' },
    { value: outOfStock, color: '#C0392B', label: 'Out' },
  ].filter(s => s.value > 0)

  // ─── Compute Top By Value ──────────────────────────────────────────────────
  const topByValue = [...allProducts]
    .map(p => ({ ...p, totalValue: (p.price || 0) * (p.stock_quantity || 0) }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 6)

  // ─── Compute Recent Orders ─────────────────────────────────────────────────
  // FIX: Map orders directly. We set customer name to 'Guest' to avoid 
  // rendering errors if the profile join was removed.
  const recentOrders = allOrders.slice(0, 8).map(o => ({
    id: o.id,
    created_at: o.created_at,
    total: o.total,
    status: o.status,
    customer: { name: 'Guest' } 
  }))

  return (
    <AdminOverviewClient
      stats={stats}
      dailyMetrics={dailyMetrics}
      orderPoints={[]}
      orderSegments={orderSegments}
      catEntries={catEntries}
      inventorySegments={inventorySegments}
      topByValue={topByValue}
      recentOrders={recentOrders}
    />
  )
}
