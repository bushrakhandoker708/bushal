// app/components/layout/AdminSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/app/lib/utils/cn'
import { useAuth } from '@/app/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string | number
  badgeColor?: 'copper' | 'success' | 'warning' | 'danger' | 'info'
  exactMatch?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

// ─── Icons (extracted for reuse & readability) ──────────────────────────────

const Icons = {
  overview: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z" />
    </svg>
  ),
  analytics: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  products: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  categories: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  orders: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  reviews: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  demand: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  restock: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  segmentation: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  graph: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  signOut: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

// ─── Navigation Data ─────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { href: '/admin', label: 'Overview', icon: Icons.overview, exactMatch: true },
      { href: '/admin/analytics', label: 'Analytics', icon: Icons.analytics },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/admin/products', label: 'Products', icon: Icons.products },
      { href: '/admin/categories', label: 'Categories', icon: Icons.categories },
      { href: '/admin/orders', label: 'Orders', icon: Icons.orders },
      { href: '/admin/comments', label: 'Reviews', icon: Icons.reviews },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        href: '/admin/analytics/demand-forecasting',
        label: 'Demand Forecast',
        icon: Icons.demand,
        badge: 'HW',
        badgeColor: 'info',
      },
      {
        href: '/admin/inventory/smart-restocking',
        label: 'Smart Restock',
        icon: Icons.restock,
        badge: 'AI',
        badgeColor: 'copper',
      },
      {
        href: '/admin/analytics/customer-segmentation',
        label: 'Segmentation',
        icon: Icons.segmentation,
        badge: 'K-Means',
        badgeColor: 'warning',
      },
      {
        href: '/admin/products/graph-recommendations',
        label: 'Product Graph',
        icon: Icons.graph,
        badge: 'PR',
        badgeColor: 'info',
      },
    ],
  },
]

// ─── Badge ───────────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  copper: 'bg-bushal-copper/20 text-bushal-copperGlow border-bushal-copper/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  danger:  'bg-rose-500/15 text-rose-300 border-rose-500/25',
  info:    'bg-blue-500/15 text-blue-300 border-blue-500/25',
}

function NavBadge({ text, color = 'copper' }: { text: string | number; color?: string }) {
  return (
    <span className={cn(
      'shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide uppercase leading-none',
      BADGE_COLORS[color] ?? BADGE_COLORS.copper
    )}>
      {text}
    </span>
  )
}

// ─── Nav Item ────────────────────────────────────────────────────────────────
// Key design decision: NO layoutId, NO motion on the active indicator itself —
// just a CSS transition. This eliminates the 150–300 ms Framer layout-recalc
// delay that was making clicks feel sluggish.

function NavItem({
  item,
  isActive,
  isExpanded,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  isExpanded: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      prefetch={true}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
        'transition-colors duration-150 active:scale-[0.98]',
        isActive
          ? 'bg-bushal-copper/[0.12] text-white'
          : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'
      )}
    >
      {/* Active bar — pure CSS, zero JS overhead */}
      <span
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-bushal-copper',
          'transition-all duration-150',
          isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'
        )}
      />

      {/* Icon */}
      <span className={cn(
        'shrink-0 transition-colors duration-150',
        isActive ? 'text-bushal-copperGlow' : 'text-white/35 group-hover:text-white/65'
      )}>
        {item.icon}
      </span>

      {/* Label — width animates on expand/collapse */}
      <span
        className={cn(
          'flex-1 whitespace-nowrap overflow-hidden transition-all duration-200',
          isExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
        )}
      >
        {item.label}
      </span>

      {/* Badge */}
      {item.badge && isExpanded && (
        <NavBadge text={item.badge} color={item.badgeColor} />
      )}
    </Link>
  )
}

// ─── Search ──────────────────────────────────────────────────────────────────

function SidebarSearch({
  isExpanded,
  onResultClick,
}: {
  isExpanded: boolean
  onResultClick?: () => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const allItems = NAV_SECTIONS.flatMap(s => s.items)

  const results = query.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : []

  // ⌘K focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!isExpanded) return null

  return (
    <div className="relative px-3 mb-1">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25">
          {Icons.search}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setQuery('')}
          placeholder="Search pages…"
          className={cn(
            'w-full bg-white/[0.055] text-white/80 placeholder-white/25',
            'pl-9 pr-9 py-2 rounded-lg text-xs',
            'border border-white/[0.07] outline-none',
            'focus:border-bushal-copper/35 focus:bg-white/[0.08]',
            'transition-colors duration-150'
          )}
        />
        {!query && (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-white/20 bg-white/[0.05] px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">
            ⌘K
          </kbd>
        )}
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-3 right-3 top-full mt-1.5 z-50 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a2e24] shadow-2xl shadow-black/40"
          >
            {results.map(item => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => { setQuery(''); onResultClick?.() }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/65 hover:text-white hover:bg-white/[0.06] transition-colors duration-100"
              >
                <span className="text-white/35 shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── User Profile Card ───────────────────────────────────────────────────────

function UserCard({
  isExpanded,
  onSignOut,
}: {
  isExpanded: boolean
  onSignOut: () => void
}) {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user, supabase])

  const initials = (profile?.full_name || user?.email || 'A')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const displayName = profile?.full_name || 'Admin'
  const displayEmail = profile?.email || user?.email || ''

  return (
    <div className={cn(
      'mx-3 mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] transition-all duration-200',
      isExpanded ? 'p-3' : 'p-2 flex justify-center'
    )}>
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bushal-copper to-bushal-copperLight flex items-center justify-center text-white text-[11px] font-bold shadow-md shadow-bushal-copper/25">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-bushal-forest" />
        </div>

        {/* Info — collapses with the sidebar */}
        <div className={cn(
          'flex-1 min-w-0 overflow-hidden transition-all duration-200',
          isExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
        )}>
          <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{displayName}</p>
          <p className="text-[10px] text-white/35 truncate mt-0.5">{displayEmail}</p>
        </div>

        {/* Sign-out */}
        {isExpanded && (
          <button
            onClick={onSignOut}
            title="Sign out"
            className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-400/10 transition-colors duration-150"
          >
            {Icons.signOut}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Logo Mark ───────────────────────────────────────────────────────────────

function BushalMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-base' : size === 'lg' ? 'w-10 h-10 text-xl' : 'w-9 h-9 text-lg'
  return (
    <div className={cn(
      'rounded-xl bg-gradient-to-br from-bushal-copper to-bushal-copperLight flex items-center justify-center shadow-lg shadow-bushal-copper/20 shrink-0',
      dim
    )}>
      <span className="text-white font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>B</span>
    </div>
  )
}

// ─── Section Divider ─────────────────────────────────────────────────────────

function SectionLabel({ label, visible }: { label: string; visible: boolean }) {
  return (
    <div className={cn(
      'px-3 mb-1.5 overflow-hidden transition-all duration-200',
      visible ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'
    )}>
      <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/20 select-none">
        {label}
      </p>
    </div>
  )
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  const [isExpanded, setIsExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydrate collapsed state without flash
  useEffect(() => {
    const saved = localStorage.getItem('bushal-sidebar-collapsed')
    if (saved === 'true') setIsExpanded(false)
    setMounted(true)
  }, [])

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const next = !prev
      localStorage.setItem('bushal-sidebar-collapsed', String(!next))
      return next
    })
  }, [])

  // ⌘B shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleExpanded()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleExpanded])

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isActive = (item: NavItem) =>
    item.exactMatch ? pathname === item.href : pathname.startsWith(item.href)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Mobile Top Bar ──────────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-bushal-forest/95 border-b border-white/[0.07] backdrop-blur-md">
        <Link href="/admin" className="flex items-center gap-2.5">
          <BushalMark size="sm" />
          <div>
            <p className="text-sm font-bold text-white leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Bushal</p>
            <p className="text-[9px] text-bushal-copperGlow font-semibold uppercase tracking-wider mt-0.5">Admin</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors duration-150"
          aria-label="Open navigation"
        >
          {Icons.menu}
        </button>
      </header>

      {/* ── Mobile Drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
            />

            {/* Drawer panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed top-0 right-0 bottom-0 z-[60] w-72 flex flex-col bg-bushal-forest shadow-2xl shadow-black/50"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-3">
                  <BushalMark size="md" />
                  <div>
                    <p className="text-[15px] font-bold text-white leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Bushal</p>
                    <p className="text-[9px] text-bushal-copperGlow font-semibold uppercase tracking-wider mt-0.5">Admin Panel</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.08] transition-colors duration-150"
                >
                  {Icons.close}
                </button>
              </div>

              {/* Drawer search */}
              <div className="pt-4 pb-1">
                <SidebarSearch isExpanded={true} onResultClick={() => setMobileOpen(false)} />
              </div>

              {/* Drawer nav */}
              <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto overscroll-contain">
                {NAV_SECTIONS.map(section => (
                  <div key={section.title}>
                    <SectionLabel label={section.title} visible={true} />
                    <div className="space-y-0.5">
                      {section.items.map(item => (
                        <NavItem
                          key={item.href}
                          item={item}
                          isActive={isActive(item)}
                          isExpanded={true}
                          onClick={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="mt-auto border-t border-white/[0.07] pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                <UserCard isExpanded={true} onSignOut={handleSignOut} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen sticky top-0',
          'bg-bushal-forest border-r border-white/[0.07]',
          'transition-[width] duration-200 ease-out will-change-[width]',
          isExpanded ? 'w-64' : 'w-[68px]',
          !mounted && 'invisible'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center border-b border-white/[0.07] px-4 h-[60px] shrink-0',
          isExpanded ? 'justify-between' : 'justify-center'
        )}>
          {isExpanded ? (
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="relative">
                <BushalMark size="md" />
                <div className="absolute -inset-1 bg-bushal-copper/15 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-white leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Bushal
                </p>
                <p className="text-[9px] text-bushal-copperGlow font-semibold uppercase tracking-wider mt-0.5">
                  Admin Panel
                </p>
              </div>
            </Link>
          ) : (
            <Link href="/admin">
              <BushalMark size="md" />
            </Link>
          )}

          {isExpanded && (
            <button
              onClick={toggleExpanded}
              title="Collapse sidebar (⌘B)"
              className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors duration-150"
            >
              {Icons.chevronLeft}
            </button>
          )}
        </div>

        {/* Collapsed — expand button */}
        {!isExpanded && (
          <button
            onClick={toggleExpanded}
            title="Expand sidebar (⌘B)"
            className="mx-auto mt-3 p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Search */}
        <div className={cn('pt-4 pb-1', !isExpanded && 'hidden')}>
          <SidebarSearch isExpanded={isExpanded} />
        </div>

        {/* Navigation */}
        <nav className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden no-scrollbar',
          'px-2.5 py-3 space-y-5'
        )}>
          {NAV_SECTIONS.map(section => (
            <div key={section.title}>
              <SectionLabel label={section.title} visible={isExpanded} />
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={isActive(item)}
                    isExpanded={isExpanded}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Shortcut hint */}
        <div className={cn(
          'px-4 py-2.5 border-t border-white/[0.05] transition-all duration-200 overflow-hidden',
          isExpanded ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0 py-0 border-0'
        )}>
          <div className="flex items-center gap-1.5 text-[10px] text-white/18">
            <kbd className="px-1.5 py-0.5 bg-white/[0.04] rounded font-mono border border-white/[0.06]">⌘B</kbd>
            <span>Collapse</span>
            <span className="mx-0.5 opacity-40">·</span>
            <kbd className="px-1.5 py-0.5 bg-white/[0.04] rounded font-mono border border-white/[0.06]">⌘K</kbd>
            <span>Search</span>
          </div>
        </div>

        {/* User card */}
        <div className="mt-auto border-t border-white/[0.07] pt-3 pb-3">
          <UserCard isExpanded={isExpanded} onSignOut={handleSignOut} />
        </div>
      </aside>
    </>
  )
}