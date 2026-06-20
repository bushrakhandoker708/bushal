// app/components/comments/CommentForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  productId: string
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
}

export default function CommentForm({ productId }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  
  // Separate state for rating and body to support independent submission
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) {
    return (
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-bushal-copper/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-bushal-forest">Sign in to leave feedback</p>
            <p className="text-xs text-bushal-inkSoft">Share your experience with ratings or written reviews.</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <a
            href={`/login?redirect=/product/${productId}`}
            className="flex-1 text-center btn-copper inline-flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            Sign in
          </a>
          <a
            href={`/register?redirect=/product/${productId}`}
            className="flex-1 text-center inline-flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold text-bushal-forest border border-bushal-border hover:bg-bushal-ivoryDeep transition-all"
          >
            Create account
          </a>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: At least one of rating or body must be provided
    if (rating === 0 && !body.trim()) {
      setError('Please provide a star rating or write a comment.')
      return
    }
    
    // If there is text, enforce minimum length
    if (body.trim().length > 0 && body.trim().length < 5) {
      setError('Comments must be at least 5 characters long.')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_id: productId, 
          rating: rating || null, // Send null if no rating selected
          body: body.trim() || null // Send null if no text provided
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit feedback.')
        return
      }
      
      setSuccess(true)
      setRating(0)
      setBody('')
      router.refresh()
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const activeRating = hoverRating || rating

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 shadow-card"
    >
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-4 h-4 text-bushal-copper flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <h3 className="font-heading text-xl font-semibold text-bushal-forest">Leave Feedback</h3>
      </div>

      {/* Feedback banners */}
      {success && (
        <div className="mb-5 flex items-center gap-2.5 bg-bushal-successBg border border-bushal-success/25 text-bushal-success px-4 py-3 rounded-xl text-sm animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Feedback submitted successfully!
        </div>
      )}
      
      {error && (
        <div className="mb-5 flex items-start gap-2.5 bg-bushal-dangerBg border border-bushal-danger/20 text-bushal-danger px-4 py-3 rounded-xl text-sm animate-fade-in animate-shake">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Star rating section */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-bushal-inkMid uppercase tracking-wider mb-3">
          Rating <span className="text-bushal-inkSoft">(Optional)</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setRating(val)}
              onMouseEnter={() => setHoverRating(val)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-bushal-copper rounded"
              aria-label={`Rate ${val} of 5`}
            >
              <svg
                className={cn(
                  'w-8 h-8 fill-current transition-colors duration-150',
                  val <= activeRating ? 'text-bushal-copper' : 'text-bushal-border'
                )}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          {activeRating > 0 && (
            <span className="ml-2 text-sm font-semibold text-bushal-copper animate-fade-in">
              {RATING_LABELS[activeRating]}
            </span>
          )}
        </div>
      </div>

      {/* Review body section */}
      <div className="mb-6">
        <label
          htmlFor="review-body"
          className="block text-xs font-semibold text-bushal-inkMid uppercase tracking-wider mb-2"
        >
          Written Review <span className="text-bushal-inkSoft">(Optional)</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What did you like or dislike? How was the quality?"
          className={cn(
            'w-full rounded-xl border bg-bushal-ivory px-4 py-3 text-sm text-bushal-ink placeholder-bushal-inkSoft/50',
            'transition-all duration-200 resize-none',
            'focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/15 focus:bg-bushal-surface',
            error && body.trim().length > 0 && body.trim().length < 5
              ? 'border-bushal-danger'
              : 'border-bushal-border hover:border-bushal-borderMid'
          )}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-bushal-inkSoft">{body.length}/2000</span>
          {body.length > 0 && body.length < 5 && (
            <span className="text-[11px] text-bushal-danger">Minimum 5 characters</span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || (rating === 0 && !body.trim())}
        className={cn(
          'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0',
          loading
            ? 'bg-bushal-inkSoft text-white cursor-wait'
            : 'btn-copper hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]'
        )}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Submitting…
          </>
        ) : (
          'Submit feedback'
        )}
      </button>
    </form>
  )
}