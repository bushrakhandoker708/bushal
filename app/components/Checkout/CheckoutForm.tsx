// components/checkout/CheckoutForm.tsx
'use client'

import { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'

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
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Delivery Information</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          label="Email"
          value={form.email}
          onChange={handleChange}
          placeholder="alif@gmail.com"
          required
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
        <div className="grid grid-cols-2 gap-4">
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
          <Button type="submit" loading={loading} size="lg" className="w-full">
            Pay with bKash
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
        <p className="text-xs text-gray-400 text-center mt-2">
          Your information is secure and encrypted.
        </p>
      </form>
    </div>
  )
}