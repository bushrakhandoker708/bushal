// components/auth/RegisterForm.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import Input from '../ui/Input'
import Button from '../ui/Button'


export default function RegisterForm() {
  const router = useRouter()
  const supabase = createBrowserClient()

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

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="fullName"
        name="fullName"
        label="Full Name"
        value={form.fullName}
        onChange={handleChange}
        placeholder="John Doe"
        required
      />
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
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        value={form.password}
        onChange={handleChange}
        placeholder="Min 6 characters"
        required
        autoComplete="new-password"
      />
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

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Create Account
      </Button>
    </form>
  )
}