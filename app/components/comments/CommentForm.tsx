// components/comments/CommentForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  productId: string
}

export default function CommentForm({ productId }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) {
    return (
      <div className="bg-bushal-ivoryDeep rounded-2xl border border-bushal-border p-6 text-center">
        <p className="text-sm text-bushal-inkSoft mb-3">
          You must be logged in to leave a review.
        </p>
        <a 
          href={`/login?redirect=/product/${productId}`} 
          className="inline-flex items-center gap-2 bg-bushal-copper text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-bushal-copperLight transition-all shadow-md shadow-bushal-copper/20 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Sign in to Review
        </a>
        <a 
          href={`/register?redirect=/product/${productId}`} 
          className="inline-flex items-center gap-2 ml-3 text-sm font-semibold text-bushal-forest px-5 py-2.5 rounded-xl border border-bushal-border hover:bg-bushal-surface transition-all"
        >
          Create Account
        </a>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating')
      return
    }
    if (body.trim().length < 5) {
      setError('Please write a slightly longer review (at least 5 characters)')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, rating, body: body.trim() }),
      })
      
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit review')
        return
      }
      
      setSuccess(true)
      setRating(0)
      setBody('')
      router.refresh()
      
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 shadow-sm">
      <h3 className="font-heading text-lg font-semibold text-bushal-forest mb-4">
        Write a Review
      </h3>

      {success && (
        <div className="mb-4 flex items-center gap-2 bg-bushal-successBg border border-bushal-success/20 text-bushal-success px-4 py-3 rounded-xl text-sm animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Review submitted successfully! Thank you for your feedback.
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-bushal-dangerBg border border-bushal-danger/20 text-bushal-danger px-4 py-3 rounded-xl text-sm animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Star Rating */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-bushal-inkMid mb-2">
          Your Rating <span className="text-bushal-danger">*</span>
        </label>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1
            const isFilled = (hoverRating || rating) >= starValue
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                aria-label={`Rate ${starValue} out of 5 stars`}
              >
                <svg
                  className={cn(
                    'w-8 h-8 fill-current transition-colors duration-200',
                    isFilled ? 'text-bushal-copper' : 'text-bushal-border'
                  )}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            )
          })}
        </div>
        {rating > 0 && (
          <p className="text-xs text-bushal-copper font-medium mt-1.5 animate-fade-in">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        )}
      </div>

      {/* Review Body */}
      <div className="mb-6">
        <label htmlFor="review-body" className="block text-sm font-semibold text-bushal-inkMid mb-2">
          Your Review <span className="text-bushal-danger">*</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Share your experience with this product. What did you like or dislike?"
          className={cn(
            'w-full rounded-xl border bg-bushal-surface px-4 py-3 text-sm text-bushal-ink placeholder-bushal-inkSoft/60 transition-all duration-200 resize-none',
            'focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20',
            error ? 'border-bushal-danger' : 'border-bushal-border hover:border-bushal-borderMid'
          )}
        />
        <div className="flex justify-between mt-1.5">
          <p className="text-xs text-bushal-inkSoft">
            {body.length}/2000 characters
          </p>
          {body.length > 0 && body.length < 5 && (
            <p className="text-xs text-bushal-danger">Minimum 5 characters required</p>
          )}
        </div>
        <p className="text-xs text-bushal-inkSoft mt-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Your review will be published immediately.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || body.trim().length < 5 || rating === 0}
        className={cn(
          'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0',
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
            Submitting...
          </>
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  )
}