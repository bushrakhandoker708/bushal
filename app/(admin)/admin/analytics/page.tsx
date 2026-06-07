// app/(admin)/admin/analytics/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminAnalyticsClient from '@/app/components/admin/AdminAnalyticsClient'

export default async function AdminAnalyticsPage() {
  const supabase = createServerClient()

  const [
    { data: products },
    { data: orders },
    { data: orderItems },
    { data: expenses },
    { count: totalCustomers },
    { data: categories },
  ] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('order_items').select('*'),
    supabase.from('product_expenses').select('*'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('categories').select('*'),
  ])

  const allProducts = products ?? []
  const allOrders = orders ?? []
  const allItems = orderItems ?? []
  const allExpenses = expenses ?? []

  const fulfilledOrders = allOrders.filter((o) => o.status === 'fulfilled')
  const totalRevenue = fulfilledOrders.reduce((s, o) => s + Number(o.total), 0)
  const pendingOrders = allOrders.filter((o) => o.status === 'pending').length
  const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled').length

  const productCostMap: Record<string, number> = {}
  const productDeliveryMap: Record<string, number> = {}
  allProducts.forEach((p) => {
    productCostMap[p.id] = Number(p.cost_price ?? 0)
    productDeliveryMap[p.id] = Number(p.delivery_charge ?? 0)
  })

  const fulfilledOrderIds = new Set(fulfilledOrders.map((o) => o.id))
  const fulfilledItems = allItems.filter((i) => fulfilledOrderIds.has(i.order_id))

  const totalCOGS = fulfilledItems.reduce((s, item) => s + (productCostMap[item.product_id] ?? 0) * item.quantity, 0)
  const totalDeliveryCharges = fulfilledItems.reduce((s, item) => s + (productDeliveryMap[item.product_id] ?? 0) * item.quantity, 0)
  const totalExtraCosts = allExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalProfit = totalRevenue - totalCOGS - totalDeliveryCharges - totalExtraCosts

  const outOfStock = allProducts.filter((p) => !p.in_stock).length
  const lowStock = allProducts.filter((p) => p.in_stock && p.stock_quantity <= 5).length

  const dailyRevenue = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayOrders = allOrders.filter((o) => o.created_at.startsWith(key))
    const dayFulfilled = dayOrders.filter((o) => o.status === 'fulfilled')
    dailyRevenue.push({
      date: d.toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric' }),
      revenue: dayFulfilled.reduce((s, o) => s + Number(o.total), 0),
      orders: dayOrders.length,
    })
  }

  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-BD', { month: 'short', year: '2-digit' })
    const monthFulfilled = allOrders.filter((o) => o.created_at.startsWith(key) && o.status === 'fulfilled')
    const monthRevenue = monthFulfilled.reduce((s, o) => s + Number(o.total), 0)
    
    const monthOrderIds = new Set(monthFulfilled.map((o) => o.id))
    const monthItems = allItems.filter((i) => monthOrderIds.has(i.order_id))
    const monthCOGS = monthItems.reduce((s, i) => s + (productCostMap[i.product_id] ?? 0) * i.quantity, 0)
    const monthDelivery = monthItems.reduce((s, i) => s + (productDeliveryMap[i.product_id] ?? 0) * i.quantity, 0)
    
    monthlyData.push({ label, revenue: monthRevenue, cost: monthCOGS + monthDelivery, profit: monthRevenue - monthCOGS - monthDelivery })
  }

  const categoryPerformance = categories?.map((cat) => {
    const catProductIds = new Set(allProducts.filter((p) => p.category === cat.name).map((p) => p.id))
    const catItems = fulfilledItems.filter((i) => catProductIds.has(i.product_id))
    return {
      name: cat.name,
      revenue: catItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0),
      units: catItems.reduce((s, i) => s + i.quantity, 0),
      products: allProducts.filter((p) => p.category === cat.name).length,
    }
  }).sort((a, b) => b.revenue - a.revenue) || []

  const productRevenue: Record<string, number> = {}
  const productUnits: Record<string, number> = {}
  fulfilledItems.forEach((item) => {
    productRevenue[item.product_id] = (productRevenue[item.product_id] ?? 0) + (item.unit_price * item.quantity)
    productUnits[item.product_id] = (productUnits[item.product_id] ?? 0) + item.quantity
  })

  const topProducts = allProducts
    .map((p) => ({ id: p.id, name: p.name, revenue: productRevenue[p.id] ?? 0, units: productUnits[p.id] ?? 0, image_url: p.image_url, images: p.images }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const recentActivity = allOrders.slice(0, 10).map((o) => ({
    id: o.id, total: Number(o.total), status: o.status, created_at: o.created_at,
    itemCount: allItems.filter((i) => i.order_id === o.id).reduce((s, i) => s + i.quantity, 0),
    customer: 'Customer', 
  }))

  const summary = {
    totalRevenue, totalCOGS, totalDeliveryCharges, totalExtraCosts, totalProfit,
    productsAdded30d: allProducts.filter(p => (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 30).length,
    soldIn30d: fulfilledItems.filter(i => { const o = allOrders.find(x => x.id === i.order_id); return o && (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 30 }).reduce((s, i) => s + i.quantity, 0),
    recentProfit30d: monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].profit : 0,
    totalInventoryValue: allProducts.reduce((s, p) => s + p.price * (p.stock_quantity ?? 0), 0),
    fulfilledOrdersCount: fulfilledOrders.length, pendingOrders, cancelledOrders, outOfStock, lowStock,
    totalCustomers: totalCustomers ?? 0,
    avgOrderValue: fulfilledOrders.length > 0 ? totalRevenue / fulfilledOrders.length : 0,
    conversionRate: 0, 
  }

  return (
    <AdminAnalyticsClient
      summary={summary}
      dailyRevenue={dailyRevenue}
      monthlyData={monthlyData}
      topProducts={topProducts}
      categoryPerformance={categoryPerformance}
      recentActivity={recentActivity}
      products={allProducts.map(p => ({ id: p.id, name: p.name, cost_price: p.cost_price, delivery_charge: p.delivery_charge, price: p.price }))}
      expenses={allExpenses}
    />
  )
}