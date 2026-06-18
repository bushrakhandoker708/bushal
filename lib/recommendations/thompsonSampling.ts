// ============================================================================
// FILE ADDRESS: lib/recommendations/thompsonSampling.ts
// ============================================================================
// EXPLANATION:
// This module implements Thompson Sampling (a Multi-Armed Bandit algorithm) 
// to dynamically select the best-performing recommendation algorithm for each 
// user request. It balances exploration (trying less-tested algorithms) and 
// exploitation (using the algorithm with the highest conversion rate).
//
// MATHEMATICAL FOUNDATION:
// Thompson Sampling models the conversion rate of each algorithm as a Beta 
// distribution: Beta(alpha, beta), where:
// - alpha = number of conversions (clicks/purchases) + 1
// - beta = number of non-conversions (impressions without clicks) + 1
// 
// To select an algorithm, we draw a random sample from each algorithm's 
// Beta distribution and choose the one with the highest sample. Over time, 
// the distribution for the best algorithm will narrow around its true 
// conversion rate, and it will be selected more frequently.
//
// We implement a pure TypeScript Beta sampler using the Gamma distribution 
// transformation (Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b))), avoiding 
// the need for external math libraries.
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface RecommendationModel {
  id: string
  name: string
  description: string | null
  alpha: number
  beta: number
  is_active: boolean
}

export type RecommendationEventType = 'impression' | 'click' | 'purchase'

// ─── Pure TS Beta Distribution Sampler ──────────────────────────────────────

/**
 * Generate a random sample from a standard normal distribution N(0,1)
 * using the Box-Muller transform.
 */
function normalSample(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * Generate a random sample from a Gamma distribution Gamma(shape, 1)
 * using Marsaglia and Tsang's method.
 */
function gammaSample(shape: number): number {
  if (shape < 1) {
    // For shape < 1, we use the property: Gamma(a) = Gamma(a+1) * U^(1/a)
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape)
  }
  
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  
  while (true) {
    let x: number, v: number
    do {
      x = normalSample()
      v = 1 + c * x
    } while (v <= 0)
    
    v = v * v * v
    const u = Math.random()
    
    // Squeeze test for quick acceptance
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    // Final acceptance test
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

/**
 * Generate a random sample from a Beta distribution Beta(alpha, beta).
 * Uses the relationship: If X ~ Gamma(alpha) and Y ~ Gamma(beta), 
 * then X / (X + Y) ~ Beta(alpha, beta).
 */
export function betaSample(alpha: number, beta: number): number {
  const x = gammaSample(alpha)
  const y = gammaSample(beta)
  return x / (x + y)
}

// ─── Core Thompson Sampling Logic ───────────────────────────────────────────

/**
 * Selects the best recommendation model to use for the current request.
 * Fetches all active models, draws a sample from each model's Beta distribution,
 * and returns the model with the highest sample.
 * 
 * @param supabase - The Supabase client instance
 * @returns The selected RecommendationModel, or null if no models are active
 */
export async function selectBestModel(supabase: SupabaseClient): Promise<RecommendationModel | null> {
  // 1. Fetch all active models from the database
  const { data: models, error } = await supabase
    .from('recommendation_models')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('[Thompson Sampling] Error fetching models:', error)
    return null
  }

  if (!models || models.length === 0) {
    return null
  }

  // 2. Draw a sample from the Beta distribution for each model
  let bestModel: RecommendationModel | null = null
  let highestSample = -1

  for (const model of models) {
    // Ensure alpha and beta are at least 1 to prevent math errors
    const alpha = Math.max(1, Number(model.alpha) || 1)
    const beta = Math.max(1, Number(model.beta) || 1)
    
    const sample = betaSample(alpha, beta)

    if (sample > highestSample) {
      highestSample = sample
      bestModel = model
    }
  }

  return bestModel
}

/**
 * Logs a recommendation event (impression, click, or purchase) to the database.
 * If the event is a 'purchase', the RPC automatically rewards the model 
 * (increments its alpha parameter).
 * 
 * @param supabase - The Supabase client instance
 * @param modelName - The name of the algorithm that generated the recommendation
 * @param eventType - The type of event ('impression', 'click', 'purchase')
 * @param productId - The ID of the product involved in the event
 * @param sessionId - Optional session ID for anonymous users
 */
export async function logRecommendationEvent(
  supabase: SupabaseClient,
  modelName: string,
  eventType: RecommendationEventType,
  productId: string,
  sessionId?: string
): Promise<void> {
  const { error } = await supabase.rpc('log_recommendation_event', {
    p_model_name: modelName,
    p_event_type: eventType,
    p_product_id: productId,
    p_session_id: sessionId || null,
  })

  if (error) {
    console.error(`[Thompson Sampling] Error logging ${eventType} event for ${modelName}:`, error)
  }
}

/**
 * Manually penalizes a model (increments its beta parameter).
 * This is typically called by a background job or session-end webhook 
 * if an impression did not result in a click/purchase within a certain timeframe.
 * 
 * @param supabase - The Supabase client instance
 * @param modelName - The name of the algorithm to penalize
 */
export async function penalizeModel(
  supabase: SupabaseClient,
  modelName: string
): Promise<void> {
  const { error } = await supabase.rpc('penalize_recommendation_model', {
    p_model_name: modelName,
  })

  if (error) {
    console.error(`[Thompson Sampling] Error penalizing model ${modelName}:`, error)
  }
}