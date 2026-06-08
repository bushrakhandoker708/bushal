// hooks/useAuth.ts
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Initialize client inside the hook to ensure it's only created on the client
  const supabase = createBrowserClient()

  useEffect(() => {
    // 1. Get initial session on mount
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Optional: Force a page reload on sign out to clear any server-cached data
        if (_event === 'SIGNED_OUT') {
          window.location.href = '/login'
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
    // The onAuthStateChange listener above will handle the redirect
  }

  return { user, session, loading, signOut }
}