// components/cart/CartDrawer.tsx
'use client'

import { useCart } from '@/app/hooks/useCart'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import Link from 'next/link'
import { useEffect } from 'react'
import Button from '../ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
}

function DrawerCartItem({ item }: { item: any }) {
  const { updateQuantity, removeItem } = useCart()
  const discountedPrice = item.discount_percent
    ? item.price * (1 - item.discount_percent / 100)
    : item.price

  return (
    <div className="flex gap-3 py-4 border-b border-slate-100 last:border-0 animate-fade-in">
      <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate pr-2">{item.name}</p>
        <p className="text-sm text-slate-500 mt-0.5">{formatPrice(discountedPrice)}</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-colors text-sm font-medium"
          >
            −
          </button>
          <span className="text-sm font-semibold text-slate-800 w-5 text-center">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-colors text-sm font-medium"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className="font-bold text-slate-900 text-sm">
          {formatPrice(discountedPrice * item.quantity)}
        </span>
        <button
          onClick={() => removeItem(item.id)}
          className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export default function CartDrawer({ isOpen, onClose }: Props) {
  const { items } = useCart()
  const total = items.reduce((sum, item) => {
    const price = item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price
    return sum + price * item.quantity
  }, 0)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Shopping Cart</h2>
            {items.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close cart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-700 mb-1">Your cart is empty</p>
              <p className="text-sm text-slate-400 mb-5">Add items to get started</p>
              <button
                onClick={onClose}
                className="text-sm text-orange-600 font-semibold hover:underline"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <DrawerCartItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">Subtotal</span>
              <span className="font-bold text-slate-900 text-lg">{formatPrice(total)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secured by bKash & SSL Encryption
            </div>
            <Link href="/checkout" onClick={onClose}>
              <Button size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
            <Link href="/cart" onClick={onClose} className="block text-center text-sm text-slate-500 hover:text-slate-700 transition-colors">
              View full cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}