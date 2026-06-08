// app/(customer)/profile/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import ProfileClient from '@/app/components/profile/ProfileClient'
import PageWrapper from '@/app/components/layout/PageWrapper'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your Bushal account, view order history, and update your delivery details.',
  robots: { index: false, follow: true }, // Privacy: do not index user profile pages
}

export default async function ProfilePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select(`id, total, status, delivery_status, created_at, order_items(id, quantity, unit_price, products(name, image_url, images))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  
  // Redirect admins to the admin dashboard
  if (profile?.role === 'admin') redirect('/admin')
  
  const totalOrders = (orders ?? []).length
  const totalSpent = (orders ?? []).filter((o) => o.status === 'fulfilled').reduce((s, o) => s + Number(o.total), 0)
  const pendingOrders = (orders ?? []).filter((o) => o.status === 'pending').length
  const deliveredOrders = (orders ?? []).filter((o) => o.delivery_status === 'delivered').length
  
  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      
      <PageWrapper maxWidth="5xl" className="py-10 space-y-8 animate-fade-in-up">
        <ProfileClient
          profile={profile}
          orders={orders ?? []}
          stats={{ totalOrders, totalSpent, pendingOrders, deliveredOrders }}
        />
      </PageWrapper>
      
      <Footer />
    </div>
  )
}