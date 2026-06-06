// lib/bkash/index.ts
// Core bKash Checkout API wrapper (no mongoose — uses Supabase for token storage)

const BASE_URL = process.env.BKASH_BASE_URL!        // https://checkout.sandbox.bka.sh/v1.2.0-beta
const APP_KEY = process.env.BKASH_APP_KEY!
const APP_SECRET = process.env.BKASH_APP_SECRET!
const USERNAME = process.env.BKASH_USERNAME!
const PASSWORD = process.env.BKASH_PASSWORD!

// ─── Token Management ────────────────────────────────────────────────────────
// bKash tokens expire in 1 hour. We cache in a module-level variable
// (resets on server restart, which is fine for dev/sandbox).
// In production you'd store this in Supabase or Redis.

let cachedToken: { token: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  const now = Date.now()

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }

  const res = await fetch(`${BASE_URL}/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: USERNAME,
      password: PASSWORD,
    },
    body: JSON.stringify({
      app_key: APP_KEY,
      app_secret: APP_SECRET,
    }),
  })

  const data = await res.json()

  if (!data.id_token) {
    throw new Error('bKash token grant failed: ' + JSON.stringify(data))
  }

  cachedToken = {
    token: data.id_token,
    expiresAt: now + 3600_000, // 1 hour
  }

  return cachedToken.token
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: token,
    'X-APP-Key': APP_KEY,
  }
}

// ─── Create Payment ───────────────────────────────────────────────────────────
export async function bkashCreatePayment({
  amount,
  callbackURL,
  orderID,
}: {
  amount: number
  callbackURL: string
  orderID: string
}) {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/checkout/payment/create`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      amount: String(amount),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: orderID,
    }),
  })

  return res.json()
}

// ─── Execute Payment ──────────────────────────────────────────────────────────
export async function bkashExecutePayment(paymentID: string) {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/checkout/payment/execute/${paymentID}`, {
    method: 'POST',
    headers: authHeaders(token),
  })

  return res.json()
}

// ─── Query Payment ────────────────────────────────────────────────────────────
export async function bkashQueryPayment(paymentID: string) {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/checkout/payment/query/${paymentID}`, {
    method: 'GET',
    headers: authHeaders(token),
  })

  return res.json()
}