'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Button from '@/app/components/ui/Button'
import PasswordInput from '@/app/components/ui/PasswordInput'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const initializeSession = async () => {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          setMessage('Invalid or expired reset link. Please request a new one.')
          setIsValidToken(false)
        } else {
          setIsValidToken(true)
          window.history.replaceState({}, '', window.location.pathname)
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsValidToken(true)
        } else {
          setMessage('No valid reset session found. Please request a new password reset link.')
          setIsValidToken(false)
        }
      }
      setCheckingSession(false)
    }

    initializeSession()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsSuccess(false)

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setMessage(error.message || 'Failed to update password. Please try again.')
    } else {
      setIsSuccess(true)
      setMessage('Password updated successfully! Redirecting to dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-bushal-ivory flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <Link
            href="/dashboard"
            className="text-4xl font-extrabold text-bushal-copper tracking-tight hover:text-bushal-copperLight transition-colors"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Bushal
          </Link>
          <p className="mt-3 text-bushal-inkSoft text-sm sm:text-base">
            Set your new password
          </p>
        </div>

        <div className="bg-bushal-surface rounded-2xl border border-bushal-border shadow-card p-6 sm:p-8">
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

          {checkingSession ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-bushal-copper border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-bushal-inkSoft">Verifying reset link...</p>
            </div>
          ) : isValidToken ? (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <PasswordInput
                id="password"
                name="password"
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-2"
                size="lg"
                disabled={!password || !confirmPassword}
              >
                Update Password
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-bushal-inkSoft mb-4">
                Your reset link is invalid or has expired.
              </p>
              <Link
                href="/forgot-password"
                className="text-bushal-copper font-semibold hover:text-bushal-copperLight transition-colors"
              >
                Request a new link
              </Link>
            </div>
          )}

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
      </div>
    </div>
  )
}