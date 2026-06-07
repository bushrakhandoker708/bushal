// app/(customer)/product/[id]/loading.tsx
import Navbar from '@/app/components/layout/Navbar'
import { ProductDetailSkeleton } from '@/app/components/ui/Skeleton'

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductDetailSkeleton />
      </main>
    </div>
  )
}