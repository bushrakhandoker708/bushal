// app/(customer)/dashboard/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import BottomNav from '@/app/components/layout/BottomNav'
import HeroBanner from '@/app/components/home/HeroBanner'
import SectionHeader from '@/app/components/ui/SectionHeader'
import PageWrapper from '@/app/components/layout/PageWrapper'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import CategoryFilter from '@/app/components/dashboard/CatagoryFilter'
import VerificationToast from '@/app/components/dashboard/VerificationToast'
import TrendingNow from '@/app/components/dashboard/TrendingNow'
import HotDealsGrid from '@/app/components/dashboard/HotDealsGrid'


export const metadata: Metadata = {
  title: 'Home — Premium Curated Products',
  description:
    'Shop heritage-quality, handpicked products at Bushal. Fast delivery across Bangladesh, secure bKash payments, and transparent pricing.',
  openGraph: {
    title: 'Bushal — Shop Premium Curated Products',
    description:
      'Heritage-quality goods delivered across Bangladesh. Transparent pricing & secure bKash payments.',
    url: 'https://bushal.vercel.app/dashboard',
  },
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: products, error } = await supabase
    .from('products')
    .select(`*, comments ( rating )`)
    .is('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching products:', error)
  const allProducts = products ?? []

  const discounted = allProducts
    .filter((p) => p.discount_percent && p.discount_percent > 0 && p.in_stock)
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-bushal-ivory overflow-x-hidden">
      <VerificationToast />
      <Navbar />
      <HeroBanner />

      <PageWrapper maxWidth="7xl" className="pb-28 md:pb-16">


        {/* ── Trending Products ── */}
        <TrendingNow className="mt-0 lg:mt-8" limit={8} />

        {/* ── Hot Deals ── */}
        {discounted.length > 0 && (
          <HotDealsGrid discounted={discounted} />
        )}

        {/* ── All Products ── */}
        <section id="products" className="relative">
          <SectionHeader
            title="All Products"
            subtitle={`${allProducts.length} items available`}
          />
          <CategoryFilter products={allProducts} />
        </section>
      </PageWrapper>

      <Footer />
      <BottomNav />
    </div>
  )
}