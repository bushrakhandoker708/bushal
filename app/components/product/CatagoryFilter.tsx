// app/components/product/CategoryFilter.tsx
'use client'

import { useState } from 'react'
import ProductGrid from './ProductGrid'
import { Product } from '@/app/types/product'

const CATEGORIES = ['All', 'Clothing', 'Electronics', 'Food', 'Home', 'Other', 'General']

export default function CategoryFilter({ products }: { products: Product[] }) {
  const [active, setActive] = useState('All')

  const presentCategories = ['All', ...CATEGORIES.slice(1).filter(
    (cat) => products.some((p) => (p.category || 'General') === cat)
  )]

  const filtered =
    active === 'All'
      ? products
      : products.filter((p) => (p.category || 'General') === active)

  return (
    <div>
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {presentCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              active === cat
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500">No products found in this category.</p>
        </div>
      ) : (
        <ProductGrid products={filtered} />
      )}
    </div>
  )
}