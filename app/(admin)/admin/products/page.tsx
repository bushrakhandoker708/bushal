// app/(admin)/admin/products/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import AdminProductsClient from '@/app/components/admin/AdminProductsClient'

export default async function AdminProductsPage() {
  const supabase = await createServerClient()
  
  // Fetch products including the new cost_price and other_costs fields.
  // Using select('*') automatically includes all columns from the products table.
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('name')
      .order('name'),
  ])

  return (
    <AdminProductsClient
      products={products ?? []}
      categories={(categories ?? []).map((c) => c.name)}
    />
  )
}