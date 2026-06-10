// app/components/auth/RegisterForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import Input from '@/app/components/ui/Input'
import Button from '@/app/components/ui/Button'
import { useToast } from '@/app/components/ui/Toast'

export default function RegisterForm() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { toast } = useToast()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        // Ensure the email confirmation link redirects to the dashboard
        emailRedirectTo: `${window.location.origin}/dashboard`, 
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // Show premium toast notification
    toast('Check your email! A verification link has been sent.', 'success', 6000)

    // Redirect to dashboard
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Full Name */}
      <Input
        id="fullName"
        name="fullName"
        label="Full Name"
        value={form.fullName}
        onChange={handleChange}
        placeholder="Enter your full name"
        required
      />

      {/* Email */}
      <Input
        id="email"
        name="email"
        type="email"
        label="Email address"
        value={form.email}
        onChange={handleChange}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />

      {/* Password */}
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        value={form.password}
        onChange={handleChange}
        placeholder="At least 6 characters"
        required
        autoComplete="new-password"
      />

      {/* Confirm Password */}
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm Password"
        value={form.confirmPassword}
        onChange={handleChange}
        placeholder="Repeat password"
        required
      />

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2.5 text-sm text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-4 py-3 rounded-xl animate-fade-in animate-shake">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
        Create Account
      </Button>

      {/* Trust Signals */}
      <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-bushal-inkSoft">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Secure SSL
        </span>
        <span className="w-1 h-1 rounded-full bg-bushal-border" />
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Data Encrypted
        </span>
      </div>
    </form>
  )
}