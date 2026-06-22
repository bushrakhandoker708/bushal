// app/components/product/TrendingNow.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useSpring,
  useMotionValue,
} from 'framer-motion'
import Link from 'next/link'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendingProduct {
  product_id: string
  product_name: string
  category: string
  price: number
  image_url: string | null
  images: string[]
  in_stock: boolean
  trend_status: 'HOT' | 'TRENDING' | 'STABLE' | 'DECLINING'
  trend_score: number
  growth_percentage: number
  seven_day_total: number
}

interface Props {
  className?: string
  limit?: number
}

// ─── Live Pulse Dot ───────────────────────────────────────────────────────────
function PulseDot({ color = 'bg-bushal-danger' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-70', color)} />
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
    </span>
  )
}

// ─── Scroll Reveal ────────────────────────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  from = 'bottom',
  className,
}: {
  children: React.ReactNode
  delay?: number
  from?: 'bottom' | 'left' | 'right' | 'scale'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  const variants = {
    bottom: { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0 } },
    left:   { hidden: { opacity: 0, x: -32 }, visible: { opacity: 1, x: 0 } },
    right:  { hidden: { opacity: 0, x: 32 }, visible: { opacity: 1, x: 0 } },
    scale:  { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } },
  }[from]

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 60, damping: 18 })

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  useEffect(() =>
    spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix
    }),
  [spring, suffix])

  return <span ref={ref}>0{suffix}</span>
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────
function TrendBadge({ status }: { status: TrendingProduct['trend_status'] }) {
  const isHot = status === 'HOT'
  return (
    <motion.div
      className={cn(
        'absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-black tracking-[0.18em] uppercase backdrop-blur-md border shadow-lg',
        isHot
          ? 'bg-bushal-danger/90 text-white border-bushal-danger/30'
          : 'bg-bushal-warning/90 text-white border-bushal-warning/30'
      )}
      initial={{ opacity: 0, scale: 0.6, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
    >
      <motion.svg
        className="w-3 h-3"
        fill="currentColor"
        viewBox="0 0 24 24"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      >
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z" />
      </motion.svg>
      {status}
    </motion.div>
  )
}

// ─── Growth Chip ──────────────────────────────────────────────────────────────
function GrowthChip({ pct }: { pct: number }) {
  if (pct <= 0) return null
  return (
    <motion.div
      className="absolute bottom-3 right-3 flex items-center gap-1 bg-bushal-success/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-bushal-success/30 shadow-lg"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
      {pct.toFixed(0)}%
    </motion.div>
  )
}

// ─── Hero Trending Card (first slot, large) ───────────────────────────────────
function HeroTrendCard({ product, rank }: { product: TrendingProduct; rank: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [hovered, setHovered] = useState(false)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url

  return (
    <motion.div
      ref={ref}
      className="col-span-2 row-span-2 relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/product/${product.product_id}`}
        className="block relative rounded-3xl overflow-hidden bg-bushal-ivoryDeep h-full min-h-[420px] group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Parallax image */}
        {cover ? (
          <div className="absolute inset-0 overflow-hidden">
            <motion.img
              src={cover}
              alt={product.product_name}
              className="absolute inset-0 w-full h-full object-cover scale-110"
              style={{ y: imgY }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-bushal-ivoryDeep" />
        )}

        {/* Gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-bushal-ink/90 via-bushal-ink/30 to-transparent" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-bushal-danger/10 to-transparent"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        {/* Rank watermark */}
        <div className="absolute top-5 right-5 font-heading text-[72px] text-white/8 leading-none select-none pointer-events-none">
          #{rank}
        </div>

        {/* Badges */}
        <TrendBadge status={product.trend_status} />
        <GrowthChip pct={product.growth_percentage} />

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {product.category && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bushal-copper mb-2">
              {product.category}
            </p>
          )}
          <motion.h3
            className="font-heading text-3xl text-white leading-tight mb-2"
            animate={{ y: hovered ? -3 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {product.product_name}
          </motion.h3>
          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="font-heading text-2xl text-bushal-copperGlow font-semibold">
                {formatPrice(product.price)}
              </span>
              {product.seven_day_total > 0 && (
                <p className="text-[11px] text-white/50 mt-0.5">
                  <AnimatedNumber value={product.seven_day_total} /> sold this week
                </p>
              )}
            </div>
            <motion.div
              className="flex items-center gap-2 bg-bushal-copper/90 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-bushal-copper/30"
              animate={{ x: hovered ? -2 : 0, backgroundColor: hovered ? 'rgba(212,149,74,0.95)' : 'rgba(184,115,51,0.9)' }}
              transition={{ duration: 0.2 }}
            >
              Shop now
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Standard Trending Card ───────────────────────────────────────────────────
function TrendCard({
  product,
  index,
  rank,
}: {
  product: TrendingProduct
  index: number
  rank: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [hovered, setHovered] = useState(false)

  const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
  const isHot = product.trend_status === 'HOT'

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/product/${product.product_id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-bushal-ivoryDeep mb-3">
          {cover ? (
            <motion.img
              src={cover}
              alt={product.product_name}
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ scale: hovered ? 1.07 : 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-bushal-borderMid">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Hover gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-bushal-ink/50 to-transparent"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          <TrendBadge status={product.trend_status} />
          <GrowthChip pct={product.growth_percentage} />

          {/* Rank number */}
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-bushal-ink/60 backdrop-blur-md flex items-center justify-center text-[11px] font-black text-white/70">
            {rank}
          </div>

          {/* Quick view hover CTA */}
          <motion.div
            className="absolute bottom-3 left-3 right-3"
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-bushal-surface/92 backdrop-blur-md text-bushal-forest text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl text-center border border-bushal-border/50">
              View product
            </div>
          </motion.div>
        </div>

        {/* Info */}
        <div className="px-0.5">
          {product.category && (
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bushal-copper mb-1">
              {product.category}
            </p>
          )}
          <h3 className="font-heading text-[15px] text-bushal-forest leading-snug line-clamp-2 mb-2 group-hover:text-bushal-forestMid transition-colors duration-200">
            {product.product_name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="font-heading text-base text-bushal-copper font-semibold">
              {formatPrice(product.price)}
            </span>
            {product.seven_day_total > 0 && (
              <span className="text-[10px] text-bushal-inkSoft font-medium tabular-nums">
                <AnimatedNumber value={product.seven_day_total} /> this week
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
      {/* Hero skeleton */}
      <div className="col-span-2 row-span-2 rounded-3xl overflow-hidden animate-pulse">
        <div className="h-[420px] bg-bushal-ivoryDeep" />
      </div>
      {/* Small skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="aspect-[3/4] rounded-2xl bg-bushal-ivoryDeep mb-3" />
          <div className="space-y-2">
            <div className="h-2.5 bg-bushal-ivoryDeep rounded w-2/5" />
            <div className="h-4 bg-bushal-ivoryDeep rounded w-4/5" />
            <div className="h-3.5 bg-bushal-ivoryDeep rounded w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
function SectionHeader({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <div ref={ref} className="flex items-end justify-between mb-10">
      {/* Left: label + title */}
      <div className="flex items-start gap-4">
        {/* Icon block */}
        <motion.div
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bushal-danger/15 to-bushal-danger/5 border border-bushal-danger/20 flex items-center justify-center flex-shrink-0 mt-1"
          initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
          animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <motion.svg
            className="w-5 h-5 text-bushal-danger"
            fill="currentColor"
            viewBox="0 0 24 24"
            animate={inView ? { scale: [1, 1.15, 1] } : {}}
            transition={{ delay: 0.5, repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
          >
            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z" />
          </motion.svg>
        </motion.div>

        <div>
          <motion.div
            className="flex items-center gap-2 mb-1.5"
            initial={{ opacity: 0, x: -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <PulseDot color="bg-bushal-danger" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-bushal-danger">
              Real-time demand
            </p>
          </motion.div>
          <motion.h2
            className="font-heading text-4xl sm:text-5xl text-bushal-forest leading-none tracking-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Trending Now
          </motion.h2>
        </div>
      </div>

      {/* Right: live count */}
      {count > 0 && (
        <motion.div
          className="hidden sm:flex flex-col items-end"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25 }}
        >
          <span className="font-heading text-3xl text-bushal-inkSoft/40 leading-none">{count}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-bushal-inkSoft/40 mt-0.5">
            items surging
          </span>
        </motion.div>
      )}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function GoldLine() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="flex items-center gap-3 mb-8">
      <motion.div
        className="h-px flex-1 bg-gradient-to-r from-transparent via-bushal-border to-bushal-border"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        style={{ originX: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <motion.div
        className="flex gap-1"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.4 }}
      >
        <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-bushal-copper" />
        <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
      </motion.div>
      <motion.div
        className="h-px flex-1 bg-gradient-to-l from-transparent via-bushal-border to-bushal-border"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        style={{ originX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

// ─── EMA Footer Note ──────────────────────────────────────────────────────────
function FooterNote() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      className="flex items-center justify-center gap-3 mt-10"
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <div className="h-px w-12 bg-bushal-border" />
      <div className="flex items-center gap-2 text-[10px] text-bushal-inkSoft/60 font-medium uppercase tracking-[0.15em]">
        <PulseDot color="bg-bushal-success" />
        EMA algorithm · Updated hourly
      </div>
      <div className="h-px w-12 bg-bushal-border" />
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TrendingNow({ className, limit = 8 }: Props) {
  const [products, setProducts] = useState<TrendingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`/api/products/trending?limit=${limit}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.success && data.trendingProducts?.length > 0) {
          const hot = data.trendingProducts.filter(
            (p: TrendingProduct) => p.trend_status === 'HOT' || p.trend_status === 'TRENDING'
          )
          setProducts(hot.length > 0 ? hot : data.trendingProducts.slice(0, limit))
        } else {
          setProducts([])
        }
      } catch {
        setError('Unable to load trending products')
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
  }, [limit])

  if (!loading && products.length === 0) return null

  // Layout: first product is hero (if ≥3 products), rest are standard cards
  const [hero, ...rest] = products
  const showHeroLayout = products.length >= 3

  return (
    <section ref={sectionRef} className={cn('mt-20 lg:mt-32', className)}>
      <SectionHeader count={products.length} />
      <GoldLine />

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Skeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            className="flex items-center gap-3 bg-bushal-dangerBg border border-bushal-danger/20 rounded-2xl p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-8 h-8 rounded-xl bg-bushal-danger/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-bushal-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-bushal-danger font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products */}
      <AnimatePresence>
        {!loading && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {showHeroLayout ? (
              /* Editorial hero layout: hero left, 4 cards right in 2×2 */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-5 items-start">
                {/* Hero — spans 2 cols and 2 rows */}
                <HeroTrendCard product={hero} rank={1} />

                {/* Right side: up to 4 cards in a 2×2 */}
                {rest.slice(0, 4).map((product, i) => (
                  <TrendCard
                    key={product.product_id}
                    product={product}
                    index={i}
                    rank={i + 2}
                  />
                ))}
              </div>
            ) : (
              /* Fallback uniform grid for <3 products */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                {products.map((product, i) => (
                  <TrendCard
                    key={product.product_id}
                    product={product}
                    index={i}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}

            {/* Overflow row if more than 5 products */}
            {showHeroLayout && rest.length > 4 && (
              <Reveal delay={0.1} className="mt-4 lg:mt-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                  {rest.slice(4).map((product, i) => (
                    <TrendCard
                      key={product.product_id}
                      product={product}
                      index={i + 4}
                      rank={i + 6}
                    />
                  ))}
                </div>
              </Reveal>
            )}

            <FooterNote />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}