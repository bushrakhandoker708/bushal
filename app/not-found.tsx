// app/not-found.tsx
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bushal-ivory px-4">
      <h1 className="text-7xl font-heading font-bold text-bushal-forest mb-4">404</h1>
      <p className="text-bushal-inkSoft mb-8 text-lg">The page you are looking for does not exist.</p>
      <Link href="/dashboard" className="btn-copper text-white px-8 py-3 rounded-xl font-semibold">
        Back to Home
      </Link>
    </div>
  )
}