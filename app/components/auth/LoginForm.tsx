// components/auth/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import Input from '@/app/components/ui/Input'
import Button from '@/app/components/ui/Button'

export default function LoginForm() {
  const router = useRouter()
  const supabase = createBrowserClient()
  
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setLoading(false)
      setError(authError?.message ?? 'Invalid email or password')
      return
    }

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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
        <div className="flex items-start gap-2.5 text-sm text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-4 py-3 rounded-xl animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
        Sign in
      </Button>
    </form>
  )
}