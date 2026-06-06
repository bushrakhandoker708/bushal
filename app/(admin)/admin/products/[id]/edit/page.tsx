// app/(admin)/admin/products/[id]/edit/page.tsx

import ProductForm from '@/app/components/product/ProductForm'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  const supabase = createServerClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product) notFound()

  const normalised = {
    ...product,
    images:
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image_url
        ? [product.image_url]
        : [],
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Product</h1>
      <div className="bg-white rounded-xl shadow p-8">
        <ProductForm mode="edit" product={normalised} />
      </div>
    </div>
  )
}