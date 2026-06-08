// app/(customer)/orders/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import BottomNav from '@/app/components/layout/BottomNav'
import OrderCard from '@/app/components/order/OrderCard'
import EmptyState from '@/app/components/ui/EmptyState'
import SectionHeader from '@/app/components/ui/SectionHeader'
import PageWrapper from '@/app/components/layout/PageWrapper'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Orders',
  description: 'View and track your order history, delivery status, and receipts on Bushal.',
  robots: { index: false, follow: true }, // Keep order pages out of public search results for privacy
}

export default async function CustomerOrdersPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(id, quantity, unit_price, products(name, image_url, images))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  const mapped = (orders ?? []).map((order) => ({
    id: order.id,
    status: order.delivery_status ?? order.status,
    created_at: order.created_at,
    total: order.total,
    items: (order.order_items ?? []).map((oi: any) => ({
      id: oi.id,
      name: oi.products?.name ?? 'Product',
      image_url: (Array.isArray(oi.products?.images) && oi.products.images[0]) || oi.products?.image_url || null,
      quantity: oi.quantity,
      price: oi.unit_price,
    })),
  }))

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      
      <PageWrapper maxWidth="2xl" className="pb-28 md:pb-12">
        <SectionHeader
          title="My Orders"
          subtitle={`${mapped.length} order${mapped.length !== 1 ? 's' : ''} placed`}
        />

        {mapped.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="No orders yet"
            description="Start shopping and your orders will appear here."
            action={
              <Link href="/dashboard" className="btn-copper text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
                Browse Products
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {mapped.map((order) => (
              <OrderCard key={order.id} order={order as any} />
            ))}
          </div>
        )}
      </PageWrapper>

      <BottomNav />
    </div>
  )
}