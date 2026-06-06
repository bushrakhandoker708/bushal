// components/comments/CommentForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import Button from '../ui/Button'


interface Props {
  productId: string
}

export default function CommentForm({ productId }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!user) {
    return (
      <p className="text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-lg">
        <a href="/login" className="text-orange-500 font-medium hover:underline">
          Sign in
        </a>{' '}
        to leave a review.
      </p>
    )
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 text-center">
        <p className="text-green-700 font-semibold text-lg">✓ Review submitted!</p>
        <p className="text-green-600 text-sm mt-1">Refreshing page to show your review...</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return

    setLoading(true)
    setError('')

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        body,
        rating: rating || null,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setSubmitted(true)
      setTimeout(() => window.location.reload(), 800)
    } else {
      if (
        data.error?.includes('duplicate') ||
        data.error?.includes('unique') ||
        data.error?.includes('comments_user_product_unique')
      ) {
        setError('You have already reviewed this product. Only one review per product is allowed.')
      } else {
        setError(data.error ?? 'Failed to submit review. Please try again.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>

      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            onMouseEnter={() => setHoveredRating(i + 1)}
            onMouseLeave={() => setHoveredRating(0)}
          >
            <svg
              className={`w-7 h-7 fill-current transition-colors ${
                i < (hoveredRating || rating) ? 'text-yellow-400' : 'text-gray-200'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {rating > 0 && (
          <span className="text-sm text-gray-500 ml-2">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </span>
        )}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Share your experience with this product..."
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        required
      />

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" loading={loading} className="mt-3" size="sm">
        Submit Review
      </Button>
    </form>
  )
}