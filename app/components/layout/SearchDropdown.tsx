// app/components/layout/SearchDropdown.tsx

// An upgraded, premium search dropdown component that replaces 
// the inline dropdown in the Navbar. It features buttery-smooth 
// Framer Motion animations, intelligent text highlighting for 
// matched queries, and a cohesive Bushal brand aesthetic.

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { formatPrice } from '@/app/lib/utils/formatPrice'

// Define the shape of a search result (matches Navbar.tsx SearchResult)
export interface SearchResult {
  id: string
  name: string
  price: number
  image_url: string | null
  images: string[]
  discount_percent: number | null
  in_stock: boolean
  matchType?: 'exact' | 'partial' | 'fuzzy'
}

interface SearchDropdownProps {
  results: SearchResult[]
  query: string
  showResults: boolean
  searching: boolean
  onResultClick: () => void
}

// Helper function to safely highlight matched text
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  
  // Escape special regex characters to prevent errors
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${safeQuery})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark 
        key={i} 
        className="bg-bushal-copper/20 text-bushal-forest rounded px-0.5 font-semibold"
      >
        {part}
      </mark>
    ) : part
  )
}

export default function SearchDropdown({ 
  results, 
  query, 
  showResults, 
  searching, 
  onResultClick 
}: SearchDropdownProps) {
  return (
    <AnimatePresence>
      {showResults && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} // Premium luxury easing
          className="absolute z-50 w-full bg-bushal-surface rounded-2xl border border-bushal-border shadow-2xl shadow-bushal-ink/10 mt-3 overflow-hidden"
        >
          {/* Loading State */}
          {searching && (
            <div className="px-6 py-10 text-center">
              <div className="w-8 h-8 border-2 border-bushal-copper border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-bushal-ink">Searching collection...</p>
            </div>
          )}

          {/* Empty State */}
          {!searching && results.length === 0 && (
            <div className="px-6 py-10 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-bushal-ivoryDeep flex items-center justify-center">
                <svg className="w-6 h-6 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-bushal-ink mb-1">No results for "{query}"</p>
              <p className="text-xs text-bushal-inkSoft">Try different keywords or browse all products</p>
              <Link 
                href="/dashboard" 
                onClick={onResultClick} 
                className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors"
              >
                Browse all →
              </Link>
            </div>
          )}

          {/* Results List */}
          {!searching && results.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-2 border-b border-bushal-border bg-bushal-ivoryDeep/30">
                <p className="text-[11px] text-bushal-inkSoft font-semibold uppercase tracking-wide">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="divide-y divide-bushal-ivory max-h-[420px] overflow-y-auto no-scrollbar">
                {results.map((product) => {
                  const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
                  const dp = product.discount_percent 
                    ? product.price * (1 - product.discount_percent / 100) 
                    : null
                  
                  return (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      onClick={onResultClick}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-bushal-ivoryDeep transition-colors group"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0">
                        {cover ? (
                          <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-bushal-ink group-hover:text-bushal-forest transition-colors line-clamp-1">
                          {highlightMatch(product.name, query)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-bushal-copper">
                            {formatPrice(dp ?? product.price)}
                          </span>
                          {dp && (
                            <span className="text-[11px] text-bushal-inkSoft line-through">
                              {formatPrice(product.price)}
                            </span>
                          )}
                          {!product.in_stock && (
                            <span className="text-[10px] font-bold text-bushal-danger bg-bushal-dangerBg px-1.5 py-0.5 rounded-full">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow Icon */}
                      <svg className="w-4 h-4 text-bushal-borderMid group-hover:text-bushal-copper group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
              
              {/* Footer Link */}
              <Link
                href={`/dashboard?q=${encodeURIComponent(query)}`}
                onClick={onResultClick}
                className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold text-bushal-copper hover:bg-bushal-ivoryDeep transition-colors border-t border-bushal-border bg-bushal-ivoryDeep/20"
              >
                See all results for "{query}" →
              </Link>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
