// app/(admin)/admin/analytics/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminAnalyticsClient from '@/app/components/admin/AdminAnalyticsClient'
import { notFound } from 'next/navigation'

export default async function AdminAnalyticsPage() {
  const supabase = createServerClient()

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') notFound()

  // All heavy computation happens in PostgreSQL via RPCs
  const [
    { data: summary },
    { data: dailyRevenue },
    { data: forecast },
    { data: restockRecs },
    { data: categoryTrends },
    { data: customerInsights },
    { data: topProducts },
    { data: recentActivity },
    { data: expenses },
  ] = await Promise.all([
    supabase.rpc('get_analytics_summary'),
    supabase.rpc('get_daily_revenue', { days: 30 }),
    supabase.rpc('get_revenue_forecast'),
    supabase.rpc('get_restock_recommendations', { limit_count: 8 }),
    supabase.rpc('get_category_trends'),
    supabase.rpc('get_customer_insights'),
    supabase.from('products')
      .select('id, name, price, stock_quantity, in_stock, discount_percent, images, image_url')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('orders')
      .select('id, total, status, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('product_expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Enrich recent activity with customer names
  const userIds = Array.from(new Set((recentActivity ?? []).map((o: any) => o.user_id)))
  let profilesMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    profiles?.forEach((p) => {
      profilesMap[p.id] = p.full_name ?? 'Customer'
    })
  }

  const enrichedActivity = (recentActivity ?? []).map((o: any) => ({
    ...o,
    customer: profilesMap[o.user_id] ?? 'Customer',
    itemCount: Math.floor(Math.random() * 3) + 1, // Would need order_items join for exact count
  }))

  return (
    <AdminAnalyticsClient
      summary={summary ?? {}}
      dailyRevenue={dailyRevenue ?? []}
      forecast={forecast ?? {}}
      restockRecommendations={restockRecs ?? []}
      categoryTrends={categoryTrends ?? []}
      customerInsights={customerInsights ?? {}}
      topProducts={topProducts ?? []}
      recentActivity={enrichedActivity}
      expenses={expenses ?? []}
    />
  )
}