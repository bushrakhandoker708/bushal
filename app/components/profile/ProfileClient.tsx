// app/components/profile/ProfileClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { cn } from '@/app/lib/utils/cn'
import { divisions, getDistricts, getUpazillas } from '@/app/lib/data/bdLocations'

interface Profile {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  role: string
  created_at: string
}

interface Address {
  id: string
  division: string
  zilla: string
  upazilla: string
  detailed_address: string
  delivery_instructions?: string | null
  is_default: boolean
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
  
  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
  })
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    division: '',
    zilla: '',
    upazilla: '',
    detailed_address: '',
    delivery_instructions: '',
    is_default: false,
  })
  const [addressError, setAddressError] = useState('')

  useEffect(() => {
    if (profile) {
      fetchAddresses()
    }
  }, [profile])

  const fetchAddresses = async () => {
    setLoadingAddresses(true)
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', profile!.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    
    setAddresses(data ?? [])
    setLoadingAddresses(false)
  }

  const handleProfileSave = async () => {
    setSavingProfile(true)
    setProfileError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim(),
      })
      .eq('id', profile!.id)
    
    setSavingProfile(false)
    if (err) {
      setProfileError(err.message)
      return
    }
    setProfileSuccess(true)
    setEditingProfile(false)
    setTimeout(() => setProfileSuccess(false), 3000)
    router.refresh()
  }

  const handleAddressFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setAddressForm(prev => {
      const next = { ...prev, [name]: value }
      // Cascading reset
      if (name === 'division') {
        next.zilla = ''
        next.upazilla = ''
      } else if (name === 'zilla') {
        next.upazilla = ''
      }
      return next
    })
  }

  const handleSaveAddress = async () => {
    if (!addressForm.division || !addressForm.zilla || !addressForm.upazilla || !addressForm.detailed_address.trim()) {
      setAddressError('Please fill all required address fields.')
      return
    }

    setSavingAddress(true)
    setAddressError('')

    const payload = {
      user_id: profile!.id,
      division: addressForm.division,
      zilla: addressForm.zilla,
      upazilla: addressForm.upazilla,
      detailed_address: addressForm.detailed_address.trim(),
      delivery_instructions: addressForm.delivery_instructions.trim() || null,
      is_default: addressForm.is_default,
    }

    const { error: err } = await supabase.from('addresses').insert(payload)
    
    setSavingAddress(false)
    if (err) {
      setAddressError(err.message)
      return
    }

    setShowAddressForm(false)
    setAddressForm({ division: '', zilla: '', upazilla: '', detailed_address: '', delivery_instructions: '', is_default: false })
    fetchAddresses()
  }

  const handleSetDefault = async (id: string) => {
    await supabase.from('addresses').update({ is_default: true }).eq('id', id)
    fetchAddresses()
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return
    await supabase.from('addresses').delete().eq('id', id)
    fetchAddresses()
  }

  const recentOrders = orders.slice(0, 5)
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })
    : ''

  const availableZillas = addressForm.division ? getDistricts(addressForm.division) : []
  const availableUpazillas = addressForm.division && addressForm.zilla ? getUpazillas(addressForm.division, addressForm.zilla) : []

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
          {!editingProfile ? (
            <button
              onClick={() => setEditingProfile(true)}
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
                onClick={() => { setEditingProfile(false); setProfileError('') }}
                className="text-xs text-bushal-inkSoft hover:text-bushal-ink px-3 py-1.5 rounded-lg hover:bg-bushal-ivoryDeep transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileSave}
                disabled={savingProfile}
                className="text-xs font-semibold bg-bushal-copper text-white px-3 py-1.5 rounded-lg hover:bg-bushal-copperLight disabled:opacity-50 transition-colors"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {profileSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-bushal-successBg border border-bushal-success/20 text-bushal-success px-4 py-2.5 rounded-xl text-sm animate-fade-in">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Profile updated successfully
          </div>
        )}
        {profileError && (
          <div className="mx-6 mt-4 text-sm text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-4 py-2.5 rounded-xl animate-fade-in">
            {profileError}
          </div>
        )}

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'Full Name', key: 'full_name', value: profile?.full_name, placeholder: 'Enter your name' },
            { label: 'Phone Number', key: 'phone', value: profile?.phone, placeholder: '+880 1XXX-XXXXXX' },
          ].map(({ label, key, value, placeholder }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">{label}</p>
              {editingProfile ? (
                <input
                  type="text"
                  value={profileForm[key as keyof typeof profileForm]}
                  onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
                />
              ) : (
                <p className="text-sm text-bushal-ink font-medium">{value ?? <span className="text-bushal-inkSoft">Not set</span>}</p>
              )}
            </div>
          ))}
          <div>
            <p className="text-xs font-semibold text-bushal-inkSoft uppercase tracking-wide mb-1.5">Email</p>
            <p className="text-sm text-bushal-ink font-medium">{profile?.email}</p>
            <p className="text-[11px] text-bushal-inkSoft mt-0.5">Contact support to change email</p>
          </div>
        </div>
      </div>

      {/* Saved Addresses Section */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-bushal-border">
          <h2 className="text-sm font-bold text-bushal-forest">Saved Addresses</h2>
          {!showAddressForm && (
            <button
              onClick={() => { setShowAddressForm(true); setAddressError('') }}
              className="text-xs font-semibold text-bushal-copper hover:text-bushal-copperLight flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Address
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {loadingAddresses ? (
            <p className="text-sm text-bushal-inkSoft">Loading addresses...</p>
          ) : addresses.length === 0 && !showAddressForm ? (
            <p className="text-sm text-bushal-inkSoft">No saved addresses yet. Add one to speed up checkout.</p>
          ) : (
            <>
              {addresses.map((addr) => (
                <div 
                  key={addr.id} 
                  className={cn(
                    "relative p-4 rounded-xl border transition-all",
                    addr.is_default 
                      ? "border-bushal-copper/40 bg-bushal-copper/5" 
                      : "border-bushal-border bg-bushal-ivory/40 hover:bg-bushal-ivoryDeep/50"
                  )}
                >
                  {addr.is_default && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-bushal-copper bg-bushal-copper/10 px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                  <p className="text-sm font-semibold text-bushal-ink pr-16">
                    {addr.detailed_address}
                  </p>
                  <p className="text-xs text-bushal-inkSoft mt-1">
                    {addr.upazilla}, {addr.zilla}, {addr.division}
                  </p>
                  {addr.delivery_instructions && (
                    <p className="text-xs text-bushal-inkSoft mt-1 italic">
                      Note: {addr.delivery_instructions}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="text-[11px] font-semibold text-bushal-forest hover:text-bushal-copper transition-colors"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-[11px] font-semibold text-bushal-danger hover:text-bushal-danger/80 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Address Form */}
              {showAddressForm && (
                <div className="p-4 rounded-xl border border-bushal-copper/30 bg-bushal-copper/5 space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-bushal-forest">New Address</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-bushal-inkSoft mb-1">Division *</label>
                      <select
                        name="division"
                        value={addressForm.division}
                        onChange={handleAddressFormChange}
                        className="w-full rounded-lg border border-bushal-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-bushal-copper"
                      >
                        <option value="">Select Division</option>
                        {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-bushal-inkSoft mb-1">Zilla (District) *</label>
                      <select
                        name="zilla"
                        value={addressForm.zilla}
                        onChange={handleAddressFormChange}
                        disabled={!addressForm.division}
                        className="w-full rounded-lg border border-bushal-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-bushal-copper disabled:bg-bushal-ivoryDeep"
                      >
                        <option value="">Select Zilla</option>
                        {availableZillas.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-bushal-inkSoft mb-1">Upazilla *</label>
                      <select
                        name="upazilla"
                        value={addressForm.upazilla}
                        onChange={handleAddressFormChange}
                        disabled={!addressForm.zilla}
                        className="w-full rounded-lg border border-bushal-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-bushal-copper disabled:bg-bushal-ivoryDeep"
                      >
                        <option value="">Select Upazilla</option>
                        {availableUpazillas.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-bushal-inkSoft mb-1">Detailed Home Address *</label>
                    <input
                      type="text"
                      name="detailed_address"
                      value={addressForm.detailed_address}
                      onChange={handleAddressFormChange}
                      placeholder="House #, Road #, Block, Area"
                      className="w-full rounded-lg border border-bushal-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-bushal-copper"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-bushal-inkSoft mb-1">Delivery Instructions (Optional)</label>
                    <input
                      type="text"
                      name="delivery_instructions"
                      value={addressForm.delivery_instructions}
                      onChange={handleAddressFormChange}
                      placeholder="e.g., Call before delivery, Leave at security gate"
                      className="w-full rounded-lg border border-bushal-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-bushal-copper"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                      className="w-4 h-4 rounded border-bushal-border text-bushal-copper focus:ring-bushal-copper"
                    />
                    <label htmlFor="is_default" className="text-xs text-bushal-ink">Set as default address</label>
                  </div>

                  {addressError && (
                    <p className="text-xs text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-3 py-2 rounded-lg">
                      {addressError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddressForm(false); setAddressError('') }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-bushal-inkMid bg-bushal-ivoryDeep hover:bg-bushal-border transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={savingAddress}
                      className="inline-flex items-center gap-2 bg-bushal-copper text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-bushal-copperLight disabled:opacity-50 transition-all"
                    >
                      {savingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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