// app/(customer)/cart/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import ProductGrid from '@/app/components/product/ProductGrid'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'

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
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl animate-fade-in-up">
            <h1
              className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Shop with <span className="text-orange-500">Confidence</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
              Quality products delivered fast across Bangladesh. Secure bKash payments, transparent pricing.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { icon: '🚚', text: 'Free delivery over ৳1000' },
                { icon: '🔒', text: 'Secure bKash payments' },
                { icon: '🔄', text: '7-day easy returns' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-full border border-white/10">
                  <span>{icon}</span>
                  <span className="text-slate-200">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">All Products</h2>
            {products && (
              <p className="text-sm text-slate-400 mt-0.5">{products.length} items available</p>
            )}
          </div>
        </div>
        <ProductGrid products={products ?? []} />
      </main>

      <Footer />
    </div>
  )
}