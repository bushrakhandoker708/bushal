// app/components/layout/PageWrapper.tsx
import { ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '7xl'
  withBottomNav?: boolean
}

export default function PageWrapper({
  children,
  className,
  maxWidth = '7xl',
  withBottomNav = true,
}: Props) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '5xl': 'max-w-5xl', 
    '7xl': 'max-w-7xl',
  }[maxWidth]

  return (
    <main 
      className={cn(
        'mx-auto w-full',
        // Horizontal padding with responsive scaling
        'px-4 sm:px-6 lg:px-8',
        // Top padding: Clear the fixed navbar
        // Mobile: 64px navbar + 16px breathing room = 80px (pt-20)
        // Desktop: 80px navbar + 16px breathing room = 96px (pt-24)
        'pt-20 lg:pt-24',
        // Bottom padding: Account for BottomNav + safe area
        withBottomNav && 'pb-24 md:pb-12',
        // Add safe area insets for notched devices (iPhone X+, etc.)
        // This ensures content doesn't get cut off by the home indicator
        'pb-[calc(env(safe-area-inset-bottom,0px)+theme(padding.6))]',
        maxWidthClass,
        className
      )}
      style={{
        // Fallback for browsers that don't support env() in Tailwind
        paddingBottom: withBottomNav 
          ? 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' 
          : 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
      }}
    >
      {children}
    </main>
  )
}