// app/(customer)/wishlist/page.tsx
// A premium, responsive page displaying the user's saved wishlist items.
// Utilizes the Zustand store for instant, optimistic UI updates.
// Includes empty states, move-to-cart actions, and remove functionality.
// Integrates Framer Motion for smooth layout animations when items are removed.
'use client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useWishlist } from '@/app/hooks/useWishList'
import { useCart } from '@/app/hooks/useCart'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import EmptyState from '@/app/components/ui/EmptyState'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import BottomNav from '@/app/components/layout/BottomNav'
import PageWrapper from '@/app/components/layout/PageWrapper'
import { useState, useEffect } from 'react'

export default function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlist()
  const { addItem } = useCart()

  // FIX: Track if the component has mounted on the client to prevent hydration mismatches
  // caused by Zustand's localStorage persistence.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Map wishlist item back to a Product-like object for the cart
  const handleMoveToCart = (item: any) => {
    const productForCart = {
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      images: item.images,
      discount_percent: item.discount_percent,
      in_stock: item.in_stock,
      stock_quantity: 99, // Assume in stock if in wishlist, or handle appropriately
    }
    addItem(productForCart as any)
    removeItem(item.id)
  }

  // FIX: To prevent hydration mismatch, we treat the wishlist as empty until 
  // the client has mounted and read the actual data from localStorage.
  if (!mounted || items.length === 0) {
    return (
      <div className="min-h-screen bg-bushal-ivory">
        <Navbar />
        <PageWrapper maxWidth="5xl" className="py-16">
          <EmptyState
            variant="taka"
            title="Your wishlist is empty"
            description="Save your favorite heritage pieces here to keep track of them."
            action={
              <Link
                href="/dashboard"
                className="btn-copper text-white text-sm font-semibold px-8 py-3 rounded-xl inline-block"
              >
                Explore Collection
              </Link>
            }
          />
        </PageWrapper>
        <Footer />
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <PageWrapper maxWidth="5xl" className="py-10 pb-28 md:pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-bushal-border">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl text-bushal-forest tracking-tight">
              My Wishlist
            </h1>
            <p className="text-sm text-bushal-inkSoft mt-1">
              {items.length} {items.length === 1 ? 'piece' : 'pieces'} saved
            </p>
          </div>
          <button
            onClick={clearWishlist}
            className="text-xs font-semibold text-bushal-danger hover:text-bushal-danger/80 transition-colors self-start sm:self-auto"
          >
            Clear All
          </button>
        </div>

        {/* Grid with Layout Animations */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const cover = (Array.isArray(item.images) && item.images[0]) || item.image_url
              const discountedPrice = item.discount_percent
                ? item.price * (1 - item.discount_percent / 100)
                : null

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3 }}
                  className="group bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden shadow-card hover:shadow-cardHover transition-all duration-300"
                >
                  {/* Image */}
                  <Link href={`/product/${item.id}`} className="block relative aspect-[3/4] overflow-hidden bg-bushal-ivoryDeep">
                    {cover ? (
                      <img
                        src={cover}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        removeItem(item.id)
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bushal-surface/90 backdrop-blur-sm flex items-center justify-center text-bushal-inkSoft hover:text-bushal-danger hover:bg-white transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 shadow-sm"
                      aria-label="Remove from wishlist"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Stock Badge */}
                    {!item.in_stock && (
                      <div className="absolute bottom-3 left-3 bg-bushal-danger/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md">
                        Sold Out
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="p-4 flex flex-col gap-3">
                    <Link href={`/product/${item.id}`} className="group/link">
                      <h3 className="font-heading text-lg text-bushal-forest leading-tight line-clamp-2 group-hover/link:text-bushal-copper transition-colors">
                        {item.name}
                      </h3>
                    </Link>

                    <div className="flex items-baseline gap-2 mt-auto">
                      <span className="font-heading text-xl font-semibold text-bushal-copper">
                        {formatPrice(discountedPrice ?? item.price)}
                      </span>
                      {discountedPrice && (
                        <span className="text-xs text-bushal-inkSoft line-through">
                          {formatPrice(item.price)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleMoveToCart(item)}
                        disabled={!item.in_stock}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all",
                          item.in_stock
                            ? "bg-bushal-forest text-white hover:bg-bushal-forestMid active:scale-[0.97]"
                            : "bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed"
                        )}
                      >
                        {item.in_stock ? 'Move to Bag' : 'Unavailable'}
                      </button>
                      <Link
                        href={`/product/${item.id}`}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-bushal-border text-bushal-inkSoft hover:text-bushal-forest hover:border-bushal-forest transition-colors"
                        aria-label="View product"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </PageWrapper>
      <Footer />
      <BottomNav />
    </div>
  )
}