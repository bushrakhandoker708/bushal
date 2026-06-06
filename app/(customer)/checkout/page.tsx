// app/(customer)/checkout/page.tsx
'use client'

import CheckoutForm from '@/app/components/Checkout/CheckoutForm'
import OrderSummary from '@/app/components/Checkout/OrderSummery'
import Navbar from '@/app/components/layout/Navbar'
import { useCart } from '@/app/hooks/useCart'
import { useState } from 'react'

export default function CheckoutPage() {
  const { items, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/bkash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
          <p className="text-sm text-slate-400 mt-1">Complete your order</p>
        </div>

        <div className="flex items-center gap-2 mb-6 text-xs text-slate-400 bg-white rounded-xl border border-slate-200 px-4 py-3">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Your payment is secured by bKash & 256-bit SSL encryption</span>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-xl animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <CheckoutForm onSubmit={handleCheckout} loading={loading} />
          </div>
          <div className="lg:col-span-2">
            <OrderSummary items={items} />
          </div>
        </div>
      </main>
    </div>
  )
}