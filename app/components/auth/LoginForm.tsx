'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import Input from '../ui/Input'
import Button from '../ui/Button'

export default function LoginForm() {
  const router = useRouter()
  const supabase = createBrowserClient()

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

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  })

  if (signInError) {
    setLoading(false)
    setError(signInError.message)
    return
  }

  // Debug logging
  console.log('User data:', data.user)

  if (data.user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    console.log('Profile data:', profile)
    console.log('Profile error:', profileError)

    if (profile?.role === 'admin') {
      console.log('Redirecting to /admin')
      router.push('/admin')
    } else {
      console.log('Redirecting to /dashboard, role is:', profile?.role)
      router.push('/dashboard')
    }
  }

  setLoading(false)
  router.refresh()
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