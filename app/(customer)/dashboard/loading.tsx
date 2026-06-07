// app/(customer)/dashboard/loading.tsx

import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import BottomNav from '@/app/components/layout/BottomNav'
import { ProductGridSkeleton, Skeleton } from '@/app/components/ui/Skeleton'
import SectionHeader from '@/app/components/ui/SectionHeader'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-12 space-y-10">
        <Skeleton className="w-full h-[450px] md:h-[550px]" rounded="lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" rounded="lg" />
          ))}
        </div>
        <section>
          <SectionHeader title="All Products" subtitle="Loading items..." />
          <ProductGridSkeleton count={8} />
        </section>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}