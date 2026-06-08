// app/(auth)/register/page.tsx
import RegisterForm from '@/app/components/auth/RegisterForm'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join Bushal to access exclusive curated products, track your orders, and enjoy a seamless shopping experience in Bangladesh.',
  robots: { index: false, follow: true }, // Prevents indexing of the registration page for security and SEO best practices
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-bushal-ivory flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <Link
            href="/dashboard"
            className="text-4xl font-extrabold text-bushal-copper tracking-tight hover:text-bushal-copperLight transition-colors"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Bushal
          </Link>
          <p className="mt-2 text-bushal-inkSoft text-sm">Create your free account</p>
        </div>
        
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border shadow-card p-8">
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-bushal-inkSoft">
            Already have an account?{' '}
            <Link href="/login" className="text-bushal-copper font-semibold hover:text-bushal-copperLight transition-colors">
              Sign in
            </Link>
          </p>
        </div>
        
        <p className="mt-6 text-center text-xs text-bushal-inkSoft px-4 leading-relaxed">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-bushal-ink transition-colors">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-bushal-ink transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}