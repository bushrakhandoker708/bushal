// app/sitemap.ts
import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://bushal.vercel.app'

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  let productRoutes: MetadataRoute.Sitemap = []

  try {
    // Use plain supabase-js — no cookies(), no SSR client, no request context needed.
    // This is the correct pattern for sitemap generation: public read, no user session.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: products, error } = await supabase
      .from('products')
      .select('id, updated_at')
      .eq('in_stock', true)

    if (error) throw error

    if (products) {
      productRoutes = products.map(
        (product: { id: string; updated_at: string | null }) => ({
          url: `${baseUrl}/product/${product.id}`,
          lastModified: product.updated_at
            ? new Date(product.updated_at)
            : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        })
      )
    }
  } catch (error) {
    console.error('[Sitemap] Product fetch failed:', error)
    // Falls through with just staticRoutes — always returns valid XML
  }

  return [...staticRoutes, ...productRoutes]
}