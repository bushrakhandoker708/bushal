// components/product/ProductForm.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/app/types/product'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface Props {
  mode: 'create' | 'edit'
  product?: Product
}

export default function ProductForm({ mode, product }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    image_url: product?.image_url ?? '',
    in_stock: product?.in_stock ?? true,
    discount_percent: product?.discount_percent?.toString() ?? '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      image_url: form.image_url || null,
      in_stock: form.in_stock,
      discount_percent: form.discount_percent
        ? parseInt(form.discount_percent)
        : null,
    }

    const url =
      mode === 'create' ? '/api/products' : `/api/products/${product?.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      return
    }

    router.push('/admin/products')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="name"
        name="name"
        label="Product Name"
        value={form.name}
        onChange={handleChange}
        placeholder="e.g. Nike Air Max 90"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Product description..."
        />
      </div>

      <Input
        id="price"
        name="price"
        label="Price (taka)"
        type="number"
        min="0"
        step="0.01"
        value={form.price}
        onChange={handleChange}
        placeholder="999999.99"
        required
      />

      <Input
        id="image_url"
        name="image_url"
        label="Image URL"
        value={form.image_url}
        onChange={handleChange}
        placeholder="https://..."
      />

      <Input
        id="discount_percent"
        name="discount_percent"
        label="Discount % (optional)"
        type="number"
        min="0"
        max="100"
        value={form.discount_percent}
        onChange={handleChange}
        placeholder="e.g. 20"
      />

      <div className="flex items-center gap-3">
        <input
          id="in_stock"
          name="in_stock"
          type="checkbox"
          checked={form.in_stock}
          onChange={handleChange}
          className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
        />
        <label htmlFor="in_stock" className="text-sm font-medium text-gray-700">
          Available in store
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {mode === 'create' ? 'Add Product' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}