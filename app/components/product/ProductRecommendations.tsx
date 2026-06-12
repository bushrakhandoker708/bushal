// app/components/product/ProductRecommendations.tsx
// A premium "You Might Also Like" section that displays products 
// from the same category as the current product. 
// 
// This is a Server Component for optimal performance and SEO.
// It fetches related items directly from Supabase, excluding the 
// current product and out-of-stock items, ensuring customers 
// always see relevant, purchasable alternatives.

import { createServerClient } from '@/lib/supabase/server'
import ProductCard from './ProductCard'
import { Product } from '@/app/types/product'

interface Props {
  currentProductId: string
  category?: string | null
}

export default async function ProductRecommendations({ currentProductId, category }: Props) {
  // If no category is provided, we can't reliably recommend similar items
  if (!category) return null

  const supabase = await createServerClient()

  // Fetch products from the same category, excluding the current one, that are in stock.
  // We limit to 4 to show a clean, responsive row.
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .neq('id', currentProductId)
    .eq('in_stock', true)
    // Exclude soft-deleted products just in case
    .is('is_deleted', false) 
    .order('created_at', { ascending: false })
    .limit(4)

  if (error || !products || products.length === 0) {
    return null
  }

  return (
    <section className="mt-20 lg:mt-28 animate-fade-up">
      {/* Section Header */}
      <div className="flex items-center gap-5 mb-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-bushal-copper mb-1">
            Curated for you
          </p>
          <h2 className="font-heading text-3xl text-bushal-forest">
            You Might Also Like
          </h2>
        </div>
        <div className="flex-1 h-px bg-bushal-border" />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product, index) => (
          <ProductCard 
            key={product.id} 
            product={product as Product} 
            index={index} 
          />
        ))}
      </div>
    </section>
  )
}
