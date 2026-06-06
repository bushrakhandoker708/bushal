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
  const [success, setSuccess] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return

    setLoading(true)

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, body, rating: rating || null }),
    })

    setLoading(false)

    if (res.ok) {
      setBody('')
      setRating(0)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>

      {/* Star rating input */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            onMouseEnter={() => setHoveredRating(i + 1)}
            onMouseLeave={() => setHoveredRating(0)}
          >
            <svg
              className={`w-6 h-6 fill-current ${
                i < (hoveredRating || rating)
                  ? 'text-yellow-400'
                  : 'text-gray-200'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Share your experience with this product..."
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        required
      />

      {success && (
        <p className="mt-2 text-sm text-green-600">
          ✓ Review submitted successfully!
        </p>
      )}

      <Button type="submit" loading={loading} className="mt-3" size="sm">
        Submit Review
      </Button>
    </form>
  )
}