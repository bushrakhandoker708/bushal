// components/product/ProductGrid.tsx
import ProductCard from './ProductCard'
import { Product } from '@/app/types/product'
import EmptyState from '@/app/components/ui/EmptyState'

interface Props {
  products: Product[]
}

export default function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        }
        title="No products found"
        description="Try a different category or check back later."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  )
}