'use client'

// app/components/comments/CommentList.tsx

import { useState } from 'react'
import { formatDate } from '@/app/lib/utils/formatDate'
import { Comment } from '@/app/types/comment'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  comments: Comment[]
  currentUserId?: string
  isAdmin?: boolean
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const px = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={cn(
            px,
            'fill-current',
            i < rating ? 'text-bushal-copper' : 'text-bushal-border'
          )}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// Deterministic avatar color from name
function avatarColor(name: string) {
  const palette = [
    'bg-bushal-copper/15 text-bushal-copper',
    'bg-bushal-forest/10 text-bushal-forest',
    'bg-bushal-success/10 text-bushal-success',
    'bg-bushal-warning/10 text-bushal-warning',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return palette[hash % palette.length]
}

interface CardProps {
  comment: Comment
  currentUserId?: string
  isAdmin?: boolean
}

function CommentCard({ comment, currentUserId, isAdmin }: CardProps) {
  const isOwner = comment.user_id === currentUserId

  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [editRating, setEditRating] = useState(comment.rating ?? 0)
  const [editLoading, setEditLoading] = useState(false)

  const [editingReply, setEditingReply] = useState(false)
  const [replyBody, setReplyBody] = useState(comment.admin_reply ?? '')
  const [replyLoading, setReplyLoading] = useState(false)

  const [deleted, setDeleted] = useState(false)
  const [current, setCurrent] = useState(comment)

  if (deleted) return null

  const displayName = comment.profiles?.full_name ?? 'Anonymous'
  const initial = displayName.charAt(0).toUpperCase()
  const colorClass = avatarColor(displayName)

  const handleEditComment = async () => {
    setEditLoading(true)
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_id: comment.id,
        type: 'comment',
        body: editBody,
        rating: editRating || null,
      }),
    })
    setEditLoading(false)
    if (res.ok) {
      const data = await res.json()
      setCurrent({ ...current, body: data.body, rating: data.rating })
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this review?')) return
    const res = await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: comment.id, type: 'comment' }),
    })
    if (res.ok) setDeleted(true)
  }

  const handleEditReply = async () => {
    setReplyLoading(true)
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_id: comment.id,
        type: 'reply',
        reply: replyBody,
      }),
    })
    setReplyLoading(false)
    if (res.ok) {
      const data = await res.json()
      setCurrent({ ...current, admin_reply: data.admin_reply })
      setEditingReply(false)
    }
  }

  const handleDeleteReply = async () => {
    if (!confirm('Delete this reply?')) return
    const res = await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: comment.id, type: 'reply' }),
    })
    if (res.ok) {
      setCurrent({ ...current, admin_reply: null })
      setReplyBody('')
    }
  }

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-5 shadow-card hover:shadow-cardHover hover:border-bushal-borderMid transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
              colorClass
            )}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-bushal-ink text-sm leading-tight truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">
              {formatDate(comment.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {current.rating != null && !editing && (
            <StarDisplay rating={current.rating} />
          )}

          {isOwner && !editing && (
            <div className="flex gap-0.5 ml-1">
              <button
                onClick={() => setEditing(true)}
                className="text-[11px] text-bushal-copper font-semibold px-2 py-1 rounded-lg hover:bg-bushal-copper/8 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-[11px] text-bushal-danger font-semibold px-2 py-1 rounded-lg hover:bg-bushal-dangerBg transition-colors"
              >
                Delete
              </button>
            </div>
          )}

          {isAdmin && !isOwner && (
            <button
              onClick={handleDelete}
              className="text-[11px] text-bushal-danger font-semibold px-2 py-1 rounded-lg hover:bg-bushal-dangerBg transition-colors ml-1"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Body — edit or display */}
      {editing ? (
        <div className="space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setEditRating(val)}
                className="hover:scale-110 transition-transform"
              >
                <svg
                  className={cn(
                    'w-6 h-6 fill-current transition-colors',
                    val <= editRating ? 'text-bushal-copper' : 'text-bushal-border'
                  )}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-bushal-border bg-bushal-ivory px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/50 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/15 resize-none transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={handleEditComment}
              disabled={editLoading}
              className="btn-copper text-xs px-4 py-2 rounded-lg disabled:opacity-50 transition-all font-semibold"
            >
              {editLoading ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setEditBody(current.body)
                setEditRating(current.rating ?? 0)
              }}
              className="bg-bushal-ivoryDeep text-bushal-ink text-xs px-4 py-2 rounded-lg hover:bg-bushal-border transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-bushal-inkMid text-sm leading-relaxed whitespace-pre-wrap">
          {current.body}
        </p>
      )}

      {/* Admin reply — display */}
      {current.admin_reply && !editingReply && (
        <div className="mt-4 bg-bushal-copper/5 border border-bushal-copper/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-bushal-copper flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-[11px] font-bold text-bushal-copper uppercase tracking-wider">
                Response from Bushal
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-0.5">
                <button
                  onClick={() => {
                    setEditingReply(true)
                    setReplyBody(current.admin_reply ?? '')
                  }}
                  className="text-[11px] text-bushal-copper font-semibold px-2 py-0.5 rounded hover:bg-bushal-copper/10 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteReply}
                  className="text-[11px] text-bushal-danger font-semibold px-2 py-0.5 rounded hover:bg-bushal-dangerBg transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-bushal-inkMid leading-relaxed">
            {current.admin_reply}
          </p>
        </div>
      )}

      {/* Admin reply — edit form */}
      {editingReply && isAdmin && (
        <div className="mt-4 space-y-3">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Write your reply as Bushal…"
            className="w-full rounded-xl border border-bushal-copper/30 bg-bushal-copper/5 px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/50 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/15 resize-none transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={handleEditReply}
              disabled={replyLoading}
              className="btn-copper text-xs px-4 py-2 rounded-lg disabled:opacity-50 font-semibold"
            >
              {replyLoading ? 'Saving…' : 'Save reply'}
            </button>
            <button
              onClick={() => setEditingReply(false)}
              className="bg-bushal-ivoryDeep text-bushal-ink text-xs px-4 py-2 rounded-lg hover:bg-bushal-border transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admin reply input (no existing reply) */}
      {isAdmin && !current.admin_reply && !editingReply && (
        <button
          onClick={() => setEditingReply(true)}
          className="mt-4 flex items-center gap-1.5 text-xs text-bushal-copper font-semibold hover:text-bushal-copperLight transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Reply as Bushal
        </button>
      )}
    </div>
  )
}

// ─── Rating distribution bar ──────────────────────────────────────────────────

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span className="text-bushal-inkSoft w-3 text-right">{star}</span>
      <svg className="w-3.5 h-3.5 text-bushal-copper fill-current flex-shrink-0" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <div className="flex-1 h-1.5 bg-bushal-ivoryDeep rounded-full overflow-hidden">
        <div
          className="h-full bg-bushal-copper rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-bushal-inkSoft w-6 text-right">{count}</span>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CommentList({ comments, currentUserId, isAdmin }: Props) {
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-14 bg-bushal-ivoryDeep/60 rounded-2xl border border-dashed border-bushal-border">
        <svg
          className="w-10 h-10 mx-auto mb-3 text-bushal-border"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-sm font-semibold text-bushal-ink">No reviews yet.</p>
        <p className="text-xs text-bushal-inkSoft mt-1">Be the first to share your experience.</p>
      </div>
    )
  }

  const ratingsOnly = comments.filter((c) => c.rating != null)
  const avgRating =
    ratingsOnly.length > 0
      ? ratingsOnly.reduce((s, c) => s + (c.rating ?? 0), 0) / ratingsOnly.length
      : null

  // Count per star
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingsOnly.filter((c) => c.rating === star).length,
  }))

  return (
    <div>
      {/* Rating summary */}
      {avgRating !== null && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 p-5 bg-bushal-surface rounded-2xl border border-bushal-border shadow-card">
          {/* Big number */}
          <div className="text-center flex-shrink-0 sm:pr-6 sm:border-r sm:border-bushal-border">
            <p className="font-heading text-5xl text-bushal-forest font-semibold leading-none mb-1">
              {avgRating.toFixed(1)}
            </p>
            <div className="flex justify-center mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg
                  key={i}
                  className={cn(
                    'w-4 h-4 fill-current',
                    i <= Math.round(avgRating) ? 'text-bushal-copper' : 'text-bushal-border'
                  )}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-xs text-bushal-inkSoft">
              {ratingsOnly.length} {ratingsOnly.length === 1 ? 'rating' : 'ratings'}
            </p>
          </div>

          {/* Breakdown bars */}
          <div className="flex-1 w-full space-y-2">
            {starCounts.map(({ star, count }) => (
              <RatingBar
                key={star}
                star={star}
                count={count}
                total={ratingsOnly.length}
              />
            ))}
          </div>
        </div>
      )}

      {/* Comment cards */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  )
}