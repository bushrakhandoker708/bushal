// components/cart/CartSummary.tsx
'use client'

import { useAuth } from '@/app/hooks/useAuth'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { CartItem as CartItemType } from '@/app/types/cart'
import Link from 'next/link'
import Button from '@/app/components/ui/Button'

interface Props {
  items: CartItemType[]
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
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 sticky top-24 shadow-card">
      <h2 className="text-lg font-heading font-bold text-bushal-forest mb-5">
        Order Summary
      </h2>

      <div className="space-y-3 text-sm mb-5">
        <div className="flex justify-between text-bushal-inkSoft">
          <span>Subtotal ({totalItems} items)</span>
          <span className="font-medium text-bushal-ink">{formatPrice(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-bushal-inkSoft">
          <span>Shipping</span>
          <span className={shipping === 0 ? 'text-bushal-success font-semibold' : 'font-medium text-bushal-ink'}>
            {shipping === 0 ? 'FREE' : formatPrice(shipping)}
          </span>
        </div>

        {shipping > 0 ? (
          <div className="bg-bushal-ivoryDeep rounded-lg px-3 py-2 text-xs text-bushal-inkSoft">
            Add {formatPrice(1000 - subtotal)} more for free shipping
          </div>
        ) : (
          <div className="bg-bushal-successBg rounded-lg px-3 py-2 text-xs text-bushal-success font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You qualify for free shipping!
          </div>
        )}

        <div className="border-t border-bushal-border pt-3 flex justify-between font-heading font-bold text-bushal-forest text-base">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-5">
        {user ? (
          <Link href="/checkout" className="block w-full">
            <Button className="w-full" size="lg">
              Proceed to Checkout
            </Button>
          </Link>
        ) : (
          <Link href="/login?redirect=/checkout" className="block w-full">
            <Button className="w-full" size="lg">
              Sign in to Checkout
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-bushal-inkSoft">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          SSL Secured
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          bKash Verified
        </span>
      </div>

      <Link
        href="/dashboard"
        className="block text-center text-sm text-bushal-copper hover:text-bushal-copperLight font-semibold mt-5 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  )
}