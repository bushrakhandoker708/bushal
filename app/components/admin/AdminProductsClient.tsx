// app/components/admin/AdminProductsClient.tsx

// Updated the Admin Products client component to integrate 
// the new DeleteConfirmationModal with the "Keep Rating" option.
// It also ensures that soft-deleted products are filtered out 
// from the admin view so they don't appear after deletion.

'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { cn } from '@/app/lib/utils/cn'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/ui/Toast'
// Import the new modal and its options type
import DeleteConfirmationModal, { DeleteOptions } from '@/app/components/ui/DeleteConfirmationModal'

interface Props {
  products: Product[]
  categories: string[]
}

type StockFilter = 'all' | 'in_stock' | 'out_of_stock' | 'low_stock'
type SortKey = 'name' | 'price' | 'stock_quantity' | 'created_at' | 'category'
type SortDir = 'asc' | 'desc'

export default function AdminProductsClient({ products, categories }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deleting, setDeleting] = useState<string | null>(null)

  // New state for the custom delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null)

  // Filter out soft-deleted products from the admin view
  // FIX: Use type assertion to handle is_deleted property
  const activeProducts = useMemo(() => {
    return products.filter(p => !(p as any).is_deleted)
  }, [products])

  const filtered = useMemo(() => {
    let list = [...activeProducts]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
      )
    }
    if (stockFilter === 'in_stock') list = list.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 5)
    if (stockFilter === 'out_of_stock') list = list.filter((p) => !p.in_stock)
    if (stockFilter === 'low_stock') list = list.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5)
    if (categoryFilter !== 'all') list = list.filter((p) => p.category === categoryFilter)
    
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  // Updated handleDelete: Opens the modal instead of using native confirm()
  const handleDelete = (id: string, productName: string) => {
    setProductToDelete({ id, name: productName })
    setDeleteModalOpen(true)
  }

  // New confirmDelete function: Handles the actual API call with the selected options
  const confirmDelete = async (options: DeleteOptions) => {
    if (!productToDelete) return
    
    setDeleting(productToDelete.id)
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options) // Pass the admin's choices to the API
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (res.status === 409) {
          toast('Cannot delete product', 'warning', 5000)
          setTimeout(() => {
            toast('This product has been ordered. Set stock to 0 instead.', 'info', 4000)
          }, 100)
        } else {
          toast(data.error || 'Failed to delete product', 'error', 4000)
        }
        return
      }
      
      toast('Product deleted successfully', 'success', 3000)
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

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <svg className="w-3 h-3 inline ml-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : (
      <svg className="w-3 h-3 inline ml-1 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )

  const stockCounts = {
    all: activeProducts.length,
    in_stock: activeProducts.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 5).length,
    low_stock: activeProducts.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5).length,
    out_of_stock: activeProducts.filter((p) => !p.in_stock).length,
  }

  const stockFilterOptions: { value: StockFilter; label: string; color: string; activeColor: string }[] = [
    { value: 'all', label: `All (${stockCounts.all})`, color: 'bg-bushal-surface text-bushal-inkMid border-bushal-border', activeColor: 'bg-bushal-forest text-white border-bushal-forest' },
    { value: 'in_stock', label: `In Stock (${stockCounts.in_stock})`, color: 'bg-bushal-successBg text-bushal-success border-bushal-success/20', activeColor: 'bg-bushal-success text-white border-bushal-success' },
    { value: 'low_stock', label: `Low Stock (${stockCounts.low_stock})`, color: 'bg-bushal-warningBg text-bushal-warning border-bushal-warning/20', activeColor: 'bg-bushal-warning text-white border-bushal-warning' },
    { value: 'out_of_stock', label: `Out of Stock (${stockCounts.out_of_stock})`, color: 'bg-bushal-dangerBg text-bushal-danger border-bushal-danger/20', activeColor: 'bg-bushal-danger text-white border-bushal-danger' },
  ]

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-bushal-forest">Products</h1>
          <p className="text-sm text-bushal-inkSoft mt-0.5">
            Showing {filtered.length} of {activeProducts.length}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-bushal-copper text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-bushal-copperLight transition-all shadow-lg shadow-bushal-copper/20 hover:-translate-y-0.5 active:scale-[0.97] self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* Stock filter pills */}
      <div className="flex gap-2 flex-wrap">
        {stockFilterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStockFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
              stockFilter === opt.value ? opt.activeColor : opt.color + ' hover:opacity-90'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bushal-inkSoft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, category, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-bushal-border bg-bushal-surface text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-bushal-inkSoft hover:text-bushal-ink"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-bushal-border bg-bushal-surface text-sm text-bushal-ink focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-bushal-ivoryDeep border-b border-bushal-border">
                {[
                  { label: 'Product', key: 'name' as SortKey },
                  { label: 'Category', key: 'category' as SortKey },
                  { label: 'Price', key: 'price' as SortKey },
                  { label: 'Stock', key: 'stock_quantity' as SortKey },
                  { label: 'Added', key: 'created_at' as SortKey },
                ].map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-4 py-3 text-left text-xs font-bold text-bushal-inkSoft uppercase tracking-wide cursor-pointer hover:text-bushal-ink select-none"
                  >
                    {label}<SortIcon k={key} />
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-bold text-bushal-inkSoft uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bushal-ivory">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-bushal-inkSoft text-sm">
                    No products match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const qty = product.stock_quantity ?? 0
                  const isOut = qty === 0
                  const isLow = qty > 0 && qty <= 5
                  const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
                  return (
                    <tr key={product.id} className="hover:bg-bushal-ivoryDeep/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0">
                            {cover ? (
                              <img src={cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-bushal-borderMid text-xs">📦</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-bushal-ink truncate max-w-[200px]">{product.name}</p>
                            {product.discount_percent ? (
                              <span className="text-[11px] font-bold text-bushal-copper bg-bushal-copper/10 px-1.5 py-0.5 rounded-md">
                                {product.discount_percent}% OFF
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-bushal-ivoryDeep text-bushal-inkMid">
                          {product.category ?? 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-bushal-forest">{formatPrice(product.price)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                          isOut ? 'bg-bushal-dangerBg text-bushal-danger' :
                          isLow ? 'bg-bushal-warningBg text-bushal-warning' :
                          'bg-bushal-successBg text-bushal-success'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isOut ? 'bg-bushal-danger' : isLow ? 'bg-bushal-warning' : 'bg-bushal-success'
                          )} />
                          {isOut ? 'Out of Stock' : `${qty} units`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-bushal-inkSoft">
                        {new Date(product.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bushal-ivoryDeep text-bushal-inkMid text-xs font-semibold hover:bg-bushal-copper/10 hover:text-bushal-copper transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={deleting === product.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bushal-dangerBg text-bushal-danger text-xs font-semibold hover:bg-bushal-danger/20 transition-colors disabled:opacity-50"
                          >
                            {deleting === product.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border py-16 text-center text-bushal-inkSoft text-sm">
            No products match your filters
          </div>
        ) : (
          filtered.map((product) => {
            const qty = product.stock_quantity ?? 0
            const isOut = qty === 0
            const isLow = qty > 0 && qty <= 5
            const cover = (Array.isArray(product.images) && product.images[0]) || product.image_url
            return (
              <div key={product.id} className="bg-bushal-surface rounded-2xl border border-bushal-border p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-bushal-ivoryDeep border border-bushal-border flex-shrink-0">
                    {cover ? (
                      <img src={cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-bushal-borderMid text-sm"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-bushal-forest text-sm truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bushal-ivoryDeep text-bushal-inkMid font-medium">
                        {product.category ?? 'General'}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-semibold',
                        isOut ? 'bg-bushal-dangerBg text-bushal-danger' :
                        isLow ? 'bg-bushal-warningBg text-bushal-warning' :
                        'bg-bushal-successBg text-bushal-success'
                      )}>
                        {isOut ? 'Out of Stock' : `${qty} in stock`}
                      </span>
                    </div>
                    <p className="font-bold text-bushal-forest text-sm mt-1">{formatPrice(product.price)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bushal-ivoryDeep text-bushal-inkMid text-xs font-semibold hover:bg-bushal-copper/10 hover:text-bushal-copper transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={deleting === product.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bushal-dangerBg text-bushal-danger text-xs font-semibold hover:bg-bushal-danger/20 transition-colors disabled:opacity-50"
                  >
                    {deleting === product.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setProductToDelete(null)
        }}
        onConfirm={confirmDelete}
        productName={productToDelete?.name || ''}
        loading={deleting !== null}
      />
    </div>
  )
}