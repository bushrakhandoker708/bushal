// app/(customer)/orders/loading.tsx
import Navbar from '@/app/components/layout/Navbar'
import BottomNav from '@/app/components/layout/BottomNav'
import { OrderCardSkeleton } from '@/app/components/ui/Skeleton'
import SectionHeader from '@/app/components/ui/SectionHeader'

export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12 space-y-6">
        <SectionHeader title="My Orders" subtitle="Loading your orders..." />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}