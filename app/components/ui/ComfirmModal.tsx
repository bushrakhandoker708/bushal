// components/ui/ConfirmModal.tsx
'use client'

import { useEffect } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: Props) {
  // Handle Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const confirmStyles = {
    danger: 'bg-bushal-danger text-white hover:bg-bushal-danger/90 shadow-lg shadow-bushal-danger/20',
    warning: 'bg-bushal-warning text-white hover:bg-bushal-warning/90 shadow-lg shadow-bushal-warning/20',
    info: 'btn-forest text-white', // Uses your existing forest button class
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-bushal-ink/40 backdrop-blur-sm transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none',
          isOpen ? 'pointer-events-auto' : ''
        )}
      >
        <div
          className={cn(
            'bg-bushal-surface rounded-2xl border border-bushal-border shadow-2xl shadow-bushal-ink/20 w-full max-w-sm p-6 transition-all duration-200',
            isOpen ? 'opacity-100 scale-100 animate-scale-in' : 'opacity-0 scale-95'
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <h3 id="modal-title" className="font-heading text-xl font-semibold text-bushal-forest mb-2">
            {title}
          </h3>
          
          {description && (
            <p className="text-sm text-bushal-inkSoft leading-relaxed mb-6">
              {description}
            </p>
          )}
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-semibold text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivoryDeep rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'px-5 py-2.5 text-sm font-semibold rounded-lg transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2',
                confirmStyles[variant]
              )}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Processing…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}