// app/(customer)/dashboard/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import ProductGrid from '@/app/components/product/ProductGrid'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import { formatPrice } from '@/app/lib/utils/formatPrice'

export default async function DashboardPage() {
  const supabase = createServerClient()

  const { data: products, error } = await supabase
    .from('products')
    .select(`*, comments ( rating )`)
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching products:', error)

  const allProducts = products ?? []

  const newArrivals = allProducts.slice(0, 4)

  const discounted = allProducts
    .filter((p) => p.discount_percent && p.discount_percent > 0 && p.in_stock)
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/25 rounded-full px-4 py-1.5 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-orange-300 text-xs font-semibold tracking-wide uppercase">
                  Free delivery on orders over ৳1,000
                </span>
              </div>

              <h1
                className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-6"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Quality you can{' '}
                <span className="relative">
                  <span className="text-orange-500">trust.</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path d="M2 6C50 2 100 2 198 6" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4"/>
                  </svg>
                </span>
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
                Handpicked products delivered fast across Bangladesh. Secure bKash payments, real reviews, zero surprises.
              </p>

              <div className="flex flex-wrap gap-5">
                {[
                  { value: String(allProducts.filter(p => p.in_stock).length) + '+', label: 'Products in stock' },
                  { value: '64', label: 'Districts covered' },
                  { value: '24h', label: 'Delivery in Dhaka' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="text-2xl font-extrabold text-white">{s.value}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-3">
              {newArrivals.map((p, i) => {
                const cover = (Array.isArray(p.images) && p.images[0]) || p.image_url
                const discountedPrice = p.discount_percent
                  ? p.price * (1 - p.discount_percent / 100)
                  : null
                return (
                  <a
                    key={p.id}
                    href={`/product/${p.id}`}
                    className={`group relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/50 hover:border-orange-500/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-900/20 ${i === 0 ? 'row-span-2' : ''}`}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={p.name}
                        className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${i === 0 ? 'h-72' : 'h-32'}`}
                      />
                    ) : (
                      <div className={`w-full bg-slate-700 flex items-center justify-center text-slate-600 ${i === 0 ? 'h-72' : 'h-32'}`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-1">{p.name}</p>
                      <p className="text-orange-400 text-xs font-bold mt-0.5">
                        {formatPrice(discountedPrice ?? p.price)}
                      </p>
                    </div>
                    {p.discount_percent ? (
                      <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        -{p.discount_percent}%
                      </span>
                    ) : null}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="bg-slate-800 border-y border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-x-8 gap-y-3 py-3.5">
            {[
              { icon: '🚚', text: 'Free delivery over ৳1,000' },
              { icon: '🔒', text: 'Secured by bKash & SSL' },
              { icon: '🔄', text: '7-day hassle-free returns' },
              { icon: '📞', text: '24/7 customer support' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                <span className="text-base">{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hot deals ── */}
      {discounted.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-3.5 py-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-rose-600 text-xs font-bold uppercase tracking-wide">Hot Deals</span>
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {discounted.map((p) => {
              const cover = (Array.isArray(p.images) && p.images[0]) || p.image_url
              const discountedPrice = p.price * (1 - (p.discount_percent ?? 0) / 100)
              const saved = p.price - discountedPrice
              return (
                <a
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="group flex gap-4 items-center bg-white rounded-2xl border border-slate-200 p-3.5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100 transition-all duration-200"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {cover ? (
                      <img src={cover} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1.5">
                      -{p.discount_percent}% OFF
                    </span>
                    <p className="text-slate-900 text-sm font-semibold leading-tight line-clamp-2 mb-1.5">{p.name}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-orange-600 font-bold text-base">{formatPrice(discountedPrice)}</span>
                      <span className="text-slate-400 text-xs line-through">{formatPrice(p.price)}</span>
                    </div>
                    <p className="text-emerald-600 text-xs font-semibold mt-0.5">You save {formatPrice(saved)}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All products ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">All Products</h2>
          {allProducts.length > 0 && (
            <span className="text-sm text-slate-400 font-medium">{allProducts.length} items</span>
          )}
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <ProductGrid products={allProducts} />
      </main>

      <Footer />
    </div>
  )
}