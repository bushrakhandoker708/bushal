// app/(customer)/cart/page.tsx
'use client'
import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import BottomNav from '@/app/components/layout/BottomNav'
import CartItemComponent from '@/app/components/cart/CartItem'
import CartSummary from '@/app/components/cart/CartSummery'
import { useCart } from '@/app/hooks/useCart'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function CartPage() {
  const { items } = useCart()
  
  // FIX: Track if the component has mounted on the client to prevent hydration mismatches
  // caused by Zustand's localStorage persistence.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // To prevent hydration mismatch, we treat the cart as empty until the client has mounted
  // and read the actual data from localStorage. This ensures the server and client render
  // the exact same initial HTML structure.
  if (!mounted) {
    return (
      <div className="min-h-screen bg-bushal-ivory">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-12">
          <h1 className="text-3xl font-bold text-bushal-forest mb-8">Your Cart</h1>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-bushal-forest mb-2">Your cart is empty</h2>
            <p className="text-bushal-inkSoft mb-8">Looks like you haven't added anything yet.</p>
            <Link href="/dashboard" className="btn-copper text-white px-8 py-3 rounded-xl font-semibold">
              Start Shopping
            </Link>
          </div>
        </main>
        <Footer />
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-12">
        <h1 className="text-3xl font-bold text-bushal-forest mb-8">Your Cart</h1>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-bushal-forest mb-2">Your cart is empty</h2>
            <p className="text-bushal-inkSoft mb-8">Looks like you haven't added anything yet.</p>
            <Link href="/dashboard" className="btn-copper text-white px-8 py-3 rounded-xl font-semibold">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <CartItemComponent key={item.id} item={item} />
              ))}
            </div>
            <div className="lg:col-span-1">
              <CartSummary items={items} />
            </div>
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}