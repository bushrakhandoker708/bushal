// app/(customer)/dashboard/page.tsx

import { createServerClient } from '@/lib/supabase/server'


import ProductGrid from '@/app/components/product/ProductGrid'
import Navbar from '@/app/components/layout/Navbar'

export default async function DashboardPage() {
  const supabase = createServerClient()

  const { data: products, error } = await supabase
  .from('products')
  .select(`
    *,
    comments (
      rating
    )
  `)
  .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching products:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">All Products</h1>
        <ProductGrid products={products ?? []} />
      </main>
    </div>
  )
}