// components/layout/Navbar.tsx

'use client'

import { useAuth } from '@/app/hooks/useAuth'
import { useCart } from '@/app/hooks/useCart'
import Link from 'next/link'


export default function Navbar() {
  const { items } = useCart()
  const { user, signOut } = useAuth()

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav className="bg-gray-900 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="text-2xl font-extrabold text-orange-400 tracking-tight"
          >
            Sagitus
          </Link>

          {/* Search bar placeholder */}
          <div className="flex-1 mx-8 hidden md:block">
            <input
              type="search"
              placeholder="Search products..."
              className="w-full max-w-xl bg-gray-800 text-white placeholder-gray-400 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-5">
            {/* Cart */}
            <Link href="/cart" className="relative">
              <svg
                className="w-6 h-6 text-gray-300 hover:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300 hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}