// lib/supabase/client.ts
// Browser-side Supabase client — safe to use in 'use client' components

import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'

export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}