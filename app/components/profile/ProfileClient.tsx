// app/components/profile/ProfileClient.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'

interface Profile {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  role: string
  created_at: string
}

interface Order {
  id: string
  total: number
  status: string
  delivery_status: string
  created_at: string
  order_items: any[]
}

interface Stats {
  totalOrders: number
  totalSpent: number
  pendingOrders: number
  deliveredOrders: number
}

const DELIVERY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  order_placed:    { label: 'Order Placed',     color: 'text-bushal-inkMid',   bg: 'bg-bushal-ivoryDeep' },
  confirmed:       { label: 'Confirmed',         color: 'text-bushal-copper',   bg: 'bg-bushal-copper/10' },
  processing:      { label: 'Processing',        color: 'text-bushal-copper',   bg: 'bg-bushal-copper/10' },
  shipped:         { label: 'Shipped',           color: 'text-bushal-forest',   bg: 'bg-bushal-forest/10' },
  out_for_delivery:{ label: 'Out for Delivery',  color: 'text-bushal-warning',  bg: 'bg-bushal-warningBg' },
  delivered:       { label: 'Delivered',         color: 'text-bushal-success',  bg: 'bg-bushal-successBg' },
  cancelled:       { label: 'Cancelled',         color: 'text-bushal-danger',   bg: 'bg-bushal-dangerBg' },
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  const colors: Record<string, string> = {
    orange: 'from-bushal-copper/10 to-bushal-copper/5 border-bushal-copper/20',
    blue:   'from-blue-50 to-blue-50/50 border-blue-200',
    green:  'from-bushal-successBg to-bushal-successBg/50 border-bushal-success/20',
    violet: 'from-violet-50 to-violet-50/50 border-violet-200',
  }
  const textColors: Record<string, string> = {
    orange: 'text-bushal-copper',
    blue:   'text-blue-700',
    green:  'text-bushal-success',
    violet: 'text-violet-700',
  }

  return (
    <div className={cn('bg-gradient-to-br rounded-2xl border p-5 flex flex-col gap-1', colors[accent])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-bushal-inkSoft">{label}</p>
      <p className={cn('text-2xl font-extrabold tracking-tight', textColors[accent])}>{value}</p>
      {sub && <p className="text-xs text-bushal-inkSoft">{sub}</p>}
    </div>
  )
}

export default function ProfileClient({ profile, orders, stats }: { profile: Profile | null; orders: Order[]; stats: Stats }) {
  const supabase = createBrowserClient()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ 
        full_name: form.full_name.trim(), 
        phone: form.phone.trim(), 
        address: form.address.trim() 
      })
      .eq('id', profile!.id)
    
    setSaving(false)
    if (err) { 
      setError(err.message)
      return 
    }
    setSuccess(true)
    setEditing(false)
    setTimeout(() => setSuccess(false), 3000)
    router.refresh()
  }

  const recentOrders = orders.slice(0, 5)
  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-BD', { month: 'long', year: 'numeric' }) 
    : ''

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-bushal-copper to-bushal-copperLight flex items-center justify-center shadow-lg shadow-bushal-copper/30 flex-shrink-0">
          <span className="text-2xl font-extrabold text-white">
            {(profile?.full_name ?? profile?.email ?? 'U').charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-bushal-forest tracking-tight">
            {profile?.full_name ?? 'My Profile'}
          </h1>
          <p className="text-sm text-bushal-inkSoft mt-0.5">{profile?.email} · Member since {memberSince}</p>
          {profile?.address && (
            <p className="text-xs text-bushal-inkSoft mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profile.address}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Orders"    value={stats.totalOrders}             accent="blue"   />
        <StatCard label="Total Spent"     value={formatPrice(stats.totalSpent)} accent="orange" sub="fulfilled orders" />
        <StatCard label="Delivered"       value={stats.deliveredOrders}         accent="green"  />
        <StatCard label="Pending"         value={stats.pendingOrders}           accent="violet" />
      </div>

      {/* Profile info card */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-bushal-border">
          <h2 className="text-sm font-bold text-bushal-forest">Account Details</h2>
          {!editing ? (
            <button 
              onClick={() => setEditing(true)} 
              className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => { setEditing(false); setError('') }} 
                className="text-xs text-bushal-inkSoft hover:text-bushal-ink px-3 py-1.5 rounded-lg hover:bg-bushal-ivoryDeep transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="text-xs font-semibold bg-bushal-copper text-white px-3 py-1.5 rounded-lg hover:bg-bushal-copperLight disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-bushal-successBg border border-bushal-success/20 text-bushal-success px-4 py-2.5 rounded-xl text-sm animate-fade-in">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Profile updated successfully
          </div>
        )}
        {error && (
          <div className="mx-6 mt-4 text-sm text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-4 py-2.5 rounded-xl animate-fade-in">
            {error}
          </div>
        )}

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'Full Name', key: 'full_name', value: profile?.full_name, placeholder: 'Enter your name' },
            { label: 'Phone Number', key: 'phone', value: profile?.phone, placeholder: '+880 1XXX-XXXXXX' },
          ].map(({ label, key, value, placeholder }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">{label}</p>
              {editing ? (
                <input
                  type="text"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
                />
              ) : (
                <p className="text-sm text-bushal-ink font-medium">{value ?? <span className="text-bushal-inkSoft">Not set</span>}</p>
              )}
            </div>
          ))}
          
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Delivery Address</p>
            {editing ? (
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="House/flat, road, area, city, Bangladesh"
                rows={2}
                className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all resize-none"
              />
            ) : (
              <p className="text-sm text-bushal-ink font-medium">{profile?.address ?? <span className="text-bushal-inkSoft">No address saved</span>}</p>
            )}
          </div>
          
          <div>
            <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Email</p>
            <p className="text-sm text-bushal-ink font-medium">{profile?.email}</p>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">Contact support to change email</p>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-bushal-border">
            <h2 className="text-sm font-bold text-bushal-forest">Recent Orders</h2>
            <a href="/orders" className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight transition-colors">
              View all →
            </a>
          </div>
          <div className="divide-y divide-bushal-ivory">
            {recentOrders.map((order) => {
              const ds = DELIVERY_LABELS[order.delivery_status] ?? DELIVERY_LABELS['order_placed']
              const itemCount = (order.order_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0)
              return (
                <div key={order.id} className="flex items-center gap-4 px-6 py-4 hover:bg-bushal-ivoryDeep/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-bushal-ink">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-bushal-inkSoft mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', ds.bg, ds.color)}>
                    {ds.label}
                  </span>
                  <p className="text-sm font-bold text-bushal-forest flex-shrink-0">
                    {formatPrice(order.total)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}