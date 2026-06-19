// app/(admin)/admin/layout.tsx
import AdminSidebar from '@/app/components/layout/AdminSidebar'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  
  // FIX: Use getUser() instead of getSession() for secure server-side verification.
  // getSession() reads from cookies which can be tampered with, whereas getUser()
  // validates the token against the Supabase Auth server.
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-bushal-ivoryDeep">
      <AdminSidebar />
      <main className="flex-1 pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}