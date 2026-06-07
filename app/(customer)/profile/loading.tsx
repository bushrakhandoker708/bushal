// app/(customer)/profile/loading.tsx

import Navbar from '@/app/components/layout/Navbar'
import Footer from '@/app/components/layout/Footer'
import { ProfileSkeleton } from '@/app/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      <ProfileSkeleton />
      <Footer />
    </div>
  )
}