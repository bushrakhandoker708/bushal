// lib/auth.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type AuthResult =
  | { success: true; userId: string; supabase: Awaited<ReturnType<typeof createServerClient>> }
  | { success: false; response: NextResponse }

/**
 * Verifies that the request has a valid authenticated session.
 * 
 * SECURITY FIX: Uses getUser() instead of getSession().
 * - getSession() reads directly from cookies and can be spoofed via cookie tampering.
 * - getUser() makes a server-to-server call to Supabase Auth to validate the token,
 *   ensuring the session is genuine and not expired/revoked.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    if (error) {
      console.error('[Auth] requireAuth failed:', error.message)
    }
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  
  return { success: true, userId: user.id, supabase }
}

/**
 * Verifies that the request has a valid admin session.
 * 
 * SECURITY FIX: Uses getUser() instead of getSession().
 * Also verifies the user's role from the profiles table after confirming
 * the session is valid server-side.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const supabase = await createServerClient()
  
  // Step 1: Verify session server-side (prevents cookie spoofing)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    if (error) {
      console.error('[Auth] requireAdmin session check failed:', error.message)
    }
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  
  // Step 2: Verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || profile?.role !== 'admin') {
    if (profileError) {
      console.error('[Auth] requireAdmin profile check failed:', profileError.message)
    }
    return {
      success: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  
  return { success: true, userId: user.id, supabase }
}