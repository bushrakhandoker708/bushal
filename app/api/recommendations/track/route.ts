// ============================================================================
// FILE ADDRESS: app/api/recommendations/track/route.ts
// ============================================================================
// EXPLANATION:
// This API endpoint receives recommendation tracking events from the frontend.
// It acts as the bridge between the UI and the Thompson Sampling engine.
//
// HOW IT WORKS:
// 1. The frontend calls this endpoint when a user interacts with a 
//    recommendation widget (e.g., "Frequently Bought Together").
// 2. We validate the event type ('impression', 'click', 'purchase').
// 3. We call the `logRecommendationEvent` utility, which executes the 
//    atomic Supabase RPC. 
// 4. If the event is a 'purchase', the RPC automatically rewards the 
//    algorithm that generated the recommendation (incrementing its alpha).
//
// SECURITY:
// - Uses the server-side Supabase client to ensure the event is logged 
//   with the correct authenticated user context (auth.uid()).
// - Validates the model name to prevent injection of fake algorithm names.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { logRecommendationEvent, type RecommendationEventType } from '@/lib/recommendations/thompsonSampling'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrackRequestBody {
  modelName: string
  eventType: RecommendationEventType
  productId: string
  sessionId?: string
}

// List of valid model names to prevent injection of fake algorithms
const VALID_MODEL_NAMES = [
  'collaborative_filtering',
  'fp_growth',
  'pagerank_rwr',
  'trending_ema',
  'random_baseline',
]

// ─── Main API Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body: TrackRequestBody = await request.json()
    const { modelName, eventType, productId, sessionId } = body

    if (!modelName || !eventType || !productId) {
      return NextResponse.json(
        { error: 'Missing required fields: modelName, eventType, productId' },
        { status: 400 }
      )
    }

    if (!VALID_MODEL_NAMES.includes(modelName)) {
      return NextResponse.json(
        { error: `Invalid model name. Must be one of: ${VALID_MODEL_NAMES.join(', ')}` },
        { status: 400 }
      )
    }

    const validEventTypes: RecommendationEventType[] = ['impression', 'click', 'purchase']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 2. Initialize Supabase client (Server-side to capture auth.uid() if logged in)
    const supabase = await createServerClient()

    // 3. Log the event to the database
    // This calls the atomic RPC we created in migration 034.
    // If eventType is 'purchase', the RPC automatically rewards the model.
    await logRecommendationEvent(
      supabase,
      modelName,
      eventType,
      productId,
      sessionId
    )

    // 4. Return success
    return NextResponse.json(
      { success: true, message: `Event '${eventType}' logged for model '${modelName}'` },
      { status: 200 }
    )

  } catch (error) {
    console.error('[Recommendation Tracker] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error while tracking recommendation event' },
      { status: 500 }
    )
  }
}