// middleware.ts
// Runs on every request. Refreshes Supabase session, protects routes, and enforces rate limiting.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

// Initialize Upstash Redis for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate Limiting Configuration
const RATE_LIMIT_WINDOW = 60 // seconds
const MAX_REQUESTS = 10 // max requests per window

async function checkRateLimit(identifier: string): Promise<boolean> {
  const key = `ratelimit:${identifier}`
  
  try {
    // Use a pipeline to atomically increment and set expiry
    const [current] = await redis.pipeline()
      .incr(key)
      .expire(key, RATE_LIMIT_WINDOW)
      .exec()
    
    // If this is the first request, set the expiry immediately
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW)
    }

    return current <= MAX_REQUESTS
  } catch (error) {
    console.error('[Middleware] Rate limit check failed:', error)
    // Fail open: allow request if Redis is down to prevent blocking legitimate users
    return true
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use proper SSR session detection instead of fragile cookie string matching.
  // This automatically handles token refresh and securely validates the user session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ─── Rate Limiting Logic ────────────────────────────────────────────────
  // Apply rate limiting to sensitive public endpoints to prevent brute-force and DoS
  const rateLimitedPaths = ['/api/login', '/api/register', '/api/bkash/create']
  const isRateLimitedPath = rateLimitedPaths.some((path) => pathname.startsWith(path))

  if (isRateLimitedPath) {
    // Use IP address as identifier. In production behind a proxy, you might use 
    // request.headers.get('x-forwarded-for') or similar.
    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    const isAllowed = await checkRateLimit(identifier)
    
    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
  }

  // ─── Authentication Checks ──────────────────────────────────────────────
  // Routes that require authentication
  const protectedRoutes = ['/checkout', '/admin']
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}