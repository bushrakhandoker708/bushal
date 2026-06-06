// app/components/product/ProductDetail.tsx
'use client'

import { useCart } from '@/app/hooks/useCart'
import { Product } from '@/app/types/product'
import { useState } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import Button from '../ui/Button'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  product: Product
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={cn('w-4 h-4 fill-current', i < Math.round(rating) ? 'text-amber-400' : 'text-slate-200')}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-slate-500 font-medium">
        {rating.toFixed(1)} · {count} {count === 1 ? 'review' : 'reviews'}
      </span>
    </div>
  )
}

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  const allImages = images.length > 0 ? images : []
  const hasMultiple = allImages.length > 1

  if (allImages.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-square flex items-center justify-center text-slate-300">
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  const prev = () => setActive((a) => (a - 1 + allImages.length) % allImages.length)
  const next = () => setActive((a) => (a + 1) % allImages.length)

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-square cursor-zoom-in"
        onClick={() => setZoomed(!zoomed)}
      >
        <img
          src={allImages[active]}
          alt={`${name} - image ${active + 1}`}
          className={cn(
            'w-full h-full object-cover transition-transform duration-700 ease-out',
            zoomed ? 'scale-125 cursor-zoom-out' : 'hover:scale-105'
          )}
        />

        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all active:scale-95"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all active:scale-95"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {active + 1} / {allImages.length}
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActive(i) }}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    i === active ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="grid grid-cols-5 gap-2">
          {allImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150',
                i === active
                  ? 'border-orange-500 ring-2 ring-orange-500/20 scale-[0.96]'
                  : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300'
              )}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductDetail({ product }: Props) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  const comments = product.comments || []
  const validRatings = comments.map((c) => c.rating).filter((r) => r != null) as number[]
  const averageRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
    : 0

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : product.image_url
    ? [product.image_url]
    : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
      <ImageGallery images={images} name={product.name} />

      <div className="flex flex-col animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {product.in_stock ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              In Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
              Out of Stock
            </span>
          )}
          {product.discount_percent && (
            <span className="inline-flex items-center text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
              -{product.discount_percent}% OFF
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 leading-tight">
          {product.name}
        </h1>

        <StarRating rating={averageRating} count={validRatings.length} />

        <div className="flex items-baseline gap-3 my-5">
          <span className="text-4xl font-extrabold text-slate-900">
            {formatPrice(discountedPrice ?? product.price)}
          </span>
          {discountedPrice && (
            <>
              <span className="text-xl text-slate-400 line-through font-medium">
                {formatPrice(product.price)}
              </span>
              <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Save {formatPrice(product.price - discountedPrice)}
              </span>
            </>
          )}
        </div>

        {product.description && (
          <p className="text-slate-600 leading-relaxed mb-6 text-sm sm:text-base border-t border-slate-100 pt-5">
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-semibold text-slate-700">Quantity</span>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition-colors font-medium text-lg"
            >
              −
            </button>
            <span className="px-5 py-2.5 text-slate-900 font-bold min-w-[3.5rem] text-center border-x border-slate-200">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition-colors font-medium text-lg"
            >
              +
            </button>
          </div>
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={!product.in_stock}
          size="lg"
          className={cn(
            'w-full transition-all duration-200',
            added && 'bg-emerald-600 hover:bg-emerald-600 shadow-emerald-600/20'
          )}
        >
          {added ? (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Added to Cart!
            </span>
          ) : (
            'Add to Cart'
          )}
        </Button>

        <div className="mt-6 grid grid-cols-3 gap-3 pt-5 border-t border-slate-100">
          {[
            { icon: '🚚', label: 'Fast Delivery', sub: 'Across Bangladesh' },
            { icon: '🔄', label: '7-Day Returns', sub: 'No questions asked' },
            { icon: '🔒', label: 'Secure Payment', sub: 'bKash & card' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center p-3 rounded-xl bg-slate-50">
              <span className="text-xl">{icon}</span>
              <span className="text-xs font-semibold text-slate-700">{label}</span>
              <span className="text-[10px] text-slate-400">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}