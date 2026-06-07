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
    <div className="bg-bushal-surface rounded-xl border border-bushal-border overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" rounded="sm" />
      <div className="p-3.5 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-10 w-full mt-3" rounded="lg" />
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

export function OrderCardSkeleton() {
  return (
    <div className="bg-bushal-surface rounded-xl border border-bushal-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" rounded="full" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex items-center justify-between pt-2 border-t border-bushal-border">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-28" rounded="lg" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16" rounded="full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full" rounded="lg" />
          </div>
        ))}
      </div>
    </div>
  )
}