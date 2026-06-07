// components/ui/BottomSheet.tsx
'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  height?: 'auto' | 'half' | 'full'
}

export default function BottomSheet({ isOpen, onClose, title, children, height = 'auto' }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const heightClass = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]',
  }[height]

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-bushal-ink/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 inset-x-0 z-50 bg-bushal-surface rounded-t-2xl flex flex-col',
          'shadow-2xl shadow-bushal-ink/30 transition-transform duration-300 ease-out',
          heightClass,
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-bushal-border" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-bushal-border">
            <h3 className="font-heading text-lg font-semibold text-bushal-forest">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivory transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto safe-bottom">{children}</div>
      </div>
    </>
  )
}