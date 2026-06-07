// components/cart/CartSummary.tsx
'use client'

import { useAuth } from '@/app/hooks/useAuth'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { CartItem } from '@/app/types/cart'
import Link from 'next/link'
import Button from '../ui/Button'

interface Props {
  items: CartItem[]
}

export default function CartSummary({ items }: Props) {
  const { user } = useAuth()

  const subtotal = items.reduce((sum, item) => {
    const price = item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price
    return sum + price * item.quantity
  }, 0)

  const shipping = subtotal >= 1000 ? 0 : 120
  const total = subtotal + shipping

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-20">
      <h2 className="text-lg font-bold text-bushal-forest mb-5">Order Summary</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
          <span className="font-medium text-slate-800">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Shipping</span>
          <span className={shipping === 0 ? 'text-emerald-600 font-semibold' : 'font-medium text-slate-800'}>
            {shipping === 0 ? 'FREE' : formatPrice(shipping)}
          </span>
        </div>
        {shipping > 0 && (
          <p className="text-xs text-bushal-inkSoft bg-bushal-ivory rounded-lg px-3 py-2">
            Add {formatPrice(1000 - subtotal)} more for free shipping
          </p>
        )}
        {shipping === 0 && (
          <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 font-medium">
            You qualify for free shipping!
          </p>
        )}
        <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-bushal-forest text-base">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-5">
        {user ? (
          <Link href="/checkout">
            <Button className="w-full" size="lg">
              Proceed to Checkout
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button className="w-full" size="lg">
              Sign in to Checkout
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-bushal-inkSoft">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          SSL Secured
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          bKash Verified
        </span>
      </div>

      <Link
        href="/dashboard"
        className="block text-center text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline mt-4 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  )
}