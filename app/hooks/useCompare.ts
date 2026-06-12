// app/hooks/useCompare.ts
// Zustand store for managing the Product Comparison feature.
// Allows users to select up to 4 products to compare side-by-side.
// Persists data to localStorage so the selection survives page reloads.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/app/types/product'

// Define the shape of a comparison item (snapshot of the product)
export interface CompareItem {
  id: string
  name: string
  price: number
  image_url: string | null
  images: string[]
  category?: string
  description?: string | null
  stock_quantity: number
  discount_percent?: number | null
  in_stock: boolean
  added_at: string
}

interface CompareState {
  items: CompareItem[]
  
  // Actions
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  toggleItem: (product: Product) => void
  clearCompare: () => void
  
  // Selectors / Helpers
  isInCompare: (productId: string) => boolean
  getItemCount: () => number
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],

      // Add a product to the comparison list. Max 4 items allowed.
      addItem: (product) => {
        set((state) => {
          // Check if already exists to prevent duplicates
          const exists = state.items.some((item) => item.id === product.id)
          if (exists) return state

          // Limit to 4 products for a clean comparison UI
          if (state.items.length >= 4) return state

          const newItem: CompareItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url ?? null,
            images: product.images,
            category: product.category,
            description: product.description,
            stock_quantity: product.stock_quantity,
            discount_percent: product.discount_percent,
            in_stock: product.in_stock,
            added_at: new Date().toISOString(),
          }

          return { items: [...state.items, newItem] }
        })
      },

      // Toggle a product in/out of the comparison list
      toggleItem: (product) => {
        set((state) => {
          const exists = state.items.some((item) => item.id === product.id)
          
          if (exists) {
            // Remove if exists
            return { 
              items: state.items.filter((item) => item.id !== product.id) 
            }
          } else {
            // Add if doesn't exist (max 4)
            if (state.items.length >= 4) return state

            const newItem: CompareItem = {
              id: product.id,
              name: product.name,
              price: product.price,
              image_url: product.image_url ?? null,
              images: product.images,
              category: product.category,
              description: product.description,
              stock_quantity: product.stock_quantity,
              discount_percent: product.discount_percent,
              in_stock: product.in_stock,
              added_at: new Date().toISOString(),
            }

            return { items: [...state.items, newItem] }
          }
        })
      },

      // Remove a product by ID
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }))
      },

      // Clear all items from the comparison list
      clearCompare: () => {
        set({ items: [] })
      },

      // Helper to check if a specific product is in the comparison list
      isInCompare: (productId) => {
        return get().items.some((item) => item.id === productId)
      },

      // Helper to get the total count of items
      getItemCount: () => {
        return get().items.length
      },
    }),
    {
      // Unique key for localStorage to prevent collisions
      name: 'bushal-compare-storage',
      
      // Only persist the items array to keep localStorage payload small
      partialize: (state) => ({ items: state.items }),
    }
  )
)