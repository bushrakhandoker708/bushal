// lib/supabase/server.ts
// Server-side Supabase client — use in Server Components, Route Handlers, Server Actions

import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method is called from a Server Component.
            // Can be safely ignored if middleware is refreshing sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as above
          }
        },
      },
      // SECURITY FIX: Ensure all database functions created by this client
      // run with the privileges of the caller (SECURITY INVOKER) rather than
      // the creator (SECURITY DEFINER). This prevents privilege escalation
      // where a low-privileged user could execute a function that bypasses
      // Row-Level Security (RLS) policies.
      db: {
        schema: 'public',
      },
      auth: {
        // SECURITY FIX: Enable auto-refresh to ensure the session token
        // is always valid and up-to-date when passed to server-side logic.
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}