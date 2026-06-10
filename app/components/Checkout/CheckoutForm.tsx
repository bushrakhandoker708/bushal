// app/components/checkout/CheckoutForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/hooks/useAuth'
import Input from '@/app/components/ui/Input'
import Button from '@/app/components/ui/Button'
import { cn } from '@/app/lib/utils/cn'
import { divisions, getDistricts, getUpazillas } from '@/app/lib/data/bdLocations'

interface SavedAddress {
  id: string
  division: string
  zilla: string
  upazilla: string
  detailed_address: string
  delivery_instructions?: string | null
  is_default: boolean
}

interface ProfileData {
  full_name: string
  email: string
  phone: string
}

export interface CheckoutData {
  delivery_address: string
  customer_note: string
  phone: string
}

interface Props {
  onBkash: (data: CheckoutData) => Promise<void>
  onCOD: (data: CheckoutData) => Promise<void>
  loading: boolean
}

export default function CheckoutForm({ onBkash, onCOD, loading }: Props) {
  const { user } = useAuth()
  const supabase = createBrowserClient()

  // Profile & Autofill State
  const [profile, setProfile] = useState<ProfileData>({ full_name: '', email: '', phone: '' })
  
  // Address State
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  // New Address Form State
  const [newAddress, setNewAddress] = useState({
    division: '',
    zilla: '',
    upazilla: '',
    detailed_address: '',
    delivery_instructions: '',
    is_default: false,
  })

  const [error, setError] = useState('')

  // Fetch profile and saved addresses on mount
  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      // 1. Autofill profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile({
          full_name: profileData.full_name ?? '',
          email: profileData.email ?? '',
          phone: profileData.phone ?? '',
        })
      }

      // 2. Fetch saved addresses
      const { data: addrData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })

      if (addrData && addrData.length > 0) {
        setAddresses(addrData)
        const defaultAddr = addrData.find(a => a.is_default) || addrData[0]
        setSelectedAddressId(defaultAddr.id)
      } else {
        // If no saved addresses, force open the new address form
        setShowNewAddressForm(true)
      }
    }
    fetchData()
  }, [user, supabase])

  // Handle cascading dropdown resets
  const handleNewAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewAddress(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'division') {
        next.zilla = ''
        next.upazilla = ''
      } else if (name === 'zilla') {
        next.upazilla = ''
      }
      return next
    })
  }

  // Save a newly created address
  const handleSaveNewAddress = async () => {
    if (!newAddress.division || !newAddress.zilla || !newAddress.upazilla || !newAddress.detailed_address.trim()) {
      setError('Please fill in all required address fields.')
      return
    }
    setError('')
    setSavingAddress(true)

    const payload = {
      user_id: user!.id,
      division: newAddress.division,
      zilla: newAddress.zilla,
      upazilla: newAddress.upazilla,
      detailed_address: newAddress.detailed_address.trim(),
      delivery_instructions: newAddress.delivery_instructions.trim() || null,
      is_default: newAddress.is_default || addresses.length === 0, // Make default if it's the first
    }

    const { data, error: dbError } = await supabase
      .from('addresses')
      .insert(payload)
      .select()
      .single()

    setSavingAddress(false)
    if (dbError) {
      setError(dbError.message)
      return
    }

    // Add to local state, select it, and hide the form
    setAddresses(prev => [data as SavedAddress, ...prev])
    setSelectedAddressId(data.id)
    setShowNewAddressForm(false)
    setNewAddress({ division: '', zilla: '', upazilla: '', detailed_address: '', delivery_instructions: '', is_default: false })
  }

  // Format address for display and API payload
  const formatAddress = (addr: SavedAddress) => {
    return `${addr.detailed_address}, ${addr.upazilla}, ${addr.zilla}, ${addr.division}`
  }

  // Final submission handler
  const handleSubmit = async (type: 'bkash' | 'cod') => {
    setError('')

    // 1. Validate Phone (Mandatory for delivery)
    if (!profile.phone.trim()) {
      setError('Phone number is required for delivery updates.')
      return
    }

    // 2. Validate Address Selection
    let finalAddress = ''
    let finalNote = ''

    if (selectedAddressId) {
      const addr = addresses.find(a => a.id === selectedAddressId)
      if (!addr) {
        setError('Please select a valid delivery address.')
        return
      }
      finalAddress = formatAddress(addr)
      finalNote = addr.delivery_instructions ?? ''
    } else {
      setError('Please select or add a delivery address.')
      return
    }

    const checkoutData: CheckoutData = {
      delivery_address: finalAddress,
      customer_note: finalNote,
      phone: profile.phone.trim(),
    }

    // Trigger the parent's payment handler
    if (type === 'bkash') {
      await onBkash(checkoutData)
    } else {
      await onCOD(checkoutData)
    }
  }

  const availableZillas = newAddress.division ? getDistricts(newAddress.division) : []
  const availableUpazillas = newAddress.division && newAddress.zilla ? getUpazillas(newAddress.division, newAddress.zilla) : []

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 shadow-card space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold text-bushal-forest mb-1">Delivery Information</h2>
        <p className="text-sm text-bushal-inkSoft">Please verify your contact details and select a delivery address.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-bushal-dangerBg border border-bushal-danger/20 text-bushal-danger px-4 py-3 rounded-xl text-sm animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Contact Info (Autofilled) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-bushal-inkMid mb-1.5">Full Name</label>
          <input
            type="text"
            value={profile.full_name}
            readOnly
            className="w-full rounded-xl border border-bushal-border bg-bushal-ivoryDeep px-4 py-2.5 text-sm text-bushal-inkSoft cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-bushal-inkMid mb-1.5">Email</label>
          <input
            type="email"
            value={profile.email}
            readOnly
            className="w-full rounded-xl border border-bushal-border bg-bushal-ivoryDeep px-4 py-2.5 text-sm text-bushal-inkSoft cursor-not-allowed"
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number *"
            value={profile.phone}
            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+880 1700 000 000"
            required
          />
          <p className="text-[11px] text-bushal-inkSoft mt-1">Required for delivery updates via SMS/Call.</p>
        </div>
      </div>

      {/* Delivery Address Selection */}
      <div>
        <label className="block text-sm font-semibold text-bushal-inkMid mb-3">Delivery Address *</label>
        
        {/* Render Saved Addresses */}
        {addresses.length > 0 && !showNewAddressForm && (
          <div className="space-y-3 mb-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                onClick={() => { setSelectedAddressId(addr.id); setError('') }}
                className={cn(
                  'relative p-4 rounded-xl border cursor-pointer transition-all',
                  selectedAddressId === addr.id
                    ? 'border-bushal-copper bg-bushal-copper/5 ring-2 ring-bushal-copper/20'
                    : 'border-bushal-border bg-bushal-surface hover:border-bushal-borderMid'
                )}
              >
                {addr.is_default && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-bushal-copper bg-bushal-copper/10 px-1.5 py-0.5 rounded-full">
                    Default
                  </span>
                )}
                <p className="text-sm font-semibold text-bushal-ink pr-12">{addr.detailed_address}</p>
                <p className="text-xs text-bushal-inkSoft mt-1">{addr.upazilla}, {addr.zilla}, {addr.division}</p>
                {addr.delivery_instructions && (
                  <p className="text-xs text-bushal-inkSoft mt-1 italic">Note: {addr.delivery_instructions}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add New Address Toggle / Form */}
        {!showNewAddressForm ? (
          <button
            type="button"
            onClick={() => { setShowNewAddressForm(true); setSelectedAddressId(null); setError('') }}
            className="w-full py-3 rounded-xl border-2 border-dashed border-bushal-border text-sm font-semibold text-bushal-inkSoft hover:border-bushal-copper hover:text-bushal-copper transition-all"
          >
            + Add New Address
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-bushal-copper/30 bg-bushal-copper/5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-bushal-forest">New Delivery Address</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-bushal-inkSoft mb-1">Division *</label>
                <select
                  name="division"
                  value={newAddress.division}
                  onChange={handleNewAddressChange}
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
                  value={newAddress.zilla}
                  onChange={handleNewAddressChange}
                  disabled={!newAddress.division}
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
                  value={newAddress.upazilla}
                  onChange={handleNewAddressChange}
                  disabled={!newAddress.zilla}
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
                value={newAddress.detailed_address}
                onChange={handleNewAddressChange}
                placeholder="House #, Road #, Block, Area"
                className="w-full rounded-lg border border-bushal-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-bushal-copper"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-bushal-inkSoft mb-1">Delivery Instructions (Optional)</label>
              <input
                type="text"
                name="delivery_instructions"
                value={newAddress.delivery_instructions}
                onChange={handleNewAddressChange}
                placeholder="e.g., Call before delivery, Leave at security gate"
                className="w-full rounded-lg border border-bushal-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-bushal-copper"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={newAddress.is_default}
                onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                className="w-4 h-4 rounded border-bushal-border text-bushal-copper focus:ring-bushal-copper"
              />
              <label htmlFor="is_default" className="text-xs text-bushal-ink">Set as default address</label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewAddressForm(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" loading={savingAddress} onClick={handleSaveNewAddress}>
                Save & Select Address
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4 border-t border-bushal-border">
        <Button
          type="button"
          loading={loading}
          size="lg"
          className="w-full"
          onClick={() => handleSubmit('bkash')}
        >
          Pay securely with bKash
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit('cod')}
          loading={loading}
          size="lg"
          variant="outline"
          className="w-full"
        >
          Cash on Delivery (COD)
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-bushal-inkSoft">
        <svg className="w-3.5 h-3.5 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Your information is encrypted and securely processed.</span>
      </div>
    </div>
  )
}