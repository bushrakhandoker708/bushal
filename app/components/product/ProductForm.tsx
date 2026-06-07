// app/components/product/ProductForm.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/app/types/product'
import { createBrowserClient } from '@/lib/supabase/client'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface Props {
  mode: 'create' | 'edit'
  product?: Product
}

const CATEGORIES = ['General', 'Clothing', 'Electronics', 'Food', 'Home', 'Other']

export default function ProductForm({ mode, product }: Props) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    in_stock: product?.in_stock ?? true,
    discount_percent: product?.discount_percent?.toString() ?? '',
    stock_quantity: product?.stock_quantity?.toString() ?? '',
    category: product?.category ?? 'General',
  })

  const resolveImages = (p?: Product): string[] => {
    if (!p) return []
    if (Array.isArray(p.images) && p.images.length > 0) return p.images
    if (p.image_url) return [p.image_url]
    return []
  }

  const [images, setImages] = useState<string[]>(() => resolveImages(product))
  const [previews, setPreviews] = useState<string[]>(() => resolveImages(product))

  useEffect(() => {
    const resolved = resolveImages(product)
    setImages(resolved)
    setPreviews(resolved)
  }, [product?.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    setError('')

    const newUrls: string[] = []
    const newPreviews: string[] = []

    for (const file of files) {
      const localPreview = URL.createObjectURL(file)
      newPreviews.push(localPreview)

      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `products/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setUploading(false)
        return
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      newUrls.push(data.publicUrl)
    }

    setImages((prev) => [...prev, ...newUrls])
    setPreviews((prev) => [...prev, ...newPreviews])
    setUploading(false)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = async (index: number) => {
    const url = images[index]
    if (url && url.includes('/product-images/')) {
      const path = url.split('/product-images/')[1]
      if (path) {
        await supabase.storage.from('product-images').remove([`products/${path.split('/products/')[1]}`])
      }
    }
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const qty = parseInt(form.stock_quantity)

    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      images,
      image_url: images[0] ?? null,
      in_stock: qty > 0,
      stock_quantity: isNaN(qty) ? 0 : qty,
      discount_percent: form.discount_percent ? parseInt(form.discount_percent) : null,
      category: form.category || 'General',
    }

    const url = mode === 'create' ? '/api/products' : `/api/products/${product?.id}`
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 text-sm transition-all duration-200 focus:outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15 hover:border-slate-300 resize-none"
          placeholder="Product description..."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 text-sm transition-all duration-200 focus:outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15 hover:border-slate-300"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="price"
          name="price"
          label="Price (৳)"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          placeholder="0.00"
          required
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
      </div>

      <Input
        id="stock_quantity"
        name="stock_quantity"
        label="Stock Quantity"
        type="number"
        min="0"
        value={form.stock_quantity}
        onChange={handleChange}
        placeholder="e.g. 50"
        hint="Setting to 0 will mark the product as out of stock automatically"
        required
      />

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Images</label>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
            {previews.map((src, i) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={src} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm font-medium">Click to upload images</span>
              <span className="text-xs">PNG, JPG, WEBP · Multiple allowed · First image is cover</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-sm text-rose-600 bg-rose-50 border border-rose-200 px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {mode === 'create' ? 'Add Product' : 'Save Changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}