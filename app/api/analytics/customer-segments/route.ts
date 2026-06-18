//app/api/analytics/customer-segments/route.ts

/**

 * This API endpoint reads customer segments from the cache table populated
 * by the Python ML microservice. It NO LONGER runs K-Means clustering
 * in the serverless function.
 * 
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed all ML algorithm imports and execution
 * - Reads from `customer_segments` table (populated by Python cron)
 * - Calculates summaries and recommendations directly from cached DB data
 * - Much faster response time (no computation, just DB reads)
 * 
 * USAGE:
 * GET /api/analytics/customer-segments?limit=50
 * GET /api/analytics/customer-segments?segment=VIP
 * GET /api/analytics/customer-segments?includeRecommendations=true
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

// ─── Types ──────────────────────────────────────────────────────────────────

type SegmentType = 'VIP' | 'Loyal' | 'Normal' | 'High Risk' | 'Fake Orders'

interface CustomerSegmentRow {
  user_id: string
  segment: SegmentType
  total_spent: number
  order_count: number
  avg_order_value: number
  order_variance: number
  confidence_score: number
  recommended_discount: number
  top_category: string | null
  updated_at: string
}

interface ProfileRow {
  id: string
  full_name: string | null
  email: string | null
}

// ─── Main API Handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication - Ensure user is an admin
    const auth = await requireAdmin()
    if (!auth.success) {
      return auth.response
    }

    const supabase = await auth.supabase

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const segmentFilter = searchParams.get('segment') as SegmentType | null
    const includeRecommendations = searchParams.get('includeRecommendations') === 'true'

    if (limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 500.' },
        { status: 400 }
      )
    }

    // 3. Fetch Segments from Cache Table
    // We fetch up to 2000 records to calculate accurate summaries and recommendations,
    // then slice the final enriched list to the requested `limit`.
    let segmentsQuery = supabase
      .from('customer_segments')
      .select('*')
      .order('total_spent', { ascending: false })
      .limit(2000)

    if (segmentFilter) {
      segmentsQuery = supabase
        .from('customer_segments')
        .select('*')
        .eq('segment', segmentFilter)
        .order('total_spent', { ascending: false })
        .limit(2000)
    }

    const { data: allSegments, error: segmentsError } = await segmentsQuery

    if (segmentsError) {
      console.error('[Customer Segments API] Error fetching segments:', segmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch customer segments' },
        { status: 500 }
      )
    }

    const segments = (allSegments ?? []) as CustomerSegmentRow[]

    if (segments.length === 0) {
      return NextResponse.json({
        success: true,
        segments: [],
        summary: [],
        recommendations: [],
        totalCustomers: 0,
        filteredCount: 0,
        generatedAt: new Date().toISOString(),
      })
    }

    // 4. Generate Segment Summaries from Cached Data
    const summaryMap = new Map<SegmentType, { count: number; total_spent: number; total_orders: number }>()
    const allSegmentTypes: SegmentType[] = ['VIP', 'Loyal', 'Normal', 'High Risk', 'Fake Orders']
    
    allSegmentTypes.forEach(s => summaryMap.set(s, { count: 0, total_spent: 0, total_orders: 0 }))

    segments.forEach(seg => {
      const data = summaryMap.get(seg.segment)!
      data.count++
      data.total_spent += Number(seg.total_spent)
      data.total_orders += seg.order_count
    })

    const summaries = allSegmentTypes.map(segment => {
      const data = summaryMap.get(segment)!
      return {
        segment,
        count: data.count,
        avg_spent: data.count > 0 ? Math.round(data.total_spent / data.count) : 0,
        avg_orders: data.count > 0 ? Math.round((data.total_orders / data.count) * 10) / 10 : 0,
        total_revenue: Math.round(data.total_spent),
      }
    })

    // 5. Limit the detailed segments list
    const limitedSegments = segments.slice(0, limit)

    // 6. Fetch Customer Profiles for Enrichment
    const userIds = limitedSegments.map(s => s.user_id)
    
    let enrichedSegments: any[] = []
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      const profileMap = new Map<string, { name: string; email: string }>()
      ;(profiles ?? []).forEach((p: ProfileRow) => {
        profileMap.set(p.id, {
          name: p.full_name ?? 'Anonymous',
          email: p.email ?? 'No email',
        })
      })

      enrichedSegments = limitedSegments.map(seg => ({
        user_id: seg.user_id,
        segment: seg.segment,
        total_spent: Number(seg.total_spent),
        order_count: seg.order_count,
        confidence_score: Number(seg.confidence_score),
        recommended_discount: seg.recommended_discount,
        top_category: seg.top_category ?? 'General',
        customer_name: profileMap.get(seg.user_id)?.name ?? 'Anonymous',
        customer_email: profileMap.get(seg.user_id)?.email ?? 'No email',
      }))
    }

    // 7. Generate Category Discount Recommendations (Optional)
    let recommendations: Array<{
      segment: string
      category: string
      recommended_discount: number
      reasoning: string
    }> = []

    if (includeRecommendations) {
      // Analyze top_category affinity per segment from the cached data
      const affinityMap: Record<string, Record<string, number>> = {}
      
      segments.forEach(seg => {
        if (!seg.top_category) return
        if (!affinityMap[seg.segment]) affinityMap[seg.segment] = {}
        affinityMap[seg.segment][seg.top_category] = (affinityMap[seg.segment][seg.top_category] || 0) + 1
      })

      for (const [segment, categories] of Object.entries(affinityMap)) {
        const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1])
        
        if (sortedCategories.length > 0) {
          const topCategory = sortedCategories[0][0]
          const count = sortedCategories[0][1]
          const totalInSegment = summaryMap.get(segment as SegmentType)?.count || 1
          const affinityPercentage = Math.round((count / totalInSegment) * 100)
          
          // Base discount logic on segment type
          let discount = 15
          if (segment === 'High Risk') discount = 30
          else if (segment === 'VIP') discount = 10
          else if (segment === 'Fake Orders') discount = 0

          if (discount > 0) {
            recommendations.push({
              segment,
              category: topCategory,
              recommended_discount: discount,
              reasoning: `${segment} customers show ${affinityPercentage}% affinity for ${topCategory}. Targeted discount recommended to boost conversion.`,
            })
          }
        }
      }
      
      recommendations.sort((a, b) => b.recommended_discount - a.recommended_discount)
    }

    // 8. Build Response
    return NextResponse.json({
      success: true,
      segments: enrichedSegments,
      summary: summaries,
      recommendations,
      totalCustomers: segments.length,
      filteredCount: enrichedSegments.length,
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[Customer Segments API] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching customer segments.',
      },
      { status: 500 }
    )
  }
}