// app/components/product/ProductDetail.tsx
'use client'

import { useCart } from '@/app/hooks/useCart'
import { useRecentlyViewed } from '@/app/hooks/useRecentlyViewed'
import { Product } from '@/app/types/product'
import { useState, useRef, useEffect, useCallback } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import { getStockStatus } from '@/app/lib/utils/stockStatus'
import ImageZoom from './ImageZoom'
import RecentlyViewedCarousel from './RecentlyViewedCarousel'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useSpring,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
} from 'framer-motion'

interface Props {
  product: Product
}

// ─── Magnetic Button Hook ─────────────────────────────────────────────────────
function useMagnetic(strength = 0.3) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 350, damping: 28 })
  const springY = useSpring(y, { stiffness: 350, damping: 28 })

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set((e.clientX - cx) * strength)
    y.set((e.clientY - cy) * strength)
  }, [x, y, strength])

  const handleMouseLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [handleMouseMove, handleMouseLeave])

  return { ref, style: { x: springX, y: springY } }
}

// ─── Cursor Glow Component ────────────────────────────────────────────────────
function CursorGlow({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      x.set(e.clientX - rect.left)
      y.set(e.clientY - rect.top)
    }
    el.addEventListener('mousemove', move)
    return () => el.removeEventListener('mousemove', move)
  }, [x, y, containerRef])

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl"
      style={{
        background: useTransform(
          [x, y],
          ([mx, my]) =>
            `radial-gradient(320px circle at ${mx}px ${my}px, rgba(184,115,51,0.06), transparent 70%)`
        ),
      }}
    />
  )
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 80, damping: 20 })

  useEffect(() => {
    if (inView) motionVal.set(value)
  }, [inView, value, motionVal])

  useEffect(() => {
    return springVal.on('change', (v) => {
      if (ref.current) ref.current.textContent = v.toFixed(decimals)
    })
  }, [springVal, decimals])

  return <span ref={ref}>0</span>
}

// ─── Parallax Image Container ─────────────────────────────────────────────────
function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  return (
    <div ref={ref} className="relative w-full h-full overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover scale-110"
        style={{ y }}
      />
    </div>
  )
}

// ─── Image Gallery ────────────────────────────────────────────────────────────
function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const prev = () => { setDirection(-1); setActive((a) => (a - 1 + images.length) % images.length) }
  const next = () => { setDirection(1); setActive((a) => (a + 1) % images.length) }

  const handleThumbClick = (index: number) => {
    setDirection(index > active ? 1 : -1)
    setActive(index)
  }

  // Swipe support
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true)
    dragStartX.current = 'touches' in e ? e.touches[0].clientX : e.clientX
  }
  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return
    const endX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
    const delta = dragStartX.current - endX
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev()
    setIsDragging(false)
  }

  if (images.length === 0) {
    return (
      <div className="rounded-3xl bg-bushal-ivoryDeep aspect-[4/5] flex flex-col items-center justify-center gap-4 border border-bushal-border text-bushal-borderMid">
        <svg className="w-20 h-20 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-bushal-inkSoft">No images available</span>
      </div>
    )
  }

  return (
    <div className="flex gap-4 lg:gap-5 h-full">
      {/* Vertical thumbnail strip */}
      {images.length > 1 && (
        <motion.div
          className="hidden sm:flex flex-col gap-2.5 w-[72px] flex-shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {images.map((src, i) => (
            <motion.button
              key={i}
              onClick={() => handleThumbClick(i)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative w-full aspect-square rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all duration-300',
                i === active
                  ? 'border-bushal-copper ring-2 ring-bushal-copper/20 ring-offset-2 ring-offset-bushal-ivory'
                  : 'border-transparent opacity-50 hover:opacity-80 hover:border-bushal-border'
              )}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              <AnimatePresence>
                {i === active && (
                  <motion.div
                    className="absolute inset-0 bg-bushal-copper/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Main image */}
      <div className="flex-1 flex flex-col gap-4">
        <div
          ref={containerRef}
          className="relative rounded-3xl overflow-hidden bg-bushal-ivoryDeep aspect-[4/5] group cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
        >
          <CursorGlow containerRef={containerRef as React.RefObject<HTMLDivElement>} />

          {/* Main image transition */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={active}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60, scale: 0.97 }),
                center: { opacity: 1, x: 0, scale: 1 },
                exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60, scale: 0.97 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50) next()
                else if (info.offset.x > 50) prev()
              }}
            >
              <ImageZoom src={images[active]} alt={`${name} — view ${active + 1}`} />
            </motion.div>
          </AnimatePresence>

          {/* Gradient overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bushal-ink/20 to-transparent pointer-events-none" />

          {/* Zoom hint badge */}
          <motion.div
            className="absolute top-4 right-4 bg-bushal-surface/80 backdrop-blur-md text-bushal-inkSoft text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-bushal-border/40 flex items-center gap-1.5 pointer-events-none"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Hover to zoom
          </motion.div>

          {/* Hover: reveal zoom hint */}
          <div className="absolute top-4 right-4 bg-bushal-surface/80 backdrop-blur-md text-bushal-inkSoft text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-bushal-border/40 flex items-center gap-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Hover to zoom
          </div>

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              {[
                { onClick: prev, icon: 'M15 19l-7-7 7-7', label: 'Previous', side: 'left-4' },
                { onClick: next, icon: 'M9 5l7 7-7 7', label: 'Next', side: 'right-4' },
              ].map(({ onClick, icon, label, side }) => (
                <motion.button
                  key={label}
                  onClick={(e) => { e.stopPropagation(); onClick() }}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bushal-surface/90 backdrop-blur-md shadow-xl flex items-center justify-center text-bushal-forest border border-bushal-border/40',
                    side,
                    'opacity-0 group-hover:opacity-100'
                  )}
                  whileHover={{ scale: 1.12, backgroundColor: 'rgba(255,255,255,0.98)' }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ duration: 0.15 }}
                  aria-label={label}
                  style={{ transition: 'opacity 0.3s ease' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                </motion.button>
              ))}
            </>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-bushal-ink/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                {images.map((_, i) => (
                  <motion.button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); handleThumbClick(i) }}
                    animate={{ width: i === active ? 20 : 6, backgroundColor: i === active ? '#B87333' : 'rgba(255,255,255,0.5)' }}
                    className="h-1.5 rounded-full"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile thumbnails */}
        {images.length > 1 && (
          <div className="sm:hidden flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {images.map((src, i) => (
              <motion.button
                key={i}
                onClick={() => handleThumbClick(i)}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all',
                  i === active ? 'border-bushal-copper' : 'border-transparent opacity-45'
                )}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Rating Stars ─────────────────────────────────────────────────────────────
function RatingStars({ rating, animated = false }: { rating: number; animated?: boolean }) {
  const filled = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.svg
          key={i}
          className={cn('w-4 h-4 fill-current', i <= filled ? 'text-bushal-copper' : 'text-bushal-border')}
          viewBox="0 0 20 20"
          initial={animated ? { scale: 0, rotate: -30 } : false}
          animate={animated ? { scale: 1, rotate: 0 } : false}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </motion.svg>
      ))}
    </div>
  )
}

// ─── Scroll Reveal Wrapper ────────────────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className,
}: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const initial = {
    up: { opacity: 0, y: 28 },
    left: { opacity: 0, x: -28 },
    right: { opacity: 0, x: 28 },
    none: { opacity: 0 },
  }[direction]

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : initial}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── Feature Item with Stagger ────────────────────────────────────────────────
function FeatureItem({ text, index }: { text: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })

  return (
    <motion.div
      ref={ref}
      className="flex items-start gap-3 group/item"
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="w-7 h-7 rounded-lg bg-gradient-to-br from-bushal-copper/15 to-bushal-copper/5 border border-bushal-copper/15 flex items-center justify-center flex-shrink-0 mt-0.5"
        whileHover={{ scale: 1.15, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        <svg className="w-3.5 h-3.5 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <p className="text-[14.5px] leading-relaxed text-bushal-inkMid font-body flex-1 group-hover/item:text-bushal-ink transition-colors duration-200">
        {text}
      </p>
    </motion.div>
  )
}

// ─── Animated Price ───────────────────────────────────────────────────────────
function AnimatedPrice({ price, className }: { price: string; className?: string }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {price}
    </motion.span>
  )
}

// ─── Trust Badge ──────────────────────────────────────────────────────────────
function TrustBadge({
  icon,
  label,
  sub,
  delay = 0,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-bushal-ivoryDeep/60 border border-bushal-border/60 hover:border-bushal-copper/25 hover:bg-bushal-copperMuted/40 transition-all duration-400 group cursor-default"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(184,115,51,0.10)' }}
    >
      <motion.div
        className="w-9 h-9 rounded-xl bg-bushal-surface flex items-center justify-center text-bushal-copper flex-shrink-0 shadow-sm border border-bushal-border/40"
        whileHover={{ rotate: 8, scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        {icon}
      </motion.div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-bushal-forest uppercase tracking-wider leading-tight">{label}</span>
        <span className="text-[10px] text-bushal-inkSoft leading-tight mt-0.5">{sub}</span>
      </div>
    </motion.div>
  )
}

// ─── Quantity Stepper ─────────────────────────────────────────────────────────
function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  size = 'md',
}: {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  size?: 'sm' | 'md'
}) {
  const btnH = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'
  const numW = size === 'sm' ? 'w-9 text-sm' : 'w-11 text-[15px]'

  return (
    <div className="flex items-center rounded-xl overflow-hidden border border-bushal-border bg-bushal-surface shadow-inset">
      <motion.button
        onClick={onDecrement}
        className={cn(btnH, 'flex items-center justify-center text-bushal-forest hover:bg-bushal-ivoryDeep transition-colors text-lg font-light')}
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 600 }}
        aria-label="Decrease"
      >
        −
      </motion.button>
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          className={cn(numW, 'flex items-center justify-center text-bushal-forest font-bold border-x border-bushal-border bg-bushal-ivory/40')}
          style={{ height: size === 'sm' ? 36 : 44 }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <motion.button
        onClick={onIncrement}
        className={cn(btnH, 'flex items-center justify-center text-bushal-forest hover:bg-bushal-ivoryDeep transition-colors text-lg font-light')}
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 600 }}
        aria-label="Increase"
      >
        +
      </motion.button>
    </div>
  )
}

// ─── Floating Label ───────────────────────────────────────────────────────────
function DiscountBadge({ percent }: { percent: number }) {
  return (
    <motion.div
      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-copper/40 shadow-md"
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.4 }}
      whileHover={{ scale: 1.06 }}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      −{percent}% OFF
    </motion.div>
  )
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function GoldDivider({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className={cn('flex items-center gap-3', className)}>
      <motion.div
        className="h-px flex-1 bg-gradient-to-r from-transparent to-bushal-border"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ originX: 0 }}
      />
      <motion.div
        className="flex gap-1"
        initial={{ opacity: 0, scale: 0 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-bushal-copper" />
        <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
      </motion.div>
      <motion.div
        className="h-px flex-1 bg-gradient-to-l from-transparent to-bushal-border"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ originX: 1 }}
      />
    </div>
  )
}

// ─── Add to Bag Button ────────────────────────────────────────────────────────
function AddToBagButton({
  inStock,
  added,
  onClick,
  size = 'md',
}: {
  inStock: boolean
  added: boolean
  onClick: () => void
  size?: 'sm' | 'md'
}) {
  const { ref, style } = useMagnetic(0.2)

  return (
    <motion.button
      ref={ref}
      style={style}
      onClick={onClick}
      disabled={!inStock}
      className={cn(
        'relative overflow-hidden rounded-xl font-bold tracking-[0.06em] uppercase flex items-center justify-center gap-2 transition-all',
        size === 'md' ? 'flex-1 h-12 text-sm' : 'flex-1 h-11 text-xs',
        inStock
          ? added
            ? 'bg-bushal-success text-white'
            : 'btn-forest'
          : 'bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed border border-bushal-border'
      )}
      whileHover={inStock && !added ? { scale: 1.02 } : {}}
      whileTap={inStock ? { scale: 0.97 } : {}}
      aria-live="polite"
    >
      {/* Shimmer overlay */}
      {!added && inStock && (
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ translateX: ['−100%', '200%'] }}
          transition={{ repeat: Infinity, repeatDelay: 3, duration: 1.4, ease: 'easeInOut' }}
        />
      )}

      <AnimatePresence mode="wait">
        {added ? (
          <motion.span
            key="added"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <motion.svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35 }}
            >
              <motion.path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </motion.svg>
            Added to bag
          </motion.span>
        ) : (
          <motion.span
            key="add"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {inStock ? 'Add to bag' : 'Out of stock'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ─── Sticky Progress Bar ──────────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-bushal-copper via-bushal-copperLight to-bushal-copperGlow z-50 origin-left"
      style={{ scaleX }}
    />
  )
}

// ─── Stock Pulse Indicator ────────────────────────────────────────────────────
function StockIndicator({ stockQty, status }: { stockQty: number; status: ReturnType<typeof getStockStatus> }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      className="flex items-center gap-2.5"
      initial={{ opacity: 0, x: -12 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <span className={cn('relative flex h-2.5 w-2.5')}>
        {stockQty > 0 && (
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', status.dotColor)} />
        )}
        <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', status.dotColor)} />
      </span>
      <span className={cn('text-sm font-semibold', status.color)}>
        {status.label}
        {stockQty > 5 && (
          <span className="text-bushal-inkSoft font-normal"> · ships within 24 hours</span>
        )}
      </span>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetail({ product }: Props) {
  const { addItem } = useCart()
  const { addProduct } = useRecentlyViewed()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<'features' | 'story'>('features')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (product) addProduct(product)
  }, [product.id, addProduct])

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null
  const finalPrice = discountedPrice ?? product.price
  const savingsAmount = discountedPrice ? product.price - discountedPrice : 0

  const ratingsOnly = (product.comments ?? []).filter((c: any) => c.rating != null)
  const avgRating =
    ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum: number, c: any) => sum + (c.rating ?? 0), 0) / ratingsOnly.length
      : 0

  const stockDisplay = getStockStatus(product.stock_quantity)

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2800)
  }

  const images = product.images?.length
    ? product.images
    : product.image_url
    ? [product.image_url]
    : []

  const features = product.details
    ? product.details.split('\n').filter((l: string) => l.trim()).map((l: string) => l.trim())
    : []

  const descriptionParagraphs = product.description
    ? product.description.split('\n').filter((p: string) => p.trim())
    : []

  return (
    <>
      <ScrollProgress />

      <div ref={containerRef} className="relative">
        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_46%] gap-10 lg:gap-16">

          {/* ── Gallery Column ── */}
          <motion.div
            className="relative lg:sticky lg:top-8 lg:self-start"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Category floating badge on image */}
            {product.category && (
              <motion.div
                className="absolute top-4 left-4 z-10 bg-bushal-surface/90 backdrop-blur-md text-bushal-forest text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-bushal-border/50 shadow-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {product.category}
              </motion.div>
            )}
            <ImageGallery images={images} name={product.name} />
          </motion.div>

          {/* ── Detail Column ── */}
          <div className="flex flex-col pb-32 lg:pb-10">

            {/* Product name */}
            <Reveal delay={0.1}>
              <motion.h1
                className="font-heading text-[2.8rem] sm:text-[3.4rem] text-bushal-forest leading-[1.02] tracking-[-0.025em] mb-3"
                style={{ fontVariantNumeric: 'lining-nums' }}
              >
                {product.name}
              </motion.h1>
            </Reveal>

            {/* Rating row */}
            {ratingsOnly.length > 0 && (
              <Reveal delay={0.18}>
                <div className="flex items-center gap-3 mb-5">
                  <RatingStars rating={avgRating} animated />
                  <span className="text-sm text-bushal-inkSoft">
                    {avgRating.toFixed(1)}
                    <span className="mx-1.5 text-bushal-border">·</span>
                    {ratingsOnly.length} {ratingsOnly.length === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </Reveal>
            )}

            <GoldDivider className="mb-6" />

            {/* ── Price Block ── */}
            <Reveal delay={0.22}>
              <div className="mb-5">
                <div className="flex items-end gap-4 flex-wrap mb-2">
                  <AnimatedPrice
                    price={formatPrice(finalPrice)}
                    className="font-heading text-[2.6rem] text-bushal-copper font-semibold leading-none"
                  />
                  {discountedPrice && (
                    <motion.span
                      className="text-xl text-bushal-inkSoft/60 line-through font-light pb-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {formatPrice(product.price)}
                    </motion.span>
                  )}
                </div>
                {discountedPrice && product.discount_percent && (
                  <div className="flex items-center gap-3 mt-2">
                    <DiscountBadge percent={product.discount_percent} />
                    <motion.span
                      className="text-xs text-bushal-success font-semibold"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 }}
                    >
                      You save {formatPrice(savingsAmount)}
                    </motion.span>
                  </div>
                )}
              </div>
            </Reveal>

            {/* ── Stock ── */}
            <Reveal delay={0.28} className="mb-7">
              <StockIndicator stockQty={product.stock_quantity} status={stockDisplay} />
            </Reveal>

            {/* ── Tab switcher: Features / Story ── */}
            {(features.length > 0 || descriptionParagraphs.length > 0) && (
              <Reveal delay={0.32} className="mb-6">
                {/* Tab pills */}
                <div className="flex items-center gap-1 bg-bushal-ivoryDeep rounded-xl p-1 mb-5 w-fit border border-bushal-border/60">
                  {(['features', 'story'] as const).filter(tab =>
                    tab === 'features' ? features.length > 0 : descriptionParagraphs.length > 0
                  ).map((tab) => (
                    <motion.button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'relative px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-200',
                        activeTab === tab ? 'text-bushal-forest' : 'text-bushal-inkSoft hover:text-bushal-inkMid'
                      )}
                    >
                      {activeTab === tab && (
                        <motion.div
                          layoutId="tab-pill"
                          className="absolute inset-0 bg-bushal-surface rounded-lg shadow-sm border border-bushal-border/50"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{tab === 'features' ? 'Key Features' : 'The Story'}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'features' && features.length > 0 && (
                    <motion.div
                      key="features"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="relative rounded-2xl border border-bushal-copper/12 bg-gradient-to-br from-bushal-surface to-bushal-ivoryDeep/40 p-5 space-y-3 overflow-hidden"
                    >
                      {/* Decorative corner accent */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-bushal-copper/6 to-transparent rounded-bl-3xl pointer-events-none" />
                      {features.map((feature: string, idx: number) => (
                        <FeatureItem key={idx} text={feature} index={idx} />
                      ))}
                    </motion.div>
                  )}

                  {activeTab === 'story' && descriptionParagraphs.length > 0 && (
                    <motion.div
                      key="story"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="relative rounded-2xl border border-bushal-border/60 bg-gradient-to-br from-bushal-surface to-bushal-ivoryDeep/30 p-5 overflow-hidden"
                    >
                      {/* Decorative quote mark */}
                      <div className="absolute -top-3 -left-1 font-heading text-[80px] text-bushal-copper/8 leading-none select-none pointer-events-none">
                        "
                      </div>
                      <div className="space-y-3 relative">
                        {descriptionParagraphs.map((para: string, idx: number) => (
                          <motion.p
                            key={idx}
                            className="text-[14.5px] leading-[1.85] text-bushal-inkMid font-body"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07 }}
                          >
                            {para}
                          </motion.p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            )}

            <GoldDivider className="mb-7" />

            {/* ── Desktop CTA ── */}
            <Reveal delay={0.36} className="hidden lg:block mb-7">
              <div className="flex items-center gap-3">
                <QuantityStepper
                  value={quantity}
                  onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
                  onIncrement={() => setQuantity((q) => q + 1)}
                />
                <AddToBagButton
                  inStock={!!product.in_stock}
                  added={added}
                  onClick={handleAddToCart}
                />
              </div>

              {/* Savings nudge */}
              <AnimatePresence>
                {!added && product.in_stock && (
                  <motion.p
                    className="text-[11px] text-bushal-inkSoft/70 mt-2.5 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    Free delivery · 7-day returns · Secure checkout
                  </motion.p>
                )}
              </AnimatePresence>
            </Reveal>

            {/* ── Trust badges ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <TrustBadge
                delay={0.45}
                icon={
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                label="Free delivery"
                sub="Nationwide shipping"
              />
              <TrustBadge
                delay={0.5}
                icon={
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
                label="7-day returns"
                sub="No questions asked"
              />
              <TrustBadge
                delay={0.55}
                icon={
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                label="Secure payment"
                sub="bKash · Card · COD"
              />
            </div>
          </div>
        </div>

        {/* ── Mobile sticky bar ── */}
        <motion.div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bushal-surface/96 backdrop-blur-xl border-t border-bushal-border/70 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-12px_40px_rgba(27,58,45,0.14)]"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 28 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-heading text-2xl text-bushal-copper font-semibold leading-none block">
                {formatPrice(finalPrice)}
              </span>
              {discountedPrice && (
                <span className="text-xs text-bushal-inkSoft line-through mt-0.5 block">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            <div className={cn('flex items-center gap-1.5 text-xs font-semibold', stockDisplay.color)}>
              {product.stock_quantity > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', stockDisplay.dotColor)} />
                  <span className={cn('relative inline-flex h-2 w-2 rounded-full', stockDisplay.dotColor)} />
                </span>
              )}
              {stockDisplay.status === 'out_of_stock'
                ? 'Out of stock'
                : stockDisplay.status === 'low_stock'
                ? `Only ${product.stock_quantity} left`
                : 'In stock'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={quantity}
              onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
              onIncrement={() => setQuantity((q) => q + 1)}
              size="sm"
            />
            <AddToBagButton
              inStock={!!product.in_stock}
              added={added}
              onClick={handleAddToCart}
              size="sm"
            />
          </div>
        </motion.div>

        {/* ── Recently Viewed ── */}
        <div className="mt-20 lg:mt-28">
          <Reveal>
            <RecentlyViewedCarousel currentProductId={product.id} />
          </Reveal>
        </div>
      </div>
    </>
  )
}