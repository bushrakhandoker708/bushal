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

  const shipping = subtotal > 50 ? 0 : 5.99
  const total = subtotal + shipping

  return (
    <div className="bg-white rounded-xl shadow p-6 sticky top-20">
      <h2 className="text-xl font-bold text-gray-900 mb-5">Order Summary</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
        </div>
        {shipping === 0 && (
          <p className="text-xs text-green-600">
            🎉 You qualify for free shipping!
          </p>
        )}
        <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900 text-base">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-6">
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

      <Link
        href="/dashboard"
        className="block text-center text-sm text-orange-500 hover:underline mt-4"
      >
        Continue Shopping
      </Link>
    </div>
  )
}