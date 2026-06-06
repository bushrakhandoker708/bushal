// app/(customer)/cart/page.tsx

'use client'


import CartItem from '@/app/components/cart/CartItem'
import CartSummary from '@/app/components/cart/CartSummery'
import Navbar from '@/app/components/layout/Navbar'
import { useCart } from '@/app/hooks/useCart'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function CartPage() {
  const { items, clearCart } = useCart()
  const searchParams = useSearchParams()
  const bkashStatus = searchParams.get('bkash')
  const bkashReason = searchParams.get('reason')

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Your cart is empty
          </h1>
          <p className="text-gray-500 mb-8">
            Add some products to get started.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition"
          >
            Continue Shopping
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {bkashStatus === 'failed' && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {bkashReason === 'cancel'
              ? 'Payment was cancelled. Your cart is still saved.'
              : 'Payment failed. Please try again.'}
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items list */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
            <button
              onClick={clearCart}
              className="text-sm text-red-500 underline hover:text-red-700"
            >
              Clear cart
            </button>
          </div>
          {/* Order summary */}
          <div>
            <CartSummary items={items} />
          </div>
        </div>
      </main>
    </div>
  )
}