// app/(auth)/login/page.tsx
import LoginForm from '@/app/components/auth/LoginForm'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Bushal account to access your orders, saved addresses, and a personalized shopping experience.',
  robots: { index: false, follow: true }, // Prevents indexing of the login page for security and SEO best practices
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bushal-ivory flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link
            href="/dashboard"
            className="text-4xl font-extrabold text-bushal-copper tracking-tight hover:text-bushal-copperLight transition-colors"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Bushal
          </Link>
          <p className="mt-3 text-bushal-inkSoft text-sm sm:text-base">
            Sign in to continue shopping
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border shadow-card p-6 sm:p-8">
          <LoginForm />
          
          {/* FIX: Added Forgot Password Link */}
          <div className="mt-6 text-center">
            <Link 
              href="/forgot-password" 
              className="text-sm text-bushal-copper font-semibold hover:text-bushal-copperLight transition-colors hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-bushal-inkSoft">
            Don&apos;t have an account?{' '}
            <Link 
              href="/register" 
              className="text-bushal-copper font-semibold hover:text-bushal-copperLight transition-colors hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 flex items-center justify-center gap-5 text-xs text-bushal-inkSoft">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured by SSL
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Your data is safe
          </span>
        </div>
      </div>
    </div>
  )
}