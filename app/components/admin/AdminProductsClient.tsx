// app/components/admin/AdminProductsClient.tsx
'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { cn } from '@/app/lib/utils/cn'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/ui/Toast'
import DeleteConfirmationModal, { DeleteOptions } from '@/app/components/ui/DeleteConfirmationModal'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  products: Product[]
  categories: string[]
}

type StockFilter = 'all' | 'in_stock' | 'out_of_stock' | 'low_stock'
type SortKey = 'name' | 'price' | 'stock_quantity' | 'created_at' | 'category'
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'created_at', label: 'Date Added' },
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'stock_quantity', label: 'Stock Level' },
  { key: 'category', label: 'Category' },
]

export default function AdminProductsClient({ products, categories }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  
  // Delete State
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null)
  
  // Bulk State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydration fix for animations
  useEffect(() => setMounted(true), [])

  // Filter Active Products (Soft Delete Handling)
  const activeProducts = useMemo(() => {
    return products.filter((p) => !(p as any).is_deleted)
  }, [products])

  // Filtering & Sorting Logic
  const filtered = useMemo(() => {
    let list = [...activeProducts]
    
    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
      )
    }

    // Stock Filter
    if (stockFilter === 'in_stock') list = list.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 5)
    if (stockFilter === 'out_of_stock') list = list.filter((p) => !p.in_stock)
    if (stockFilter === 'low_stock') list = list.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5)
    
    // Category Filter
    if (categoryFilter !== 'all') list = list.filter((p) => p.category === categoryFilter)

    // Sorting
    list.sort((a, b) => {
      let va: any = a[sortKey as keyof Product]
      let vb: any = b[sortKey as keyof Product]
      
      if (sortKey === 'name' || sortKey === 'category') {
        va = (va ?? '').toLowerCase()
        vb = (vb ?? '').toLowerCase()
      }
      
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [activeProducts, search, stockFilter, categoryFilter, sortKey, sortDir])

  // --- CSV Export Feature ---
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast('No products to export', 'warning')
      return
    }

    // Define CSV headers
    const headers = ['Product Name', 'Stock Available', 'Price (BDT)']
    
    // Map data to CSV rows
    const rows = filtered.map(p => [
      `"${p.name.replace(/"/g, '""')}"`, // Escape quotes in name
      p.stock_quantity ?? 0,
      p.price
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `bushal_products_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast('Product list downloaded successfully', 'success')
  }

  // Handlers
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === filtered.length) return new Set()
      return new Set(filtered.map((p) => p.id))
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleDelete = (id: string, productName: string) => {
    setProductToDelete({ id, name: productName })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async (options: DeleteOptions) => {
    if (!productToDelete) return
    setDeleting(productToDelete.id)
    
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          toast('Cannot delete product', 'warning', 5000)
          setTimeout(() => toast('This product has order history. Set stock to 0 instead.', 'info', 4000), 100)
        } else {
          toast(data.error || 'Failed to delete product', 'error', 4000)
        }
        return
      }

      toast('Product deleted successfully', 'success', 3000)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(productToDelete.id)
        return next
      })
      router.refresh()
    } catch (err) {
      console.error('Delete error:', err)
      toast('Failed to delete product', 'error', 4000)
    } finally {
      setDeleting(null)
      setDeleteModalOpen(false)
      setProductToDelete(null)
    }
  }

  const confirmBulkDelete = async (options: DeleteOptions) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkDeleting(true)
    let succeeded = 0
    let blocked = 0
    let failed = 0

    for (const id of ids) {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        })
        if (res.ok) succeeded++
        else if (res.status === 409) blocked++
        else failed++
      } catch {
        failed++
      }
    }

    if (succeeded > 0) toast(`${succeeded} product${succeeded > 1 ? 's' : ''} deleted`, 'success', 3000)
    if (blocked > 0) setTimeout(() => toast(`${blocked} product${blocked > 1 ? 's' : ''} couldn't be deleted (has orders)`, 'warning', 5000), 100)
    if (failed > 0) setTimeout(() => toast(`${failed} product${failed > 1 ? 's' : ''} failed to delete`, 'error', 4000), 200)

    setBulkDeleting(false)
    setBulkDeleteOpen(false)
    clearSelection()
    router.refresh()
  }

  // Stats for Filters
  const stockCounts = {
    all: activeProducts.length,
    in_stock: activeProducts.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 5).length,
    low_stock: activeProducts.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5).length,
    out_of_stock: activeProducts.filter((p) => !p.in_stock).length,
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
  const someSelected = selectedIds.size > 0 && !allSelected

  // Helper Components
  const SortIcon = ({ k }: { k: SortKey }) => (
    <motion.svg 
      animate={{ rotate: sortKey === k ? (sortDir === 'asc' ? 0 : 180) : 0 }}
      className={cn("w-3 h-3 inline ml-1 transition-colors", sortKey === k ? "text-bushal-copper" : "text-bushal-inkSoft/50")} 
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
    </motion.svg>
  )

  const StockBadge = ({ qty, inStock }: { qty: number, inStock: boolean }) => {
    const maxStock = 50 // For progress bar visualization
    const percentage = Math.min(100, (qty / maxStock) * 100)
    
    if (!inStock || qty === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-bushal-danger/10 text-bushal-danger border border-bushal-danger/20">
            <span className="w-1.5 h-1.5 rounded-full bg-bushal-danger animate-pulse" />
            Out of Stock
          </span>
          <div className="h-1 w-16 bg-bushal-ivoryDeep rounded-full overflow-hidden hidden sm:block">
             <div className="h-full bg-bushal-danger w-0" />
          </div>
        </motion.div>
      )
    }
    if (qty <= 5) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-bushal-warning/10 text-bushal-warning border border-bushal-warning/20">
            <span className="w-1.5 h-1.5 rounded-full bg-bushal-warning animate-pulse" />
            Low Stock ({qty})
          </span>
          <div className="h-1 w-16 bg-bushal-ivoryDeep rounded-full overflow-hidden hidden sm:block">
             <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.5 }} className="h-full bg-bushal-warning" />
          </div>
        </motion.div>
      )
    }
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-bushal-success/10 text-bushal-success border border-bushal-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-bushal-success" />
          In Stock ({qty})
        </span>
        <div className="h-1 w-16 bg-bushal-ivoryDeep rounded-full overflow-hidden hidden sm:block">
           <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.5 }} className="h-full bg-bushal-success" />
        </div>
      </motion.div>
    )
  }

  if (!mounted) return null

  return (
    <div className="space-y-8 pb-20 animate-fade-in-up">
      
      {/* --- Header Section with Blended Circle --- */}
      <div className="relative overflow-visible min-h-[240px] flex items-end pb-8">

        
        <div className="relative z-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold tracking-tight text-bushal-ink font-heading"
            >
              Products
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="text-bushal-inkSoft mt-2 text-base md:text-lg max-w-lg font-medium"
            >
              Manage your inventory, pricing, and availability with precision.
            </motion.p>
          </div>
          <motion.div 
            className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
             <motion.button 
               whileHover={{ scale: 1.02, y: -2 }}
               whileTap={{ scale: 0.98 }}
               onClick={handleExportCSV}
               className="group inline-flex items-center justify-center gap-2 bg-white text-bushal-ink border-2 border-bushal-border px-5 py-3.5 rounded-2xl font-semibold text-sm hover:border-bushal-copper hover:text-bushal-copper transition-all active:scale-95 whitespace-nowrap shadow-sm hover:shadow-md"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download List
             </motion.button>
             <motion.div 
               whileHover={{ scale: 1.02, y: -2 }}
               whileTap={{ scale: 0.98 }}
             >
              <Link
                href="/admin/products/new"
                className="group relative inline-flex items-center justify-center gap-2 bg-bushal-copper text-white px-6 py-3.5 rounded-2xl font-semibold text-sm shadow-lg shadow-bushal-copper/30 hover:bg-bushal-copperLight transition-all active:scale-95 whitespace-nowrap overflow-hidden"
              >
                <span className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="relative z-10">Add New Product</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* --- Filters & Controls --- */}
      <div className="space-y-6 px-2">
        {/* Stock Pills */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[
            { value: 'all', label: 'All Items', count: stockCounts.all, color: 'border-bushal-border text-bushal-inkMid bg-bushal-surface hover:border-bushal-forest/30', active: 'bg-bushal-forest text-white border-bushal-forest shadow-md shadow-bushal-forest/20' },
            { value: 'in_stock', label: 'In Stock', count: stockCounts.in_stock, color: 'border-bushal-success/30 text-bushal-success bg-bushal-success/5 hover:bg-bushal-success/10', active: 'bg-bushal-success text-white border-bushal-success shadow-md shadow-bushal-success/20' },
            { value: 'low_stock', label: 'Low Stock', count: stockCounts.low_stock, color: 'border-bushal-warning/30 text-bushal-warning bg-bushal-warning/5 hover:bg-bushal-warning/10', active: 'bg-bushal-warning text-white border-bushal-warning shadow-md shadow-bushal-warning/20' },
            { value: 'out_of_stock', label: 'Out of Stock', count: stockCounts.out_of_stock, color: 'border-bushal-danger/30 text-bushal-danger bg-bushal-danger/5 hover:bg-bushal-danger/10', active: 'bg-bushal-danger text-white border-bushal-danger shadow-md shadow-bushal-danger/20' },
          ].map((opt) => (
            <motion.button
              key={opt.value}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStockFilter(opt.value as StockFilter)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-2.5 cursor-pointer",
                stockFilter === opt.value ? opt.active : `${opt.color}`
              )}
            >
              {opt.label}
              <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-mono", stockFilter === opt.value ? "bg-white/20" : "bg-bushal-ivoryDeep")}>
                {opt.count}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Search + Sort Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search */}
          <div className="md:col-span-5 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-bushal-inkSoft/50 group-focus-within:text-bushal-copper transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search products by name, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-bushal-border/60 bg-bushal-surface/80 backdrop-blur-sm text-sm text-bushal-ink placeholder-bushal-inkSoft/50 focus:outline-none focus:border-bushal-copper focus:ring-4 focus:ring-bushal-copper/10 transition-all shadow-sm"
            />
            {search && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-bushal-ivoryDeep text-bushal-inkSoft hover:text-bushal-danger transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </motion.button>
            )}
          </div>

          {/* Category Select */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none px-5 py-3.5 rounded-2xl border border-bushal-border/60 bg-bushal-surface/80 backdrop-blur-sm text-sm text-bushal-ink focus:outline-none focus:border-bushal-copper focus:ring-4 focus:ring-bushal-copper/10 transition-all shadow-sm cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-bushal-inkSoft/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="md:col-span-4 flex gap-3">
            <div className="relative flex-1">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-full appearance-none px-5 py-3.5 rounded-2xl border border-bushal-border/60 bg-bushal-surface/80 backdrop-blur-sm text-sm text-bushal-ink focus:outline-none focus:border-bushal-copper focus:ring-4 focus:ring-bushal-copper/10 transition-all shadow-sm cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => <option key={opt.key} value={opt.key}>Sort: {opt.label}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-bushal-inkSoft/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="px-4 py-3.5 rounded-2xl border border-bushal-border/60 bg-bushal-surface/80 backdrop-blur-sm text-bushal-inkMid hover:bg-bushal-ivoryDeep hover:text-bushal-forest transition-all shadow-sm flex items-center justify-center"
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              <SortIcon k={sortKey} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* --- Bulk Action Toolbar --- */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="sticky top-4 z-30 flex items-center justify-between bg-bushal-forest/95 backdrop-blur-md text-white rounded-2xl px-6 py-4 shadow-2xl shadow-bushal-forest/30 border border-white/10 mx-2"
          >
            <div className="flex items-center gap-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm border border-white/20"
              >
                {selectedIds.size}
              </motion.div>
              <span className="text-sm font-medium hidden sm:inline">items selected</span>
            </div>
            <div className="flex items-center gap-3">
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                onClick={clearSelection} 
                className="text-xs font-bold px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
              >
                Clear
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                onClick={() => setBulkDeleteOpen(true)} 
                disabled={bulkDeleting}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-bushal-danger hover:bg-bushal-danger/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-bushal-danger/20 border border-bushal-danger/50"
              >
                {bulkDeleting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Delete Selected
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Desktop Table View --- */}
      <div className="hidden lg:block bg-bushal-surface/50 backdrop-blur-sm rounded-3xl border border-bushal-border/50 overflow-hidden shadow-sm mx-2">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-bushal-ivoryDeep/50 border-b border-bushal-border/50">
                <th className="px-8 py-5 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded-lg border-bushal-borderMid text-bushal-copper focus:ring-bushal-copper/30 cursor-pointer accent-bushal-copper"
                  />
                </th>
                {[
                  { label: 'Product', key: 'name' as SortKey },
                  { label: 'Category', key: 'category' as SortKey },
                  { label: 'Price', key: 'price' as SortKey },
                  { label: 'Status', key: 'stock_quantity' as SortKey },
                ].map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-6 py-5 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wider cursor-pointer hover:text-bushal-forest transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon k={key} />
                    </div>
                  </th>
                ))}
                <th className="px-8 py-5 text-right text-xs font-bold text-bushal-inkSoft uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bushal-border/30">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-bushal-inkSoft/50">
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-16 h-16 rounded-full bg-bushal-ivoryDeep flex items-center justify-center mb-4"
                        >
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </motion.div>
                        <p className="text-sm font-medium">No products match your filters</p>
                        <p className="text-xs mt-1">Try adjusting your search or category.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => {
                    const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
                    const isSelected = selectedIds.has(product.id)
                    return (
                      <motion.tr
                        layout
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "group hover:bg-bushal-ivoryDeep/40 transition-colors cursor-pointer",
                          isSelected && "bg-bushal-copper/5 hover:bg-bushal-copper/10"
                        )}
                        onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT' && !(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('a')) toggleSelect(product.id) }}
                      >
                        <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(product.id)}
                            className="w-5 h-5 rounded-lg border-bushal-borderMid text-bushal-copper focus:ring-bushal-copper/30 cursor-pointer accent-bushal-copper"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <motion.div 
                              whileHover={{ scale: 1.05 }}
                              className="w-14 h-14 rounded-2xl overflow-hidden bg-bushal-ivoryDeep border border-bushal-border/50 flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
                            >
                              {cover ? (
                                <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-bushal-borderMid text-xs">📦</div>
                              )}
                            </motion.div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-bushal-ink truncate max-w-[220px]">{product.name}</p>
                              {product.discount_percent ? (
                                <motion.span 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="inline-block mt-1 text-[10px] font-bold text-bushal-copper bg-bushal-copper/10 px-2 py-0.5 rounded-md border border-bushal-copper/20"
                                >
                                  {product.discount_percent}% OFF
                                </motion.span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold bg-bushal-ivoryDeep text-bushal-inkMid border border-bushal-border/50">
                            {product.category ?? 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-bushal-forest tabular-nums">{formatPrice(product.price)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <StockBadge qty={product.stock_quantity ?? 0} inStock={product.in_stock} />
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-x-2 group-hover:translate-x-0">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Link
                                href={`/admin/products/${product.id}/edit`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-2.5 rounded-xl text-bushal-inkMid hover:text-bushal-copper hover:bg-bushal-copper/10 transition-all"
                                title="Edit Product"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </Link>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.name) }}
                                disabled={deleting === product.id}
                                className="p-2.5 rounded-xl text-bushal-inkMid hover:text-bushal-danger hover:bg-bushal-danger/10 transition-all disabled:opacity-50"
                                title="Delete Product"
                              >
                                {deleting === product.id ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                )}
                              </button>
                            </motion.div>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Mobile Card View --- */}
      <div className="lg:hidden space-y-4 px-2">
        {filtered.length === 0 ? (
          <div className="bg-bushal-surface/50 backdrop-blur-sm rounded-3xl border border-bushal-border/50 p-12 text-center text-bushal-inkSoft">
            No products match your filters
          </div>
        ) : (
          <>
            {/* Mobile Select All Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-bushal-surface/80 backdrop-blur-sm rounded-2xl border border-bushal-border/50 shadow-sm sticky top-20 z-20">
              <label className="flex items-center gap-3 text-xs font-bold text-bushal-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded-lg border-bushal-borderMid text-bushal-copper focus:ring-bushal-copper/30 cursor-pointer accent-bushal-copper"
                />
                Select all ({filtered.length})
              </label>
            </div>

            <AnimatePresence mode="popLayout">
              {filtered.map((product) => {
                const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
                const isSelected = selectedIds.has(product.id)
                return (
                  <motion.div
                    layout
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "relative bg-bushal-surface/80 backdrop-blur-sm rounded-3xl border p-5 transition-all shadow-sm",
                      isSelected ? "border-bushal-copper ring-2 ring-bushal-copper/20 shadow-md" : "border-bushal-border/50 hover:border-bushal-border"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="w-5 h-5 mt-1 rounded-lg border-bushal-borderMid text-bushal-copper focus:ring-bushal-copper/30 cursor-pointer accent-bushal-copper flex-shrink-0"
                      />
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="w-20 h-20 rounded-2xl overflow-hidden bg-bushal-ivoryDeep border border-bushal-border/50 flex-shrink-0 shadow-inner"
                      >
                        {cover ? (
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-bushal-borderMid text-sm">📦</div>
                        )}
                      </motion.div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-bold text-bushal-ink text-sm leading-snug line-clamp-2">{product.name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] px-2.5 py-1 rounded-lg bg-bushal-ivoryDeep text-bushal-inkMid font-semibold border border-bushal-border/50">
                            {product.category ?? 'General'}
                          </span>
                          <StockBadge qty={product.stock_quantity ?? 0} inStock={product.in_stock} />
                        </div>
                        <p className="font-bold text-bushal-forest text-lg mt-3 tabular-nums">{formatPrice(product.price)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-5 pt-4 border-t border-bushal-border/30">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-bushal-ivoryDeep text-bushal-inkMid text-xs font-bold hover:bg-bushal-copper/10 hover:text-bushal-copper transition-all active:scale-95 border border-transparent hover:border-bushal-copper/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit Details
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deleting === product.id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-bushal-danger/5 text-bushal-danger text-xs font-bold hover:bg-bushal-danger hover:text-white transition-all active:scale-95 border border-bushal-danger/10 hover:border-bushal-danger"
                      >
                        {deleting === product.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* --- Modals --- */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setProductToDelete(null) }}
        onConfirm={confirmDelete}
        productName={productToDelete?.name || ''}
        loading={deleting !== null}
      />

      <DeleteConfirmationModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        productName={`${selectedIds.size} selected product${selectedIds.size > 1 ? 's' : ''}`}
        loading={bulkDeleting}
      />
    </div>
  )
}