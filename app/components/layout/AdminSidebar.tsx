// components/layout/AdminSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/app/lib/utils/cn'

const navItems = [
  {
    href: '/admin',
    label: 'Overview',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/admin/products',
    label: 'Products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    ),
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/admin/comments',
    label: 'Comments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5 border-b border-bushal-ivory/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-bushal-copper flex items-center justify-center shadow-lg shadow-bushal-copper/30">
            <span className="text-white font-heading font-bold text-sm leading-none">B</span>
          </div>
          <div>
            <p className="text-base font-semibold text-bushal-ivory" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Bushal
            </p>
            <p className="text-[11px] text-bushal-copper font-medium -mt-0.5">Admin Panel</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-lg text-bushal-ivory/50 hover:text-bushal-ivory hover:bg-bushal-ivory/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-bushal-copper text-white shadow-lg shadow-bushal-copper/30'
                  : 'text-bushal-ivory/60 hover:bg-bushal-ivory/10 hover:text-bushal-ivory'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer / Back to Store */}
      <div className="px-3 pb-5 border-t border-bushal-ivory/10 pt-4">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-bushal-ivory/50 hover:bg-bushal-ivory/10 hover:text-bushal-ivory transition-all duration-150"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Store
        </Link>
      </div>
    </div>
  )
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-bushal-forest border-b border-bushal-ivory/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-bushal-copper flex items-center justify-center">
            <span className="text-white font-bold text-xs">B</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-bushal-ivory" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Bushal</p>
            <p className="text-[10px] text-bushal-copper font-medium -mt-0.5">Admin</p>
          </div>
        </div>
        <button 
          onClick={() => setOpen(true)} 
          className="p-2 rounded-xl text-bushal-ivory/60 hover:text-bushal-ivory hover:bg-bushal-ivory/10 transition-colors" 
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {open && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-bushal-ink/60 backdrop-blur-sm animate-fade-in" 
          onClick={() => setOpen(false)} 
        />
      )}

      {/* Mobile Sidebar */}
      <div 
        className={cn(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-bushal-forest transition-transform duration-300 ease-out', 
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={() => setOpen(false)} />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-bushal-forest flex-shrink-0 border-r border-bushal-ivory/5">
        <SidebarContent />
      </aside>
    </>
  )
}