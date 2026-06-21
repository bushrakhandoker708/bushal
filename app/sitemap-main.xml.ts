import { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://bushal.vercel.app'
  
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = await createServerClient() // FIX: Added await here
    // Only index products that are actually in stock
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at')
      .eq('in_stock', true)

    if (products) {
      productRoutes = products.map((product: { id: string; updated_at: string | null }) => ({
        url: `${baseUrl}/product/${product.id}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    }
  } catch (error) {
    console.error('Sitemap generation error:', error)
  }

  return [...staticRoutes, ...productRoutes]
}