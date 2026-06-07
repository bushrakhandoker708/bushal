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

export default function ProductCard({ product, index = 0 }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [isWished, setIsWished] = useState(false)

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : []

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.in_stock) return
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div
      className="group animate-fade-up flex flex-col"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image Container */}
      <Link href={`/product/${product.id}`} className="block relative overflow-hidden rounded-2xl bg-bushal-ivoryDeep aspect-[4/5]">
        <div 
          className="absolute inset-0"
          onMouseEnter={() => images.length > 1 && setImgIndex(1)}
          onMouseLeave={() => setImgIndex(0)}
        >
          {images.length > 0 ? (
            <>
              <img
                src={images[0]}
                alt={product.name}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out',
                  imgIndex === 1 ? 'opacity-0 scale-105' : 'opacity-100 group-hover:scale-105'
                )}
              />
              {images.length > 1 && (
                <img
                  src={images[1]}
                  alt={product.name}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out',
                    imgIndex === 1 ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                  )}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {product.discount_percent ? (
            <span className="bg-bushal-copper text-white text-[10px] font-body font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">
              Save {product.discount_percent}%
            </span>
          ) : null}
          {!product.in_stock && (
            <span className="bg-bushal-forest/90 backdrop-blur-md text-bushal-ivory text-[10px] font-body font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsWished(!isWished) }}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 z-10",
            isWished ? "bg-bushal-copper text-white scale-110" : "bg-white/80 backdrop-blur-md text-bushal-forest hover:bg-white hover:scale-110"
          )}
          aria-label="Add to wishlist"
        >
          <svg className="w-4 h-4" fill={isWished ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Quick Add Overlay (Desktop Only) */}
        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-10 hidden md:block">
          <button
            onClick={handleAdd}
            disabled={!product.in_stock}
            className={cn(
              "w-full py-3 rounded-xl font-body font-semibold text-sm tracking-wide transition-all duration-300 shadow-lg",
              product.in_stock
                ? added
                  ? "bg-bushal-success text-white"
                  : "bg-bushal-forest text-bushal-ivory hover:bg-bushal-forestMid active:scale-[0.98]"
                : "bg-bushal-inkSoft/50 text-bushal-ivory cursor-not-allowed"
            )}
          >
            {added ? "Added to Bag" : product.in_stock ? "Add to Bag" : "Sold Out"}
          </button>
        </div>
      </Link>

      {/* Content */}
      <div className="pt-4 px-1 flex flex-col flex-1">
        <Link href={`/product/${product.id}`} className="group/link">
          <h3 className="font-heading text-lg text-bushal-forest leading-tight mb-1 group-hover/link:text-bushal-copper transition-colors duration-300 line-clamp-2">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-body font-semibold text-bushal-copper text-lg">
              {formatPrice(discountedPrice ?? product.price)}
            </span>
            {discountedPrice && (
              <span className="text-xs text-bushal-inkSoft line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          
          {/* Mobile Add Button */}
          <button
            onClick={handleAdd}
            disabled={!product.in_stock}
            className={cn(
              "md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90",
              product.in_stock
                ? added
                  ? "bg-bushal-success text-white"
                  : "bg-bushal-copper text-white hover:bg-bushal-copperLight shadow-md shadow-bushal-copper/20"
                : "bg-bushal-border text-bushal-inkSoft cursor-not-allowed"
            )}
            aria-label="Add to cart"
          >
            {added ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}