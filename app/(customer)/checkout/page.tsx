// app/(customer)/checkout/page.tsx
'use client'

import BottomNav from '@/app/components/layout/BottomNav'
import Navbar from '@/app/components/layout/Navbar'
import { useCart } from '@/app/hooks/useCart'
import { useAuth } from '@/app/hooks/useAuth'
import { useState } from 'react'
import Link from 'next/link'
import CheckoutForm from '@/app/components/Checkout/CheckoutForm'
import OrderSummary from '@/app/components/Checkout/OrderSummery'


interface CheckoutData {
  delivery_address: string
  customer_note: string
  phone: string
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBkash = async (checkoutData: CheckoutData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bkash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items,
          delivery_address: checkoutData.delivery_address,
          customer_note: checkoutData.customer_note,
          phone: checkoutData.phone
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Payment initiation failed')
        return
      }
      clearCart()
      window.location.href = data.bkashURL
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCOD = async (checkoutData: CheckoutData) => {
    setLoading(true)
    setError('')
    try {
      const subtotal = items.reduce((sum, item) => {
        const price = item.discount_percent
          ? item.price * (1 - item.discount_percent / 100)
          : item.price
        return sum + price * item.quantity
      }, 0)
      const shipping = subtotal >= 1000 ? 0 : 120
      const total = subtotal + shipping

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items, 
          total, 
          payment_method: 'cod',
          delivery_address: checkoutData.delivery_address,
          customer_note: checkoutData.customer_note,
          phone: checkoutData.phone
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Order failed')
        return
      }
      clearCart()
      window.location.href = `/thank-you?orderId=${data.id}`
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      {/* FIX: Added responsive padding and safe-area-inset-bottom to ensure content isn't hidden by mobile browser bars or the bottom nav */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32 md:pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-bushal-forest">Checkout</h1>
          <p className="text-sm text-bushal-inkSoft mt-1">Complete your order</p>
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 bg-bushal-surface rounded-2xl border border-bushal-border">
            <div className="w-16 h-16 rounded-full bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center">
              <svg className="w-8 h-8 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-bushal-ink">Sign in to continue</p>
              <p className="text-sm text-bushal-inkSoft mt-1">You need to be logged in to place an order.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/login?redirect=/checkout`}
                // FIX: Increased touch target size and padding for mobile accessibility
                className="px-6 py-3 min-h-[44px] flex items-center justify-center bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-bushal-copper/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                // FIX: Increased touch target size and padding for mobile accessibility
                className="px-6 py-3 min-h-[44px] flex items-center justify-center border border-bushal-border text-bushal-ink text-sm font-semibold rounded-xl hover:bg-bushal-ivoryDeep transition-all duration-200"
              >
                Register
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6 text-xs text-bushal-inkSoft bg-bushal-surface rounded-xl border border-bushal-border px-4 py-3">
              <svg className="w-4 h-4 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Your payment is secured by bKash & 256-bit SSL encryption</span>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-3 bg-bushal-dangerBg border border-bushal-danger/20 text-bushal-danger px-4 py-3.5 rounded-xl animate-fade-in">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3">
                <CheckoutForm onBkash={handleBkash} onCOD={handleCOD} loading={loading} />
              </div>
              <div className="lg:col-span-2">
                <OrderSummary items={items} />
              </div>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}