// middleware.ts
// Runs on every request. Refreshes Supabase session and protects routes.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Always refresh the Supabase session cookie first
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Routes that require authentication
  const protectedRoutes = ['/checkout', '/admin']
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected) {
    // Read the session from the refreshed response cookies
    const hasSession = request.cookies.get(
      'sb-' +
        new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0] +
        '-auth-token'
    )

    if (!hasSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}