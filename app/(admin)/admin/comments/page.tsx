// app/(admin)/admin/comments/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/app/lib/utils/formatDate'
import AdminReplyForm from '@/app/components/comments/AdminReplyForm'
import { cn } from '@/app/lib/utils/cn'

export default async function AdminCommentsPage() {
  const supabase = await createServerClient()

  // Fetch ALL comments including hidden ones, ordered by newest first
  const { data: allComments } = await supabase
    .from('comments')
    .select(`
      id,
      body,
      rating,
      admin_reply,
      created_at,
      user_id,
      product_id,
      is_hidden,
      products ( name )
    `)
    .order('created_at', { ascending: false })

  // Fetch customer profiles for display names
  const commentUserIds = Array.from(new Set((allComments ?? []).map((c) => c.user_id)))
  let commentProfilesMap: Record<string, string> = {}

  if (commentUserIds.length > 0) {
    const { data: commentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', commentUserIds)

    commentProfiles?.forEach((p) => {
      commentProfilesMap[p.id] = p.full_name ?? 'Anonymous'
    })
  }

  // Calculate statistics for separate ratings vs comments
  const totalComments = allComments?.length ?? 0
  const hiddenComments = allComments?.filter((c) => c.is_hidden).length ?? 0
  const visibleComments = totalComments - hiddenComments
  
  // Separate ratings (no body) from reviews (has body)
  const ratingsOnly = allComments?.filter((c) => c.rating && !c.body) ?? []
  const textReviews = allComments?.filter((c) => c.body) ?? []
  
  // Calculate average rating across ALL visible comments that have ratings
  const ratedVisibleComments = allComments?.filter((c) => c.rating && !c.is_hidden) ?? []
  const avgRating = ratedVisibleComments.length > 0
    ? ratedVisibleComments.reduce((sum, c) => sum + (c.rating ?? 0), 0) / ratedVisibleComments.length
    : 0

  const unreplied = (allComments ?? []).filter((c) => !c.admin_reply && !c.is_hidden).length

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bushal-forest">Customer Feedback</h1>
          <p className="text-sm text-bushal-inkSoft mt-0.5">
            {visibleComments} visible · {hiddenComments} hidden · {totalComments} total
          </p>
        </div>
        
        {/* Quick Stats Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-bushal-surface rounded-xl border border-bushal-border px-4 py-2">
            <p className="text-xs text-bushal-inkSoft">Avg Rating</p>
            <p className="text-lg font-bold text-bushal-copper">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </p>
          </div>
          <div className={cn(
            "rounded-xl border px-4 py-2",
            unreplied > 0 
              ? "bg-bushal-warningBg border-bushal-warning/20" 
              : "bg-bushal-successBg border-bushal-success/20"
          )}>
            <p className="text-xs text-bushal-inkSoft">Awaiting Reply</p>
            <p className={cn(
              "text-lg font-bold",
              unreplied > 0 ? "text-bushal-warning" : "text-bushal-success"
            )}>
              {unreplied}
            </p>
          </div>
        </div>
      </div>

      {/* Content Type Tabs (Optional visual separator) */}
      <div className="flex gap-4 text-sm border-b border-bushal-border pb-2">
        <span className="font-semibold text-bushal-forest">
          All ({totalComments})
        </span>
        <span className="text-bushal-inkSoft">
          Reviews ({textReviews.length})
        </span>
        <span className="text-bushal-inkSoft">
          Ratings Only ({ratingsOnly.length})
        </span>
      </div>

      {!allComments || allComments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <p className="text-bushal-inkSoft text-sm">No feedback yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(allComments ?? []).map((comment) => {
            const hasBody = !!comment.body
            const hasRating = !!comment.rating
            
            return (
              <div
                key={comment.id}
                className={cn(
                  "bg-white rounded-2xl border p-5 transition-all",
                  comment.is_hidden 
                    ? "border-bushal-border bg-bushal-ivoryDeep/50 opacity-75" 
                    : !comment.admin_reply 
                      ? "border-amber-200 shadow-sm shadow-amber-100" 
                      : "border-slate-200"
                )}
              >
                {/* Comment Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-bushal-forest text-sm">
                        {commentProfilesMap[comment.user_id] ?? 'Anonymous'}
                      </p>
                      
                      {/* Hidden Badge */}
                      {comment.is_hidden && (
                        <span className="text-[10px] font-bold text-bushal-danger bg-bushal-dangerBg px-1.5 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                      
                      {/* Needs Reply Badge */}
                      {!comment.admin_reply && !comment.is_hidden && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          Needs Reply
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-bushal-inkSoft mt-0.5">
                      on{' '}
                      <span className="font-medium text-slate-600">
                        {(comment.products as any)?.name ?? 'Unknown product'}
                      </span>
                      {' · '}
                      {formatDate(comment.created_at)}
                    </p>
                  </div>

                  {/* Rating Display */}
                  {hasRating && (
                    <div className="flex gap-0.5 flex-shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg 
                          key={i} 
                          className={cn(
                            "w-4 h-4 fill-current",
                            i < comment.rating! ? "text-yellow-400" : "text-slate-200"
                          )} 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comment Body (if exists) */}
                {hasBody && (
                  <p className="text-slate-700 text-sm mb-4 leading-relaxed">
                    {comment.body}
                  </p>
                )}

                {/* Rating Only Indicator (if no body) */}
                {hasRating && !hasBody && (
                  <p className="text-xs text-bushal-inkSoft italic mb-4">
                    Customer left a rating without a written review.
                  </p>
                )}

                {/* Admin Reply Section */}
                {comment.admin_reply ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-orange-600 mb-1">Your reply:</p>
                    <p className="text-sm text-slate-700">{comment.admin_reply}</p>
                  </div>
                ) : (
                  <AdminReplyForm commentId={comment.id} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}