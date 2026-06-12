// app/components/ui/DeleteConfirmationModal.tsx

// Updated the confirmation modal to replace "Keep Reviews & Comments" 
// with "Keep Product Rating" as requested. This allows admins to 
// preserve the average star rating and review count even if the 
// product is deleted, preventing skewed analytics.

'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/app/lib/utils/cn'

// Define the shape of the deletion options (Updated: keepReviews -> keepRating)
export interface DeleteOptions {
  keepSalesData: boolean
  keepAnalytics: boolean
  keepRating: boolean
}

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: DeleteOptions) => void
  productName: string
  loading?: boolean
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  loading = false
}: DeleteConfirmationModalProps) {
  // State to track the admin's choices for data retention
  const [options, setOptions] = useState<DeleteOptions>({
    keepSalesData: true,
    keepAnalytics: true,
    keepRating: true
  })

  // Reset options to default (keep all) every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setOptions({
        keepSalesData: true,
        keepAnalytics: true,
        keepRating: true
      })
    }
  }, [isOpen])

  // Handle Escape key to close the modal and prevent background scrolling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Helper to toggle a specific option
  const toggleOption = (key: keyof DeleteOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'bg-bushal-surface rounded-2xl border border-bushal-border shadow-2xl shadow-bushal-ink/20 w-full max-w-md p-6 transition-all duration-200 pointer-events-auto',
            isOpen ? 'opacity-100 scale-100 animate-scale-in' : 'opacity-0 scale-95'
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          {/* Header with Warning Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-bushal-dangerBg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-bushal-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-lg font-bold text-bushal-forest">Delete Product</h3>
              <p className="text-xs text-bushal-inkSoft">Configure data retention options</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-bushal-ink mb-5 leading-relaxed">
            Are you sure you want to delete <strong className="text-bushal-forest">"{productName}"</strong>? 
            Choose what to do with the related data below.
          </p>

          {/* Data Retention Options */}
          <div className="space-y-3 mb-6">
            <p className="text-xs font-bold text-bushal-inkSoft uppercase tracking-wider mb-2">Related Data Options:</p>
            
            {/* Option 1: Keep Sales Data */}
            <button
              type="button"
              onClick={() => toggleOption('keepSalesData')}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                options.keepSalesData 
                  ? "border-bushal-copper/40 bg-bushal-copper/5" 
                  : "border-bushal-border hover:bg-bushal-ivoryDeep/50"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                options.keepSalesData 
                  ? "bg-bushal-copper border-bushal-copper" 
                  : "border-bushal-borderMid bg-bushal-surface"
              )}>
                {options.keepSalesData && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-bushal-ink block">Keep Sales Data</span>
                <p className="text-xs text-bushal-inkSoft mt-0.5">Preserve order history and revenue records.</p>
              </div>
            </button>

            {/* Option 2: Keep Analytics */}
            <button
              type="button"
              onClick={() => toggleOption('keepAnalytics')}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                options.keepAnalytics 
                  ? "border-bushal-copper/40 bg-bushal-copper/5" 
                  : "border-bushal-border hover:bg-bushal-ivoryDeep/50"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                options.keepAnalytics 
                  ? "bg-bushal-copper border-bushal-copper" 
                  : "border-bushal-borderMid bg-bushal-surface"
              )}>
                {options.keepAnalytics && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-bushal-ink block">Keep Analytics</span>
                <p className="text-xs text-bushal-inkSoft mt-0.5">Retain product performance metrics and forecasts.</p>
              </div>
            </button>

            {/* Option 3: Keep Rating (Updated from Keep Reviews) */}
            <button
              type="button"
              onClick={() => toggleOption('keepRating')}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                options.keepRating 
                  ? "border-bushal-copper/40 bg-bushal-copper/5" 
                  : "border-bushal-border hover:bg-bushal-ivoryDeep/50"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                options.keepRating 
                  ? "bg-bushal-copper border-bushal-copper" 
                  : "border-bushal-borderMid bg-bushal-surface"
              )}>
                {options.keepRating && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-bushal-ink block">Keep Product Rating</span>
                <p className="text-xs text-bushal-inkSoft mt-0.5">Preserve the average star rating and review count.</p>
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-semibold text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivoryDeep rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(options)}
              disabled={loading}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2",
                "bg-bushal-danger text-white hover:bg-bushal-danger/90 shadow-lg shadow-bushal-danger/20"
              )}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Product
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
