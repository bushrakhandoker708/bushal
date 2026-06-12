// app/components/home/HeroBanner.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  image_url: string | null
  images: string[]
}

interface TopProduct extends Product {
  total_sold: number
}

export default function HeroBanner() {
  const [topProduct, setTopProduct] = useState<TopProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    let active = true

    const fetchTopProduct = async () => {
      const supabase = createBrowserClient()
      try {
        const { data, error } = await supabase.rpc('get_top_selling_product')

        if (!active) return

        if (!error && data?.length) {
          setTopProduct(data[0])
          return
        }

        // Fallback: derive top seller from recent order items
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity, products (id, name, image_url, images)')
          .order('created_at', { ascending: false })
          .limit(500)

        if (!active) return

        if (orderItems?.length) {
          const tally: Record<string, { sold: number; product: Product }> = {}

          orderItems.forEach((item: any) => {
            const productId = item.product_id
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            if (!product) return
            if (!tally[productId]) tally[productId] = { sold: 0, product }
            tally[productId].sold += item.quantity ?? 0
          })

          const ranked = Object.values(tally).sort((a, b) => b.sold - a.sold)

          if (ranked.length) {
            const top = ranked[0]
            setTopProduct({
              id: top.product.id,
              name: top.product.name,
              image_url: top.product.image_url,
              images: top.product.images || [],
              total_sold: top.sold,
            })
          }
        }
      } catch {
        /* silent — hero degrades gracefully */
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchTopProduct()
    return () => {
      active = false
    }
  }, [])

  const productImage =
    topProduct && !imageError ? topProduct.images?.[0] || topProduct.image_url : null

  return (
    <section className="relative overflow-hidden mb-12 md:mb-16  ">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c1d15] via-bushal-forest to-[#234936]" />

      {/* Grain texture for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '160px 160px',
        }}
      />

      {/* Soft glow accents */}
      <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-bushal-copper/20 blur-[110px] animate-pulse-soft" />
      <div className="absolute -bottom-40 -left-20 w-[24rem] h-[24rem] rounded-full bg-bushal-forestLight/25 blur-[120px] animate-pulse-soft" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-16 md:py-24 lg:py-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* ── Left: Copy ── */}
        <div className="flex flex-col">


          {/* Headline */}
          <h1
            className="animate-fade-up font-heading font-semibold text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[1.05] text-bushal-ivory"
            style={{ animationDelay: '80ms' }}
          >
            Heritage Quality,
            <span className="block bg-gradient-to-r from-bushal-copperGlow via-bushal-copperLight to-bushal-copper bg-clip-text text-transparent">
              Delivered with Care.
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="animate-fade-up mt-6 max-w-md text-[15px] sm:text-base leading-relaxed text-bushal-ivory/60 font-body"
            style={{ animationDelay: '160ms' }}
          >
            Handpicked, heritage-quality goods curated for Bangladesh — transparent
            pricing, genuine care, and every detail considered.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href="#products"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-bushal-copper to-bushal-copperLight px-7 py-3.5 text-sm font-semibold text-white shadow-copper transition-all duration-300 hover:shadow-copperHover hover:-translate-y-0.5"
            >
              Explore Collection
              <svg
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-bushal-ivory/80 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-bushal-ivory"
            >
              Track Order
            </Link>
          </div>

          {/* Trust strip */}
          <div
            className="animate-fade-up mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-6"
            style={{ animationDelay: '320ms' }}
          >
            <TrustItem
              icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              label="Secure bKash Payments"
            />
            <TrustItem
              icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              label="Free Delivery on ৳1000+"
            />
            <TrustItem
              icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              label="4.9 / 5 Customer Rating"
            />
          </div>
        </div>

        {/* ── Right: Product showcase ── */}
        <div
          className="animate-fade-up relative mx-auto w-full max-w-[720px] lg:max-w-[760px] aspect-square"
          style={{ animationDelay: '120ms' }}
        >
          {/* Decorative rings */}
          <div className="absolute inset-0 rounded-full border border-bushal-copperGlow/15" />
          <div className="absolute inset-6 rounded-full border border-dashed border-bushal-copperGlow/10" />

          {/* Image frame */}
          <div className="absolute inset-[10%] rounded-full overflow-hidden bg-[#0c1d15] shadow-[0_30px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(240,185,106,0.15),0_0_0_1px_rgba(184,115,51,0.25)] animate-float">
            {productImage ? (
              <Link href={`/product/${topProduct!.id}`} className="group/img relative block h-full w-full">
                <img
                  src={productImage}
                  alt={topProduct!.name}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                  style={{
                    filter: imageLoaded ? 'brightness(0.94) saturate(1.08)' : 'blur(14px) brightness(0.4)',
                    transition: 'filter 0.8s ease, transform 0.7s ease',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                {/* Best seller badge */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-bushal-copper/40 bg-black/60 px-3.5 py-1.5 backdrop-blur-md">
                  <svg className="h-3 w-3 text-bushal-copperGlow" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-bushal-copperGlow font-body">
                    Best Seller
                  </span>
                  <span className="text-[10px] font-mono text-bushal-ivory/50">
                    · {topProduct!.total_sold} sold
                  </span>
                </div>
              </Link>
            ) : loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-bushal-copper/20 border-t-bushal-copperGlow" />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-heading text-7xl font-black text-bushal-copperGlow/80">B</span>
              </div>
            )}
          </div>

          {/* Floating: Premium badge */}
          <div
            className="animate-float absolute -top-2 -left-4 sm:-left-8 hidden sm:block rounded-2xl border border-bushal-copperGlow/15 bg-[#0c1d15]/90 px-4 py-3 shadow-[0_14px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-bushal-copper/20">
                <svg className="h-3.5 w-3.5 text-bushal-copperGlow" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-bushal-ivory/90 font-body">
                Premium
              </span>
            </div>
            <p className="text-[10px] leading-snug text-bushal-ivory/40 font-body">Heritage-grade goods</p>
          </div>

          {/* Floating: Live status */}
          <div
            className="animate-float absolute -bottom-4 -right-2 sm:-right-6 rounded-2xl border border-bushal-copperGlow/15 bg-[#0c1d15]/90 px-4 py-3 shadow-[0_14px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            style={{ animationDelay: '1.1s' }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-bushal-copperLight font-body">
                Live Status
              </span>
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[8px] font-bold font-mono text-emerald-400">LIVE</span>
              </div>
            </div>
            <p className="text-[10px] text-bushal-ivory/40 font-body">Orders shipping now</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg className="h-4 w-4 flex-shrink-0 text-bushal-copperGlow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
      </svg>
      <span className="text-[11px] font-medium text-bushal-ivory/50 font-body">{label}</span>
    </div>
  )
}