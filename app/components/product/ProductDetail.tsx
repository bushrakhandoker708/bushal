// app/components/product/ProductDetail.tsx
'use client'

import { useCart } from '@/app/hooks/useCart'
import { Product } from '@/app/types/product'
import { useState } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  product: Product
}

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const allImages = images.length > 0 ? images : []

  if (allImages.length === 0) {
    return (
      <div className="rounded-3xl overflow-hidden bg-bushal-ivoryDeep aspect-[4/5] flex items-center justify-center text-bushal-borderMid">
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative rounded-3xl overflow-hidden bg-bushal-ivoryDeep aspect-[4/5] group cursor-zoom-in">
        <img
          src={allImages[active]}
          alt={`${name} - image ${active + 1}`}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        
        {/* Navigation Arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setActive((a) => (a - 1 + allImages.length) % allImages.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-bushal-surface/90 backdrop-blur-md shadow-lg flex items-center justify-center text-bushal-forest hover:bg-bushal-surface hover:scale-110 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
              aria-label="Previous"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => setActive((a) => (a + 1) % allImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-bushal-surface/90 backdrop-blur-md shadow-lg flex items-center justify-center text-bushal-forest hover:bg-bushal-surface hover:scale-110 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
              aria-label="Next"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-4 right-4 bg-bushal-forest/80 backdrop-blur-md text-bushal-ivory text-xs font-body font-semibold px-3 py-1.5 rounded-full">
          {active + 1} / {allImages.length}
        </div>
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mb-2">
          {allImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'relative flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden transition-all duration-300',
                i === active
                  ? 'ring-2 ring-bushal-copper ring-offset-2 ring-offset-bushal-ivory scale-95'
                  : 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0'
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

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
      {/* Gallery */}
      <div className="animate-fade-up">
        <ImageGallery images={images} name={product.name} />
      </div>

      {/* Details */}
      <div className="flex flex-col animate-fade-up pb-28 lg:pb-0">
        {/* Category / Breadcrumb */}
        <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-bushal-copper mb-3">
          {product.category || 'Collection'}
        </p>

        {/* Title */}
        <h1 className="font-heading text-4xl sm:text-5xl text-bushal-forest leading-[1.1] mb-4">
          {product.name}
        </h1>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-0.5 text-bushal-copper">
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            ))}
          </div>
          <span className="text-sm font-body text-bushal-inkSoft">
            {product.comments?.length || 0} Reviews
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-4 mb-8">
          <span className="font-heading text-4xl text-bushal-copper font-semibold">
            {formatPrice(discountedPrice ?? product.price)}
          </span>
          {discountedPrice && (
            <>
              <span className="text-xl text-bushal-inkSoft line-through font-body">
                {formatPrice(product.price)}
              </span>
              <span className="text-xs font-body font-bold tracking-wider uppercase text-bushal-success bg-bushal-successBg px-2.5 py-1 rounded-full">
                Save {formatPrice(product.price - discountedPrice)}
              </span>
            </>
          )}
        </div>

        {/* Elegant Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-bushal-border" />
          <div className="w-1.5 h-1.5 rounded-full bg-bushal-copper" />
          <div className="h-px flex-1 bg-bushal-border" />
        </div>

        {/* Description */}
        {product.description && (
          <p className="font-body text-bushal-inkMid leading-relaxed text-base mb-8">
            {product.description}
          </p>
        )}

        {/* Stock Status */}
        <div className="flex items-center gap-2 mb-6">
          {product.in_stock ? (
            <>
              <span className="w-2 h-2 rounded-full bg-bushal-success animate-pulse" />
              <span className="text-sm font-body font-semibold text-bushal-forest">In Stock & Ready to Ship</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-bushal-danger" />
              <span className="text-sm font-body font-semibold text-bushal-danger">Currently Unavailable</span>
            </>
          )}
        </div>

        {/* Desktop Quantity & Add to Cart */}
        <div className="hidden lg:flex items-center gap-4 mb-8">
          <div className="flex items-center border border-bushal-border rounded-xl overflow-hidden bg-bushal-surface">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-12 h-12 flex items-center justify-center text-bushal-forest hover:bg-bushal-ivory transition-colors text-xl font-light"
            >
              −
            </button>
            <span className="w-12 h-12 flex items-center justify-center text-bushal-forest font-body font-bold text-lg border-x border-bushal-border">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-12 h-12 flex items-center justify-center text-bushal-forest hover:bg-bushal-ivory transition-colors text-xl font-light"
            >
              +
            </button>
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className={cn(
              "flex-1 h-12 rounded-xl font-body font-semibold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2",
              product.in_stock
                ? added
                  ? "bg-bushal-success text-white"
                  : "btn-forest hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                : "bg-bushal-border text-bushal-inkSoft cursor-not-allowed"
            )}
          >
            {added ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Added to Bag
              </>
            ) : (
              "Add to Bag"
            )}
          </button>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-bushal-border">
          {[
            { icon: '📦', label: 'Complimentary', sub: 'Fast Delivery' },
            { icon: '🔄', label: 'Hassle-Free', sub: '7-Day Returns' },
            { icon: '🛡️', label: 'Secure', sub: 'bKash & Card' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1">
              <span className="text-2xl mb-1">{icon}</span>
              <span className="text-xs font-body font-bold text-bushal-forest uppercase tracking-wide">{label}</span>
              <span className="text-[11px] font-body text-bushal-inkSoft">{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bushal-surface/95 backdrop-blur-xl border-t border-bushal-border p-4 safe-bottom shadow-[0_-10px_40px_rgba(27,58,45,0.1)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-bushal-border rounded-lg overflow-hidden bg-bushal-ivory">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-bushal-forest text-lg">−</button>
            <span className="w-8 text-center font-body font-bold text-bushal-forest">{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} className="w-10 h-10 flex items-center justify-center text-bushal-forest text-lg">+</button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className={cn(
              "flex-1 h-12 rounded-lg font-body font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2",
              product.in_stock
                ? added
                  ? "bg-bushal-success text-white"
                  : "btn-copper hover:shadow-lg active:scale-[0.98]"
                : "bg-bushal-border text-bushal-inkSoft cursor-not-allowed"
            )}
          >
            {added ? "Added!" : "Add to Bag"}
          </button>
        </div>
      </div>
    </div>
  )
}