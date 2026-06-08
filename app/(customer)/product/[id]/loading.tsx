// app/(customer)/product/[id]/loading.tsx
import Navbar from '@/app/components/layout/Navbar'
import { ProductDetailSkeleton } from '@/app/components/ui/Skeleton'
import PageWrapper from '@/app/components/layout/PageWrapper'

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <PageWrapper maxWidth="5xl" withBottomNav={false} className="py-10">
        <ProductDetailSkeleton />
      </PageWrapper>
    </div>
  )
}