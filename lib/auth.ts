// lib/auth.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type AuthResult =
  | { success: true; userId: string; supabase: ReturnType<typeof createServerClient> }
  | { success: false; response: NextResponse }

export async function requireAuth(): Promise<AuthResult> {
  const supabase = createServerClient()
  const { data: { user }, error } =  await (await supabase).auth.getUser()

  if (error || !user) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { success: true, userId: user.id, supabase }
}

export async function requireAdmin(): Promise<AuthResult> {
  const supabase = createServerClient()
  const { data: { user }, error } = await (await supabase).auth.getUser()

  if (error || !user) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await (await supabase)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { success: true, userId: user.id, supabase }
}