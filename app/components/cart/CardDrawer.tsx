// components/cart/CartDrawer.tsx
'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/app/hooks/useCart'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: Props) {
  const { items, removeItem, updateQuantity, clearCart } = useCart()
  const drawerRef = useRef<HTMLDivElement>(null)

  const subtotal = items.reduce((sum, item) => {
    const price = item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price
    return sum + price * item.quantity
  }, 0)

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-bushal-ink/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-md bg-bushal-surface flex flex-col',
          'shadow-2xl shadow-bushal-ink/20 transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-bushal-border">
          <div>
            <h2 className="font-heading text-xl font-semibold text-bushal-forest">Your Cart</h2>
            <p className="text-xs text-bushal-inkSoft mt-0.5">
              {items.length === 0 ? 'Empty' : `${items.reduce((s, i) => s + i.quantity, 0)} item${items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivory transition-colors"
            aria-label="Close cart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-bushal-borderMid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
              </div>
              <p className="font-heading text-lg font-semibold text-bushal-forest mb-1">Your cart is empty</p>
              <p className="text-sm text-bushal-inkSoft mb-6">Add something you love.</p>
              <button
                onClick={onClose}
                className="btn-copper text-white text-sm font-semibold px-6 py-2.5 rounded-xl"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => {
              const discountedPrice = item.discount_percent
                ? item.price * (1 - item.discount_percent / 100)
                : item.price
              return (
                <div key={item.id} className="flex gap-4 p-3 rounded-xl border border-bushal-border bg-bushal-ivory/40 group">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-bushal-ivoryDeep flex-shrink-0 border border-bushal-border">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-bushal-ink line-clamp-2 leading-snug">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-bold text-bushal-forest">{formatPrice(discountedPrice)}</span>
                      {item.discount_percent && (
                        <span className="text-xs text-bushal-inkSoft line-through">{formatPrice(item.price)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1 bg-bushal-surface rounded-lg border border-bushal-border overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivory transition-colors text-base leading-none"
                          aria-label="Decrease"
                        >−</button>
                        <span className="text-sm font-semibold text-bushal-ink min-w-[24px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivory transition-colors text-base leading-none"
                          aria-label="Increase"
                        >+</button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-bushal-inkSoft hover:text-bushal-danger transition-colors rounded-lg hover:bg-bushal-dangerBg"
                        aria-label="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-bushal-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-bushal-inkSoft">Subtotal</span>
              <span className="font-heading text-lg font-bold text-bushal-forest">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-bushal-inkSoft">Shipping calculated at checkout.</p>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full btn-copper text-white text-center text-sm font-semibold py-3.5 rounded-xl"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={clearCart}
              className="block w-full text-center text-xs text-bushal-inkSoft hover:text-bushal-danger transition-colors py-1"
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}