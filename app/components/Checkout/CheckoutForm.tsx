// components/checkout/CheckoutForm.tsx
'use client'

import { useState } from 'react'
import Input from '@/app/components/ui/Input'
import Button from '@/app/components/ui/Button'

interface Props {
  onBkash: () => Promise<void>
  onCOD: () => Promise<void>
  loading: boolean
}

export default function CheckoutForm({ onBkash, onCOD, loading }: Props) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onBkash()
  }

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 shadow-card">
      <h2 className="text-xl font-heading font-bold text-bushal-forest mb-6">
        Delivery Information
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          value={form.fullName}
          onChange={handleChange}
          placeholder="Muhammad Alif"
          required
        />
        
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address"
          value={form.email}
          onChange={handleChange}
          placeholder="alif@example.com"
          required
          autoComplete="email"
        />
        
        <Input
          id="phone"
          name="phone"
          type="tel"
          label="Phone Number"
          value={form.phone}
          onChange={handleChange}
          placeholder="+880 1700 000 000"
          required
        />
        
        <Input
          id="address"
          name="address"
          label="Street Address"
          value={form.address}
          onChange={handleChange}
          placeholder="House 12, Road 5, Dhanmondi"
          required
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            id="city"
            name="city"
            label="City / District"
            value={form.city}
            onChange={handleChange}
            placeholder="Dhaka"
            required
          />
          <Input
            id="zip"
            name="zip"
            label="Postal Code"
            value={form.zip}
            onChange={handleChange}
            placeholder="1205"
            required
          />
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            type="submit" 
            loading={loading} 
            size="lg" 
            className="w-full"
          >
            Pay securely with bKash
          </Button>
          
          <Button
            type="button"
            onClick={onCOD}
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
      </form>
    </div>
  )
}