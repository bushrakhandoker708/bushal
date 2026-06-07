// components/product/ReviewList.tsx
'use client'

import { cn } from '@/app/lib/utils/cn'
import { useState, useMemo } from 'react'

export interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
  admin_reply?: string | null
}

type SortOption = 'recent' | 'highest' | 'lowest'

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={cn('w-4 h-4', filled ? 'text-bushal-copper' : 'text-bushal-border', className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function StarRow({ rating, max = 5, size = 'sm' }: { rating: number; max?: number; size?: 'sm' | 'md' }) {
  const stars = Array.from({ length: max }).map((_, i) => (
    <StarIcon 
      key={i} 
      filled={i < Math.round(rating)} 
      className={size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} 
    />
  ))
  return <div className="flex items-center gap-0.5">{stars}</div>
}

function ReviewCard({ review }: { review: Review }) {
  const initial = review.user_name?.[0]?.toUpperCase() ?? '?'
  const date = new Date(review.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-5 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bushal-forest/10 flex items-center justify-center flex-shrink-0 ring-2 ring-bushal-forest/5">
            <span className="text-sm font-bold text-bushal-forest">{initial}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-bushal-ink">{review.user_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRow rating={review.rating} />
              <span className="text-xs text-bushal-inkSoft">•</span>
              <span className="text-xs text-bushal-inkSoft">{date}</span>
            </div>
          </div>
        </div>
      </div>
      
      {review.comment && (
        <p className="text-sm text-bushal-inkMid leading-relaxed whitespace-pre-wrap">
          {review.comment}
        </p>
      )}

      {review.admin_reply && (
        <div className="mt-3 pl-4 border-l-2 border-bushal-copper bg-bushal-ivory/50 py-3 pr-4 rounded-r-lg">
          <p className="text-xs font-bold text-bushal-copper uppercase tracking-wide mb-1">
            Response from Bushal
          </p>
          <p className="text-sm text-bushal-inkMid leading-relaxed">
            {review.admin_reply}
          </p>
        </div>
      )}
    </div>
  )
}

function RatingSummary({ reviews }: { reviews: Review[] }) {
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
    pct: reviews.length ? (reviews.filter((r) => Math.round(r.rating) === star).length / reviews.length) * 100 : 0,
  }))

  return (
    <div className="flex flex-col sm:flex-row gap-8 bg-gradient-to-br from-bushal-ivory to-white rounded-2xl p-6 border border-bushal-border mb-8 shadow-sm">
      <div className="flex flex-col items-center justify-center text-center sm:min-w-[140px] border-b sm:border-b-0 sm:border-r border-bushal-border pb-6 sm:pb-0 sm:pr-8">
        <p className="font-heading text-5xl font-bold text-bushal-forest leading-none">
          {avg.toFixed(1)}
        </p>
        <div className="my-2">
          <StarRow rating={avg} size="md" />
        </div>
        <p className="text-xs font-medium text-bushal-inkSoft">
          {reviews.length} Review{reviews.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="flex-1 space-y-2.5">
        {distribution.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-3 group">
            <span className="text-xs font-medium text-bushal-inkSoft w-4 text-right flex-shrink-0">
              {star}
            </span>
            <StarIcon filled className="w-3.5 h-3.5 flex-shrink-0" />
            <div className="flex-1 h-2 rounded-full bg-bushal-border/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-bushal-copper transition-all duration-700 ease-out group-hover:bg-bushal-copperLight"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-bushal-inkMid w-8 text-right flex-shrink-0">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReviewList({ reviews }: { reviews: Review[] }) {
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews]
    if (sortBy === 'recent') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'highest') {
      sorted.sort((a, b) => b.rating - a.rating)
    } else {
      sorted.sort((a, b) => a.rating - b.rating)
    }
    return sorted
  }, [reviews, sortBy])

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 bg-bushal-ivory/30 rounded-2xl border border-dashed border-bushal-border">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bushal-forest/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-bushal-forest/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-lg font-heading font-semibold text-bushal-forest mb-1">No reviews yet</p>
        <p className="text-sm text-bushal-inkSoft max-w-xs mx-auto">
          Be the first to share your thoughts and help others make a decision.
        </p>
      </div>
    )
  }

  return (
    <div>
      <RatingSummary reviews={reviews} />
      
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-heading font-semibold text-bushal-ink">
          Reviews ({reviews.length})
        </h3>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-reviews" className="text-xs text-bushal-inkSoft font-medium">Sort by:</label>
          <select
            id="sort-reviews"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs font-semibold text-bushal-ink bg-bushal-surface border border-bushal-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-bushal-forest/20 cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {sortedReviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
    </div>
  )
}