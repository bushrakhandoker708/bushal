# API Reference

Every route handler in `app/api/`, documented from the actual implementation — not from a spec written before the code existed. Where the source has a gap or an apparent duplicate, it's noted as such rather than papered over.

Related reading: [`bkash-integration.md`](bkash-integration.md) for the full payment contract, [`the-ml-engine.md`](the-ml-engine.md) for what the analytics endpoints are computing, [`database-design.md`](database-design.md) for the tables behind all of this.

## Conventions

**Base URL.** `https://bushal.vercel.app/api` in production, `http://localhost:3000/api` locally.

**Auth model.** Three tiers, enforced by two shared helpers in `lib/auth.ts`:

| Tier | Helper | Behavior |
|---|---|---|
| Public | — | No session check |
| Authenticated | `requireAuth()` | 401 if no valid Supabase session |
| Admin | `requireAdmin()` | 401 if no session, 403 if session exists but `profiles.role !== 'admin'` |

Both helpers return either `{ success: true, userId, supabase }` or `{ success: false, response }`, where `response` is a pre-built `NextResponse` the route returns directly — every protected route in this API starts with the same two lines:

```typescript
const auth = await requireAuth() // or requireAdmin()
if (!auth.success) return auth.response
```

**Status codes.** `200` success, `201` created, `400` malformed request, `401` no session, `403` wrong role, `404` not found, `409` conflict (stock/availability), `422` insufficient data to compute a result, `500` unhandled error. Almost every handler wraps its body in try/catch and returns `500` with a generic message on the catch — specific error messages are logged server-side, not leaked to the client, except for validation errors (`400`) which do return field-level detail from Zod.

**Content type.** Every response below is `application/json` unless marked otherwise. Two routes (`/bkash/callback`, `/auth/callback`) return HTTP redirects, not JSON — they're navigation endpoints, not data endpoints.

---

## Catalog

### `GET /api/products`
**Auth:** Public · **Returns:** full product list, newest first.

```json
// 200
[{ "id": "uuid", "name": "...", "price": 1200, "stock_quantity": 14, "in_stock": true, ... }]
```

### `POST /api/products`
**Auth:** Admin · **Body:** validated against `productSchema` (Zod).

Server-side, the handler forces `category` to `'General'` if blank and coerces `cost_price`/`other_costs` to numbers — a direct fix for a `null value in column category` constraint violation that used to happen on submit.

```json
// 201
{ "id": "uuid", "name": "...", "category": "General", ... }
```
```json
// 400 — Zod validation failure
{ "error": { "fieldErrors": { "price": ["Required"] } } }
```

### `GET /api/products/{id}`
**Auth:** Public · **Returns:** one product joined with its `comments`. Returns `404` if the product doesn't exist *or* if `is_deleted = true` — soft-deleted products are invisible to this endpoint by design.

### `PUT /api/products/{id}`
**Auth:** Admin · **Body:** partial `productSchema` (any subset of fields). `in_stock` is derived server-side from `stock_quantity > 0` rather than trusted from the client.

### `DELETE /api/products/{id}`
**Auth:** Admin · **Body (optional):**
```json
{ "keepSalesData": true, "keepAnalytics": true, "keepRating": true }
```
Never hard-deletes. Always sets `is_deleted = true`. If `keepRating` is `false`, attached comments are deleted first. If either `keepSalesData` or `keepAnalytics` is `false`, the product row itself is anonymized (`name → "[Deleted Product]"`, price/images/category reset) so it stops showing real data while the `order_items` foreign key referencing it stays intact — this is the application-level half of the audit trail that `product_deletion_log` (database side) records.

### `GET /api/products/search`
**Auth:** Public · **Query:** `q` (string, min 2 chars), `debug=1` (optional).

Calls the `search_products` Postgres RPC (the weighted `tsvector` function). On RPC failure, falls back to a plain `ILIKE` query rather than returning an error — search degrades gracefully instead of going blank. `debug=1` returns a 4-step diagnostic trace (raw table read → `ILIKE` without filters → `ILIKE` with stock filter → RPC result) instead of search results, for troubleshooting why a product isn't appearing.

```json
// 200
[{ "id": "uuid", "name": "...", "matchType": "exact" | "partial" | "fuzzy" }]
```

### `GET /api/search/autocomplete`
**Auth:** Public · **Query:** `q` (min 2 chars), `limit` (1–20, default 8), `includeCategories`, `inStockOnly` (default `true`).

Builds (or reuses) an in-memory Trie from up to 5,000 in-stock products, cached at module scope for 5 minutes. First request after a cold start or cache expiry pays the build cost; every request in the following 5 minutes is a pure O(m) prefix walk.

```json
// 200
{ "success": true, "query": "sh", "suggestions": [{ "id": "...", "name": "Shirt", "price": 1200, "in_stock": true }], "totalProductsIndexed": 4231 }
```

### `GET /api/products/trending`
**Auth:** Public · **Query:** `limit` (1–50), `status` (`HOT`/`TRENDING`/`STABLE`/`DECLINING`), `category`, `includeMetrics`.

Pulls 30 days of fulfilled `order_items`, runs the EMA/trend-score classifier (`lib/analytics/trendingProducts.ts`), and caches the result in-memory for 10 minutes per unique query combination.

```json
// 200
{ "success": true, "trendingProducts": [{ "product_id": "...", "trend_status": "HOT", "trend_score": 18.4, "growth_percentage": 142 }], "storeMetrics": { "hot_count": 3, "store_momentum": "..." } }
```

### `GET /api/products/graph-similar/{productId}`
**Auth:** Public · **Query:** `limit` (1–50), `alpha` (0–1, default 0.7 — blend weight between RWR similarity and PageRank popularity).

Builds the co-purchase + category product graph from order history on the fly, runs Random Walk with Restart for similarity and PageRank for a popularity boost, and blends the two. `404` if the target product doesn't exist in the live catalog.

```json
// 200
{ "success": true, "productId": "...", "recommendations": [{ "productId": "...", "score": 0.84, "rwrProbability": 0.91, "pageRankScore": 0.62 }], "totalEdges": 1840 }
```

---

## Recommendations

### `GET /api/recommendations/frequently-bought/{productId}`
**Auth:** Public · Runs the in-app TypeScript Apriori implementation against up to 2,000 recent fulfilled orders (`minSupport: 0.01, minConfidence: 0.3, minLift: 1.2`), caches per-product for 1 hour. This is the on-demand path; the nightly Python FP-Growth job (see [`the-ml-engine.md`](the-ml-engine.md)) populates the `frequently_bought_together` cache table that other surfaces read from directly. Both exist in the codebase today.

```json
// 200
{ "success": true, "productId": "...", "recommendations": [{ "product_id": "...", "support": 0.05, "confidence": 0.75, "lift": 2.5, "reason": "..." }] }
```

### `GET /api/recommendations/user/{userId}`
**Auth:** Authenticated, self-or-admin (a non-admin requesting another user's ID gets `403`) · **Query:** `limit` (1–50), `useHybrid` (default `true`), `diversity`, `k` (neighbor count, default 5).

Three code paths depending on data availability: `cold_start_fallback` if the user has zero purchase history, `hybrid_cf_svd` if `useHybrid` and history exists, `collaborative_filtering` otherwise. Results cached in-memory for 30 minutes per `userId:limit` pair.

```json
// 200
{ "success": true, "recommendations": [...], "algorithm": "hybrid_cf_svd", "similarUsersCount": 4, "totalProductsAnalyzed": 480 }
```

### `POST /api/recommendations/user/{userId}`
**Auth:** Authenticated, self-or-admin · Clears the in-memory recommendation cache for that user — call after a purchase or major interaction so the next `GET` recomputes rather than serving a stale entry.

---

## Cart & Checkout

### `POST /api/cart`
**Auth:** Public · **Body:** `{ "items": [{ "id": "uuid", "quantity": 2 }] }`

Pure validation, no mutation: confirms every item still exists, is in stock, and has enough `stock_quantity` for the requested amount, then returns the server-computed total (applying any `discount_percent`). Returns `409` with structured detail (`missingIds`, `outOfStock`, or `insufficient`) rather than a generic error, so the cart UI can highlight exactly which line item is the problem.

```json
// 200
{ "valid": true, "total": 3450 }
```

### `POST /api/orders`
**Auth:** Authenticated · **Body:**
```json
{
  "items": [{ "id": "uuid", "quantity": 1, "price": 1200, "discount_percent": 10 }],
  "total": 1080,
  "payment_method": "cod" | "bkash",
  "delivery_address": "string",
  "phone": "+8801XXXXXXXXX",
  "customer_note": "optional"
}
```
Calls the `create_order_with_stock_check` RPC (row-locked, atomic — see [Decision 4 in the README](../README.md#engineering-decision-log)), then attaches delivery metadata, then fires both an admin-alert email and a customer-confirmation email concurrently via `Promise.all`. Email failures are caught inside the email helpers and never surface as a `500` to the customer — the order has already been created by the time email is attempted.

```json
// 201
{ "id": "uuid", "message": "Order created successfully" }
```
```json
// 409 — RPC reported insufficient_stock
{ "error": "One or more items are out of stock. Please adjust your cart." }
```

### `GET /api/orders`
**Auth:** Authenticated · Returns the calling user's own orders (filtered by `user_id` in the query, not just RLS) with nested `order_items` and product name/image/price.

### A second checkout path (path not labeled in source)

Elsewhere in the codebase there's a second `POST` handler — distinct from the one above — that does `create_order_with_stock_check` *and then* calls `bkashCreatePayment()` to start the bKash checkout, generating an order reference like `SAG-XXXXXXXX` (a naming leftover, evidently, from before the "Bushal" rebrand) and redirecting through `bkashURL`. The source dump doesn't carry an explicit file-path comment for this handler the way every other route does, so rather than guess confidently: based on behavior and its position immediately before `bkash/callback/route.ts`, it's most likely `app/api/bkash/create/route.ts` or folded into a `/checkout` route — confirm the exact path against the live repository rather than trusting this document for that one detail.

```json
// 200
{ "bkashURL": "https://...", "orderId": "uuid" }
```

### `GET /api/bkash/callback`
**Auth:** Public (called by the bKash redirect, not by your frontend) · Not a data endpoint — it's a server-side redirect target. Handles `status=cancel`/`failure` by deleting the unconfirmed order and its items, otherwise calls `bkashExecutePayment`, checks `bkash_invoice` for an already-fulfilled match (idempotency against bKash retry), updates the order to `fulfilled`, sends both notification emails, and redirects to `/thank-you?orderId=...`. See [`bkash-integration.md`](bkash-integration.md) for the full state machine.

### `POST /api/webhooks/bkash`
**Auth:** Public, IPN signature verification scaffolded but not yet enforced (`BKASH_IPN_SECRET`) · **Body (from bKash):** `{ "paymentID": "...", "trxID": "...", "status": "completed" | "cancelled" | "failure" }`

The actual source of truth for order fulfillment — see [Decision 4](../README.md#engineering-decision-log). Checks `order.status === 'fulfilled' || order.delivery_status === 'confirmed'` before doing anything, so a duplicate IPN delivery is a no-op. Returns `200` even for an unrecognized `paymentID` (`{ "status": "ignored" }`) specifically so bKash doesn't interpret "we don't have this order" as a delivery failure and retry it forever.

---

## Orders & Delivery (Admin)

### `GET / PATCH /api/admin/orders/{id}`
**Auth:** Admin · `GET` returns the full order — items with per-item profit (`unit_price × quantity − cost_price × quantity − delivery_charge × quantity`), parsed delivery address, customer profile. `PATCH` takes `{ "delivery_status": "..." }`, calls `confirm_order_and_reduce_stock` (the same atomic RPC the bKash webhook uses), and fires a status-update email — note this is an admin-initiated email sent via a raw `fetch` to Resend's HTTP API rather than the `resend` SDK used elsewhere, a small inconsistency in the codebase rather than a deliberate choice.

```json
// 200 (PATCH)
{ "delivery_status": "shipped", "status": "pending", "inventory_reduced_now": true }
```

*A note on duplication:* near-identical GET/PATCH logic for a single order by ID also appears directly after `/api/orders/route.ts` in the source, also gated by `requireAdmin()`. Whether that's a second live route at a different path or the same file represented twice in the export isn't fully resolvable from the dump alone — worth a five-minute check against the actual file tree before treating both as independently maintained.

### `PATCH /api/orders/{id}/delivery`
**Auth:** Admin · Functionally overlapping with the route above: validates `delivery_status` against the same seven-state enum, calls the same `confirm_order_and_reduce_stock` RPC, sends the same style of status email via raw `fetch`. Three different code paths in this repository call the same Postgres function for the same outcome — consolidating to one is a reasonable, low-risk cleanup.

---

## Customer Account

### `GET / POST /api/addresses`
**Auth:** Authenticated · `GET` returns the user's saved addresses, default address first. `POST` requires `division`, `zilla`, `upazilla`, `detailed_address` (Bangladesh's administrative hierarchy); `delivery_instructions` and `is_default` are optional. Setting a new default is handled by a database trigger (`ensure_single_default_address`), not application logic — the API doesn't need to un-set the previous default itself.

### `GET / PATCH /api/notifications`
**Auth:** Authenticated · An admin sees broadcast notifications (`user_id IS NULL`); a regular customer sees only their own. `PATCH` marks all of the caller's unread notifications as read in one query — there's no per-notification mark-as-read endpoint.

### `POST / PATCH / DELETE /api/comments`
**Auth:** Authenticated · `POST` creates a review (`product_id`, `body`, optional `rating`) — admin notification on new comments is handled by a database trigger, not this route, which is why the handler comment explicitly notes the "duplicate notification logic" that used to live here was removed. `PATCH`/`DELETE` branch on a `type` field (`"comment"` vs `"reply"`): editing your own review requires ownership, replying to a review or clearing a reply requires `admin`.

### `GET /api/auth/callback`
**Auth:** Public (OAuth/magic-link redirect target) · Exchanges Supabase's `code` query param for a session via `exchangeCodeForSession`, then redirects to `/dashboard`. Not a JSON endpoint.

---

## Catalog Management (Admin)

### `POST /api/categories`
**Auth:** Admin · `{ "name": "...", "slug": "optional", "description": "optional" }`. Slug auto-generates from `name` (lowercased, spaces → hyphens) if not provided.

### `DELETE /api/categories/{id}`
**Auth:** Admin.

### `POST /api/expenses`
**Auth:** Admin · `{ "label": "...", "amount": 150.0, "product_id": "optional" }` — ad hoc cost entries (shipping, packaging) attributable to a specific product or general overhead, feeding into profit calculations elsewhere in the admin dashboard.

### `DELETE /api/expenses/{id}`
**Auth:** Admin — enforced via a manual `session` + `profiles.role` check rather than the shared `requireAdmin()` helper used everywhere else. Functionally equivalent, just not using the common path; worth normalizing.

---

## Analytics & ML

These four endpoints are admin-only and each does real computation on request — none of them read from the nightly Python pipeline's cache tables. They're the **on-demand, synchronous** counterparts to the batch jobs described in [`the-ml-engine.md`](the-ml-engine.md), and they still exist in the live API surface alongside the cached versions other parts of the app read from. That overlap is exactly the situation described in the README's [Decision 1](../README.md#engineering-decision-log) and [What I'd Do Differently](../README.md#what-id-do-differently) — both versions work, only one is the long-term path.

### `GET /api/analytics/customer-segments`
**Auth:** Admin · **Query:** `limit` (1–500), `segment`, `includeRecommendations`.

Fetches 12 months of fulfilled orders, runs the in-app TypeScript K-Means (`lib/analytics/customerSegmentation.ts`) **with a hardcoded `k: 5`** — the original implementation later superseded by the Silhouette-Score-optimized Python version for the production pipeline.

```json
// 200
{ "success": true, "segments": [{ "user_id": "...", "segment": "VIP", "confidence_score": 0.87 }], "summary": [...], "totalCustomers": 340 }
```

### `GET /api/analytics/demand-forecast`
**Auth:** Admin · **Query:** `product_id` (optional — omit for store-wide revenue forecast), `periods` (1–24, default 6), `lead_time` (default 14).

Runs an in-app TypeScript Holt-Winters implementation (`lib/analytics/holtWinters.ts`) with **hardcoded smoothing constants** (`alpha: 0.3, beta: 0.1, gamma: 0.2`) and a hardcoded Bangladesh festival calendar — distinct from the production Python job, which calls `statsmodels` with `fit(optimized=True)` and lets the constants be fit from data rather than guessed. Returns `422` if fewer than 3 months of historical data exist.

```json
// 200
{ "success": true, "forecastType": "product", "forecast": [...], "stockOutRisk": "medium", "festivalsApplied": [{ "name": "Pohela Boishakh", "boostFactor": 1.8 }] }
```

### `GET /api/inventory/restock-alerts`
**Auth:** Admin · Pulls 90 days of fulfilled `order_items`, estimates per-category supplier lead times (a hardcoded lookup table — `Electronics: 21 days`, `Accessories: 10 days`, etc., pending a real `suppliers` table), and runs the EOQ / safety-stock / reorder-point math from `lib/inventory/smartRestocking.ts`.

```json
// 200
{ "success": true, "recommendations": [{ "product_name": "...", "reorder_point": 12, "eoq": 48, "urgency": "critical", "reasoning": "..." }], "summary": { "total_cost": 84500, "potential_lost_revenue": 31200 } }
```

### `GET /api/admin/ml-accuracy`
**Auth:** Admin · Returns the last 20 rows of `ml_model_accuracy` — Silhouette Score, MAPE, average lift, per model, over time. This is the entire backend for the dashboard's **AI Trust Score** panel; there's no separate aggregation logic, just a sorted, limited `SELECT`. Response cached at the edge for 5 minutes (`s-maxage=300`).

```json
// 200
[{ "id": "uuid", "model_name": "holt_winters_forecast", "metric_name": "mape_percentage", "metric_value": 14.2, "evaluated_at": "2026-06-17T02:03:11Z" }]
```

---

## Background Jobs

### `GET /api/cron/trigger-ml`
**Auth:** None on the incoming request itself — invoked by Vercel Cron per `vercel.json` (`0 2 * * *`). The handler checks that `ML_SERVICE_URL` and `ML_PIPELINE_SECRET` are configured, then forwards a `POST` to the Python service's `/run-pipeline` with the secret in an `x-pipeline-secret` header and a 55-second timeout. The actual authorization boundary is on the *downstream* call, not this one — anyone who finds this URL can cause the pipeline to re-run, but can't read or change anything through it, since it returns only the pipeline's summary result.

```json
// 200
{ "success": true, "results": { "segmentation": {...}, "forecasting": {...}, "recommendations": {...}, "automation": {...} } }
```

### `GET /api/health`
**Auth:** Public · The entire implementation:
```typescript
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
```
Liveness only — it doesn't check database or Redis connectivity. Used by uptime monitors and as a deploy-success signal.