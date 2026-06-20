// app/components/comments/AdminReplyForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../ui/Button'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  commentId: string
  initialIsHidden?: boolean
}

export default function AdminReplyForm({ commentId, initialIsHidden = false }: Props) {
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  // Local state for hide/unhide with optimistic updates
  const [isHidden, setIsHidden] = useState(initialIsHidden)
  const [hiding, setHiding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          comment_id: commentId,
          type: 'reply', 
          reply 
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to submit reply')
      }

      setSuccess(true)
      setReply('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleHide = async () => {
    setHiding(true)
    
    // Optimistic update
    const previousState = isHidden
    setIsHidden(!previousState)

    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          comment_id: commentId,
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
      
      router.refresh()
    } catch (err: any) {
      console.error('Hide toggle failed:', err)
      // Note: We keep the optimistic state visually but could show a toast here
    } finally {
      setHiding(false)
    }
  }

  if (success) {
    return (
      <p className="text-sm text-green-600 font-medium animate-fade-in">
        ✓ Reply posted successfully.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Hide/Show Toggle */}
      <div className="flex items-center justify-between bg-bushal-ivoryDeep p-2 rounded-lg border border-bushal-border">
        <span className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide">
          Visibility
        </span>
        <button
          onClick={handleToggleHide}
          disabled={hiding}
          className={cn(
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-bushal-copper focus:ring-offset-2",
            isHidden ? "bg-bushal-danger" : "bg-bushal-success",
            hiding && "opacity-50 cursor-not-allowed"
          )}
          aria-label={isHidden ? "Unhide comment" : "Hide comment"}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              isHidden ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* Reply Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder="Write your reply as Bushal Team..."
          className={cn(
            "w-full rounded-lg border px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none resize-none text-sm transition-all",
            error 
              ? "border-red-300 focus:ring-2 focus:ring-red-200" 
              : "border-gray-300 focus:ring-2 focus:ring-orange-400"
          )}
          required
        />
        
        {error && (
          <p className="text-sm text-red-500 animate-shake">{error}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={loading} size="sm">
            Post Reply
          </Button>
        </div>
      </form>
    </div>
  )
}