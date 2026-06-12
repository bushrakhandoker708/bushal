// app/hooks/useRecentlyViewed.ts

// Zustand store for managing the user's Recently Viewed products.
// Persists data to localStorage to maintain history across sessions.
// Limits the history to the last 12 viewed products to keep 
// localStorage payload small and relevant.
// =========================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/app/types/product'

// Define the shape of a recently viewed item (a lightweight snapshot)
export interface RecentlyViewedItem {
  id: string
  name: string
  price: number
  image_url: string | null // Normalized to always be string or null
  images: string[]
  discount_percent?: number | null
  in_stock: boolean
  viewed_at: string // Timestamp for sorting
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[]
  
  // Actions
  addProduct: (product: Product) => void
  clearHistory: () => void
  
  // Selectors
  getItems: () => RecentlyViewedItem[]
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      // Add a product to the recently viewed list.
      // If it already exists, move it to the front (most recent).
      // Keeps a maximum of 12 items.
      addProduct: (product) => {
        set((state) => {
          // Filter out the product if it's already in the list to avoid duplicates
          const filtered = state.items.filter((item) => item.id !== product.id)

          const newItem: RecentlyViewedItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url ?? null, // FIX: Ensure null instead of undefined for TS compliance
            images: product.images,
            discount_percent: product.discount_percent,
            in_stock: product.in_stock,
            viewed_at: new Date().toISOString(),
          }

          // Prepend the new item and slice to keep only the last 12
          const updatedItems = [newItem, ...filtered].slice(0, 12)

          return { items: updatedItems }
        })
      },

      // Clear all recently viewed items
      clearHistory: () => {
        set({ items: [] })
      },

      // Helper to get the current items
      getItems: () => {
        return get().items
      },
    }),
    {
      // Unique key for localStorage to prevent collisions
      name: 'bushal-recently-viewed-storage',
      
      // Only persist the items array to keep localStorage payload small
      partialize: (state) => ({ items: state.items }),
    }
  )
)
