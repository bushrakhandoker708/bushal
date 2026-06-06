// app/(customer)/product/[id]/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import ProductDetail from '@/app/components/product/ProductDetail'
import CommentForm from '@/app/components/comments/CommentForm'
import CommentList from '@/app/components/comments/CommentList'


interface Props {
  params: { id: string }
}

export default async function ProductPage({ params }: Props) {
  const supabase = createServerClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product) notFound()

  const { data: comments } = await supabase
    .from('comments')
    .select('*, profiles(full_name)')
    .eq('product_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductDetail product={product} />
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Customer Reviews
          </h2>
          <CommentForm productId={product.id} />
          <CommentList comments={comments ?? []} />
        </section>
      </main>
    </div>
  )
}