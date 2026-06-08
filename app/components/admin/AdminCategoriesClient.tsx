// app/components/admin/AdminCategoriesClient.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  created_at: string
}

interface Props {
  initialCategories: Category[]
}

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function AdminCategoriesClient({ initialCategories }: Props) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) {
      setError('Category name is required')
      return
    }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError('A category with this name already exists')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: slugify(name), description: newDesc }),
    })

    setSaving(false)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to create category')
      return
    }

    const data = await res.json()
    setCategories((prev) => [...prev, data.category])
    setNewName('')
    setNewDesc('')
    setAdding(false)
    router.refresh()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Products in this category will remain but lose their category.`)) return
    
    setDeleting(id)
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setDeleting(null)

    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      router.refresh()
    }
  }

  return (
    <div className="animate-fade-in-up space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-bushal-forest">Categories</h1>
          <p className="text-sm text-bushal-inkSoft mt-0.5">{categories.length} categories</p>
        </div>
        <button
          onClick={() => { setAdding(true); setError('') }}
          className="inline-flex items-center gap-2 bg-bushal-copper text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-bushal-copperLight transition-all shadow-lg shadow-bushal-copper/20 hover:-translate-y-0.5 active:scale-[0.97] self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-bushal-surface rounded-2xl border border-bushal-copper/20 p-5 space-y-4">
          <h3 className="font-bold text-bushal-forest text-sm">New Category</h3>
          
          <div>
            <label className="block text-xs font-semibold text-bushal-inkMid mb-1">Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError('') }}
              placeholder="e.g. Accessories"
              className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-bushal-inkMid mb-1">Description (optional)</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Short description..."
              className="w-full rounded-xl border border-bushal-border bg-bushal-surface px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/60 focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20 transition-all"
            />
          </div>

          {newName && (
            <p className="text-xs text-bushal-inkSoft">
              Slug: <span className="font-mono text-bushal-inkMid">{slugify(newName)}</span>
            </p>
          )}

          {error && (
            <p className="text-xs text-bushal-danger bg-bushal-dangerBg border border-bushal-danger/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-bushal-copper text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-bushal-copperLight disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save Category'}
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); setNewDesc(''); setError('') }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-bushal-inkMid bg-bushal-ivoryDeep hover:bg-bushal-border transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="bg-bushal-surface rounded-2xl border border-bushal-border overflow-hidden">
        {categories.length === 0 ? (
          <div className="py-16 text-center text-bushal-inkSoft text-sm">No categories yet</div>
        ) : (
          <div className="divide-y divide-bushal-ivory">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-bushal-ivoryDeep/50 transition-colors">
                <div>
                  <p className="font-semibold text-bushal-ink text-sm">{cat.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-bushal-inkSoft">{cat.slug}</span>
                    {cat.description && (
                      <span className="text-xs text-bushal-inkSoft">· {cat.description}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deleting === cat.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bushal-dangerBg text-bushal-danger text-xs font-semibold hover:bg-bushal-danger/20 disabled:opacity-50 transition-colors"
                >
                  {deleting === cat.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="bg-bushal-warningBg border border-bushal-warning/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-bushal-ink">💡 Tip</p>
        <p className="text-xs text-bushal-inkMid mt-1">
          Removing a category will not delete products. Products will keep their category label, but it won't appear in filters until you update them.
        </p>
      </div>
    </div>
  )
}