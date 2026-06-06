// components/checkout/CheckoutForm.tsx

'use client'


import { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface Props {
  onSubmit: () => Promise<void>
  loading: boolean
}

export default function CheckoutForm({ onSubmit, loading }: Props) {
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
    // Stripe handles billing/shipping collection on their side.
    // This form is just for UX before redirect.
    onSubmit()
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Delivery Information
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          value={form.fullName}
          onChange={handleChange}
          placeholder="John Doe"
          required
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          required
        />
        <Input
          id="phone"
          name="phone"
          type="tel"
          label="Phone Number"
          value={form.phone}
          onChange={handleChange}
          placeholder="+1 555 000 0000"
          required
        />
        <Input
          id="address"
          name="address"
          label="Street Address"
          value={form.address}
          onChange={handleChange}
          placeholder="123 Main St"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="city"
            name="city"
            label="City"
            value={form.city}
            onChange={handleChange}
            placeholder="New York"
            required
          />
          <Input
            id="zip"
            name="zip"
            label="ZIP / Postal Code"
            value={form.zip}
            onChange={handleChange}
            placeholder="10001"
            required
          />
        </div>

        <p className="text-xs text-gray-400">
          You will be redirected to Stripe for secure payment.
        </p>

        <Button type="submit" loading={loading} size="lg" className="w-full">
          Continue to Payment
        </Button>
      </form>
    </div>
  )
}