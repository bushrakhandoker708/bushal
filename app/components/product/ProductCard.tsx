// app/components/product/ProductCard.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { useCart } from '@/app/hooks/useCart'
import { useWishlist } from '@/app/hooks/useWishList'
import { useCompare } from '@/app/hooks/useCompare'
import { cn } from '@/app/lib/utils/cn'
import ProductQuickView from './ProductQuickView'
import { getStockStatus } from '@/app/lib/utils/stockStatus'

interface Props {
  product: Product
  index?: number
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { addItem } = useCart()
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlist()
  const { toggleItem: toggleCompare, isInCompare } = useCompare()
  const [added, setAdded] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [quickViewOpen, setQuickViewOpen] = useState(false)

  // Long-press state for mobile quick-view
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // FIX: Track if the component has mounted on the client to prevent hydration mismatches
  // caused by Zustand's localStorage persistence for wishlist and compare hooks.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Only check wishlist/compare status after mounting to ensure server/client match
  const isWished = mounted ? isInWishlist(product.id) : false
  const isCompared = mounted ? isInCompare(product.id) : false

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : []
  const stockDisplay = getStockStatus(product.stock_quantity)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.in_stock) return
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleCompare(product)
  }

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setQuickViewOpen(true)
  }

  // ─── Long-Press Handlers for Mobile Quick View ─────────────────────────────
  const LONG_PRESS_DURATION = 500 // ms
  const MOVE_THRESHOLD = 10 // px - cancel if finger moves more than this

  const startLongPress = useCallback((clientX: number, clientY: number) => {
    touchStartPos.current = { x: clientX, y: clientY }
    setIsLongPressing(true)
    
    longPressTimer.current = setTimeout(() => {
      // Trigger quick view after long press
      setQuickViewOpen(true)
      setIsLongPressing(false)
      
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, LONG_PRESS_DURATION)
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
    touchStartPos.current = null
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    startLongPress(touch.clientX, touch.clientY)
  }, [startLongPress])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return
    
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)
    
    // Cancel long-press if finger moves too much
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      cancelLongPress()
    }
  }, [cancelLongPress])

  const handleTouchEnd = useCallback(() => {
    cancelLongPress()
  }, [cancelLongPress])

  const handleTouchCancel = useCallback(() => {
    cancelLongPress()
  }, [cancelLongPress])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return (
    <div
      ref={cardRef}
      className={cn(
        "group animate-fade-up flex flex-col",
        isLongPressing && "scale-95 transition-transform duration-200"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Image Container */}
      <Link
        href={`/product/${product.id}`}
        className="block relative overflow-hidden rounded-xl sm:rounded-2xl bg-bushal-ivoryDeep aspect-[3/4] shadow-card hover:shadow-cardHover transition-all duration-500 ease-out"
      >
        <div
          className="absolute inset-0"
          onMouseEnter={() => images.length > 1 && setImgIndex(1)}
          onMouseLeave={() => setImgIndex(0)}
        >
          {images.length > 0 ? (
            <>
              <img
                src={images[0] ?? undefined}
                alt={product.name}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out',
                  imgIndex === 1 ? 'opacity-0 scale-110' : 'opacity-100 group-hover:scale-105'
                )}
              />
              {images.length > 1 && (
                <img
                  src={images[1] ?? undefined}
                  alt={product.name}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out',
                    imgIndex === 1 ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                  )}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
              <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Inner Vignette */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-black/5 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Long-Press Indicator (Mobile Only) */}
        {isLongPressing && (
          <div className="absolute inset-0 bg-bushal-forest/20 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-bushal-surface/95 backdrop-blur-md rounded-full px-4 py-2 shadow-xl flex items-center gap-2">
              <svg className="w-4 h-4 text-bushal-forest animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-xs font-semibold text-bushal-forest">Quick View</span>
            </div>
          </div>
        )}

        {/* Discount Badge */}
        {product.discount_percent && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-bushal-forest text-bushal-copperGlow text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-1 sm:px-3 sm:py-1.5 shadow-lg shadow-black/10">
            −{product.discount_percent}%
          </div>
        )}

        {/* Stock Status Badge */}
        {product.stock_quantity === 0 ? (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-bushal-dangerBg/90 backdrop-blur-md text-bushal-danger text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-1 sm:px-3 sm:py-1.5 border border-bushal-danger/20">
            Sold Out
          </div>
        ) : product.stock_quantity <= 5 ? (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-bushal-warningBg/90 backdrop-blur-md text-bushal-warning text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-1 sm:px-3 sm:py-1.5 border border-bushal-warning/20">
            Only {product.stock_quantity} left
          </div>
        ) : null}

        {/* Wishlist Button (Top Right) - Increased touch target to 44x44 */}
        <button
          onClick={handleWishlistToggle}
          className={cn(
            "absolute top-2 right-2 sm:top-4 sm:right-4 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 z-10 backdrop-blur-md",
            isWished
              ? "bg-bushal-copper text-white scale-110 shadow-lg shadow-bushal-copper/30"
              : "bg-bushal-ivory/80 text-bushal-forest hover:bg-bushal-ivory hover:scale-110"
          )}
          aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={isWished ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Compare Button (Bottom Left) - Increased touch target to 44x44 */}
        <button
          onClick={handleCompareToggle}
          className={cn(
            "absolute bottom-3 left-2 sm:bottom-5 sm:left-4 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 z-10 backdrop-blur-md",
            isCompared
              ? "bg-bushal-forest text-white scale-110 shadow-lg shadow-bushal-forest/30"
              : "bg-bushal-ivory/90 text-bushal-forest hover:bg-bushal-ivory hover:scale-110 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 shadow-lg"
          )}
          aria-label={isCompared ? "Remove from compare" : "Add to compare"}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </button>

        {/* Quick View Button (Bottom Right) - Increased touch target to 44x44 */}
        <button
          onClick={handleQuickView}
          className="absolute bottom-3 right-2 sm:bottom-5 sm:right-4 w-11 h-11 rounded-full flex items-center justify-center bg-bushal-ivory/90 backdrop-blur-md text-bushal-forest hover:bg-bushal-ivory hover:scale-110 transition-all duration-300 z-10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 shadow-lg"
          aria-label="Quick view"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* Quick Add Overlay (Desktop Only) */}
        <div className="absolute inset-x-2 bottom-0 px-16 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-10 hidden md:block">
          <button
            onClick={handleAdd}
            disabled={!product.in_stock}
            className={cn(
              "w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 shadow-xl backdrop-blur-md hover:bg-bushal-copperLight",
              product.in_stock
                ? added
                  ? "bg-bushal-success text-white"
                  : "bg-bushal-forest/95 text-bushal-ivory hover:bg-bushal-forest active:scale-[0.98]"
                : "bg-bushal-ivory/80 text-bushal-inkSoft cursor-not-allowed"
            )}
          >
            {added ? "Added to Bag ✓" : product.in_stock ? "Add to Bag" : "Sold Out"}
          </button>
        </div>
      </Link>

      {/* Content Section - Optimized for Mobile 2-Column */}
      <div className="pt-3 sm:pt-5 px-0.5 sm:px-1 flex flex-col flex-1">
        {/* Category Eyebrow - Smaller on mobile */}
        {product.category && (
          <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-bushal-copper mb-1 sm:mb-2">
            {product.category}
          </p>
        )}

        {/* Product Name - Responsive sizing */}
        <Link href={`/product/${product.id}`} className="group/link block">
          <h3
            className={cn(
              "font-heading text-base sm:text-xl leading-tight mb-1.5 sm:mb-2 transition-colors duration-300 line-clamp-2",
              product.discount_percent ? "italic text-bushal-forest group-hover/link:text-bushal-copper" : "text-bushal-forest group-hover/link:text-bushal-copper"
            )}
          >
            {product.name}
          </h3>
        </Link>

        {/* Price & Actions */}
        <div className="flex items-center justify-between mt-auto pt-2 sm:pt-3 border-t border-bushal-border/50">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="font-heading text-lg sm:text-2xl font-semibold text-bushal-copper">
              {formatPrice(discountedPrice ?? product.price)}
            </span>
            {discountedPrice && (
              <span className="text-[10px] sm:text-xs text-bushal-inkSoft line-through font-body">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Mobile Add Button - Increased to 44x44 touch target */}
          <button
            onClick={handleAdd}
            disabled={!product.in_stock}
            className={cn(
              "md:hidden w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 shadow-md",
              product.in_stock
                ? added
                  ? "bg-bushal-success text-white"
                  : "bg-bushal-copper text-white hover:bg-bushal-copperLight shadow-bushal-copper/20"
                : "bg-bushal-border text-bushal-inkSoft cursor-not-allowed"
            )}
            aria-label="Add to cart"
          >
            {added ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <ProductQuickView
        product={quickViewOpen ? product : null}
        onClose={() => setQuickViewOpen(false)}
      />
    </div>
  )
}