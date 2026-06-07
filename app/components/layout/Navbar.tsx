// app/(customer)/components/navbar/Navbar.tsx

'use client'

import { useAuth } from '@/app/hooks/useAuth'
import { useCart } from '@/app/hooks/useCart'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/app/lib/utils/cn'
import CartDrawer from '../cart/CardDrawer'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { createBrowserClient } from '@/lib/supabase/client'

interface SearchResult {
  id: string
  name: string
  price: number
  image_url: string | null
  images: string[]
  discount_percent: number | null
  in_stock: boolean
  matchType?: 'exact' | 'partial' | 'fuzzy'
}

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  order_id?: string | null
  comment_id?: string | null
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${safe})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-bushal-copperGlow/60 text-bushal-ink rounded px-0.5">
        {part}
      </mark>
    ) : part
  )
}

export default function Navbar() {
  const { items } = useCart()
  const { user, signOut } = useAuth()
  const supabase = createBrowserClient()

  const [cartOpen, setCartOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const [cartBump, setCartBump] = useState(false)
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [notifLoading, setNotifLoading] = useState(true)
  const notifRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 280)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (cartCount > prevCount && prevCount !== 0) {
      setCartBump(true)
      setTimeout(() => setCartBump(false), 400)
    }
    setPrevCount(cartCount)
  }, [cartCount])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setUserRole(data?.role ?? null))
  }, [user])

  const isAdmin = userRole === 'admin'

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifLoading(false)
      return
    }
    try {
      setNotifLoading(true)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const admin = profile?.role === 'admin'

      let q = supabase
        .from('notifications')
        .select('id, type, title, body, read, created_at, order_id, comment_id')
        .order('created_at', { ascending: false })
        .limit(20)

      if (admin) {
        q = q.is('user_id', null)
      } else {
        q = q.eq('user_id', user.id)
      }

      const { data, error } = await q
      if (error) {
        console.error('Error fetching notifications:', error)
        setNotifications([])
      } else {
        setNotifications(data ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setNotifications([])
    } finally {
      setNotifLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!user || isAdmin) return

    const channel = supabase
      .channel('customer-notifications:' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification
          setNotifications((prev) =>
            prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev]
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, isAdmin, supabase])

  useEffect(() => {
    if (!user || !isAdmin) return

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const incoming = payload.new as Notification & { user_id: string | null }
          if (incoming.user_id !== null) return
          setNotifications((prev) =>
            prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev]
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, isAdmin, supabase])

  const markAllRead = useCallback(async () => {
    if (!user || unreadCount === 0) return
    try {
      let q = supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)

      if (isAdmin) {
        q = q.is('user_id', null)
      } else {
        q = q.eq('user_id', user.id)
      }

      const { error } = await q
      if (error) { console.error('Error marking notifications as read:', error); return }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }, [user, isAdmin, unreadCount, supabase])

  const handleNotifToggle = useCallback(() => {
    const wasOpen = notifOpen
    setNotifOpen((v) => !v)
    if (wasOpen && unreadCount > 0) {
      markAllRead()
    }
  }, [notifOpen, unreadCount, markAllRead])

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
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: SearchResult[]) => {
        if (cancelled) return
        setResults(Array.isArray(data) ? data : [])
        setShowResults(true)
        setSearching(false)
      })
      .catch(() => {
        if (!cancelled) { setResults([]); setShowResults(false); setSearching(false) }
      })

    return () => { cancelled = true }
  }, [debouncedQuery])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setMobileSearchOpen(false)
        setQuery('')
        setResults([])
        setShowResults(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        if (notifOpen && unreadCount > 0) markAllRead()
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen, unreadCount, markAllRead])

  const handleResultClick = useCallback(() => {
    setShowResults(false)
    setMobileSearchOpen(false)
    setMobileMenuOpen(false)
    setQuery('')
    setResults([])
  }, [])

  const SearchDropdown = () => {
    if (!showResults) return null
    return (
      <div className="absolute z-50 bg-bushal-surface rounded-xl border border-bushal-border shadow-cardHover top-full left-0 right-0 mt-2 overflow-hidden animate-scale-in">
        {results.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-bushal-ink mb-1">No results for "{query}"</p>
            <p className="text-xs text-bushal-inkSoft">Try different keywords or browse all products</p>
            <Link href="/dashboard" onClick={handleResultClick} className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight">
              Browse all →
            </Link>
          </div>
        ) : (
          <>
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[11px] text-bushal-inkSoft font-semibold uppercase tracking-wide">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-bushal-ivory max-h-[400px] overflow-y-auto">
              {results.map((product) => {
                const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
                const dp = product.discount_percent ? product.price * (1 - product.discount_percent / 100) : null
                return (
                  <Link key={product.id} href={`/product/${product.id}`} onClick={handleResultClick}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-bushal-ivory transition-colors group">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0">
                      {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-bushal-ink group-hover:text-bushal-forest transition-colors line-clamp-1">
                        {highlightMatch(product.name, query)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-semibold text-bushal-forest">{formatPrice(dp ?? product.price)}</span>
                        {dp && <span className="text-[11px] text-bushal-inkSoft line-through">{formatPrice(product.price)}</span>}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-bushal-borderMid group-hover:text-bushal-copper transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
            <Link href={`/dashboard?q=${encodeURIComponent(query)}`} onClick={handleResultClick}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-bushal-copper hover:bg-bushal-ivory transition-colors border-t border-bushal-border">
              See all results →
            </Link>
          </>
        )}
      </div>
    )
  }

  const NotificationPanel = () => (
    <div className="absolute right-0 top-full mt-2 w-80 bg-bushal-surface rounded-xl border border-bushal-border shadow-cardHover z-50 overflow-hidden animate-scale-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-bushal-border">
        <p className="text-sm font-semibold text-bushal-ink">
          {isAdmin ? 'Admin Notifications' : 'Notifications'}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-bushal-copper font-semibold hover:text-bushal-copperLight transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>
      {notifLoading ? (
        <div className="px-4 py-8 text-center">
          <div className="w-6 h-6 border-2 border-bushal-copper border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-bushal-inkSoft">Loading...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="w-12 h-12 bg-bushal-ivoryDeep rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-sm text-bushal-inkSoft">No notifications yet</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-bushal-ivory">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn('px-4 py-3 transition-colors', !n.read ? 'bg-bushal-ivory' : 'hover:bg-bushal-ivory')}
            >
              <div className="flex items-start gap-2.5">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', !n.read ? 'bg-bushal-copper' : 'bg-transparent')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-bushal-ink leading-snug">{n.title}</p>
                  <p className="text-xs text-bushal-inkSoft mt-0.5 leading-relaxed">{n.body}</p>
                  {n.order_id && (
                    <Link
                      href={isAdmin ? `/admin/orders/${n.order_id}` : '/orders'}
                      className="text-xs text-bushal-copper font-semibold mt-1 inline-block hover:underline"
                    >
                      View order →
                    </Link>
                  )}
                  {n.comment_id && isAdmin && (
                    <Link
                      href="/admin/comments"
                      className="text-xs text-bushal-copper font-semibold mt-1 inline-block hover:underline"
                    >
                      View comment →
                    </Link>
                  )}
                  <p className="text-[10px] text-bushal-inkSoft mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-BD', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <nav className={cn(
          'pointer-events-auto transition-all duration-500 ease-out',
          scrolled
            ? 'bg-bushal-forest shadow-2xl shadow-bushal-forest/40'
            : 'bg-bushal-forest/95 backdrop-blur-md'
        )}>
          <div className="h-0.5 bg-gradient-to-r from-transparent via-bushal-copper to-transparent opacity-60" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-20">

              <Link href="/dashboard" className="flex items-center gap-3 flex-shrink-0 group relative">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-bushal-copper to-bushal-copperLight shadow-bushal-copper/30 group-hover:shadow-bushal-copper/50">
                    <span className="font-heading font-bold text-lg leading-none text-white">B</span>
                  </div>
                  <div className="absolute -inset-1 bg-bushal-copper/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-2xl font-heading font-bold tracking-wide text-white group-hover:text-bushal-copperGlow transition-colors duration-300"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Bushal
                  </span>
                  <span className="text-[10px] uppercase tracking-widest -mt-1 text-white/60 transition-colors duration-300">Quality Delivered</span>
                </div>
              </Link>

              <div className="flex-1 mx-8 hidden lg:block" ref={searchRef}>
                <div className="relative max-w-xl">
                  <div className="absolute inset-0 bg-white/5 rounded-xl blur-sm" />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setShowResults(true)}
                    placeholder="Search products, categories..."
                    className="relative w-full bg-white/10 text-white placeholder-white/50 pl-12 pr-12 py-3 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-bushal-copper/60 focus:bg-white/15 focus:ring-2 focus:ring-bushal-copper/20 transition-all duration-300"
                  />
                  {searching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-bushal-copper/60 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {query && !searching && (
                    <button
                      onClick={() => { setQuery(''); setResults([]); setShowResults(false); inputRef.current?.focus() }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMobileSearchOpen((v) => !v); setTimeout(() => mobileInputRef.current?.focus(), 50) }}
                  className="hidden md:flex p-2.5 rounded-xl transition-all duration-200 hover:scale-110 text-white/70 hover:text-white hover:bg-white/10"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                <button
                  onClick={() => setCartOpen(true)}
                  className="relative p-2.5 rounded-xl transition-all duration-200 hover:scale-110 text-white/70 hover:text-white hover:bg-white/10"
                  aria-label="Cart"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className={cn('absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none shadow-lg shadow-bushal-copper/40', cartBump && 'animate-bounce-pop')}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>

                {user && (
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={handleNotifToggle}
                      className="relative p-2.5 rounded-xl transition-all duration-200 hover:scale-110 text-white/70 hover:text-white hover:bg-white/10"
                      aria-label="Notifications"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-bushal-danger to-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none shadow-lg shadow-rose-500/40 animate-bounce-pop">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    {notifOpen && <NotificationPanel />}
                  </div>
                )}

                <div className="hidden md:flex items-center gap-2 ml-2">
                  {user ? (
                    <>
                      <Link href="/orders" className="text-sm text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200">
                        Orders
                      </Link>
                      <Link
                        href={isAdmin ? '/admin' : '/profile'}
                        className="flex items-center gap-2 text-sm text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-bushal-copper/30 to-bushal-copperLight/30 border border-bushal-copper/50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="font-medium">{isAdmin ? 'Analytics' : 'Profile'}</span>
                      </Link>
                      <button
                        onClick={signOut}
                        className="text-sm text-white/50 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="text-sm text-bushal-copper hover:text-bushal-copperLight px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 font-medium">
                        Sign in
                      </Link>
                      <Link
                        href="/register"
                        className="text-sm bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white px-5 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-bushal-copper/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                      >
                        Register
                      </Link>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="md:hidden p-2.5 rounded-xl transition-all duration-200 hover:scale-110 text-white/70 hover:text-white hover:bg-white/10"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {mobileSearchOpen && (
            <div ref={mobileSearchRef} className="lg:hidden border-t border-white/10 py-4 px-4 animate-fade-up bg-bushal-forest backdrop-blur-xl">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={mobileInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-white/10 text-white placeholder-white/50 pl-12 pr-4 py-3 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-bushal-copper/60 focus:ring-2 focus:ring-bushal-copper/20"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-bushal-copper/60 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <SearchDropdown />
            </div>
          )}

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/10 py-4 space-y-2 animate-fade-up px-4 bg-bushal-forest backdrop-blur-xl">
              {user ? (
                <>
                  <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm text-white/70 hover:text-white px-3 py-3 rounded-xl hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    My Orders
                  </Link>
                  <Link href={isAdmin ? '/admin' : '/profile'} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm text-white/70 hover:text-white px-3 py-3 rounded-xl hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {isAdmin ? 'Analytics' : 'Profile'}
                  </Link>
                  <button onClick={() => { signOut(); setMobileMenuOpen(false) }} className="flex items-center gap-3 w-full text-left text-sm text-white/50 hover:text-white px-3 py-3 rounded-xl hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-white/70 hover:text-white px-3 py-3 rounded-xl hover:bg-white/10 transition-all">Sign in</Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block text-sm bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white text-center px-3 py-3 rounded-xl font-semibold mt-2">Register</Link>
                </>
              )}
            </div>
          )}
        </nav>
      </div>

      <div className="h-20 lg:h-24" />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}