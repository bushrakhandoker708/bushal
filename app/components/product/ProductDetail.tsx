'use client'

// app/components/product/ProductDetail.tsx

import { useCart } from '@/app/hooks/useCart'
import { Product } from '@/app/types/product'
import { useState, useCallback, useRef } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  product: Product
}

// ─── Image Gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const imgRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!zoomed || !imgRef.current) return
      const rect = imgRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePos({ x, y })
    },
    [zoomed]
  )

  const prev = () => setActive((a) => (a - 1 + images.length) % images.length)
  const next = () => setActive((a) => (a + 1) % images.length)

  if (images.length === 0) {
    return (
      <div className="rounded-2xl bg-bushal-ivoryDeep aspect-[4/5] flex flex-col items-center justify-center gap-3 border border-bushal-border text-bushal-borderMid">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm text-bushal-inkSoft">No image available</span>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* Vertical thumbnail strip */}
      {images.length > 1 && (
        <div className="hidden sm:flex flex-col gap-2.5 w-[72px] flex-shrink-0">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-300 flex-shrink-0',
                i === active
                  ? 'ring-2 ring-bushal-copper ring-offset-2 ring-offset-bushal-ivory'
                  : 'opacity-50 hover:opacity-80 hover:ring-1 hover:ring-bushal-border hover:ring-offset-1 hover:ring-offset-bushal-ivory'
              )}
              aria-label={`View image ${i + 1}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === active && (
                <div className="absolute inset-0 bg-bushal-copper/10" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="flex-1 flex flex-col gap-3">
        <div
          ref={imgRef}
          className={cn(
            'relative rounded-2xl overflow-hidden bg-bushal-ivoryDeep aspect-[4/5] border border-bushal-border/60',
            zoomed ? 'cursor-crosshair' : 'cursor-zoom-in'
          )}
          onMouseMove={handleMouseMove}
          onClick={() => setZoomed((z) => !z)}
          onMouseLeave={() => setZoomed(false)}
        >
          <img
            src={images[active]}
            alt={`${name} — view ${active + 1}`}
            className={cn(
              'w-full h-full object-cover transition-transform duration-100',
              zoomed ? 'scale-[2]' : 'scale-100 hover:scale-[1.03] transition-transform duration-700 ease-out'
            )}
            style={
              zoomed
                ? { transformOrigin: `${mousePos.x}% ${mousePos.y}%` }
                : undefined
            }
            draggable={false}
          />

          {/* Zoom hint */}
          {!zoomed && (
            <div className="absolute bottom-3 left-3 bg-bushal-forest/70 backdrop-blur-sm text-bushal-ivory text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none">
              Click to zoom
            </div>
          )}

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bushal-surface/90 backdrop-blur-sm shadow-md flex items-center justify-center text-bushal-forest hover:bg-bushal-surface hover:scale-110 transition-all active:scale-95 opacity-0 [.group:hover_&]:opacity-100"
                aria-label="Previous image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bushal-surface/90 backdrop-blur-sm shadow-md flex items-center justify-center text-bushal-forest hover:bg-bushal-surface hover:scale-110 transition-all active:scale-95 opacity-0 [.group:hover_&]:opacity-100"
                aria-label="Next image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Position indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActive(i) }}
                  className={cn(
                    'transition-all duration-300 rounded-full',
                    i === active
                      ? 'w-5 h-1.5 bg-bushal-copper'
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
          <div className="sm:hidden flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={cn(
                  'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all duration-200',
                  i === active
                    ? 'ring-2 ring-bushal-copper ring-offset-1 ring-offset-bushal-ivory'
                    : 'opacity-50 hover:opacity-80'
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
    <div className="flex flex-col items-center text-center gap-1.5 px-2">
      <div className="w-10 h-10 rounded-xl bg-bushal-copper/8 flex items-center justify-center text-bushal-copper mb-0.5">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-bushal-forest uppercase tracking-wider leading-tight">
        {label}
      </span>
      <span className="text-[11px] text-bushal-inkSoft leading-tight">{sub}</span>
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
  const btnClass =
    size === 'sm'
      ? 'w-9 h-9 text-base'
      : 'w-11 h-11 text-lg'
  const numClass = size === 'sm' ? 'w-8 text-sm' : 'w-10 text-base'

  return (
    <div className="flex items-center border border-bushal-border rounded-xl overflow-hidden bg-bushal-surface">
      <button
        onClick={onDecrement}
        className={cn(btnClass, 'flex items-center justify-center text-bushal-forest hover:bg-bushal-ivory transition-colors font-light')}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span
        className={cn(numClass, 'flex items-center justify-center text-bushal-forest font-bold border-x border-bushal-border h-full')}
        style={{ height: size === 'sm' ? '36px' : '44px' }}
      >
        {value}
      </span>
      <button
        onClick={onIncrement}
        className={cn(btnClass, 'flex items-center justify-center text-bushal-forest hover:bg-bushal-ivory transition-colors font-light')}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductDetail({ product }: Props) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_44%] gap-10 lg:gap-14 group">
      {/* ── Gallery ── */}
      <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
        <ImageGallery images={images} name={product.name} />
      </div>

      {/* ── Details ── */}
      <div
        className="flex flex-col animate-fade-up pb-28 lg:pb-0"
        style={{ animationDelay: '80ms' }}
      >
        {/* Category eyebrow */}
        {product.category && (
          <p className="eyebrow mb-4">{product.category}</p>
        )}

        {/* Product name */}
        <h1 className="font-heading text-[2.6rem] sm:text-5xl text-bushal-forest leading-[1.05] tracking-[-0.02em] mb-4">
          {product.name}
        </h1>

        {/* Rating row */}
        {ratingsOnly.length > 0 && (
          <div className="flex items-center gap-2.5 mb-6">
            <RatingStars rating={avgRating} />
            <span className="text-sm text-bushal-inkSoft">
              {avgRating.toFixed(1)} · {ratingsOnly.length}{' '}
              {ratingsOnly.length === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        )}

        {/* Divider ornament */}
        <div className="flex items-center gap-3 mb-7">
          <div className="h-px flex-1 bg-bushal-border" />
          <div className="flex gap-1.5">
            <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-bushal-copper" />
            <span className="w-1 h-1 rounded-full bg-bushal-copper/40" />
          </div>
          <div className="h-px flex-1 bg-bushal-border" />
        </div>

        {/* Price block */}
        <div className="mb-7">
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
            <div className="mt-2 inline-flex items-center gap-1.5 bg-bushal-successBg border border-bushal-success/20 text-bushal-success px-3 py-1 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a0 0 0 014-4h0z" />
              </svg>
              <span className="text-xs font-bold tracking-wide">
                Save {formatPrice(savingsAmount)} ({product.discount_percent}% off)
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-bushal-inkMid leading-[1.75] text-[15px] mb-8">
            {product.description}
          </p>
        )}

        {/* Stock status */}
        <div className="flex items-center gap-2.5 mb-8">
          <span
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              product.in_stock ? 'bg-bushal-success animate-pulse' : 'bg-bushal-danger'
            )}
          />
          <span
            className={cn(
              'text-sm font-semibold',
              product.in_stock ? 'text-bushal-forest' : 'text-bushal-danger'
            )}
          >
            {product.in_stock ? 'In stock — ships within 24 hours' : 'Currently out of stock'}
          </span>
        </div>

        {/* Desktop: quantity + add to bag */}
        <div className="hidden lg:flex items-center gap-3 mb-8">
          <QuantityStepper
            value={quantity}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => q + 1)}
          />
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className={cn(
              'flex-1 h-11 rounded-xl font-semibold text-sm tracking-[0.08em] uppercase transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden',
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
        </div>

        {/* Divider */}
        <div className="hidden lg:block h-px bg-bushal-border mb-8" />

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-1">
          <TrustBadge
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            label="Free delivery"
            sub="Nationwide"
          />
          <TrustBadge
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            label="7-day returns"
            sub="No questions asked"
          />
          <TrustBadge
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            label="Secure payment"
            sub="bKash & card"
          />
        </div>
      </div>

      {/* ── Mobile sticky bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bushal-surface/96 backdrop-blur-xl border-t border-bushal-border px-4 pt-3 safe-bottom shadow-[0_-8px_32px_rgba(27,58,45,0.09)]">
        {/* Price mini row */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-heading text-xl text-bushal-copper font-semibold">
            {formatPrice(finalPrice)}
          </span>
          {product.in_stock ? (
            <span className="flex items-center gap-1.5 text-xs text-bushal-success font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-bushal-success animate-pulse" />
              In stock
            </span>
          ) : (
            <span className="text-xs text-bushal-danger font-semibold">Out of stock</span>
          )}
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
              'flex-1 h-11 rounded-xl font-bold text-sm tracking-[0.06em] uppercase transition-all duration-300 flex items-center justify-center gap-2',
              product.in_stock
                ? added
                  ? 'bg-bushal-success text-white'
                  : 'btn-copper active:scale-[0.98]'
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
    </div>
  )
}