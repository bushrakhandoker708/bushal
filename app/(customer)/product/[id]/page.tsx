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

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product || productError) notFound()

  // Get current user session
  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id ?? null

  // Check if admin
  let isAdmin = false
  if (currentUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  // Fetch comments
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('id, body, rating, admin_reply, created_at, user_id')
    .eq('product_id', params.id)
    .order('created_at', { ascending: false })

  if (commentsError) console.error('Comments error:', commentsError)

  // Fetch profile names for comment authors
  // FIXED: Changed [...new Set()] to Array.from(new Set())
  const userIds = Array.from(new Set((comments ?? []).map((c) => c.user_id)))

  let profilesMap: Record<string, string> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    profiles?.forEach((p) => {
      profilesMap[p.id] = p.full_name ?? 'Anonymous'
    })
  }

  // Attach profile names to comments
  const commentsWithProfiles = (comments ?? []).map((c) => ({
    ...c,
    profiles: { full_name: profilesMap[c.user_id] ?? 'Anonymous' },
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductDetail product={product} />

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Customer Reviews
            {commentsWithProfiles.length > 0 && (
              <span className="ml-2 text-base font-normal text-gray-500">
                ({commentsWithProfiles.length})
              </span>
            )}
          </h2>

          <CommentForm productId={product.id} />

          <CommentList
            comments={commentsWithProfiles as any}
            currentUserId={currentUserId ?? undefined}
            isAdmin={isAdmin}
          />
        </section>
      </main>
    </div>
  )
}