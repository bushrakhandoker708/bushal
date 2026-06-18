//  app/api/recommendations/frequently-bought/[productId]/route.ts
// EXPLANATION:
// This API endpoint generates "Frequently Bought Together" recommendations
// for a specific product. 
//
// BUG FIX: Removed TypeScript Apriori Implementation
// Previously, this route imported and ran the heavy Apriori association rule 
// mining algorithm in TypeScript. Running complex ML algorithms in Vercel 
// serverless functions causes timeouts and memory crashes. 
//
// THE FIX: We now read directly from the `frequently_bought_together` cache 
// table, which is populated nightly by the Python ML microservice. This 
// reduces the response time from seconds to milliseconds and eliminates 
// serverless timeout risks.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────────────────

interface EnrichedRecommendation {
  product_id: string
  name: string
  price: number
  image_url: string | null
  images: string[]
  in_stock: boolean
  support: number
  confidence: number
  lift: number
  frequency: number
  reason: string
}

interface FBTResponse {
  success: boolean
  productId: string
  recommendations: EnrichedRecommendation[]
  generatedAt: string
  error?: string
}

// ─── Main API Handler ───────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    // 1. Validate product ID
    const productId = params.productId
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // 2. Initialize Supabase client
    const supabase = await createServerClient()

    // 3. Fetch recommendation IDs from the Python ML cache table
    // We order by 'lift' descending to get the strongest, most meaningful 
    // associations first. We fetch 20 to ensure we have enough fallbacks 
    // after filtering out out-of-stock items.
    const { data: fbtData, error: fbtError } = await supabase
      .from('frequently_bought_together')
      .select('product_b_id, support, confidence, lift, frequency')
      .eq('product_a_id', productId)
      .order('lift', { ascending: false })
      .limit(20)

    if (fbtError) {
      console.error('[FBT API] Error fetching FBT cache:', fbtError)
      return NextResponse.json({
        success: false,
        productId,
        recommendations: [],
        generatedAt: new Date().toISOString(),
        error: 'Failed to fetch recommendations from cache',
      }, { status: 500 })
    }

    // If no associations exist for this product, return empty array gracefully
    if (!fbtData || fbtData.length === 0) {
      return NextResponse.json({
        success: true,
        productId,
        recommendations: [],
        generatedAt: new Date().toISOString(),
      })
    }

    // 4. Fetch product details for the recommended IDs
    // We do a separate query to avoid relying on Supabase's implicit FK join naming
    const recommendedIds = fbtData.map(row => row.product_b_id)
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, image_url, images, in_stock')
      .in('id', recommendedIds)
      .eq('in_stock', true)       // Only recommend products that are currently in stock
      .is('is_deleted', false)    // Exclude soft-deleted products

    if (productsError) {
      console.error('[FBT API] Error fetching product details:', productsError)
    }

    // 5. Map and enrich recommendations
    const productMap = new Map((products ?? []).map(p => [p.id, p]))
    
    const enrichedRecommendations: EnrichedRecommendation[] = fbtData
      .map((row) => {
        const product = productMap.get(row.product_b_id)
        
        // If the product is out of stock or deleted, productMap.get() returns undefined
        if (!product) return null 

        return {
          product_id: row.product_b_id,
          name: product.name,
          price: product.price,
          image_url: product.image_url || null,
          images: product.images || [],
          in_stock: product.in_stock,
          support: row.support,
          confidence: row.confidence,
          lift: row.lift,
          frequency: row.frequency,
          reason: `Bought together ${row.frequency} times (${(row.confidence * 100).toFixed(1)}% confidence)`,
        }
      })
      .filter((rec): rec is EnrichedRecommendation => rec !== null)
      .slice(0, 5) // Return top 5 after filtering out unavailable items

    // 6. Build response
    const response: FBTResponse = {
      success: true,
      productId,
      recommendations: enrichedRecommendations,
      generatedAt: new Date().toISOString(),
    }

    // 7. Return response with caching headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        'X-Cache': 'HIT-DB',
        'X-Recommendations-Count': enrichedRecommendations.length.toString(),
      },
    })

  } catch (error) {
    console.error('[FBT API] Unexpected error:', error)
    
    return NextResponse.json(
      {
        success: false,
        productId: params.productId ?? '',
        recommendations: [],
        generatedAt: new Date().toISOString(),
        error: 'Internal server error while generating recommendations',
      },
      { status: 500 }
    )
  }
}