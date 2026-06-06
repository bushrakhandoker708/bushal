// components/auth/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import Input from '../ui/Input'
import Button from '../ui/Button'

export default function LoginForm() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createBrowserClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setLoading(false)
      setError(authError?.message ?? 'Login failed')
      return
    }

    // Fetch the profile AFTER sign-in confirms the user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const role = profile?.role ?? 'customer'

    if (role === 'admin') {
      window.location.href = '/admin'
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Sign in
      </Button>
    </form>
  )
}