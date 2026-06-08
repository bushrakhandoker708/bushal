// components/product/CategoryFilter.tsx
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/app/types/product'
import ProductCard from '@/app/components/product/ProductCard'
import { cn } from '@/app/lib/utils/cn'

interface Props {
  products: Product[]
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'discount'

export default function CategoryFilter({ products }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [hideOutOfStock, setHideOutOfStock] = useState(false)

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category || 'General'))
    return ['All', ...Array.from(cats).sort()]
  }, [products])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products]

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((p) => (p.category || 'General') === selectedCategory)
    }

    // Stock filter
    if (hideOutOfStock) {
      result = result.filter((p) => p.in_stock)
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.discount_percent ? a.price * (1 - a.discount_percent / 100) : a.price) - 
                 (b.discount_percent ? b.price * (1 - b.discount_percent / 100) : b.price)
        case 'price_desc':
          return (b.discount_percent ? b.price * (1 - b.discount_percent / 100) : b.price) - 
                 (a.discount_percent ? a.price * (1 - a.discount_percent / 100) : a.price)
        case 'discount':
          return (b.discount_percent || 0) - (a.discount_percent || 0)
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return result
  }, [products, selectedCategory, sortBy, hideOutOfStock])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bushal-surface p-4 rounded-2xl border border-bushal-border shadow-sm">
        
        {/* Category Pills (Horizontal Scroll on Mobile) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border',
                selectedCategory === cat
                  ? 'bg-bushal-forest text-white border-bushal-forest shadow-md shadow-bushal-forest/20'
                  : 'bg-bushal-ivoryDeep text-bushal-inkSoft border-bushal-border hover:border-bushal-borderMid hover:text-bushal-ink'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort & Filters */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Hide Out of Stock Toggle */}
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={hideOutOfStock}
                onChange={(e) => setHideOutOfStock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-bushal-ivoryDeep rounded-full peer-checked:bg-bushal-forest transition-colors duration-200 border border-bushal-border peer-checked:border-bushal-forest" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-4" />
            </div>
            <span className="text-xs font-medium text-bushal-inkSoft group-hover:text-bushal-ink transition-colors">
              In Stock Only
            </span>
          </label>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-bushal-ivoryDeep border border-bushal-border text-bushal-ink text-sm font-medium rounded-xl px-4 py-2 pr-9 focus:outline-none focus:border-bushal-forest focus:ring-1 focus:ring-bushal-forest/20 transition-all cursor-pointer hover:border-bushal-borderMid"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount">Biggest Discount</option>
            </select>
            <svg 
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bushal-inkSoft pointer-events-none" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-bushal-inkSoft">
          Showing <span className="font-semibold text-bushal-forest">{filteredProducts.length}</span> products
          {selectedCategory !== 'All' && <span> in <span className="font-semibold text-bushal-forest">{selectedCategory}</span></span>}
        </p>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-bushal-surface rounded-3xl border border-dashed border-bushal-border">
          <div className="w-16 h-16 rounded-2xl bg-bushal-ivoryDeep flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-bushal-borderMid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-bushal-forest mb-1">No products found</h3>
          <p className="text-sm text-bushal-inkSoft max-w-sm">
            We couldn't find any products matching your current filters. Try adjusting your category or sort options.
          </p>
          <button
            onClick={() => { setSelectedCategory('All'); setHideOutOfStock(false); setSortBy('newest') }}
            className="mt-6 text-sm font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors underline underline-offset-4"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}