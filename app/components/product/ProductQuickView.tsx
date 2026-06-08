// components/product/ProductQuickView.tsx
'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/app/hooks/useCart'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  product: Product | null
  onClose: () => void
}

export default function ProductQuickView({ product, onClose }: Props) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  
  const images = product?.images?.length ? product.images : product?.image_url ? [product.image_url] : []
  const discountedPrice = product?.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden'
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
      document.addEventListener('keydown', handler)
      return () => { 
        document.body.style.overflow = '' 
        document.removeEventListener('keydown', handler) 
      }
    }
  }, [product, onClose])

  const handleAdd = () => {
    if (!product) return
    for (let i = 0; i < quantity; i++) addItem(product)
    setAdded(true)
    setTimeout(() => { setAdded(false); onClose() }, 1500)
  }

  if (!product) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-bushal-ink/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
        aria-hidden="true"
      />
      
      {/* Modal Card */}
      <div className="relative bg-bushal-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in flex flex-col md:flex-row ring-1 ring-bushal-border/50">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-bushal-ivoryDeep text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-border transition-colors"
          aria-label="Close quick view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image Section */}
        <div className="w-full md:w-1/2 bg-bushal-ivoryDeep aspect-square md:aspect-auto flex items-center justify-center rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden">
          {images.length > 0 ? (
            <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
          <p className="text-xs font-semibold tracking-widest uppercase text-bushal-copper mb-2">
            {product.category || 'Collection'}
          </p>
          
          <h2 className="font-heading text-2xl md:text-3xl text-bushal-forest mb-3 leading-tight">
            {product.name}
          </h2>
          
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-2xl font-bold text-bushal-copper">
              {formatPrice(discountedPrice ?? product.price)}
            </span>
            {discountedPrice && (
              <span className="text-lg text-bushal-inkSoft line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <p className="text-sm text-bushal-inkMid leading-relaxed mb-6 flex-1">
            {product.description || 'Premium curated product, carefully selected for quality and craftsmanship.'}
          </p>

          {/* Quantity & Add to Cart */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center border border-bushal-border rounded-xl overflow-hidden bg-bushal-ivory">
              <button 
                onClick={() => setQuantity((q) => Math.max(1, q - 1))} 
                className="w-10 h-10 flex items-center justify-center text-bushal-forest hover:bg-bushal-ivoryDeep transition-colors text-lg"
              >
                −
              </button>
              <span className="w-10 h-10 flex items-center justify-center font-bold text-bushal-forest border-x border-bushal-border">
                {quantity}
              </span>
              <button 
                onClick={() => setQuantity((q) => q + 1)} 
                className="w-10 h-10 flex items-center justify-center text-bushal-forest hover:bg-bushal-ivoryDeep transition-colors text-lg"
              >
                +
              </button>
            </div>
            
            <button 
              onClick={handleAdd} 
              disabled={!product.in_stock}
              className={cn(
                'flex-1 h-10 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2',
                product.in_stock
                  ? added 
                    ? 'bg-bushal-success text-white' 
                    : 'btn-forest hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-bushal-border text-bushal-inkSoft cursor-not-allowed'
              )}
            >
              {added ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Added!
                </>
              ) : product.in_stock ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-bushal-border">
            <span className="flex items-center gap-1.5 text-xs text-bushal-inkSoft">
              <svg className="w-3.5 h-3.5 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Free shipping over ৳1000
            </span>
            <span className="flex items-center gap-1.5 text-xs text-bushal-inkSoft">
              <svg className="w-3.5 h-3.5 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              7-day returns
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}