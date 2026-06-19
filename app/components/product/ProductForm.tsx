// app/components/product/ProductForm.tsx
'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/app/types/product'
import { createBrowserClient } from '@/lib/supabase/client'
import Input from '@/app/components/ui/Input'
import Button from '@/app/components/ui/Button'
import { getStockStatus } from '@/app/lib/utils/stockStatus'
import { cn } from '@/app/lib/utils/cn'
import { formatPrice } from '@/app/lib/utils/formatPrice'

interface Category {
  id: string
  name: string
  slug: string
}

interface Props {
  mode: 'create' | 'edit'
  product?: Product
  categories: Category[]
}

export default function ProductForm({ mode, product, categories }: Props) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  // FIX: Added `details` to form state for the short description / key features
  const [form, setForm] = useState({
    name: product?.name ?? '',
    details: product?.details ?? '', 
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    cost_price: (product as any)?.cost_price?.toString() ?? '',
    other_costs: (product as any)?.other_costs?.toString() ?? '',
    discount_percent: product?.discount_percent?.toString() ?? '',
    stock_quantity: product?.stock_quantity?.toString() ?? '0',
    // FIX: Ensure category is never empty/null to prevent DB constraint errors
    category: product?.category ?? (categories[0]?.name ?? 'General'),
  })

  const resolveImages = (p?: Product): string[] => {
    if (!p) return []
    if (Array.isArray(p.images) && p.images.length > 0) return p.images
    if (p.image_url) return [p.image_url]
    return []
  }

  const [images, setImages] = useState<string[]>(() => resolveImages(product))
  const [previews, setPreviews] = useState<string[]>(() => resolveImages(product))
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    const resolved = resolveImages(product)
    setImages(resolved)
    setPreviews(resolved)
  }, [product?.id])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // --- Real-time Profit Margin Calculation ---
  const profitMetrics = useMemo(() => {
    const sellingPrice = parseFloat(form.price) || 0
    const costPrice = parseFloat(form.cost_price) || 0
    const otherCosts = parseFloat(form.other_costs) || 0
    const totalCost = costPrice + otherCosts
    const profit = sellingPrice - totalCost
    const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0
    return { sellingPrice, totalCost, profit, profitMargin }
  }, [form.price, form.cost_price, form.other_costs])

  const getMarginColor = (margin: number) => {
    if (margin < 0) return 'text-bushal-danger bg-bushal-dangerBg border-bushal-danger/20'
    if (margin < 20) return 'text-bushal-warning bg-bushal-warningBg border-bushal-warning/20'
    return 'text-bushal-success bg-bushal-successBg border-bushal-success/20'
  }

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    setError('')
    setUploadProgress(0)

    const newUrls: string[] = []
    const newPreviews: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
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
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setImages((prev) => [...prev, ...newUrls])
    setPreviews((prev) => [...prev, ...newPreviews])
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    await uploadFiles(files)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    await uploadFiles(files)
  }

  const removeImage = async (index: number) => {
    const url = images[index]
    if (url && url.includes('/product-images/')) {
      const path = url.split('/product-images/')[1]
      if (path) {
        await supabase.storage
          .from('product-images')
          .remove([`products/${path.split('/products/')[1]}`])
      }
    }
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const qty = parseInt(form.stock_quantity) || 0
    
    // FIX: Strictly enforce category to prevent "null value in column category" bug
    const finalCategory = form.category.trim() || 'General'

    const payload = {
      name: form.name.trim(),
      details: form.details.trim() || null, // NEW: Send short description to API
      description: form.description.trim(),
      price: parseFloat(form.price),
      // New fields for profit tracking
      cost_price: parseFloat(form.cost_price) || 0,
      other_costs: parseFloat(form.other_costs) || 0,
      images,
      image_url: images[0] ?? null,
      in_stock: qty > 0,
      stock_quantity: qty,
      discount_percent: form.discount_percent ? parseInt(form.discount_percent) : null,
      category: finalCategory,
    }

    if (!payload.name) { setError('Product name is required'); setLoading(false); return }
    if (isNaN(payload.price) || payload.price <= 0) { setError('Enter a valid selling price'); setLoading(false); return }

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

  const stockQty = parseInt(form.stock_quantity) || 0
  const stockDisplay = getStockStatus(stockQty)

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Product Name */}
      <Input
        id="name"
        name="name"
        label="Product Name *"
        value={form.name}
        onChange={handleChange}
        placeholder="e.g. Premium Cotton T-Shirt"
        required
      />

      {/* NEW: Key Details / Short Description */}
      <div>
        <label className="block text-sm font-semibold text-bushal-inkMid mb-1.5">
          Key Details <span className="text-bushal-inkSoft font-normal text-xs">(Short Description)</span>
        </label>
        <textarea
          name="details"
          value={form.details}
          onChange={handleChange}
          rows={2}
          maxLength={500}
          className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-3 text-bushal-ink placeholder-bushal-inkSoft/60 text-sm transition-all duration-200 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 hover:border-bushal-borderMid resize-none"
          placeholder="e.g. 100% organic cotton, machine washable, fits true to size."
        />
        <p className="mt-1.5 text-xs text-bushal-inkSoft">
          Displayed prominently near the price on the product page. Max 500 characters.
        </p>
      </div>

      {/* Full Description */}
      <div>
        <label className="block text-sm font-semibold text-bushal-inkMid mb-1.5">
          Full Description
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={6}
          className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-3 text-bushal-ink placeholder-bushal-inkSoft/60 text-sm transition-all duration-200 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 hover:border-bushal-borderMid resize-none"
          placeholder="Tell the full story of the product — materials, craftsmanship, sizing details, brand history..."
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-bushal-inkMid mb-1.5">Category *</label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-3 text-bushal-ink text-sm transition-all duration-200 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 hover:border-bushal-borderMid cursor-pointer"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
          <option value="General">General</option>
        </select>
        <p className="mt-1.5 text-xs text-bushal-inkSoft">
          Manage categories in{' '}
          <a href="/admin/categories" className="text-bushal-copper hover:text-bushal-copperLight font-medium underline underline-offset-2">
            Admin → Categories
          </a>
        </p>
      </div>

      {/* ── PRICING & PROFIT MARGIN SECTION ─── */}
      <div className="bg-bushal-ivoryDeep/50 rounded-2xl border border-bushal-border p-5 space-y-4">
        <h3 className="text-sm font-bold text-bushal-forest flex items-center gap-2">
          <svg className="w-4 h-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Pricing & Profit Analysis
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="cost_price"
            name="cost_price"
            type="number"
            label="Cost Price (৳)"
            value={form.cost_price}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            hint="Base buying price from supplier"
          />
          <Input
            id="other_costs"
            name="other_costs"
            type="number"
            label="Other Costs (৳)"
            value={form.other_costs}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            hint="Shipping, customs, packaging, etc."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-bushal-border">
          <Input
            id="price"
            name="price"
            type="number"
            label="Selling Price (৳) *"
            value={form.price}
            onChange={handleChange}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            required
          />
          <Input
            id="discount_percent"
            name="discount_percent"
            type="number"
            label="Discount (%)"
            value={form.discount_percent}
            onChange={handleChange}
            placeholder="0"
            min="0"
            max="100"
            hint="Leave blank for no discount"
          />
        </div>

        {/* Live Profit Margin Display */}
        {profitMetrics.sellingPrice > 0 && (
          <div className={cn(
            "mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
            getMarginColor(profitMetrics.profitMargin)
          )}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Estimated Profit per Unit</p>
              <p className="text-xl font-bold font-heading">
                {formatPrice(profitMetrics.profit)}
              </p>
              <p className="text-[11px] opacity-70 mt-0.5">
                Selling: {formatPrice(profitMetrics.sellingPrice)} − Total Cost: {formatPrice(profitMetrics.totalCost)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Profit Margin</p>
              <p className="text-2xl font-bold font-heading">
                {profitMetrics.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stock Quantity */}
      <div>
        <Input
          id="stock_quantity"
          name="stock_quantity"
          type="number"
          label="Stock Quantity *"
          value={form.stock_quantity}
          onChange={handleChange}
          placeholder="0"
          min="0"
          step="1"
        />
        <div className="mt-2">
          {stockQty === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-bushal-danger" />
              {stockDisplay.label} — will be hidden from customers
            </span>
          ) : stockQty <= 5 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bushal-warning bg-bushal-warningBg border border-bushal-warning/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-bushal-warning animate-pulse" />
              {stockDisplay.label}!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bushal-success bg-bushal-successBg border border-bushal-success/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-bushal-success" />
              {stockDisplay.label} — {stockQty} units available
            </span>
          )}
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-semibold text-bushal-inkMid mb-1.5">Product Images</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-bushal-copper bg-bushal-copper/5'
              : 'border-bushal-border hover:border-bushal-copper/50 hover:bg-bushal-ivoryDeep'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className="w-12 h-12 rounded-xl bg-bushal-ivoryDeep flex items-center justify-center">
              {uploading ? (
                <svg className="w-6 h-6 text-bushal-copper animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            {uploading ? (
              <div className="w-full max-w-xs">
                <p className="text-sm font-medium text-bushal-ink mb-2">Uploading... {uploadProgress}%</p>
                <div className="h-2 bg-bushal-ivoryDeep rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bushal-copper rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-bushal-ink">Drop images here or click to upload</p>
                <p className="text-xs text-bushal-inkSoft">PNG, JPG, WebP up to 10MB each</p>
              </>
            )}
          </div>
        </div>

        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-bushal-border bg-bushal-ivoryDeep">
                <img src={src} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute top-1 left-1">
                    <span className="text-[10px] font-bold text-white bg-bushal-copper px-1.5 py-0.5 rounded-md">Main</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-bushal-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {previews.length > 1 && (
          <p className="mt-1.5 text-xs text-bushal-inkSoft">First image is the main photo</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 text-sm text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-bushal-border mt-8">
        <Button
          type="button"
          variant="outline"
          className="flex-1 order-2 sm:order-1"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          className="flex-1 order-1 sm:order-2 bg-bushal-copper hover:bg-bushal-copperLight text-white"
        >
          {mode === 'create' ? 'Create Product' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}