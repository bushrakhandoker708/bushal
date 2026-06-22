// components/product/ProductGrid.tsx
'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion'
import ProductCard from '../dashboard/ProductCard'
import { Product } from '@/app/types/product'
import EmptyState from '@/app/components/ui/EmptyState'
import { cn } from '@/app/lib/utils/cn'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import Link from 'next/link'

interface Props {
  products: Product[]
}

// ─── View Toggle ──────────────────────────────────────────────────────────────
type ViewMode = 'editorial' | 'grid' | 'list'

// ─── Scroll-reveal wrapper ────────────────────────────────────────────────────
function RevealCard({
  children,
  index,
  className,
}: {
  children: React.ReactNode
  index: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.6,
        delay: Math.min(index % 4, 3) * 0.09,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── Hero Feature Card (large editorial slot) ─────────────────────────────────
function HeroCard({ product, index }: { product: Product; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])

  const hasDiscount = !!product.discount_percent
  const finalPrice = hasDiscount
    ? product.price * (1 - product.discount_percent! / 100)
    : product.price

  const image = product.images?.[0] ?? product.image_url ?? ''

  return (
    <motion.div
      ref={ref}
      className="col-span-2 sm:col-span-2 lg:col-span-2 relative group"
      initial={{ opacity: 0, x: -32 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: index === 0 ? 0.05 : 0 }}
    >
      <Link href={`/products/${product.id}`} className="block relative rounded-3xl overflow-hidden bg-bushal-ivoryDeep aspect-[16/11] shadow-card">
        {/* Parallax image */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            src={image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ y: imageY }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
          />
          <motion.div
            className="absolute inset-0 scale-110"
            style={{ y: imageY }}
          />
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-bushal-ink/80 via-bushal-ink/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bushal-ink/30 to-transparent" />

        {/* Hover shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-bushal-copper/10 to-transparent"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        />

        {/* Top badges */}
        <div className="absolute top-5 left-5 flex items-center gap-2">
          {product.category && (
            <span className="bg-bushal-surface/90 backdrop-blur-md text-bushal-forest text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border border-bushal-border/40">
              {product.category}
            </span>
          )}
          {hasDiscount && (
            <span className="bg-bushal-copper text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full">
              −{product.discount_percent}%
            </span>
          )}
        </div>

        {/* Stock low badge */}
        {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
          <div className="absolute top-5 right-5">
            <span className="bg-bushal-dangerBg/90 backdrop-blur-md text-bushal-danger text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-bushal-danger/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-bushal-danger animate-pulse" />
              Only {product.stock_quantity} left
            </span>
          </div>
        )}

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <motion.h3
            className="font-heading text-3xl sm:text-4xl text-bushal-ivory leading-tight tracking-tight mb-2"
            animate={{ y: hovered ? -3 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {product.name}
          </motion.h3>
          {product.description && (
            <motion.p
              className="text-bushal-ivory/65 text-sm font-body leading-relaxed line-clamp-2 mb-4 max-w-sm"
              animate={{ opacity: hovered ? 1 : 0.7, y: hovered ? -2 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {product.description.split('\n')[0]}
            </motion.p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-2xl text-bushal-copperGlow font-semibold">
                {formatPrice(finalPrice)}
              </span>
              {hasDiscount && (
                <span className="text-bushal-ivory/40 text-sm line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            <motion.div
              className="flex items-center gap-2 bg-bushal-copper/90 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl"
              animate={{ x: hovered ? -2 : 0, backgroundColor: hovered ? 'rgba(212,149,74,0.95)' : 'rgba(184,115,51,0.90)' }}
              transition={{ duration: 0.25 }}
            >
              View
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

// ─── Standard Card ────────────────────────────────────────────────────────────
// This just wraps the existing ProductCard with the reveal animation
// and passes through the index for stagger timing.
// (ProductCard handles its own hover states internally)
function GridCard({ product, index }: { product: Product; index: number }) {
  return (
    <RevealCard index={index}>
      <ProductCard product={product} index={index} />
    </RevealCard>
  )
}

// ─── List Row Card ────────────────────────────────────────────────────────────
function ListCard({ product, index }: { product: Product; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const [hovered, setHovered] = useState(false)

  const hasDiscount = !!product.discount_percent
  const finalPrice = hasDiscount
    ? product.price * (1 - product.discount_percent! / 100)
    : product.price
  const image = product.images?.[0] ?? product.image_url ?? ''

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/products/${product.id}`}
        className="flex items-center gap-5 p-4 rounded-2xl border border-bushal-border/60 bg-bushal-surface hover:border-bushal-copper/25 hover:shadow-card transition-all duration-300 group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Thumbnail */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-bushal-ivoryDeep flex-shrink-0">
          {image ? (
            <motion.img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover"
              animate={{ scale: hovered ? 1.07 : 1 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {product.category && (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bushal-copper mb-1">
              {product.category}
            </p>
          )}
          <h3 className="font-heading text-lg text-bushal-forest leading-snug truncate group-hover:text-bushal-forestMid transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-bushal-inkSoft mt-1 line-clamp-1 font-body">
              {product.description.split('\n')[0]}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {!product.in_stock ? (
              <span className="text-xs text-bushal-danger font-semibold">Out of stock</span>
            ) : product.stock_quantity <= 5 ? (
              <span className="text-xs text-bushal-warning font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-bushal-warning animate-pulse" />
                Only {product.stock_quantity} left
              </span>
            ) : (
              <span className="text-xs text-bushal-success font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-bushal-success" />
                In stock
              </span>
            )}
          </div>
        </div>

        {/* Price + arrow */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="font-heading text-xl text-bushal-copper font-semibold">
            {formatPrice(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-bushal-inkSoft line-through">{formatPrice(product.price)}</span>
          )}
          {hasDiscount && product.discount_percent && (
            <span className="text-[10px] font-bold text-bushal-copper bg-bushal-copperMuted px-2 py-0.5 rounded-full">
              −{product.discount_percent}%
            </span>
          )}
        </div>

        <motion.div
          className="flex-shrink-0 w-8 h-8 rounded-full border border-bushal-border flex items-center justify-center text-bushal-inkSoft"
          animate={{ x: hovered ? 2 : 0, borderColor: hovered ? '#B87333' : undefined, color: hovered ? '#B87333' : undefined }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </Link>
    </motion.div>
  )
}

// ─── View Mode Toggle ─────────────────────────────────────────────────────────
function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
}) {
  const options: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    {
      key: 'editorial',
      label: 'Editorial',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
          <rect x="0" y="0" width="9" height="9" rx="1.5" />
          <rect x="11" y="0" width="5" height="4" rx="1" />
          <rect x="11" y="5" width="5" height="4" rx="1" />
          <rect x="0" y="11" width="5" height="5" rx="1" />
          <rect x="6" y="11" width="10" height="5" rx="1" />
        </svg>
      ),
    },
    {
      key: 'grid',
      label: 'Grid',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
          <rect x="0" y="0" width="6.5" height="6.5" rx="1.5" />
          <rect x="9.5" y="0" width="6.5" height="6.5" rx="1.5" />
          <rect x="0" y="9.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="9.5" y="9.5" width="6.5" height="6.5" rx="1.5" />
        </svg>
      ),
    },
    {
      key: 'list',
      label: 'List',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
          <line x1="0" y1="3" x2="16" y2="3" />
          <line x1="0" y1="8" x2="16" y2="8" />
          <line x1="0" y1="13" x2="16" y2="13" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex items-center gap-1 bg-bushal-ivoryDeep/80 backdrop-blur-sm rounded-xl p-1 border border-bushal-border/60">
      {options.map(({ key, icon, label }) => (
        <motion.button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors duration-200',
            mode === key ? 'text-bushal-forest' : 'text-bushal-inkSoft hover:text-bushal-inkMid'
          )}
          whileTap={{ scale: 0.94 }}
        >
          {mode === key && (
            <motion.div
              layoutId="view-pill"
              className="absolute inset-0 bg-bushal-surface rounded-lg shadow-sm border border-bushal-border/50"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </span>
        </motion.button>
      ))}
    </div>
  )
}

// ─── Count Badge ──────────────────────────────────────────────────────────────
function ResultCount({ count }: { count: number }) {
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        key={count}
        className="font-heading text-2xl text-bushal-forest leading-none"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {count}
      </motion.span>
      <span className="text-xs text-bushal-inkSoft uppercase tracking-[0.18em] font-bold">
        {count === 1 ? 'product' : 'products'}
      </span>
    </motion.div>
  )
}

// ─── Enhanced Empty State ─────────────────────────────────────────────────────
function PremiumEmpty() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-24 px-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Animated icon */}
      <motion.div
        className="relative w-20 h-20 mb-6"
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 bg-bushal-copper/10 rounded-3xl rotate-6" />
        <div className="absolute inset-0 bg-bushal-ivoryDeep rounded-3xl flex items-center justify-center border border-bushal-border">
          <svg className="w-8 h-8 text-bushal-copper/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>
      </motion.div>

      <h3 className="font-heading text-2xl text-bushal-forest mb-2">Nothing here yet</h3>
      <p className="text-sm text-bushal-inkSoft text-center max-w-xs leading-relaxed">
        Try a different category, clear your filters, or check back soon — new arrivals drop weekly.
      </p>

      <motion.div
        className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-bushal-copper/40 to-transparent"
        animate={{ width: ['4rem', '8rem', '4rem'] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

// ─── Editorial Layout ─────────────────────────────────────────────────────────
// Pattern: every 5 products, the first gets a spanning hero card.
// Groups of 5: [hero(2-col), card, card, card, card]
// Remaining products fall into the standard 2-col compact grid.
function EditorialLayout({ products }: { products: Product[] }) {
  // Build layout groups
  const groups: { hero: Product; rest: Product[] }[] = []
  let i = 0
  while (i < products.length) {
    const hero = products[i]
    const rest = products.slice(i + 1, i + 5)
    groups.push({ hero, rest })
    i += 5
  }

  return (
    <div className="space-y-5">
      {groups.map((group, groupIdx) => (
        <div key={group.hero.id} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Hero card — always spans left 2 columns */}
          <HeroCard product={group.hero} index={groupIdx} />

          {/* Supporting cards — fill right side, 2 columns */}
          {group.rest.map((product, cardIdx) => (
            <RevealCard
              key={product.id}
              index={groupIdx * 4 + cardIdx + 1}
              className="col-span-1"
            >
              <ProductCard product={product} index={groupIdx * 5 + cardIdx + 1} />
            </RevealCard>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Standard Grid Layout ─────────────────────────────────────────────────────
function GridLayout({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product, index) => (
        <RevealCard key={product.id} index={index}>
          <ProductCard product={product} index={index} />
        </RevealCard>
      ))}
    </div>
  )
}

// ─── List Layout ──────────────────────────────────────────────────────────────
function ListLayout({ products }: { products: Product[] }) {
  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <ListCard key={product.id} product={product} index={index} />
      ))}
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function ProductGrid({ products }: Props) {
  const [mode, setMode] = useState<ViewMode>('editorial')

  if (products.length === 0) {
    return <PremiumEmpty />
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-6">
        <ResultCount count={products.length} />
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {/* ── Layout ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {mode === 'editorial' && <EditorialLayout products={products} />}
          {mode === 'grid' && <GridLayout products={products} />}
          {mode === 'list' && <ListLayout products={products} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}