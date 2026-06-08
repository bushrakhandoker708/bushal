// app/(customer)/orders/loading.tsx
import Navbar from '@/app/components/layout/Navbar'
import BottomNav from '@/app/components/layout/BottomNav'
import { OrderCardSkeleton } from '@/app/components/ui/Skeleton'
import SectionHeader from '@/app/components/ui/SectionHeader'
import PageWrapper from '@/app/components/layout/PageWrapper'

export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      
      <PageWrapper maxWidth="2xl" className="pb-28 md:pb-12 space-y-6">
        <SectionHeader title="My Orders" subtitle="Loading your orders..." />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </PageWrapper>
      
      <BottomNav />
    </div>
  )
}