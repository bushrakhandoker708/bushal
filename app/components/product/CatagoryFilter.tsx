// components/product/CategoryFilter.tsx
'use client'

import { useState } from 'react'
import ProductGrid from './ProductGrid'
import { Product } from '@/app/types/product'
import { cn } from '@/app/lib/utils/cn'

const CATEGORIES = ['All', 'Clothing', 'Electronics', 'Food', 'Home', 'Other', 'General']

export default function CategoryFilter({ products }: { products: Product[] }) {
  const [active, setActive] = useState('All')

  const presentCategories = [
    'All',
    ...CATEGORIES.slice(1).filter((cat) => products.some((p) => (p.category || 'General') === cat)),
  ]

  const filtered =
    active === 'All' ? products : products.filter((p) => (p.category || 'General') === active)

  return (
    <div>
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {presentCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
              active === cat
                ? 'bg-bushal-forest text-white shadow-md shadow-bushal-forest/20'
                : 'bg-bushal-surface text-bushal-inkMid border border-bushal-border hover:border-bushal-forestLight hover:text-bushal-forest'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-bushal-surface rounded-2xl border border-bushal-border">
          <p className="text-bushal-inkSoft">No products in this category.</p>
        </div>
      ) : (
        <ProductGrid products={filtered} />
      )}
    </div>
  )
}