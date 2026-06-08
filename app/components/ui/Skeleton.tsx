import { cn } from '@/app/lib/utils/cn'

interface SkeletonProps {
  className?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
}

export function Skeleton({ className, rounded = 'lg' }: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-bushal-ivoryDeep',
        roundedClasses[rounded],
        className
      )}
    />
  )
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton rounded="2xl" className="aspect-[4/5] w-full" />
          <Skeleton rounded="md" className="h-5 w-3/4" />
          <Skeleton rounded="md" className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-5 flex flex-col sm:flex-row gap-4">
      <Skeleton rounded="xl" className="w-full sm:w-24 h-24 flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton rounded="md" className="h-5 w-1/3" />
        <Skeleton rounded="md" className="h-4 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton rounded="full" className="h-6 w-20" />
          <Skeleton rounded="full" className="h-6 w-24" />
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <Skeleton rounded="md" className="h-6 w-24" />
        <Skeleton rounded="md" className="h-8 w-28 mt-2" />
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
      <div className="space-y-4">
        <Skeleton rounded="3xl" className="aspect-[4/5] w-full" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} rounded="xl" className="w-20 h-24" />
          ))}
        </div>
      </div>
      <div className="space-y-6 pt-4">
        <Skeleton rounded="md" className="h-4 w-24" />
        <Skeleton rounded="md" className="h-10 w-3/4" />
        <Skeleton rounded="md" className="h-6 w-32" />
        <div className="h-px bg-bushal-border my-6" />
        <Skeleton rounded="md" className="h-4 w-full" />
        <Skeleton rounded="md" className="h-4 w-full" />
        <Skeleton rounded="md" className="h-4 w-2/3" />
        <div className="flex gap-4 pt-4">
          <Skeleton rounded="xl" className="h-12 w-32" />
          <Skeleton rounded="xl" className="h-12 flex-1" />
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Skeleton rounded="2xl" className="w-16 h-16 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton rounded="md" className="h-6 w-48" />
          <Skeleton rounded="md" className="h-4 w-64" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} rounded="2xl" className="h-24" />
        ))}
      </div>

      {/* Account Details */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        <div className="px-6 py-4 border-b border-bushal-border">
          <Skeleton rounded="md" className="h-5 w-32" />
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Skeleton rounded="md" className="h-10" />
          <Skeleton rounded="md" className="h-10" />
          <Skeleton rounded="md" className="h-20 sm:col-span-2" />
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        <div className="px-6 py-4 border-b border-bushal-border">
          <Skeleton rounded="md" className="h-5 w-32" />
        </div>
        <div className="divide-y divide-bushal-ivory">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton rounded="md" className="h-10 w-10" />
              <div className="flex-1 space-y-2">
                <Skeleton rounded="md" className="h-4 w-1/3" />
                <Skeleton rounded="md" className="h-3 w-1/4" />
              </div>
              <Skeleton rounded="full" className="h-6 w-20" />
              <Skeleton rounded="md" className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Skeleton