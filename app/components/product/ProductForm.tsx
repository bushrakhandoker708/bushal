'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/app/types/product'
import { createBrowserClient } from '@/lib/supabase/client'
import { getStockStatus } from '@/app/lib/utils/stockStatus'
import { cn } from '@/app/lib/utils/cn'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Floating-label text input */
function Field({
  id,
  name,
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  hint,
  min,
  max,
  step,
  suffix,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  required?: boolean
  placeholder?: string
  hint?: string
  min?: string
  max?: string
  step?: string
  suffix?: string
}) {
  const [focused, setFocused] = useState(false)
  const lifted = focused || value.length > 0

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          placeholder={lifted ? (placeholder ?? '') : ''}
          min={min}
          max={max}
          step={step}
          className={cn(
            'peer w-full rounded-xl border bg-bushal-surface px-4 pb-2.5 pt-6 text-sm text-bushal-ink',
            'placeholder-bushal-inkSoft/40 outline-none transition-all duration-200',
            'hover:border-bushal-borderMid',
            suffix ? 'pr-12' : '',
            focused
              ? 'border-bushal-copper ring-2 ring-bushal-copper/15'
              : 'border-bushal-border'
          )}
        />
        {/* Floating label */}
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute left-4 font-medium transition-all duration-200 select-none',
            lifted
              ? 'top-2 text-[10px] tracking-wide uppercase'
              : 'top-1/2 -translate-y-1/2 text-sm',
            focused
              ? 'text-bushal-copper'
              : lifted
              ? 'text-bushal-inkSoft'
              : 'text-bushal-inkSoft'
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-bushal-danger">*</span>}
        </label>
        {/* Suffix unit */}
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-bushal-inkSoft pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 pl-1 text-[11px] text-bushal-inkSoft leading-relaxed">{hint}</p>
      )}
    </div>
  )
}

/** Section wrapper with header */
function Section({
  icon,
  title,
  subtitle,
  badge,
  delay = 0,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: React.ReactNode
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl border border-bushal-border/70 bg-bushal-surface shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-bushal-border/50 bg-gradient-to-r from-bushal-ivoryDeep/60 to-bushal-surface px-6 py-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bushal-copper/10 ring-1 ring-bushal-copper/20">
            {icon}
          </div>
          <div>
            <h2 className="font-heading text-sm font-bold tracking-tight text-bushal-forest">
              {title}
            </h2>
            <p className="mt-0.5 text-[11px] text-bushal-inkSoft">{subtitle}</p>
          </div>
        </div>
        {badge}
      </div>
      <div className="p-6">{children}</div>
    </motion.section>
  )
}

/** Step indicator dot */
function StepDot({ n, active }: { n: number; active: boolean }) {
  return (
    <div
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300',
        active
          ? 'bg-bushal-copper text-white shadow-sm shadow-bushal-copper/30'
          : 'bg-bushal-border text-bushal-inkSoft'
      )}
    >
      {n}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductForm({ mode, product, categories }: Props) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const [form, setForm] = useState({
    name: product?.name ?? '',
    details: product?.details ?? '',
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    cost_price: (product as any)?.cost_price?.toString() ?? '',
    other_costs: (product as any)?.other_costs?.toString() ?? '',
    discount_percent: product?.discount_percent?.toString() ?? '',
    stock_quantity: product?.stock_quantity?.toString() ?? '0',
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
  const [catFocused, setCatFocused] = useState(false)

  useEffect(() => {
    const resolved = resolveImages(product)
    setImages(resolved)
    setPreviews(resolved)
  }, [product?.id])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      setForm((prev) => ({ ...prev, [name]: value }))
    },
    []
  )

  // ── Profit Metrics ────────────────────────────────────────────────────────
  const profitMetrics = useMemo(() => {
    const sellingPrice = parseFloat(form.price) || 0
    const costPrice = parseFloat(form.cost_price) || 0
    const otherCosts = parseFloat(form.other_costs) || 0
    const totalCost = costPrice + otherCosts
    const profit = sellingPrice - totalCost
    const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0
    return { sellingPrice, totalCost, profit, profitMargin }
  }, [form.price, form.cost_price, form.other_costs])

  type MarginTier = 'loss' | 'low' | 'good'
  const marginTier: MarginTier =
    profitMetrics.profitMargin < 0 ? 'loss' : profitMetrics.profitMargin < 20 ? 'low' : 'good'

  const MARGIN_STYLES: Record<MarginTier, {
    wrap: string; text: string; pill: string; bar: string; icon: string; label: string
  }> = {
    loss: {
      wrap: 'border-bushal-danger/25 bg-gradient-to-br from-red-50/80 to-rose-50/30',
      text: 'text-bushal-danger',
      pill: 'bg-bushal-danger/10 text-bushal-danger border-bushal-danger/20',
      bar: 'from-bushal-danger to-rose-400',
      icon: 'bg-bushal-danger/10',
      label: 'Loss',
    },
    low: {
      wrap: 'border-bushal-warning/25 bg-gradient-to-br from-amber-50/80 to-orange-50/30',
      text: 'text-bushal-warning',
      pill: 'bg-bushal-warning/10 text-bushal-warning border-bushal-warning/20',
      bar: 'from-bushal-warning to-amber-400',
      icon: 'bg-bushal-warning/10',
      label: 'Low Margin',
    },
    good: {
      wrap: 'border-bushal-success/25 bg-gradient-to-br from-emerald-50/80 to-green-50/30',
      text: 'text-bushal-success',
      pill: 'bg-bushal-success/10 text-bushal-success border-bushal-success/20',
      bar: 'from-bushal-success to-emerald-400',
      icon: 'bg-bushal-success/10',
      label: 'Healthy',
    },
  }

  const ms = MARGIN_STYLES[marginTier]

  // ── Image Upload ──────────────────────────────────────────────────────────
  const uploadFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    setError('')
    setUploadProgress(0)

    const newUrls: string[] = []
    const newPreviews: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      newPreviews.push(URL.createObjectURL(file))

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
    await uploadFiles(Array.from(e.target.files ?? []))
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    await uploadFiles(files)
  }

  const removeImage = async (index: number) => {
    const url = images[index]
    if (url?.includes('/product-images/')) {
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

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const qty = parseInt(form.stock_quantity) || 0
    const finalCategory = form.category.trim() || 'General'

    const payload = {
      name: form.name.trim(),
      details: form.details.trim() || null,
      description: form.description.trim(),
      price: parseFloat(form.price),
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
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PUT',
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>

      {/* ── Progress Steps (visual affordance) ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2 px-1"
      >
        {['Details', 'Pricing', 'Inventory', 'Images'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <StepDot n={i + 1} active />
              <span className="hidden text-[11px] font-semibold text-bushal-inkSoft sm:block">
                {label}
              </span>
            </div>
            {i < 3 && (
              <div className="h-px w-6 bg-bushal-border sm:w-10" />
            )}
          </div>
        ))}
        <div className="ml-auto">
          <span className={cn(
            'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
            mode === 'create'
              ? 'bg-bushal-forest/8 text-bushal-forest'
              : 'bg-bushal-copper/10 text-bushal-copper'
          )}>
            {mode === 'create' ? 'New Product' : 'Editing'}
          </span>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — Basic Information
      ══════════════════════════════════════════════════════════════════ */}
      <Section
        delay={0}
        icon={
          <svg className="h-4 w-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        }
        title="Basic Information"
        subtitle="Name, category and product descriptions"
      >
        <div className="space-y-5">
          {/* Product Name */}
          <Field
            id="name"
            name="name"
            label="Product Name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Premium Hand-Embroidered Kantha Kurta"
            required
          />

          {/* Category select — styled to match floating label aesthetic */}
          <div className="relative">
            <div className="relative">
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                onFocus={() => setCatFocused(true)}
                onBlur={() => setCatFocused(false)}
                className={cn(
                  'w-full appearance-none rounded-xl border bg-bushal-surface px-4 pb-2.5 pt-6 text-sm text-bushal-ink',
                  'outline-none transition-all duration-200 hover:border-bushal-borderMid cursor-pointer',
                  catFocused
                    ? 'border-bushal-copper ring-2 ring-bushal-copper/15'
                    : 'border-bushal-border'
                )}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                <option value="General">General</option>
              </select>
              <label
                className={cn(
                  'pointer-events-none absolute left-4 top-2 text-[10px] font-medium uppercase tracking-wide transition-colors duration-200',
                  catFocused ? 'text-bushal-copper' : 'text-bushal-inkSoft'
                )}
              >
                Category <span className="text-bushal-danger">*</span>
              </label>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                <svg className="h-4 w-4 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="mt-1.5 pl-1 text-[11px] text-bushal-inkSoft">
              Manage categories in{' '}
              <a href="/admin/categories" className="font-semibold text-bushal-copper underline underline-offset-2 decoration-bushal-copper/30 hover:decoration-bushal-copper transition-colors">
                Admin → Categories
              </a>
            </p>
          </div>

          {/* Key Details */}
          <div className="relative">
            <textarea
              id="details"
              name="details"
              value={form.details}
              onChange={handleChange}
              rows={2}
              maxLength={500}
              placeholder=" "
              className={cn(
                'peer w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 pb-3 pt-6 text-sm text-bushal-ink',
                'placeholder-transparent outline-none transition-all duration-200 resize-none leading-relaxed',
                'hover:border-bushal-borderMid focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/15'
              )}
            />
            <label
              htmlFor="details"
              className={cn(
                'pointer-events-none absolute left-4 font-medium transition-all duration-200 select-none',
                'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-bushal-inkSoft',
                'top-2 -translate-y-0 text-[10px] uppercase tracking-wide text-bushal-inkSoft',
                'peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wide peer-focus:text-bushal-copper'
              )}
            >
              Key Details{' '}
              <span className="normal-case tracking-normal text-bushal-inkSoft/60">(short tagline)</span>
            </label>
            <div className="mt-1.5 flex items-center justify-between pl-1">
              <p className="text-[11px] text-bushal-inkSoft">Shown prominently near the price on the product page</p>
              <span className={cn(
                'text-[10px] font-mono tabular-nums',
                form.details.length > 450 ? 'text-bushal-warning font-bold' : 'text-bushal-inkSoft/50'
              )}>
                {form.details.length}/500
              </span>
            </div>
          </div>

          {/* Full Description */}
          <div className="relative">
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder=" "
              className={cn(
                'peer w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 pb-3 pt-6 text-sm text-bushal-ink',
                'placeholder-transparent outline-none transition-all duration-200 resize-none leading-relaxed',
                'hover:border-bushal-borderMid focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/15'
              )}
            />
            <label
              htmlFor="description"
              className={cn(
                'pointer-events-none absolute left-4 font-medium transition-all duration-200 select-none',
                'peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-bushal-inkSoft',
                'top-2 text-[10px] uppercase tracking-wide text-bushal-inkSoft',
                'peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wide peer-focus:text-bushal-copper'
              )}
            >
              Full Description
            </label>
            <p className="mt-1.5 pl-1 text-[11px] text-bushal-inkSoft">
              Materials, craftsmanship, sizing, care instructions — the full story
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — Pricing & Profit Analysis
      ══════════════════════════════════════════════════════════════════ */}
      <Section
        delay={0.06}
        icon={
          <svg className="h-4 w-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        title="Pricing & Profit Analysis"
        subtitle="Cost structure with live margin tracking"
      >
        <div className="space-y-6">

          {/* Cost Row */}
          <div>
            <p className="mb-3 pl-0.5 text-[10px] font-bold uppercase tracking-widest text-bushal-inkSoft">
              Cost Structure
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="cost_price"
                name="cost_price"
                type="number"
                label="Supplier Cost"
                value={form.cost_price}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                suffix="৳"
                hint="Base buying price from supplier"
              />
              <Field
                id="other_costs"
                name="other_costs"
                type="number"
                label="Additional Costs"
                value={form.other_costs}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                suffix="৳"
                hint="Shipping, packaging, customs"
              />
            </div>
          </div>

          {/* Hairline divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-bushal-border/70" />
            <span className="rounded-full border border-bushal-copper/25 bg-bushal-copper/8 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-bushal-copper">
              Selling Price
            </span>
            <div className="h-px flex-1 bg-bushal-border/70" />
          </div>

          {/* Selling Price + Discount Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="price"
              name="price"
              type="number"
              label="Selling Price"
              value={form.price}
              onChange={handleChange}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
              suffix="৳"
            />
            <Field
              id="discount_percent"
              name="discount_percent"
              type="number"
              label="Discount"
              value={form.discount_percent}
              onChange={handleChange}
              placeholder="0"
              min="0"
              max="100"
              suffix="%"
              hint="Leave blank if no discount"
            />
          </div>

          {/* Live Margin Card */}
          <AnimatePresence mode="wait">
            {profitMetrics.sellingPrice > 0 && (
              <motion.div
                key={marginTier}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-5 transition-colors duration-300',
                  ms.wrap
                )}
              >
                {/* Decorative corner accent */}
                <div
                  className={cn(
                    'pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10',
                    `bg-gradient-to-br ${ms.bar}`
                  )}
                />

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: profit per unit */}
                  <div className="flex items-center gap-4">
                    <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', ms.icon)}>
                      {profitMetrics.profit >= 0 ? (
                        <svg className={cn('h-5 w-5', ms.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className={cn('h-5 w-5', ms.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={cn('font-heading text-2xl font-bold tabular-nums', ms.text)}>
                          {formatPrice(profitMetrics.profit)}
                        </p>
                        <span className={cn('rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest', ms.pill)}>
                          {ms.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-bushal-inkSoft">
                        Profit per unit · Selling{' '}
                        <span className="font-semibold text-bushal-ink">{formatPrice(profitMetrics.sellingPrice)}</span>
                        {' − '}Cost{' '}
                        <span className="font-semibold text-bushal-ink">{formatPrice(profitMetrics.totalCost)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: margin dial */}
                  <div className="flex flex-col items-end gap-2 sm:min-w-[100px] sm:items-center">
                    <p className={cn('font-heading text-4xl font-bold tabular-nums leading-none', ms.text)}>
                      {profitMetrics.profitMargin.toFixed(1)}
                      <span className="text-xl">%</span>
                    </p>
                    <p className={cn('text-[9px] font-bold uppercase tracking-widest opacity-60', ms.text)}>
                      margin
                    </p>
                    {/* Mini progress bar */}
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/10">
                      <motion.div
                        className={cn('h-full rounded-full bg-gradient-to-r', ms.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Math.abs(profitMetrics.profitMargin), 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state hint when no price entered */}
          {profitMetrics.sellingPrice === 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-bushal-border bg-bushal-ivoryDeep/40 px-4 py-3">
              <svg className="h-4 w-4 flex-shrink-0 text-bushal-inkSoft/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[11px] text-bushal-inkSoft">
                Enter a selling price to see your real-time profit margin.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — Inventory
      ══════════════════════════════════════════════════════════════════ */}
      <Section
        delay={0.12}
        icon={
          <svg className="h-4 w-4 text-bushal-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        title="Inventory"
        subtitle="Stock quantity and storefront visibility"
        badge={
          <AnimatePresence mode="wait">
            <motion.span
              key={stockQty === 0 ? 'out' : stockQty <= 5 ? 'low' : 'in'}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                stockQty === 0
                  ? 'border-bushal-danger/25 bg-bushal-dangerBg text-bushal-danger'
                  : stockQty <= 5
                  ? 'border-bushal-warning/25 bg-bushal-warningBg text-bushal-warning'
                  : 'border-bushal-success/25 bg-bushal-successBg text-bushal-success'
              )}
            >
              {stockDisplay.label}
            </motion.span>
          </AnimatePresence>
        }
      >
        <div className="space-y-4">
          <Field
            id="stock_quantity"
            name="stock_quantity"
            type="number"
            label="Stock Quantity"
            value={form.stock_quantity}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="1"
            required
          />

          {/* Contextual Stock Status */}
          <AnimatePresence mode="wait">
            <motion.div
              key={stockQty === 0 ? 'out' : stockQty <= 5 ? 'low' : 'in'}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.2 }}
            >
              {stockQty === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-bushal-danger/20 bg-bushal-dangerBg px-4 py-3">
                  <span className="relative mt-0.5 flex h-2.5 w-2.5 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bushal-danger opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bushal-danger" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-bushal-danger">Out of Stock</p>
                    <p className="mt-0.5 text-[11px] text-bushal-danger/70">
                      This product will be hidden from customers until stock is added.
                    </p>
                  </div>
                </div>
              ) : stockQty <= 5 ? (
                <div className="flex items-start gap-3 rounded-xl border border-bushal-warning/20 bg-bushal-warningBg px-4 py-3">
                  <span className="relative mt-0.5 flex h-2.5 w-2.5 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bushal-warning opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bushal-warning" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-bushal-warning">Low Stock — {stockQty} unit{stockQty !== 1 ? 's' : ''} left</p>
                    <p className="mt-0.5 text-[11px] text-bushal-warning/70">
                      Consider restocking soon to avoid selling out.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-bushal-success/20 bg-bushal-successBg px-4 py-3">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-bushal-success" />
                  <p className="text-xs font-semibold text-bushal-success">
                    In Stock · {stockQty} units available
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — Product Images
      ══════════════════════════════════════════════════════════════════ */}
      <Section
        delay={0.18}
        icon={
          <svg className="h-4 w-4 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        title="Product Images"
        subtitle={
          previews.length === 0
            ? 'Upload up to 10 images'
            : `${previews.length} of 10 uploaded · First image is the main photo`
        }
        badge={
          previews.length > 0 ? (
            <span className="rounded-full border border-bushal-copper/25 bg-bushal-copper/10 px-3 py-1 text-[10px] font-bold text-bushal-copper">
              {previews.length}/10
            </span>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              'relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300',
              dragOver
                ? 'scale-[1.005] border-bushal-copper bg-bushal-copper/5 shadow-inner shadow-bushal-copper/10'
                : 'border-bushal-border/80 hover:border-bushal-copper/50 hover:bg-bushal-ivoryDeep/60',
              uploading ? 'cursor-wait' : ''
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="pointer-events-none flex flex-col items-center gap-3">
              <motion.div
                animate={{ scale: dragOver ? 1.12 : 1, rotate: dragOver ? 4 : 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors duration-300',
                  dragOver
                    ? 'border-bushal-copper/30 bg-bushal-copper/12'
                    : 'border-bushal-border bg-bushal-ivoryDeep'
                )}
              >
                {uploading ? (
                  <svg className="h-7 w-7 animate-spin text-bushal-copper" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg
                    className={cn('h-7 w-7 transition-colors duration-300', dragOver ? 'text-bushal-copper' : 'text-bushal-inkSoft')}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </motion.div>

              {uploading ? (
                <div className="w-full max-w-xs space-y-2.5">
                  <p className="text-sm font-semibold text-bushal-ink">
                    Uploading {uploadProgress}%
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bushal-border">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-bushal-copper to-bushal-copperLight"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-xs text-bushal-inkSoft">Please wait — do not close this page</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-bushal-ink">
                      <span className="text-bushal-copper">Click to upload</span>
                      {' '}or drag & drop
                    </p>
                    <p className="mt-1 text-xs text-bushal-inkSoft">
                      PNG, JPG, WebP · up to 10 MB each · max 10 images
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Image Grid */}
          <AnimatePresence>
            {previews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
              >
                {previews.map((src, i) => (
                  <motion.div
                    key={src}
                    layout
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.75 }}
                    transition={{ duration: 0.22, delay: i * 0.03 }}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-bushal-border bg-bushal-ivoryDeep shadow-sm transition-shadow hover:shadow-md"
                  >
                    <img
                      src={src}
                      alt={`Product ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    {/* Main badge */}
                    {i === 0 && (
                      <div className="absolute left-2 top-2">
                        <span className="rounded-md bg-bushal-copper/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                          Main
                        </span>
                      </div>
                    )}

                    {/* Index */}
                    <div className="absolute bottom-2 left-2">
                      <span className="rounded bg-black/40 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-sm">
                        #{i + 1}
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-bushal-danger/90 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-bushal-danger group-hover:opacity-100"
                      title="Remove image"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}

                {/* Add more slot */}
                {previews.length < 10 && (
                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-bushal-border/60 bg-bushal-ivoryDeep/40 text-bushal-inkSoft transition-colors hover:border-bushal-copper/50 hover:bg-bushal-copper/5 hover:text-bushal-copper"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-[9px] font-bold uppercase tracking-wide">Add</span>
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Section>

      {/* ─── Error ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-3 rounded-xl border border-bushal-danger/25 bg-bushal-dangerBg px-5 py-4 shadow-sm"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bushal-danger/10">
              <svg className="h-4 w-4 text-bushal-danger" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-bushal-danger">Unable to save</p>
              <p className="mt-0.5 text-sm text-bushal-danger/80">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Action Bar ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="flex flex-col gap-3 border-t border-bushal-border/60 pt-6 sm:flex-row"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-bushal-border bg-bushal-surface px-6 py-3 text-sm font-semibold text-bushal-inkMid transition-all duration-200 hover:border-bushal-borderMid hover:bg-bushal-ivoryDeep hover:text-bushal-ink order-2 sm:order-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'relative flex-1 overflow-hidden rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 order-1 sm:order-2',
            'disabled:opacity-60 disabled:cursor-wait',
            mode === 'create'
              ? 'bg-bushal-forest hover:bg-bushal-forestMid active:scale-[0.99]'
              : 'bg-bushal-copper hover:bg-bushal-copperLight active:scale-[0.99]'
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {mode === 'create' ? 'Creating…' : 'Saving…'}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {mode === 'create' ? (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Product
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </span>
          )}
        </button>
      </motion.div>
    </form>
  )
}