// app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Button from '@/app/components/ui/Button'
import Input from '@/app/components/ui/Input'
import { Metadata } from 'next'

// Note: Metadata is typically for Server Components, but keeping it here for structure 
// if you decide to convert or if Next.js handles it in client layouts.
// For pure client components, metadata is usually defined in a layout.tsx or page.tsx (server).
// We will rely on the layout.tsx for metadata if needed, but the UI is fully client-side.

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsSuccess(false)

    const supabase = createBrowserClient()
    
    // Send reset email. 
    // The redirectTo will take them to the reset-password page after they click the email link.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setIsSuccess(false)
      setMessage(error.message || 'Failed to send reset email. Please try again.')
    } else {
      setIsSuccess(true)
      setMessage('Check your inbox! A password reset link has been sent to your email.')
    }
  }

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
            Enter your email to receive a password reset link.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border shadow-card p-6 sm:p-8">
          {/* Feedback Message */}
          {message && (
            <div
              className={`mb-6 flex items-start gap-3 p-4 rounded-xl text-sm animate-fade-in ${
                isSuccess
                  ? 'bg-bushal-successBg border border-bushal-success/20 text-bushal-success'
                  : 'bg-bushal-dangerBg border border-bushal-danger/20 text-bushal-danger'
              }`}
            >
              <svg 
                className="w-5 h-5 flex-shrink-0 mt-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isSuccess ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span className="font-medium">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <Button 
              type="submit" 
              loading={loading} 
              className="w-full mt-2" 
              size="lg"
              disabled={!email.trim()}
            >
              Send Reset Link
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-8 pt-6 border-t border-bushal-border text-center">
            <p className="text-sm text-bushal-inkSoft">
              Remember your password?{' '}
              <Link 
                href="/login" 
                className="text-bushal-copper font-semibold hover:text-bushal-copperLight transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 flex items-center justify-center gap-5 text-xs text-bushal-inkSoft">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured by SSL
          </span>
        </div>
      </div>
    </div>
  )
}