'use client'

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  BUSHAL — ULTRA-PREMIUM HERO BANNER                              ║
 * ║  Stack: Framer Motion · React Spring · CSS Houdini              ║
 * ║                                                                  ║
 * ║  ASSETS YOU NEED (see comment block at bottom of this file)     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  npm install framer-motion @react-spring/web
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import Link from 'next/link'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  useInView,
  type Variants,
} from 'framer-motion'
import { createBrowserClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface Product {
  id: string
  name: string
  image_url: string | null
  images: string[]
}
interface TopProduct extends Product { total_sold: number }

// ─────────────────────────────────────────────
//  Animation Variants
// ─────────────────────────────────────────────
const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  visible: (d = 0) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: d },
  }),
}

const STAGGER_CHARS: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.028 } },
}
const CHAR: Variants = {
  hidden: { y: 110, opacity: 0, rotateZ: 8 },
  visible: {
    y: 0, opacity: 1, rotateZ: 0,
    transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
  },
}

const CARD_FLOAT: Variants = {
  initial: { y: 0 },
  animate: (d = 0) => ({
    y: [0, -10, 0],
    transition: { repeat: Infinity, duration: 4 + d, ease: 'easeInOut', delay: d },
  }),
}

const RING_SPIN: Variants = {
  animate: (dir = 1) => ({
    rotate: dir * 360,
    transition: { repeat: Infinity, duration: 32, ease: 'linear' },
  }),
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function splitWords(text: string) {
  return text.split(' ').map((word, wi) => (
    <span key={wi} className="inline-block overflow-hidden mr-[0.28em]">
      <motion.span className="inline-block" variants={CHAR}>{word}</motion.span>
    </span>
  ))
}

// ─────────────────────────────────────────────
//  Noise SVG filter (grain overlay)
// ─────────────────────────────────────────────
const NoiseFilter = () => (
  <svg className="absolute w-0 h-0">
    <defs>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="overlay" result="blend" />
        <feComposite in="blend" in2="SourceGraphic" operator="in" />
      </filter>
    </defs>
  </svg>
)

// ─────────────────────────────────────────────
//  Floating Particles
// ─────────────────────────────────────────────
const PARTICLE_COUNT = 22
type Particle = { x: number; y: number; size: number; dur: number; delay: number; opacity: number }

function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([])
  useEffect(() => {
    setParticles(
      Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        dur: Math.random() * 14 + 8,
        delay: Math.random() * -20,
        opacity: Math.random() * 0.4 + 0.05,
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-bushal-copperGlow"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{ y: [0, -60, 0], opacity: [p.opacity, p.opacity * 0.3, p.opacity] }}
          transition={{ repeat: Infinity, duration: p.dur, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Aurora Mesh Background
// ─────────────────────────────────────────────
function AuroraMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-bushal-forest via-bushal-forestMid to-bushal-forest" />

      {/* Noise grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.65] mix-blend-overlay"
        style={{
          backgroundImage: 'url(/images/noise.jpg)', // ← ASSET NEEDED (see bottom)
          
        }}
      />

      {/* Aurora blob 1 */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(184,115,51,0.22) 0%, transparent 70%)',
          top: '-20%', right: '-10%',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
      />

      {/* Aurora blob 2 */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(35,73,54,0.5) 0%, transparent 70%)',
          bottom: '-15%', left: '-10%',
          filter: 'blur(100px)',
        }}
        animate={{ x: [0, -60, 30, 0], y: [0, 50, -30, 0], scale: [1, 0.85, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut', delay: 4 }}
      />

      {/* Aurora blob 3 — accent teal */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(20,90,60,0.3) 0%, transparent 70%)',
          top: '40%', left: '40%',
          filter: 'blur(120px)',
        }}
        animate={{ x: [0, 50, -70, 0], y: [0, -40, 60, 0] }}
        transition={{ repeat: Infinity, duration: 26, ease: 'easeInOut', delay: 8 }}
      />

      {/* Cinematic light beam */}
      <motion.div
        className="absolute top-0 right-0 w-[900px] h-[900px] origin-top-right"
        style={{
          background: 'conic-gradient(from 200deg at 100% 0%, rgba(240,185,106,0.07) 0deg, transparent 40deg)',
          filter: 'blur(60px)',
        }}
        animate={{ rotate: [0, 8, -4, 0] }}
        transition={{ repeat: Infinity, duration: 30, ease: 'easeInOut' }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Magnetic Button
// ─────────────────────────────────────────────
function MagneticButton({ children, href, primary }: { children: React.ReactNode; href: string; primary?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 250, damping: 20 })
  const springY = useSpring(y, { stiffness: 250, damping: 20 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * 0.35)
    y.set((e.clientY - rect.top - rect.height / 2) * 0.35)
  }, [x, y])

  const handleMouseLeave = useCallback(() => { x.set(0); y.set(0) }, [x, y])

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={primary
        ? 'group relative inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-sm font-semibold text-white overflow-hidden select-none cursor-pointer'
        : 'inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-bushal-ivory/80 backdrop-blur-sm cursor-pointer select-none'
      }
    >
      {primary && (
        <>
          {/* Animated gradient bg */}
          <span
            className="absolute inset-0 bg-gradient-to-r from-bushal-copper via-bushal-copperLight to-[#e8a83a]"
            style={{ backgroundSize: '200% 100%' }}
          />
          {/* Hover shimmer */}
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
            whileHover={{ translateX: '200%' }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
          {/* Glow */}
          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ boxShadow: '0 0 30px rgba(184,115,51,0.6), 0 0 60px rgba(184,115,51,0.2)' }}
          />
        </>
      )}
      <span className="relative z-10 flex items-center gap-2.5">{children}</span>
    </motion.a>
  )
}

// ─────────────────────────────────────────────
//  Orbit Rings
// ─────────────────────────────────────────────
function OrbitRings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Ring 1 */}
      <motion.div
        variants={RING_SPIN}
        animate="animate"
        custom={1}
        className="absolute inset-[-8%] rounded-full"
        style={{ border: '1px solid rgba(184,115,51,0.12)' }}
      >
        {/* Orbiting dot */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{ background: 'radial-gradient(circle, #f0b96a 0%, rgba(184,115,51,0.3) 100%)', boxShadow: '0 0 10px rgba(240,185,106,0.8)' }}
        />
      </motion.div>

      {/* Ring 2 — reverse */}
      <motion.div
        variants={RING_SPIN}
        animate="animate"
        custom={-1}
        className="absolute inset-[-18%] rounded-full"
        style={{ border: '1px dashed rgba(184,115,51,0.07)' }}
      >
        <div
          className="absolute bottom-[8%] right-[8%] w-1.5 h-1.5 rounded-full bg-bushal-copperGlow/60"
          style={{ boxShadow: '0 0 6px rgba(240,185,106,0.6)' }}
        />
      </motion.div>

      {/* Ring 3 — slower */}
      <motion.div
        className="absolute inset-[2%] rounded-full"
        style={{ border: '1px solid rgba(35,73,54,0.4)' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Stat Card
// ─────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, delay, className,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; delay?: number; className?: string
}) {
  return (
    <motion.div
      variants={CARD_FLOAT}
      initial="initial"
      animate="animate"
      custom={delay ?? 0}
      className={`absolute rounded-2xl backdrop-blur-2xl border border-bushal-copperGlow/12 bg-gradient-to-br from-[#0c1d15]/95 to-[#0a1810]/95 px-4 py-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-bushal-copper/20">
          {icon}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-bushal-copperGlow font-body">{label}</span>
      </div>
      <p className="text-base font-heading font-bold text-bushal-ivory leading-none">{value}</p>
      {sub && <p className="text-[9px] text-bushal-ivory/35 font-body mt-0.5">{sub}</p>}
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Trust Strip
// ─────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Secure bKash' },
  { icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', label: 'Free Delivery ৳1000+' },
  { icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', label: '4.9 / 5 Rating' },
  { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', label: 'Authentic Only' },
]

// ─────────────────────────────────────────────
//  Marquee
// ─────────────────────────────────────────────
const MARQUEE_TEXT = ['HERITAGE', 'PREMIUM', 'AUTHENTIC', 'TRUSTED', 'HANDPICKED', 'CRAFTED']
function Marquee() {
  const items = [...MARQUEE_TEXT, ...MARQUEE_TEXT]
  return (
    <div className="relative overflow-hidden py-3 border-y border-white/[0.06]">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
      >
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.35em] text-bushal-ivory/20 font-body">
            {t}
            <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Mouse Parallax Hook
// ─────────────────────────────────────────────
function useParallax() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 2)
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [mouseX, mouseY])

  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20 })

  return { smoothX, smoothY }
}

// ─────────────────────────────────────────────
//  Main Hero
// ─────────────────────────────────────────────
export default function HeroBanner() {
  const [topProduct, setTopProduct] = useState<TopProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const heroRef = useRef<HTMLElement>(null)
  const isInView = useInView(heroRef, { once: true, margin: '-50px' })
  const { smoothX, smoothY } = useParallax()

  // Parallax layers
  const bgX = useTransform(smoothX, [-1, 1], ['-3%', '3%'])
  const bgY = useTransform(smoothY, [-1, 1], ['-3%', '3%'])
  const cardX = useTransform(smoothX, [-1, 1], ['-20px', '20px'])
  const cardY = useTransform(smoothY, [-1, 1], ['-20px', '20px'])
  const productX = useTransform(smoothX, [-1, 1], ['-12px', '12px'])
  const productY = useTransform(smoothY, [-1, 1], ['-12px', '12px'])

  useEffect(() => {
    let active = true
    const fetchTopProduct = async () => {
      const supabase = createBrowserClient()
      try {
        const { data, error } = await supabase.rpc('get_top_selling_product')
        if (!active) return
        if (!error && data?.length) { setTopProduct(data[0]); return }

        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity, products (id, name, image_url, images)')
          .order('created_at', { ascending: false })
          .limit(500)

        if (!active || !orderItems?.length) return

        const tally: Record<string, { sold: number; product: Product }> = {}
        orderItems.forEach((item: any) => {
          const pid = item.product_id
          const product = Array.isArray(item.products) ? item.products[0] : item.products
          if (!product) return
          if (!tally[pid]) tally[pid] = { sold: 0, product }
          tally[pid].sold += item.quantity ?? 0
        })
        const ranked = Object.values(tally).sort((a, b) => b.sold - a.sold)
        if (ranked.length) {
          const top = ranked[0]
          setTopProduct({ ...top.product, total_sold: top.sold, images: top.product.images || [] })
        }
      } catch { /* silent */ } finally {
        if (active) setLoading(false)
      }
    }
    fetchTopProduct()
    return () => { active = false }
  }, [])

  const productImage = topProduct && !imageError
    ? (topProduct.images?.[0] || topProduct.image_url)
    : null

  return (
    <section ref={heroRef} className="relative overflow-hidden mb-12 md:mb-16">
      <NoiseFilter />

      {/* ── Layered Background ── */}
      <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-[-6%]">
        <AuroraMesh />
      </motion.div>
      <FloatingParticles />

      {/* ── Page-entry fade ── */}
      <motion.div
        className="absolute inset-0 bg-[#060f0a] pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      {/* ── Main Grid ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-16 md:pt-24 lg:pt-28 pb-0 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* ─── LEFT COLUMN ─── */}
        <div className="flex flex-col">

          {/* Eyebrow pill */}
          <motion.div
            variants={FADE_UP} initial="hidden" animate={isInView ? 'visible' : 'hidden'} custom={0}
            className="mb-6 inline-flex w-fit items-center gap-2.5 rounded-full border border-bushal-copperGlow/20 bg-bushal-copper/10 px-4 py-1.5 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bushal-copperGlow opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bushal-copperGlow" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-bushal-copperGlow font-body">
              Now Delivering Across Bangladesh
            </span>
          </motion.div>

          {/* ── SplitText Headline ── */}
          <div className="overflow-hidden">
            <motion.h1
              className="font-heading font-semibold leading-[1.02] text-bushal-ivory"
              style={{ fontSize: 'clamp(2.6rem, 6vw, 5.2rem)', letterSpacing: '-0.04em' }}
              variants={STAGGER_CHARS}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
            >
              {splitWords('Crafted for')}
              <br />
              <span className="relative inline-block">
                {/* Gradient text */}
                <motion.span
                  className="bg-gradient-to-r from-bushal-copperGlow via-bushal-copperLight to-bushal-copper bg-clip-text text-transparent"
                  variants={STAGGER_CHARS}
                >
                  {splitWords('Modern Heritage.')}
                </motion.span>
                {/* Underline accent */}
                <motion.span
                  className="absolute -bottom-2 left-0 h-[2px] bg-gradient-to-r from-bushal-copper to-transparent rounded-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: '100%' }}
                />
              </span>
            </motion.h1>
          </div>

          {/* Description */}
          <motion.p
            variants={FADE_UP} initial="hidden" animate={isInView ? 'visible' : 'hidden'} custom={0.35}
            className="mt-7 max-w-[420px] text-[15px] sm:text-base leading-relaxed text-bushal-ivory/55 font-body"
          >
            Handpicked, heritage-quality goods curated for Bangladesh —
            transparent pricing, genuine care, and every detail considered.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={FADE_UP} initial="hidden" animate={isInView ? 'visible' : 'hidden'} custom={0.5}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <MagneticButton href="#products" primary>
              Explore Collection
              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </MagneticButton>
            <MagneticButton href="/orders">
              Track Order
            </MagneticButton>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={FADE_UP} initial="hidden" animate={isInView ? 'visible' : 'hidden'} custom={0.65}
            className="mt-10 flex flex-wrap gap-8"
          >
            {[
              { value: '12k+', label: 'Happy Customers' },
              { value: '4.9★', label: 'Average Rating' },
              { value: '2hr', label: 'Avg. Dispatch' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col">
                <span className="font-heading text-2xl font-bold text-bushal-ivory">{s.value}</span>
                <span className="text-[10px] uppercase tracking-widest text-bushal-ivory/35 font-body mt-0.5">{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Trust strip */}
          <motion.div
            variants={FADE_UP} initial="hidden" animate={isInView ? 'visible' : 'hidden'} custom={0.75}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.08] pt-5"
          >
            {TRUST_ITEMS.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-bushal-copperGlow flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} />
                </svg>
                <span className="text-[10px] font-medium text-bushal-ivory/40 font-body">{t.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ─── RIGHT COLUMN — Product Stage ─── */}
        <motion.div
          variants={FADE_UP} initial="hidden" animate={isInView ? 'visible' : 'hidden'} custom={0.2}
          className="relative mx-auto w-full max-w-[560px] aspect-square"
          style={{ x: productX, y: productY }}
        >
          <OrbitRings />

          {/* Glass pedestal glow */}
          <div
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[70%] h-[18%] rounded-[50%]"
            style={{
              background: 'radial-gradient(ellipse, rgba(184,115,51,0.25) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />

          {/* Product frame */}
          <motion.div
            className="absolute inset-[10%] rounded-full overflow-hidden cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0c1d15 0%, #142a1e 100%)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(240,185,106,0.12), 0 0 0 1px rgba(184,115,51,0.2)',
            }}
            animate={{ y: [0, -14, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            <AnimatePresence mode="wait">
              {productImage ? (
                <motion.div key="product" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Link href={`/product/${topProduct!.id}`} className="group/img relative block h-full w-full">
                    <motion.img
                      src={productImage}
                      alt={topProduct!.name}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                      className="h-full w-full object-cover"
                      animate={{ scale: isHovered ? 1.07 : 1 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        filter: imageLoaded ? 'brightness(0.92) saturate(1.1)' : 'blur(20px) brightness(0.3)',
                        transition: 'filter 0.9s ease',
                      }}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {/* Inner rim */}
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)' }} />

                    {/* Product name tag */}
                    <motion.div
                      className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-bushal-copper/35 bg-black/65 px-3.5 py-1.5 backdrop-blur-md whitespace-nowrap"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                    >
                      <svg className="h-3 w-3 text-bushal-copperGlow flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-bushal-copperGlow font-body">
                        Best Seller
                      </span>
                      <span className="text-[10px] font-mono text-bushal-ivory/45">· {topProduct!.total_sold} sold</span>
                    </motion.div>
                  </Link>
                </motion.div>
              ) : loading ? (
                <motion.div key="loading" className="flex h-full w-full items-center justify-center">
                  <motion.div
                    className="h-10 w-10 rounded-full border-2 border-bushal-copper/20 border-t-bushal-copperGlow"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  />
                </motion.div>
              ) : (
                <motion.div key="fallback" className="flex h-full w-full items-center justify-center">
                  <span className="font-heading text-7xl font-black text-bushal-copperGlow/80">B</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Floating Stat Cards ── */}
          <motion.div style={{ x: cardX, y: cardY }} className="absolute inset-0 pointer-events-none">
            {/* Top-left: Premium */}
            <StatCard
              className="-top-3 -left-8 hidden sm:block pointer-events-auto"
              delay={0.5}
              icon={<svg className="h-3.5 w-3.5 text-bushal-copperGlow" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
              label="Premium"
              value="Heritage Grade"
              sub="Handpicked quality"
            />

            {/* Bottom-right: Live */}
            <StatCard
              className="-bottom-5 -right-4 sm:-right-8 pointer-events-auto"
              delay={1}
              icon={
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              }
              label="Live Status"
              value="Dispatching Now"
              sub="Orders shipping today"
            />

            {/* Right-middle: Reviews */}
            <StatCard
              className="top-[42%] -right-3 sm:-right-10 pointer-events-auto"
              delay={0.3}
              icon={<svg className="h-3.5 w-3.5 text-bushal-copperGlow" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
              label="Customer Love"
              value="4.9 / 5.0"
              sub="12,400+ reviews"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* ── Marquee ── */}
      <motion.div
        variants={FADE_UP} initial="hidden" animate={isInView ? 'visible' : 'hidden'} custom={0.9}
        className="relative z-10 mt-14 md:mt-20"
      >
        <Marquee />
      </motion.div>

      {/* ── Bottom fade-out to page ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bushal-bg,#0a110d)] to-transparent pointer-events-none" />
    </section>
  )
}

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ASSETS & SETUP CHECKLIST                                       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  1. INSTALL DEPENDENCIES                                         ║
 * ║     npm install framer-motion                                    ║
 * ║                                                                  ║
 * ║  2. IMAGE ASSETS (place in /public/images/)                     ║
 * ║     ┌─────────────────────────────────────────────────────────┐  ║
 * ║     │ noise.png        — grain texture, 256×256, PNG, tileable│  ║
 * ║     │                    Download: https://grainy-gradients.   │  ║
 * ║     │                    vercel.app or generate in Figma       │  ║
 * ║     └─────────────────────────────────────────────────────────┘  ║
 * ║                                                                  ║
 * ║  3. OPTIONAL BUT HIGH IMPACT                                     ║
 * ║     ┌─────────────────────────────────────────────────────────┐  ║
 * ║     │ hero-product.mp4 — 5-10s looping product video           │  ║
 * ║     │   • Shoot: product on wooden/slate surface               │  ║
 * ║     │   • Lighting: warm copper/amber key light, dark bg       │  ║
 * ║     │   • Resolution: 800×800 min, square crop                 │  ║
 * ║     │   • Export: H.264, no audio, <2MB                        │  ║
 * ║     │   • Usage: replace <img> with <video autoPlay muted loop>│  ║
 * ║     │                                                           │  ║
 * ║     │ product-hero.webp — 800×800 high quality product shot    │  ║
 * ║     │   • Background removed (transparent PNG/WebP)            │  ║
 * ║     │   • Or: dark bg product on wooden surface                │  ║
 * ║     │   • Lighting: same copper-warm as brand                  │  ║
 * ║     └─────────────────────────────────────────────────────────┘  ║
 * ║                                                                  ║
 * ║  4. FONTS (already in your config, verify)                       ║
 * ║     font-heading  →  e.g. Playfair Display / Cormorant          ║
 * ║     font-body     →  e.g. Inter / DM Sans                       ║
 * ║                                                                  ║
 * ║  5. TAILWIND TOKENS (verify these exist in tailwind.config.ts)  ║
 * ║     colors.bushal.copper, copperLight, copperGlow               ║
 * ║     colors.bushal.ivory, forest, forestLight                    ║
 * ║     boxShadow.copper, copperHover                               ║
 * ║                                                                  ║
 * ║  6. PERFORMANCE NOTE                                             ║
 * ║     Add to next.config.js:                                       ║
 * ║     experimental: { optimizeCss: true }                          ║
 * ║     Add prefers-reduced-motion check if needed:                  ║
 * ║     const prefersReducedMotion = useReducedMotion()              ║
 * ║     Then pass transition={{ duration: prefersReducedMotion?0:X }}║
 * ╚══════════════════════════════════════════════════════════════════╝
 */