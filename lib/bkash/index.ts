// app/lib/bkash/index.ts
import { redis } from '@/lib/redis'

// ─── Configuration ─────────────────────────────────────────────────────────────
const BASE_URL = process.env.BKASH_BASE_URL ?? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
const USERNAME = process.env.BKASH_USERNAME!
const PASSWORD = process.env.BKASH_PASSWORD!
const APP_KEY = process.env.BKASH_APP_KEY!
const APP_SECRET = process.env.BKASH_APP_SECRET!

// ─── FIX: Redis-backed token caching ──────────────────────────────────────────
// Previously, this used a module-level variable that got wiped on Vercel cold starts.
// Redis ensures the token survives across all serverless invocations.
const TOKEN_KEY = 'bushal:bkash:token'
const TOKEN_TTL = 3300 // 55 minutes (bKash tokens last 60min, 5min buffer)

async function getToken(): Promise<string> {
  // 1. Try Redis first (survives across all serverless invocations)
  const cached = await redis.get<string>(TOKEN_KEY)
  if (cached) return cached

  // 2. Cache miss — fetch a fresh token from bKash
  const res = await fetch(`${BASE_URL}/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: USERNAME,
      password: PASSWORD,
    },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
  })

  const data = await res.json()
  if (!data.id_token) {
    throw new Error('bKash token grant failed: ' + JSON.stringify(data))
  }

  // 3. Store in Redis with TTL
  await redis.set(TOKEN_KEY, data.id_token, { ex: TOKEN_TTL })

  return data.id_token
}

// ─── Create Payment ────────────────────────────────────────────────────────────
export async function bkashCreatePayment(requestBody: {
  amount: string
  orderId: string
  callbackUrl: string
}) {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/checkout/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token,
      'X-APP-Key': APP_KEY,
    },
    body: JSON.stringify({
      mode: '0011',
      payerReference: requestBody.orderId,
      callbackURL: requestBody.callbackUrl,
      amount: requestBody.amount,
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: requestBody.orderId,
    }),
  })

  const data = await res.json()
  if (data.statusCode !== '0000') {
    throw new Error('bKash create payment failed: ' + JSON.stringify(data))
  }

  return { bkashURL: data.bkashURL, paymentID: data.paymentID }
}

// ─── Execute Payment ───────────────────────────────────────────────────────────
export async function bkashExecutePayment(paymentID: string) {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/checkout/payment/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token,
      'X-APP-Key': APP_KEY,
    },
    body: JSON.stringify({ paymentID }),
  })

  return await res.json()
}