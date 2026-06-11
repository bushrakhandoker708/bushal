// app/(admin)/admin/products/[id]/edit/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProductForm from '@/app/components/product/ProductForm'

interface Props {
  params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  const supabase = createServerClient()
  
  // Fetch the specific product to edit
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product) {
    notFound()
  }

  // Fetch categories for the dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-bushal-forest">Edit Product</h1>
        <p className="text-sm text-bushal-inkSoft mt-0.5">
          Update the details for <span className="font-semibold text-bushal-ink">{product.name}</span>
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        <ProductForm 
          mode="edit" 
          product={product} 
          categories={categories ?? []} 
        />
      </div>
    </div>
  )
}