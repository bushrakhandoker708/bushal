'use client'

// app/components/dashboard/HotDealsGrid.tsx
import Link from 'next/link'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import SectionHeader from '@/app/components/ui/SectionHeader'
import { formatPrice } from '@/app/lib/utils/formatPrice'

interface Product {
  id: string
  name: string
  price: number
  discount_percent?: number | null
  images?: string[]
  image_url?: string
  in_stock?: boolean
}

interface Props {
  discounted: Product[]
}

export default function HotDealsGrid({ discounted }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="mb-12" ref={ref}>
      <SectionHeader
        title="Hot Deals"
        subtitle="Limited-time discounts on curated picks"
        action={
          <Link
            href="#products"
            className="text-sm font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors flex items-center gap-1 group"
          >
            See all
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="inline-block"
            >
              →
            </motion.span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {discounted.map((p, i) => {
          const cover = (Array.isArray(p.images) && p.images[0]) || p.image_url
          const discountedPrice = p.price * (1 - (p.discount_percent ?? 0) / 100)
          const saved = p.price - discountedPrice

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: i * 0.1,
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Link
                href={`/product/${p.id}`}
                className="group flex gap-4 items-center bg-bushal-surface rounded-2xl border border-bushal-border p-3.5 shadow-card hover:shadow-cardHover hover:border-bushal-borderMid transition-all duration-300 relative overflow-hidden"
              >
                {/* Animated hover shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-bushal-copper/[0.04] to-transparent" />
                </div>

                {/* Image */}
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-20 h-20 rounded-xl overflow-hidden bg-bushal-ivoryDeep flex-shrink-0 border border-bushal-border"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </motion.div>

                {/* Info */}
                <div className="flex-1 min-w-0 relative z-10">
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ delay: i * 0.1 + 0.5, duration: 0.5 }}
                    className="inline-block bg-bushal-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5"
                  >
                    -{p.discount_percent}% OFF
                  </motion.div>

                  <p className="text-bushal-ink text-sm font-semibold leading-tight line-clamp-2 mb-1.5">
                    {p.name}
                  </p>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-bushal-forest font-bold text-base">
                      {formatPrice(discountedPrice)}
                    </span>
                    <span className="text-bushal-inkSoft text-xs line-through">
                      {formatPrice(p.price)}
                    </span>
                  </div>

                  <p className="text-bushal-success text-xs font-semibold mt-0.5">
                    Save {formatPrice(saved)}
                  </p>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}