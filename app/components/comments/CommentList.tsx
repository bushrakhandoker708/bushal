// app/components/comments/CommentList.tsx
'use client'

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
  
  // FIX: Initialize with empty string if body is null to satisfy textarea value type requirements
  const [editBody, setEditBody] = useState(comment.body ?? '')
  const [editRating, setEditRating] = useState(comment.rating ?? 0)
  const [editLoading, setEditLoading] = useState(false)
  
  const [editingReply, setEditingReply] = useState(false)
  const [replyBody, setReplyBody] = useState(comment.admin_reply ?? '')
  const [replyLoading, setReplyLoading] = useState(false)
  
  const [deleted, setDeleted] = useState(false)
  const [current, setCurrent] = useState(comment)
  
  // Admin hide state
  const [isHidden, setIsHidden] = useState(comment.is_hidden ?? false)
  const [hiding, setHiding] = useState(false)

  if (deleted) return null
  
  // If hidden and not admin, don't render
  if (isHidden && !isAdmin) return null

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
        // FIX: Send null if the user completely cleared the text body
        body: editBody || null,
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

  const handleToggleHide = async () => {
    setHiding(true)
    const previousState = isHidden
    setIsHidden(!previousState)

    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          comment_id: comment.id,
          type: 'hide',
          is_hidden: !previousState 
        }),
      })

      if (!res.ok) {
        // Revert on failure
        setIsHidden(previousState)
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update visibility')
      }
    } catch (err: any) {
      console.error('Hide toggle failed:', err)
    } finally {
      setHiding(false)
    }
  }

  return (
    <div className={cn(
      "bg-bushal-surface rounded-2xl border p-5 shadow-card transition-all duration-200",
      isHidden 
        ? "border-bushal-border bg-bushal-ivoryDeep/50 opacity-75" 
        : !comment.admin_reply 
          ? "border-amber-200 hover:shadow-cardHover hover:border-bushal-borderMid" 
          : "border-bushal-border hover:shadow-cardHover hover:border-bushal-borderMid"
    )}>
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-bushal-ink text-sm leading-tight truncate">
                {displayName}
              </p>
              
              {/* Hidden Badge */}
              {isHidden && (
                <span className="text-[10px] font-bold text-bushal-danger bg-bushal-dangerBg px-1.5 py-0.5 rounded-full">
                  Hidden
                </span>
              )}
              
              {/* Needs Reply Badge */}
              {!current.admin_reply && !isHidden && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  Needs Reply
                </span>
              )}
            </div>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">
              {formatDate(comment.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {current.rating != null && !editing && (
            <StarDisplay rating={current.rating} />
          )}
          
          {/* Rating Only Indicator */}
          {current.rating != null && !current.body && !editing && (
            <span className="text-xs text-bushal-inkSoft italic ml-2">
              (Rating only)
            </span>
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
            <div className="flex gap-1 ml-1">
              <button
                onClick={handleDelete}
                className="text-[11px] text-bushal-danger font-semibold px-2 py-1 rounded-lg hover:bg-bushal-dangerBg transition-colors"
              >
                Remove
              </button>
              
              {/* Admin Hide Toggle */}
              <button
                onClick={handleToggleHide}
                disabled={hiding}
                className={cn(
                  "text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors",
                  isHidden 
                    ? "text-bushal-success hover:bg-bushal-successBg" 
                    : "text-bushal-warning hover:bg-bushal-warningBg",
                  hiding && "opacity-50 cursor-not-allowed"
                )}
              >
                {isHidden ? 'Unhide' : 'Hide'}
              </button>
            </div>
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
                // FIX: Fallback to empty string when resetting state
                setEditBody(current.body ?? '')
                setEditRating(current.rating ?? 0)
              }}
              className="bg-bushal-ivoryDeep text-bushal-ink text-xs px-4 py-2 rounded-lg hover:bg-bushal-border transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={cn(
          "text-bushal-inkMid text-sm leading-relaxed whitespace-pre-wrap",
          isHidden && "line-through opacity-60"
        )}>
          {current.body || <span className="italic text-bushal-inkSoft">(No written review)</span>}
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