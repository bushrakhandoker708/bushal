// app/(customer)/cart/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import ProductGrid from '@/app/components/product/ProductGrid'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import BottomNav from '@/app/components/layout/BottomNav'
import HeroBanner from '@/app/components/home/HeroBanner'
import SectionHeader from '@/app/components/ui/SectionHeader'

export default async function CartPage() {
  const supabase = createServerClient()

  const { data: products, error } = await supabase
    .from('products')
    .select(`*, comments ( rating )`)
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching products:', error)

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-12">
        <HeroBanner />

        <SectionHeader
          title="All Products"
          subtitle={products ? `${products.length} items available` : undefined}
        />

        <ProductGrid products={products ?? []} />
      </main>

      <Footer />
      <BottomNav />
    </div>
  )
}