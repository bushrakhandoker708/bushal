// app/(admin)/admin/page.tsx

import { createServerClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = createServerClient()

  const [
    { count: productCount },
    { count: orderCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Total Products', value: productCount ?? 0, color: 'bg-blue-500' },
    { label: 'Total Orders', value: orderCount ?? 0, color: 'bg-green-500' },
    { label: 'Total Users', value: userCount ?? 0, color: 'bg-orange-500' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Admin Dashboard
      </h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow p-6">
            <div
              className={`w-12 h-12 rounded-lg ${stat.color} mb-4 flex items-center justify-center`}
            >
              <span className="text-white text-xl font-bold">
                {String(stat.value).charAt(0)}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <p className="text-gray-500 text-sm">
        Use the sidebar to manage products, orders, and customer messages.
      </p>
    </div>
  )
}