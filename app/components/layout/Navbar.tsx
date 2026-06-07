'use client'

import { useAuth } from '@/app/hooks/useAuth'
import { useCart } from '@/app/hooks/useCart'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/app/lib/utils/cn'
import CartDrawer from '../cart/CardDrawer'
import { formatPrice } from '@/app/lib/utils/formatPrice'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface SearchResult {
  id: string
  name: string
  price: number
  image_url: string | null
  images: string[]
  discount_percent: number | null
  in_stock: boolean
  matchType?: 'exact' | 'partial' | 'fuzzy'
  rank?: number
  similarity_score?: number
}

// ----------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ----------------------------------------------------------------
// Highlight helper — outside component so it's never re-created
// ----------------------------------------------------------------

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${safeQuery})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-slate-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

export default function Navbar() {
  const { items } = useCart()
  const { user, signOut } = useAuth()

  // Cart state
  const [cartOpen, setCartOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const [cartBump, setCartBump] = useState(false)
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Nav state
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const debouncedQuery = useDebounce(query, 280)

  const searchRef       = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)
  const mobileInputRef  = useRef<HTMLInputElement>(null)

  // ── Scroll listener ──────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Cart bump animation ───────────────────────────────────────
  useEffect(() => {
    if (cartCount > prevCount && prevCount !== 0) {
      setCartBump(true)
      setTimeout(() => setCartBump(false), 400)
    }
    setPrevCount(cartCount)
  }, [cartCount])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search fetch ─────────────────────────────────────────────
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setShowResults(false)
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)

    fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: SearchResult[]) => {
        if (cancelled) return
        setResults(Array.isArray(data) ? data : [])
        // BUG FIX: always show the dropdown after a successful fetch,
        // even when the array is empty (shows "no results" state)
        setShowResults(true)
        setSearching(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[search] fetch error:', err)
        setResults([])
        setShowResults(false)
        setSearching(false)
      })

    // Cleanup: ignore stale responses when query changes mid-flight
    return () => { cancelled = true }
  }, [debouncedQuery])

  // ── Click-outside to close dropdowns ─────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setMobileSearchOpen(false)
        setQuery('')
        setResults([])
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Helpers ───────────────────────────────────────────────────
  const clearSearch = useCallback((focusInput?: React.RefObject<HTMLInputElement>) => {
    setQuery('')
    setResults([])
    setShowResults(false)
    focusInput?.current?.focus()
  }, [])

  const handleResultClick = useCallback(() => {
    setShowResults(false)
    setMobileSearchOpen(false)
    setMobileMenuOpen(false)
    setQuery('')
    setResults([])
  }, [])

  // ── Search dropdown ───────────────────────────────────────────
  const SearchDropdown = ({ isMobile = false }: { isMobile?: boolean }) => {
    if (!showResults) return null

    return (
      <div
        className={cn(
          'absolute z-50 bg-white rounded-2xl border border-slate-200',
          'shadow-2xl shadow-slate-900/10 overflow-hidden',
          'top-full left-0 right-0 mt-2'
        )}
      >
        {results.length === 0 ? (
          /* ── Empty state ── */
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">No results for "{query}"</p>
            <p className="text-xs text-slate-400">Try different keywords or browse all products</p>
            <Link
              href="/dashboard"
              onClick={handleResultClick}
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Browse all products
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Result count header ── */}
            <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.some((r) => r.matchType === 'fuzzy') && (
                <span className="text-[10px] text-slate-400 italic">Including similar items</span>
              )}
            </div>

            {/* ── Result rows ── */}
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {results.map((product) => {
                const cover =
                  (Array.isArray(product.images) && product.images[0]) ||
                  product.image_url

                const discountedPrice = product.discount_percent
                  ? product.price * (1 - product.discount_percent / 100)
                  : null

                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    onClick={handleResultClick}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0">
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Name + price */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {highlightMatch(product.name, query)}
                        </p>
                        {!product.in_stock && (
                          <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold">
                            OUT OF STOCK
                          </span>
                        )}
                        {product.matchType === 'exact' && product.in_stock && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                            BEST
                          </span>
                        )}
                        {product.matchType === 'fuzzy' && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            SIMILAR
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-slate-800">
                          {formatPrice(discountedPrice ?? product.price)}
                        </span>
                        {discountedPrice && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                        {product.discount_percent && (
                          <span className="text-[10px] bg-rose-500 text-white px-1 py-0.5 rounded font-bold">
                            -{product.discount_percent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors flex-shrink-0"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>

            {/* ── "See all" footer ── */}
            <Link
              href={`/dashboard?q=${encodeURIComponent(query)}`}
              onClick={handleResultClick}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors border-t border-slate-100"
            >
              See all results for "{query}"
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <nav
        className={cn(
          'sticky top-0 z-40 transition-all duration-300',
          scrolled
            ? 'bg-slate-900/95 backdrop-blur-md shadow-lg shadow-slate-900/20'
            : 'bg-slate-900'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              href="/dashboard"
              className="text-2xl font-extrabold text-orange-500 tracking-tight hover:text-orange-400 transition-colors flex-shrink-0"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Sagitus
            </Link>

            {/* Desktop search */}
            <div className="flex-1 mx-6 hidden md:block" ref={searchRef}>
              <div className="relative max-w-lg">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  placeholder="Search products..."
                  className="w-full bg-slate-800 text-white placeholder-slate-400 pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                />
                {searching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                )}
                {query && !searching && (
                  <button
                    onClick={() => clearSearch(inputRef)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <SearchDropdown />
              </div>
            </div>

            {/* Right-side buttons */}
            <div className="flex items-center gap-1">

              {/* Mobile search toggle */}
              <button
                onClick={() => {
                  setMobileSearchOpen((prev) => !prev)
                  setTimeout(() => mobileInputRef.current?.focus(), 50)
                }}
                className="md:hidden p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                aria-label="Open cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                {cartCount > 0 && (
                  <span
                    className={cn(
                      'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orange-500 text-white',
                      'text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none',
                      cartBump && 'animate-bounce-in'
                    )}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              {/* Desktop auth links */}
              <div className="hidden md:flex items-center gap-1">
                {user ? (
                  <>
                    <Link
                      href="/orders"
                      className="text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Orders
                    </Link>
                    <button
                      onClick={signOut}
                      className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-all duration-150 font-semibold hover:shadow-lg hover:shadow-orange-600/20 active:scale-[0.97]"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>

              {/* Hamburger */}
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile search bar */}
          {mobileSearchOpen && (
            <div ref={mobileSearchRef} className="md:hidden border-t border-slate-800 py-3 relative animate-fade-in-up">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={mobileInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-slate-800 text-white placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                {searching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <SearchDropdown isMobile />
            </div>
          )}

          {/* Mobile nav menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800 py-3 space-y-1 animate-fade-in-up">
              {user ? (
                <>
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    My Orders
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 w-full text-left text-sm text-slate-400 hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-slate-300 hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
                    Sign in
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-slate-300 hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
                    Register
                  </Link>
                </>
              )}
            </div>
          )}

        </div>
      </nav>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}