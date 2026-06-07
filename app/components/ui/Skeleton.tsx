// components/ui/Skeleton.tsx
import { cn } from '@/app/lib/utils/cn'

interface Props {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ className, rounded = 'md' }: Props) {
  const r = { sm: 'rounded', md: 'rounded-lg', lg: 'rounded-xl', full: 'rounded-full' }[rounded]
  return <div className={cn('skeleton', r, className)} />
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
      <Skeleton className="aspect-[4/5] w-full" rounded="sm" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-9 w-9" rounded="full" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
      <Skeleton className="aspect-[4/5] w-full" rounded="lg" />
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <div className="h-px w-full bg-bushal-border" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-12 w-full" rounded="lg" />
      </div>
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" rounded="full" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12" rounded="lg" />
        <Skeleton className="w-12 h-12" rounded="lg" />
        <Skeleton className="w-12 h-12" rounded="lg" />
        <div className="ml-auto space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-10 w-full" rounded="lg" />
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16" rounded="full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" rounded="lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" rounded="lg" />
    </div>
  )
}