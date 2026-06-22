import { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import ProductDetail from '@/app/components/product/ProductDetail'
import CommentList from '@/app/components/comments/CommentList'
import PageWrapper from '@/app/components/layout/PageWrapper'
import CommentForm from '@/app/components/comments/CommentForm'
import ProductRecommendations from '@/app/components/product/ProductRecommendations'
import { Product } from '@/app/types/product'

// FIX 1: Next.js 14 uses a direct object for params, NOT a Promise. 
// (Promises for params were introduced in Next.js 15).
interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params // FIX 2: Removed 'await'
  const supabase = await createServerClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, description, images, image_url')
    .eq('id', id)
    .is('is_deleted', false)
    .single()

  if (!product) return { title: 'Product Not Found' }

  const coverImage =
    (Array.isArray(product.images) && product.images[0]) ||
    product.image_url ||
    '/og-image.png'

  return {
    title: `${product.name} — Bushal`,
    description:
      product.description ||
      `Shop ${product.name} at Bushal. Curated quality, fast delivery across Bangladesh.`,
    openGraph: {
      title: product.name,
      description: product.description || `Shop ${product.name} at Bushal.`,
      images: [{ url: coverImage, width: 800, height: 800, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      images: [coverImage],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = params // FIX 2: Removed 'await'
  const supabase = await createServerClient()

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, description, details, price, image_url, images, in_stock, stock_quantity, discount_percent, category, created_at, updated_at, comments(rating)')
    .eq('id', id)
    .is('is_deleted', false)
    .single()

  if (!product || productError) notFound()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id ?? null

  let isAdmin = false
  if (currentUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  // FIX 3: Added 'is_hidden' to the select query so CommentCard can properly hide moderated reviews
  const { data: comments } = await supabase
    .from('comments')
    .select('id, body, rating, admin_reply, created_at, user_id, images, is_hidden')
    .eq('product_id', id)
    .order('created_at', { ascending: false })

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

  const commentsWithProfiles = (comments ?? []).map((c) => ({
    ...c,
    profiles: { full_name: profilesMap[c.user_id] ?? 'Anonymous' },
  }))

  const coverImage =
    (Array.isArray(product.images) && product.images[0]) ||
    product.image_url ||
    'https://bushal.vercel.app/og-image.png'

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : product.price

  const avgRating =
    product.comments?.length
      ? product.comments.reduce(
          (sum: number, c: any) => sum + (c.rating || 0),
          0
        ) / product.comments.length
      : 0

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: coverImage,
    description: product.description || 'Curated product at Bushal.',
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: `https://bushal.vercel.app/product/${product.id}`,
      priceCurrency: 'BDT',
      price: discountedPrice.toFixed(2),
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      areaServed: { '@type': 'Country', name: 'Bangladesh' },
      seller: {
        '@type': 'Store',
        name: 'Bushal',
        url: 'https://bushal.vercel.app',
      },
    },
    aggregateRating: product.comments?.length
      ? {
          '@type': 'AggregateRating',
          ratingValue: avgRating.toFixed(1),
          reviewCount: product.comments.length,
          bestRating: '5',
          worstRating: '1',
        }
      : undefined,
  }

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Navbar />
      
      <PageWrapper
        maxWidth="5xl"
        withBottomNav={false}
        className="pt-28 lg:pt-32 pb-32 lg:pb-20"
      >
        <ProductDetail product={product as Product} />

        {(product.details || product.description) && (
          <section className="mt-20 lg:mt-28 mb-16 lg:mb-24 animate-fade-up">
            <div className="relative bg-bushal-surface rounded-3xl border border-bushal-border/60 shadow-card overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bushal-copper/30 via-bushal-copper to-bushal-copper/30" />
              
              <div className="p-6 sm:p-8 lg:p-12">
                <div className="flex items-center gap-3 mb-8 lg:mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bushal-copper/10 to-bushal-copper/5 border border-bushal-copper/20 flex items-center justify-center text-bushal-copper flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bushal-copper mb-1">The Story</p>
                    <h2 className="font-heading text-2xl lg:text-3xl font-bold text-bushal-forest leading-tight">
                      Product Details
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                  {product.details && (
                    <div className="lg:col-span-1">
                      <div className="lg:sticky lg:top-28">
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-bushal-inkSoft mb-4">
                          Key Features
                        </h3>
                        <div className="bg-bushal-ivoryDeep/50 rounded-2xl border border-bushal-border/50 p-5 space-y-4">
                          {product.details.split('\n').filter((p: string) => p.trim()).map((feature: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-bushal-copper/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <p className="text-sm text-bushal-inkMid leading-relaxed">
                                {feature.trim()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {product.description && (
                    <div className={product.details ? 'lg:col-span-2' : 'lg:col-span-3'}>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-bushal-inkSoft mb-4">
                        The Full Story
                      </h3>
                      <div className="max-w-none text-bushal-inkMid leading-[1.85] space-y-5 text-[15px] lg:text-base font-body">
                        {product.description.split('\n').map((paragraph: string, idx: number) => (
                          paragraph.trim() && (
                            <p key={idx} className="leading-[1.85]">
                              {paragraph.trim()}
                            </p>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <ProductRecommendations productId={product.id} userId={currentUserId} />

        <section className="mt-20 lg:mt-28  mb-32">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 lg:mb-10">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bushal-copper mb-1">
                Customer voices
              </p>
              <h2 className="font-heading text-2xl lg:text-3xl text-bushal-forest">
                Reviews
                {commentsWithProfiles.length > 0 && (
                  <span className="ml-3 font-body text-base font-normal text-bushal-inkSoft">
                    {commentsWithProfiles.length}{' '}
                    {commentsWithProfiles.length === 1 ? 'review' : 'reviews'}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <CommentList
                comments={commentsWithProfiles as any}
                currentUserId={currentUserId ?? undefined}
                isAdmin={isAdmin}
              />
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-28">
                <CommentForm productId={product.id} />
              </div>
            </div>
          </div>
        </section>
      </PageWrapper>
    </div>
  )
}