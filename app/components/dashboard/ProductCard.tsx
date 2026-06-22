'use client'

// app/components/product/ProductCard.tsx
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { useCart } from '@/app/hooks/useCart'
import { useWishlist } from '@/app/hooks/useWishList'
import { useCompare } from '@/app/hooks/useCompare'
import { cn } from '@/app/lib/utils/cn'
import ProductQuickView from '../product/ProductQuickView'
import { getStockStatus } from '@/app/lib/utils/stockStatus'

interface Props {
  product: Product
  index?: number
}

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

// ─── 3-D Tilt Hook ────────────────────────────────────────────────────────────
function useTilt(strength = 6) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [strength, -strength]), {
    stiffness: 220, damping: 26,
  })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-strength, strength]), {
    stiffness: 220, damping: 26,
  })

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [x, y])

  const reset = useCallback(() => { x.set(0); y.set(0) }, [x, y])

  return { ref, rotateX, rotateY, onMouseMove, reset }
}

// ─── Cursor light that follows mouse inside the card ─────────────────────────
function CursorLight({ active }: { active: boolean }) {
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = parentRef.current?.closest('[data-card-root]') as HTMLElement | null
    if (!el) return
    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      x.set(e.clientX - rect.left)
      y.set(e.clientY - rect.top)
    }
    el.addEventListener('mousemove', move)
    return () => el.removeEventListener('mousemove', move)
  }, [x, y])

  return (
    <div ref={parentRef} className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      <motion.div
        className="absolute w-40 h-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: x,
          top: y,
          background: 'radial-gradient(circle, rgba(184,115,51,0.18) 0%, transparent 70%)',
          opacity: active ? 1 : 0,
        }}
        transition={{ opacity: { duration: 0.3 } }}
      />
    </div>
  )
}

// ─── Image component with hover alt-image swap ────────────────────────────────
function ProductImage({
  images,
  name,
  hovered,
  productHref,
}: {
  images: string[]
  name: string
  hovered: boolean
  productHref: string
}) {
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()

  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      // Only navigate if not clicking a button/interactive child
      if ((e.target as HTMLElement).closest('button')) return
      router.push(productHref)
    },
    [router, productHref]
  )

  return (
    <div
      className="absolute inset-0 cursor-pointer"
      onClick={handleImageClick}
      role="link"
      aria-label={`View ${name}`}
    >
      {images.length > 0 ? (
        <>
          {/* Skeleton shimmer */}
          <AnimatePresence>
            {!loaded && (
              <motion.div
                className="absolute inset-0 bg-bushal-ivoryDeep"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-bushal-border/25 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary image */}
          <motion.img
            src={images[0]}
            alt={name}
            loading="lazy"
            draggable={false}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover select-none"
            animate={{
              scale: hovered ? (images.length > 1 ? 1 : 1.07) : 1,
              opacity: images.length > 1 && hovered ? 0 : 1,
            }}
            transition={{ duration: 0.55, ease: EASE_EXPO }}
          />

          {/* Secondary image on hover */}
          {images.length > 1 && (
            <motion.img
              src={images[1]}
              alt={name}
              loading="lazy"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover select-none"
              animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1.04 : 1.08 }}
              transition={{ duration: 0.5, ease: EASE_EXPO }}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-bushal-ivoryDeep text-bushal-borderMid">
          <svg className="w-14 h-14 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Discount / Stock badge ───────────────────────────────────────────────────
function BadgeGroup({
  discountPercent,
  stockQty,
}: {
  discountPercent?: number | null
  stockQty: number
}) {
  if (discountPercent && discountPercent > 0 && stockQty > 0) {
    return (
      <motion.div
        className="absolute top-3 left-3 z-20 bg-bushal-forest text-bushal-copperGlow text-[9px] font-black tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-lg shadow-lg select-none pointer-events-none"
        initial={{ opacity: 0, scale: 0.7, x: -6 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22, delay: 0.12 }}
      >
        −{discountPercent}%
      </motion.div>
    )
  }
  if (stockQty === 0) {
    return (
      <div className="absolute top-3 left-3 z-20 bg-bushal-dangerBg/95 backdrop-blur-sm text-bushal-danger text-[9px] font-black tracking-[0.15em] uppercase px-2.5 py-1.5 rounded-lg border border-bushal-danger/20 shadow-sm pointer-events-none select-none">
        Sold Out
      </div>
    )
  }
  if (stockQty <= 5) {
    return (
      <motion.div
        className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-bushal-warningBg/95 backdrop-blur-sm text-bushal-warning text-[9px] font-black tracking-[0.15em] uppercase px-2.5 py-1.5 rounded-lg border border-bushal-warning/20 pointer-events-none select-none"
        animate={{ opacity: [1, 0.65, 1] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-bushal-warning" />
        {stockQty} left
      </motion.div>
    )
  }
  return null
}

// ─── Wishlist button ──────────────────────────────────────────────────────────
function WishlistBtn({ wished, onClick }: { wished: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors',
        wished
          ? 'bg-bushal-copper text-white shadow-lg shadow-bushal-copper/35'
          : 'bg-bushal-ivory/85 text-bushal-forest border border-bushal-border/30'
      )}
      whileHover={{ scale: 1.18 }}
      whileTap={{ scale: 0.82 }}
      animate={wished ? { scale: [1, 1.35, 1] } : {}}
      transition={wished
        ? { type: 'spring', stiffness: 500, damping: 18 }
        : { duration: 0.15 }}
      aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={wished ? 'filled' : 'empty'}
          className="w-4 h-4"
          fill={wished ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </motion.svg>
      </AnimatePresence>
    </motion.button>
  )
}

// ─── Rating mini-stars ────────────────────────────────────────────────────────
function MiniStars({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return null
  const filled = Math.round(rating)
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={cn('w-2.5 h-2.5', i <= filled ? 'text-bushal-copper' : 'text-bushal-border')}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[10px] text-bushal-inkSoft font-medium tabular-nums">({count})</span>
    </div>
  )
}

// ─── Hover overlay: quick-add pill + compare/quickview tray ──────────────────
function HoverOverlay({
  visible,
  inStock,
  added,
  compared,
  onAdd,
  onCompare,
  onQuickView,
}: {
  visible: boolean
  inStock: boolean
  added: boolean
  compared: boolean
  onAdd: (e: React.MouseEvent) => void
  onCompare: (e: React.MouseEvent) => void
  onQuickView: (e: React.MouseEvent) => void
}) {
  return (
    <>
      {/* ── Quick-add pill (sits above action tray) ── */}
      <motion.div
        className="absolute inset-x-3 z-20 pointer-events-none"
        style={{ bottom: 52 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
        transition={{ duration: 0.28, ease: EASE_EXPO, delay: visible ? 0.04 : 0 }}
      >
        <motion.button
          onClick={onAdd}
          disabled={!inStock}
          className={cn(
            'w-full py-2.5 rounded-xl font-bold text-[11px] tracking-[0.1em] uppercase flex items-center justify-center gap-2 pointer-events-auto shadow-xl backdrop-blur-sm border transition-colors',
            inStock
              ? added
                ? 'bg-bushal-success text-white border-bushal-success/30'
                : 'bg-bushal-forest/96 text-bushal-ivory border-bushal-forest/10 hover:bg-bushal-forestMid'
              : 'bg-bushal-ivoryDeep/90 text-bushal-inkSoft border-bushal-border/50 cursor-not-allowed'
          )}
          whileTap={inStock ? { scale: 0.97 } : {}}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.span key="added" className="flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 400 }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Added to bag
              </motion.span>
            ) : (
              <motion.span key="add" className="flex items-center gap-1.5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {inStock ? 'Add to bag' : 'Sold out'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* ── Bottom action tray: Compare + Quick View ── */}
      <motion.div
        className="absolute bottom-3 left-3 right-3 flex items-center gap-2 z-20 pointer-events-none"
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
        transition={{ duration: 0.25, ease: EASE_EXPO }}
      >
        {/* Compare */}
        <motion.button
          onClick={onCompare}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md pointer-events-auto border shadow-md transition-colors',
            compared
              ? 'bg-bushal-forest text-white border-bushal-forest/40'
              : 'bg-bushal-ivory/90 text-bushal-forest border-bushal-border/40 hover:bg-bushal-surface'
          )}
          whileHover={{ scale: 1.14 }}
          whileTap={{ scale: 0.86 }}
          aria-label={compared ? 'Remove from compare' : 'Compare'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </motion.button>

        {/* Quick View */}
        <motion.button
          onClick={onQuickView}
          className="flex-1 h-9 rounded-xl bg-bushal-ivory/90 backdrop-blur-md text-bushal-forest text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 pointer-events-auto border border-bushal-border/40 hover:bg-bushal-surface transition-colors shadow-md"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          aria-label="Quick view"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Quick View
        </motion.button>
      </motion.div>
    </>
  )
}

// ─── Mobile long-press hint ───────────────────────────────────────────────────
function LongPressRing({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-bushal-surface/92 backdrop-blur-md rounded-2xl px-5 py-3 flex items-center gap-2.5 shadow-xl border border-bushal-border/60">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              className="text-bushal-forest"
            >
              👁
            </motion.span>
            <span className="text-xs font-bold text-bushal-forest uppercase tracking-wider">Quick View</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Mobile add-to-bag pill ───────────────────────────────────────────────────
function MobileAddBtn({ inStock, added, onClick }: {
  inStock: boolean
  added: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={!inStock}
      className={cn(
        'md:hidden w-10 h-10 rounded-full flex items-center justify-center shadow-md flex-shrink-0 transition-colors',
        inStock
          ? added
            ? 'bg-bushal-success text-white'
            : 'bg-bushal-copper text-white hover:bg-bushal-copperLight shadow-bushal-copper/25'
          : 'bg-bushal-border/70 text-bushal-inkSoft cursor-not-allowed'
      )}
      whileTap={inStock ? { scale: 0.84 } : {}}
      animate={added ? { scale: [1, 1.22, 1] } : {}}
      transition={{ type: 'spring', stiffness: 500 }}
      aria-label="Add to cart"
    >
      <AnimatePresence mode="wait">
        {added ? (
          <motion.svg key="check" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : (
          <motion.svg key="plus" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProductCard({ product, index = 0 }: Props) {
  const router = useRouter()
  const { addItem } = useCart()
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlist()
  const { toggleItem: toggleCompare, isInCompare } = useCompare()

  const [added, setAdded]               = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [hovered, setHovered]           = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [mounted, setMounted]           = useState(false)

  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos   = useRef<{ x: number; y: number } | null>(null)
  const { ref: tiltRef, rotateX, rotateY, onMouseMove, reset: tiltReset } = useTilt(5)
  const revealRef = useRef<HTMLDivElement>(null)
  const inView = useInView(revealRef, { once: true, margin: '-48px' })

  useEffect(() => { setMounted(true) }, [])

  const isWished   = mounted ? isInWishlist(product.id) : false
  const isCompared = mounted ? isInCompare(product.id) : false

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  const images = product.images?.length
    ? product.images
    : product.image_url
    ? [product.image_url]
    : []

  // Rating from comments
  const ratedComments = (product.comments ?? []).filter((c: any) => c.rating != null)
  const avgRating = ratedComments.length
    ? ratedComments.reduce((s: number, c: any) => s + c.rating, 0) / ratedComments.length
    : 0

  const productHref = `/product/${product.id}`

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!product.in_stock) return
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2400)
  }, [addItem, product])

  const handleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    toggleWishlist(product)
  }, [toggleWishlist, product])

  const handleCompare = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    toggleCompare(product)
  }, [toggleCompare, product])

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setQuickViewOpen(true)
  }, [])

  // ── Long-press mobile → quick view ──────────────────────────────────────────
  const startLongPress = useCallback((clientX: number, clientY: number) => {
    touchStartPos.current = { x: clientX, y: clientY }
    setIsLongPressing(true)
    longPressTimer.current = setTimeout(() => {
      setQuickViewOpen(true)
      setIsLongPressing(false)
      if (navigator.vibrate) navigator.vibrate(48)
    }, 500)
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    setIsLongPressing(false)
    touchStartPos.current = null
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startLongPress(e.touches[0].clientX, e.touches[0].clientY)
  }, [startLongPress])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x)
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y)
    if (dx > 10 || dy > 10) cancelLongPress()
  }, [cancelLongPress])

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    tiltReset()
  }, [tiltReset])

  return (
    <>
      <motion.div
        ref={revealRef}
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{
          duration: 0.6,
          delay: Math.min(index % 4, 3) * 0.08,
          ease: EASE_EXPO,
        }}
        className="flex flex-col"
      >
        <motion.div
          ref={tiltRef}
          data-card-root
          style={{ rotateX, rotateY, transformPerspective: 900 }}
          onMouseMove={onMouseMove}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          className="group flex flex-col"
        >
          {/* ── Image container — ENTIRE AREA IS CLICKABLE ── */}
          <div className="relative overflow-hidden rounded-2xl bg-bushal-ivoryDeep aspect-[3/4] shadow-card hover:shadow-cardHover transition-shadow duration-300">

            {/* Cursor glow (desktop only) */}
            <CursorLight active={hovered} />

            {/* Full-area clickable image */}
            <ProductImage
              images={images}
              name={product.name}
              hovered={hovered}
              productHref={productHref}
            />

            {/* Gradient vignette */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-bushal-ink/28 via-transparent to-transparent pointer-events-none"
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.35 }}
            />

            {/* Copper shimmer border on hover */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: hovered
                  ? 'inset 0 0 0 1.5px rgba(184,115,51,0.45)'
                  : 'inset 0 0 0 1px rgba(0,0,0,0.06)',
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Badges */}
            <BadgeGroup
              discountPercent={product.discount_percent}
              stockQty={product.stock_quantity}
            />

            {/* Wishlist */}
            <WishlistBtn wished={isWished} onClick={handleWishlist} />

            {/* Long-press modal cue (mobile) */}
            <LongPressRing active={isLongPressing} />

            {/* Desktop overlay (hidden on mobile) */}
            <div className="hidden md:block">
              <HoverOverlay
                visible={hovered}
                inStock={!!product.in_stock}
                added={added}
                compared={isCompared}
                onAdd={handleAdd}
                onCompare={handleCompare}
                onQuickView={handleQuickView}
              />
            </div>
          </div>

          {/* ── Info ── */}
          <div className="pt-3.5 px-0.5 flex flex-col flex-1">
            {/* Category eyebrow */}
            {product.category && (
              <motion.p
                className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em] text-bushal-copper mb-1 leading-none"
                animate={{ opacity: hovered ? 1 : 0.65 }}
                transition={{ duration: 0.2 }}
              >
                {product.category}
              </motion.p>
            )}

            {/* Product name — also navigates, but the image click above is the main UX improvement */}
            <Link href={productHref} className="group/link block mb-1">
              <h3 className="font-heading text-[15px] sm:text-[17px] leading-snug text-bushal-forest group-hover/link:text-bushal-forestMid transition-colors duration-200 line-clamp-2">
                {product.name}
              </h3>
            </Link>

            {/* Star rating */}
            <div className="mb-2">
              <MiniStars rating={avgRating} count={ratedComments.length} />
            </div>

            {/* Price row */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-bushal-border/50">
              <div className="flex items-baseline gap-2">
                <motion.span
                  className="font-heading text-[17px] sm:text-xl text-bushal-copper font-semibold leading-none"
                  animate={{ scale: added ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {formatPrice(discountedPrice ?? product.price)}
                </motion.span>
                {discountedPrice && (
                  <span className="text-[10px] text-bushal-inkSoft/55 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {/* Mobile add button */}
              <MobileAddBtn
                inStock={!!product.in_stock}
                added={added}
                onClick={handleAdd}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      <ProductQuickView
        product={quickViewOpen ? product : null}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  )
}