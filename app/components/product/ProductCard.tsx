// components/product/ProductCard.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { useCart } from '@/app/hooks/useCart'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  product: Product
  index?: number
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={cn('w-3 h-3 fill-current', i < Math.round(rating) ? 'text-amber-400' : 'text-slate-200')}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {count > 0 && <span className="text-[11px] text-slate-400 ml-0.5">({count})</span>}
    </div>
  )
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  const comments = product.comments || []
  const validRatings = comments.map((c) => c.rating).filter((r) => r != null) as number[]
  const averageRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
    : 0

  const images = product.images && product.images.length > 0
    ? product.images
    : product.image_url
    ? [product.image_url]
    : []

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.in_stock) return
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div
      className="animate-fade-in-up group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/60 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Link href={`/product/${product.id}`} className="block relative">
        <div
          className="relative aspect-[4/3] bg-slate-100 overflow-hidden"
          onMouseEnter={() => images.length > 1 && setImgIndex(1)}
          onMouseLeave={() => setImgIndex(0)}
        >
          {images.length > 0 ? (
            <>
              <img
                src={images[0]}
                alt={product.name}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-all duration-500',
                  imgIndex === 1 ? 'opacity-0' : 'opacity-100 group-hover:scale-105'
                )}
              />
              {images.length > 1 && (
                <img
                  src={images[1]}
                  alt={product.name}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                    imgIndex === 1 ? 'opacity-100' : 'opacity-0'
                  )}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {product.discount_percent && (
            <span className="absolute top-2.5 left-2.5 bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              -{product.discount_percent}%
            </span>
          )}

          {images.length > 1 && (
            <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm">
              +{images.length - 1} more
            </span>
          )}

          {!product.in_stock && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
              <span className="text-white font-bold text-sm bg-slate-900/70 px-4 py-1.5 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 text-sm leading-snug mb-1.5">
            {product.name}
          </h3>
        </Link>

        <StarRating rating={averageRating} count={validRatings.length} />

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-base font-bold text-slate-900">
            {formatPrice(discountedPrice ?? product.price)}
          </span>
          {discountedPrice && (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className={cn(
              'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97]',
              product.in_stock
                ? added
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-600/15 hover:shadow-lg hover:shadow-orange-600/20 hover:-translate-y-0.5'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            {added ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Added!
              </span>
            ) : product.in_stock ? (
              'Add to Cart'
            ) : (
              'Out of Stock'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}