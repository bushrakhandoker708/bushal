'use client'

// components/product/CategoryFilter.tsx
import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Product } from '@/app/types/product'
import ProductCard from '@/app/components/dashboard/ProductCard'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  products: Product[]
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'discount'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  price_asc: 'Price: Low → High',
  price_desc: 'Price: High → Low',
  discount: 'Biggest Discount',
}

export default function CategoryFilter({ products }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [hideOutOfStock, setHideOutOfStock] = useState(false)
  const [hoveredSort, setHoveredSort] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const controlsInView = useInView(controlsRef, { once: true, margin: '-60px' })

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category || 'General'))
    return ['All', ...Array.from(cats).sort()]
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = [...products]
    if (selectedCategory !== 'All') {
      result = result.filter((p) => (p.category || 'General') === selectedCategory)
    }
    if (hideOutOfStock) {
      result = result.filter((p) => p.in_stock)
    }
    result.sort((a, b) => {
      const aPrice = a.discount_percent ? a.price * (1 - a.discount_percent / 100) : a.price
      const bPrice = b.discount_percent ? b.price * (1 - b.discount_percent / 100) : b.price
      switch (sortBy) {
        case 'price_asc': return aPrice - bPrice
        case 'price_desc': return bPrice - aPrice
        case 'discount': return (b.discount_percent || 0) - (a.discount_percent || 0)
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    return result
  }, [products, selectedCategory, sortBy, hideOutOfStock])

  return (
    <div className="space-y-6">

      {/* ── Controls Bar ── */}
      <motion.div
        ref={controlsRef}
        initial={{ opacity: 0, y: 24 }}
        animate={controlsInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-bushal-surface rounded-2xl border border-bushal-border shadow-card overflow-hidden"
      >
        {/* Subtle copper shimmer line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bushal-copper/40 to-transparent" />

        <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            {categories.map((cat, i) => (
              <motion.button
                key={cat}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={controlsInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.04 + 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'relative flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border select-none-touch',
                  selectedCategory === cat
                    ? 'bg-bushal-forest text-white border-bushal-forest shadow-md shadow-bushal-forest/20'
                    : 'bg-bushal-ivoryDeep text-bushal-inkSoft border-bushal-border hover:border-bushal-borderMid hover:text-bushal-ink'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {selectedCategory === cat && (
                  <motion.span
                    layoutId="category-pill"
                    className="absolute inset-0 bg-bushal-forest rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </motion.button>
            ))}
          </div>

          {/* Sort & Filters */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* In Stock Toggle */}
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={hideOutOfStock}
                  onChange={(e) => setHideOutOfStock(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-[22px] bg-bushal-ivoryDeep rounded-full peer-checked:bg-bushal-forest transition-colors duration-300 border border-bushal-border peer-checked:border-bushal-forest shadow-inset" />
                <motion.div
                  animate={{ x: hideOutOfStock ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </div>
              <span className="text-xs font-medium text-bushal-inkSoft group-hover:text-bushal-ink transition-colors whitespace-nowrap">
                In Stock Only
              </span>
            </label>

            {/* Sort Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredSort(true)}
              onMouseLeave={() => setHoveredSort(false)}
            >
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-bushal-ivoryDeep border border-bushal-border text-bushal-ink text-sm font-medium rounded-xl px-4 py-2 pr-9 focus:outline-none focus:border-bushal-forest focus:ring-2 focus:ring-bushal-forest/15 transition-all cursor-pointer hover:border-bushal-borderMid"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                  <option key={opt} value={opt}>{SORT_LABELS[opt]}</option>
                ))}
              </select>
              <motion.svg
                animate={{ rotate: hoveredSort ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bushal-inkSoft pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Results Count */}
      <motion.div
        key={`${selectedCategory}-${filteredProducts.length}`}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <p className="text-sm text-bushal-inkSoft">
          Showing{' '}
          <span className="font-semibold text-bushal-forest">{filteredProducts.length}</span>{' '}
          products
          {selectedCategory !== 'All' && (
            <>
              {' '}in{' '}
              <span className="font-semibold text-bushal-forest">{selectedCategory}</span>
            </>
          )}
        </p>

        {(selectedCategory !== 'All' || hideOutOfStock || sortBy !== 'newest') && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              setSelectedCategory('All')
              setHideOutOfStock(false)
              setSortBy('newest')
            }}
            className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors underline underline-offset-4 flex items-center gap-1"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </motion.button>
        )}
      </motion.div>

      {/* Product Grid */}
      <div ref={gridRef}>
        <AnimatePresence mode="popLayout">
          {filteredProducts.length > 0 ? (
            <motion.div
              key="grid"
              layout
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 32, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  transition={{
                    delay: (index % 12) * 0.04,
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <ProductCard product={product} index={index} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center py-24 text-center bg-bushal-surface rounded-3xl border border-dashed border-bushal-border"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-2xl bg-bushal-ivoryDeep flex items-center justify-center mb-4"
              >
                <svg className="w-8 h-8 text-bushal-borderMid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </motion.div>
              <h3 className="text-lg font-semibold text-bushal-forest mb-1">No products found</h3>
              <p className="text-sm text-bushal-inkSoft max-w-sm">
                Try adjusting your category or sort options.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedCategory('All')
                  setHideOutOfStock(false)
                  setSortBy('newest')
                }}
                className="mt-6 text-sm font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors underline underline-offset-4"
              >
                Clear all filters
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}