// app/components/ui/TrustBadges.tsx
// A premium, reusable component that displays trust signals 
// (Secure Payment, Free Delivery, 7-Day Returns) to reduce 
// checkout friction and increase conversion rates. 

import { cn } from '@/app/lib/utils/cn'

interface TrustBadgeItem {
  icon: React.ReactNode
  title: string
  subtitle: string
}

const BADGES: TrustBadgeItem[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure Checkout',
    subtitle: 'SSL Encrypted & bKash Verified',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: 'Free Nationwide Delivery',
    subtitle: 'On all orders over 1,000',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: '7-Day Easy Returns',
    subtitle: 'No questions asked',
  },
]

interface TrustBadgesProps {
  className?: string
  variant?: 'default' | 'compact'
}

export default function TrustBadges({ className, variant = 'default' }: TrustBadgesProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        variant === 'compact' 
          ? 'grid-cols-1 sm:grid-cols-3' 
          : 'grid-cols-1 sm:grid-cols-3',
        className
      )}
    >
      {BADGES.map((badge, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-3 p-4 rounded-2xl border transition-colors',
            'bg-bushal-surface border-bushal-border',
            variant === 'compact' && 'p-3'
          )}
        >
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            'bg-bushal-forest/5 text-bushal-forest',
            variant === 'compact' && 'w-8 h-8'
          )}>
            {badge.icon}
          </div>
          <div className="flex flex-col">
            <span className={cn(
              'font-heading font-semibold text-bushal-forest leading-tight',
              variant === 'compact' ? 'text-xs' : 'text-sm'
            )}>
              {badge.title}
            </span>
            <span className={cn(
              'text-bushal-inkSoft leading-snug mt-0.5',
              variant === 'compact' ? 'text-[10px]' : 'text-xs'
            )}>
              {badge.subtitle}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
