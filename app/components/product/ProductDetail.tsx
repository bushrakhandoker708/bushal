// app/components/product/ProductDetail.tsx
'use client'

import { useCart } from '@/app/hooks/useCart'
import { useRecentlyViewed } from '@/app/hooks/useRecentlyViewed'
import { Product } from '@/app/types/product'
import { useState, useRef, useEffect } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import { getStockStatus } from '@/app/lib/utils/stockStatus'
import ImageZoom from './ImageZoom'
import RecentlyViewedCarousel from './RecentlyViewedCarousel'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  product: Product
}

// ─── Image Gallery ────────────────────────────────────────────────────────────
function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(0)
  const imgRef = useRef<HTMLDivElement>(null)

  const prev = () => {
    setDirection(-1)
    setActive((a) => (a - 1 + images.length) % images.length)
  }
  
  const next = () => {
    setDirection(1)
    setActive((a) => (a + 1) % images.length)
  }

  const handleThumbClick = (index: number) => {
    setDirection(index > active ? 1 : -1)
    setActive(index)
  }

  if (images.length === 0) {
    return (
      <div className="rounded-3xl bg-bushal-ivoryDeep aspect-[4/5] flex flex-col items-center justify-center gap-4 border border-bushal-border text-bushal-borderMid">
        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-bushal-inkSoft">No images available</span>
      </div>
    )
  }

  return (
    <div className="flex gap-4 lg:gap-6">
      {/* Vertical thumbnail strip (Desktop) */}
      {images.length > 1 && (
        <div className="hidden sm:flex flex-col gap-3 w-[80px] flex-shrink-0">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => handleThumbClick(i)}
              className={cn(
                'relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-300 flex-shrink-0 border-2',
                i === active
                  ? 'border-bushal-copper ring-2 ring-bushal-copper/20 ring-offset-2 ring-offset-bushal-ivory scale-105'
                  : 'border-transparent opacity-60 hover:opacity-100 hover:border-bushal-border'
              )}
              aria-label={`View image ${i + 1}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === active && (
                <div className="absolute inset-0 bg-bushal-copper/5" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main image with Premium Zoom */}
      <div className="flex-1 flex flex-col gap-4">
        <div
          ref={imgRef}
          className="relative rounded-3xl overflow-hidden bg-bushal-ivoryDeep aspect-[4/5] border border-bushal-border/60 group shadow-card"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={active}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <ImageZoom src={images[active]} alt={`${name} — view ${active + 1}`} />
            </motion.div>
          </AnimatePresence>

          {/* Zoom Hint (Desktop) */}
          <div className="absolute top-4 right-4 bg-bushal-surface/80 backdrop-blur-sm text-bushal-inkSoft text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Hover to zoom
          </div>

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bushal-surface/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-bushal-forest hover:bg-bushal-surface hover:scale-110 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                aria-label="Previous image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bushal-surface/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-bushal-forest hover:bg-bushal-surface hover:scale-110 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                aria-label="Next image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Position indicator dots */}
          {images.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-1.5 bg-bushal-ink/40 backdrop-blur-md px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); handleThumbClick(i) }}
                  className={cn(
                    'transition-all duration-300 rounded-full',
                    i === active
                      ? 'w-4 h-1.5 bg-bushal-copper'
                      : 'w-1.5 h-1.5 bg-bushal-ivory/60 hover:bg-bushal-ivory/90'
                  )}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile horizontal thumbnails */}
        {images.length > 1 && (
          <div className="sm:hidden flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => handleThumbClick(i)}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-200 border-2',
                  i === active
                    ? 'border-bushal-copper ring-2 ring-bushal-copper/20 ring-offset-1 ring-offset-bushal-ivory'
                    : 'border-transparent opacity-50 hover:opacity-80'
                )}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Rating Stars ─────────────────────────────────────────────────────────────
function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const filled = Math.round(rating)
  const px = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={cn(px, 'fill-current transition-colors', i <= filled ? 'text-bushal-copper' : 'text-bushal-border')} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ─── Trust Badge ──────────────────────────────────────────────────────────────
function TrustBadge({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-bushal-ivoryDeep/50 border border-bushal-border/50 hover:border-bushal-copper/20 hover:bg-bushal-copperMuted/30 transition-all duration-300 group">
      <div className="w-9 h-9 rounded-lg bg-bushal-surface flex items-center justify-center text-bushal-copper flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-bushal-forest uppercase tracking-wider leading-tight truncate">
          {label}
        </span>
        <span className="text-[10px] text-bushal-inkSoft leading-tight truncate">
          {sub}
        </span>
      </div>
    </div>
  )
}

// ─── Feature Item ─────────────────────────────────────────────────────────────
function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 group/item">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bushal-copper/10 to-bushal-copper/5 flex items-center justify-center flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300 shadow-sm border border-bushal-copper/10">
        {icon}
      </div>
      <p className="text-[15px] leading-[1.7] text-bushal-inkMid font-body flex-1 pt-1">
        {text}
      </p>
    </div>
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
  const btnClass = size === 'sm' ? 'w-9 h-9 text-base' : 'w-11 h-11 text-lg'
  const numClass = size === 'sm' ? 'w-8 text-sm' : 'w-10 text-base'
  return (
    <div className="flex items-center border border-bushal-border rounded-xl overflow-hidden bg-bushal-surface shadow-sm">
      <button
        onClick={onDecrement}
        className={cn(btnClass, 'flex items-center justify-center text-bushal-forest hover:bg-bushal-ivoryDeep transition-colors font-light active:scale-90')}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span
        className={cn(numClass, 'flex items-center justify-center text-bushal-forest font-bold border-x border-bushal-border h-full bg-bushal-ivory/30')}
        style={{ height: size === 'sm' ? '36px' : '44px' }}
      >
        {value}
      </span>
      <button
        onClick={onIncrement}
        className={cn(btnClass, 'flex items-center justify-center text-bushal-forest hover:bg-bushal-ivoryDeep transition-colors font-light active:scale-90')}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProductDetail({ product }: Props) {
  const { addItem } = useCart()
  const { addProduct } = useRecentlyViewed()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (product) {
      addProduct(product)
    }
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
    setTimeout(() => setAdded(false), 2500)
  }

  const images = product.images?.length
    ? product.images
    : product.image_url
    ? [product.image_url]
    : []

  // Parse details into array of features
  const features = product.details 
    ? product.details.split('\n').filter(line => line.trim()).map(line => line.trim())
    : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_44%] gap-10 lg:gap-14 group">
      {/* ── Gallery ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
        <ImageGallery images={images} name={product.name} />
      </div>

      {/* ── Details Column ── */}
      <div
        className="flex flex-col animate-fade-up pb-32 lg:pb-0"
        style={{ animationDelay: '80ms' }}
      >
        {/* Category eyebrow */}
        {product.category && (
          <motion.p 
            className="eyebrow mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {product.category}
          </motion.p>
        )}

        {/* Product name */}
        <motion.h1 
          className="font-heading text-[2.6rem] sm:text-5xl text-bushal-forest leading-[1.05] tracking-[-0.02em] mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {product.name}
        </motion.h1>

        {/* Rating row */}
        {ratingsOnly.length > 0 && (
          <motion.div 
            className="flex items-center gap-2.5 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <RatingStars rating={avgRating} />
            <span className="text-sm text-bushal-inkSoft">
              {avgRating.toFixed(1)} · {ratingsOnly.length}{' '}
              {ratingsOnly.length === 1 ? 'review' : 'reviews'}
            </span>
          </motion.div>
        )}

        {/* Divider ornament */}
        <motion.div 
          className="flex items-center gap-3 mb-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="h-px flex-1 bg-bushal-border" />
          <div className="flex gap-1.5">
            <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-bushal-copper" />
            <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
          </div>
          <div className="h-px flex-1 bg-bushal-border" />
        </motion.div>

        {/* Price block */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-heading text-[2.2rem] text-bushal-copper font-semibold leading-none">
              {formatPrice(finalPrice)}
            </span>
            {discountedPrice && (
              <span className="text-lg text-bushal-inkSoft line-through font-light">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          {discountedPrice && savingsAmount > 0 && (
            <motion.div 
              className="mt-2 inline-flex items-center gap-1.5 bg-bushal-successBg border border-bushal-success/20 text-bushal-success px-3 py-1 rounded-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a0 0 0 014-4h0z" />
              </svg>
              <span className="text-xs font-bold tracking-wide">
                Save {formatPrice(savingsAmount)} ({product.discount_percent}% off)
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* ✨ PREMIUM KEY FEATURES SECTION ✨ */}
        {features.length > 0 && (
          <motion.div 
            className="relative mb-8 animate-fade-up"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-bushal-copper/5 via-bushal-ivoryDeep/60 to-transparent rounded-2xl pointer-events-none" />
            
            <div className="relative p-5 rounded-2xl border border-bushal-copper/10 bg-bushal-surface/50 backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bushal-copper to-bushal-copperLight flex items-center justify-center shadow-md shadow-bushal-copper/20">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-bushal-copper">
                  Key Features
                </h3>
              </div>

              {/* Features list */}
              <div className="space-y-3">
                {features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + idx * 0.05 }}
                  >
                    <FeatureItem 
                      icon={
                        <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      }
                      text={feature}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Description */}
        {product.description && (
          <motion.div 
            className="mb-8 animate-fade-up"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-bushal-forest/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-bushal-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-bushal-forest">
                The Story
              </h3>
            </div>
            <div className="prose prose-sm max-w-none text-bushal-inkMid leading-[1.8] font-body">
              {product.description.split('\n').map((paragraph, idx) => (
                paragraph.trim() && (
                  <p key={idx} className="mb-4 last:mb-0">
                    {paragraph.trim()}
                  </p>
                )
              ))}
            </div>
          </motion.div>
        )}

        {/* Stock status */}
        <motion.div 
          className="flex items-center gap-2.5 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              stockDisplay.dotColor,
              product.stock_quantity > 0 && 'animate-pulse'
            )}
          />
          <span className={cn('text-sm font-semibold', stockDisplay.color)}>
            {stockDisplay.label}
            {product.stock_quantity > 5 && ' — ships within 24 hours'}
          </span>
        </motion.div>

        {/* Desktop: quantity + add to bag */}
        <motion.div 
          className="hidden lg:flex items-center gap-3 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <QuantityStepper
            value={quantity}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => q + 1)}
          />
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className={cn(
              'flex-1 h-12 rounded-xl font-semibold text-sm tracking-[0.08em] uppercase transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden',
              product.in_stock
                ? added
                  ? 'bg-bushal-success text-white shadow-none'
                  : 'btn-forest hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]'
                : 'bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed border border-bushal-border'
            )}
            aria-live="polite"
          >
            {added ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Added to bag
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Add to bag
              </>
            )}
          </button>
        </motion.div>

        {/* Divider */}
        <motion.div 
          className="hidden lg:block h-px bg-bushal-border mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        />

        {/* Trust badges */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <TrustBadge
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            label="Free delivery"
            sub="Nationwide"
          />
          <TrustBadge
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            label="7-day returns"
            sub="No questions asked"
          />
          <TrustBadge
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            label="Secure payment"
            sub="bKash & card"
          />
        </motion.div>
      </div>

      {/* ── Mobile sticky bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bushal-surface/95 backdrop-blur-xl border-t border-bushal-border/80 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_32px_rgba(27,58,45,0.12)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="font-heading text-xl text-bushal-copper font-semibold leading-none">
              {formatPrice(finalPrice)}
            </span>
            {discountedPrice && (
              <span className="text-xs text-bushal-inkSoft line-through mt-0.5">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <span className={cn("flex items-center gap-1.5 text-xs font-semibold", stockDisplay.color)}>
            {product.stock_quantity > 0 && <span className={cn('w-1.5 h-1.5 rounded-full', stockDisplay.dotColor, 'animate-pulse')} />}
            {stockDisplay.status === 'out_of_stock' ? 'Out of stock' : stockDisplay.status === 'low_stock' ? `Only ${product.stock_quantity} left` : 'In stock'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <QuantityStepper
            value={quantity}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => q + 1)}
            size="sm"
          />
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className={cn(
              'flex-1 h-11 rounded-xl font-bold text-sm tracking-[0.06em] uppercase transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97]',
              product.in_stock
                ? added
                  ? 'bg-bushal-success text-white'
                  : 'btn-copper'
                : 'bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed border border-bushal-border'
            )}
            aria-live="polite"
          >
            {added ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Added
              </>
            ) : (
              'Add to bag'
            )}
          </button>
        </div>
      </div>

      {/* ── Recently Viewed Carousel ─ */}
      <div className="col-span-1 lg:col-span-2 mt-16 lg:mt-24">
        <RecentlyViewedCarousel currentProductId={product.id} />
      </div>
    </div>
  )
}