// components/product/ReviewList.tsx
'use client'

import { cn } from '@/app/lib/utils/cn'

interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          className={cn('w-3.5 h-3.5 fill-current', i < Math.round(rating) ? 'text-bushal-copper' : 'text-bushal-border')}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const initial = review.user_name?.[0]?.toUpperCase() ?? '?'
  const date = new Date(review.created_at).toLocaleDateString('en-BD', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="bg-bushal-surface rounded-xl border border-bushal-border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-bushal-forest/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-bushal-forest">{initial}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-bushal-ink">{review.user_name}</p>
            <StarRow rating={review.rating} />
          </div>
        </div>
        <span className="text-xs text-bushal-inkSoft flex-shrink-0">{date}</span>
      </div>
      {review.comment && (
        <p className="text-sm text-bushal-inkMid leading-relaxed">{review.comment}</p>
      )}
    </div>
  )
}

interface RatingSummaryProps {
  reviews: Review[]
}

function RatingSummary({ reviews }: RatingSummaryProps) {
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
    pct: reviews.length ? (reviews.filter((r) => Math.round(r.rating) === star).length / reviews.length) * 100 : 0,
  }))

  return (
    <div className="flex flex-col sm:flex-row gap-6 bg-bushal-ivory rounded-xl p-5 border border-bushal-border mb-5">
      <div className="flex flex-col items-center justify-center text-center sm:min-w-[100px]">
        <p className="font-heading text-4xl font-bold text-bushal-forest">{avg.toFixed(1)}</p>
        <StarRow rating={avg} />
        <p className="text-xs text-bushal-inkSoft mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {distribution.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-bushal-inkSoft w-4 text-right flex-shrink-0">{star}</span>
            <svg className="w-3 h-3 text-bushal-copper flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div className="flex-1 h-1.5 rounded-full bg-bushal-border overflow-hidden">
              <div
                className="h-full rounded-full bg-bushal-copper transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-bushal-inkSoft w-6 flex-shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 bg-bushal-ivory rounded-xl border border-bushal-border">
        <p className="text-sm font-semibold text-bushal-forest mb-1">No reviews yet</p>
        <p className="text-xs text-bushal-inkSoft">Be the first to review this product.</p>
      </div>
    )
  }

  return (
    <div>
      <RatingSummary reviews={reviews} />
      <div className="space-y-3">
        {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
      </div>
    </div>
  )
}