// app/components/layout/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/app/hooks/useCart'
import { useWishlist } from '@/app/hooks/useWishList'
import { cn } from '@/app/lib/utils/cn'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface NavItem {
  href: string
  label: string
  icon: (active: boolean) => React.ReactNode
  showBadge?: boolean
  badgeCount?: number
}

export default function BottomNav() {
  const pathname = usePathname()
  const { items } = useCart()
  const { getItemCount: getWishlistCount } = useWishlist()
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)
  const wishlistCount = getWishlistCount()

  // FIX: Track if the component has mounted on the client to prevent hydration mismatches
  // caused by Zustand's localStorage persistence.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide on admin pages
  if (pathname.startsWith('/admin')) return null

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/wishlist',
      label: 'Wishlist',
      showBadge: true,
      badgeCount: wishlistCount,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      href: '/cart',
      label: 'Cart',
      showBadge: true,
      badgeCount: cartCount,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* Safe area spacer to prevent content from being hidden behind the nav */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <nav 
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bushal-surface/95 backdrop-blur-xl border-t border-bushal-border/60 shadow-[0_-4px_24px_rgba(27,58,45,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const badgeCount = mounted && item.showBadge ? (item.badgeCount || 0) : 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 min-w-[64px] min-h-[44px] py-1.5 px-2 rounded-xl transition-all duration-200 relative',
                  'active:scale-95 active:bg-bushal-ivoryDeep/50',
                  active ? 'text-bushal-forest' : 'text-bushal-inkSoft hover:text-bushal-ink'
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  {item.icon(active)}
                  
                  {/* Badge - only renders after mount to prevent hydration mismatch */}
                  <AnimatePresence>
                    {badgeCount > 0 && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-gradient-to-r from-bushal-copper to-bushal-copperLight text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-md shadow-bushal-copper/30"
                      >
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                
                <span className={cn(
                  'text-[10px] font-semibold tracking-wide transition-colors duration-200',
                  active ? 'text-bushal-forest' : 'text-bushal-inkSoft'
                )}>
                  {item.label}
                </span>
                
                {/* Active indicator with smooth animation */}
                {active && (
                  <motion.span
                    layoutId="bottomNavActiveIndicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-bushal-copper"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Floating cart button - only shows when cart has items and not on cart page */}
      <AnimatePresence>
        {mounted && cartCount > 0 && pathname !== '/cart' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="md:hidden fixed bottom-24 right-4 z-50"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <Link
              href="/cart"
              className="flex items-center gap-2 bg-bushal-forest text-white pl-4 pr-3 py-3 rounded-2xl shadow-lg shadow-bushal-forest/30 active:scale-95 transition-transform"
              aria-label={`View cart with ${cartCount} items`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <span className="text-sm font-bold">{cartCount}</span>
              <span className="w-px h-4 bg-white/30" />
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}