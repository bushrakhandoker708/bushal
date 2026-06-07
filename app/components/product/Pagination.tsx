// components/ui/Pagination.tsx
'use client'

import { cn } from '@/app/lib/utils/cn'

interface Props {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const btnBase = 'min-w-[36px] h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.94]'

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(btnBase, 'px-3 text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivory border border-bushal-border disabled:opacity-40 disabled:cursor-not-allowed')}
        aria-label="Previous"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="min-w-[36px] h-9 flex items-center justify-center text-bushal-inkSoft text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={cn(
              btnBase,
              p === currentPage
                ? 'bg-bushal-forest text-white shadow-md shadow-bushal-forest/20'
                : 'text-bushal-inkMid hover:bg-bushal-ivory border border-bushal-border'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(btnBase, 'px-3 text-bushal-inkSoft hover:text-bushal-ink hover:bg-bushal-ivory border border-bushal-border disabled:opacity-40 disabled:cursor-not-allowed')}
        aria-label="Next"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}