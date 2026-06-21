// app/components/auth/RegisterForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/app/components/ui/Input'
import PasswordInput from '@/app/components/ui/PasswordInput'
import Button from '@/app/components/ui/Button'
import { useToast } from '@/app/components/ui/Toast'

export default function RegisterForm() {
  const router = useRouter()
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

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setLoading(false)

      if (res.status === 429) {
        setError(data.error ?? 'Too many attempts. Please wait a minute and try again.')
        return
      }
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      toast('Check your email! A verification link has been sent.', 'success', 6000)
      router.push('/dashboard')
      router.refresh()
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Input id="fullName" name="fullName" label="Full Name" value={form.fullName} onChange={handleChange} placeholder="Enter your full name" required />
      <Input id="email" name="email" type="email" label="Email address" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" />
      <PasswordInput id="password" name="password" label="Password" value={form.password} onChange={handleChange} required autoComplete="new-password" />
      <PasswordInput id="confirmPassword" name="confirmPassword" label="Confirm Password" value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password" />

      {error && (
        <div className="flex items-start gap-2.5 text-sm text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-4 py-3 rounded-xl animate-fade-in">
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
        Create account
      </Button>
    </form>
  )
}