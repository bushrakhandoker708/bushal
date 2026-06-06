// app/(customer)/checkout/page.tsx

'use client'


import CheckoutForm from '@/app/components/Checkout/CheckoutForm'
import OrderSummary from '@/app/components/Checkout/OrderSummary'
import Navbar from '@/app/components/layout/Navbar'
import { useCart } from '@/app/hooks/useCart'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CheckoutPage() {
  const { items, clearCart } = useCart()
  const router = useRouter()
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

      // Clear cart then redirect to bKash payment page
      clearCart()
      window.location.href = data.bkashURL

    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <CheckoutForm onSubmit={handleCheckout} loading={loading} />
          <OrderSummary items={items} />
        </div>
      </main>
    </div>
  )
}