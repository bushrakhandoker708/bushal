// app/hooks/useWishList.ts
// Description:
// Zustand store for managing the user's Wishlist. 
// Persists data to localStorage so the wishlist survives page reloads 
// and browser sessions, providing a seamless premium shopping experience.
// Uses a normalized structure (storing full product snapshots) to avoid 
// extra database fetches when rendering the Wishlist page.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/app/types/product'

// Define the shape of a wishlist item (a snapshot of the product)
export interface WishlistItem {
  id: string
  name: string
  price: number
  image_url: string | null 
  images: string[]
  category?: string
  discount_percent?: number | null
  in_stock: boolean
  added_at: string 
}

interface WishlistState {
  items: WishlistItem[]
  
  // Actions
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  toggleItem: (product: Product) => void
  clearWishlist: () => void
  
  // Selectors / Helpers
  isInWishlist: (productId: string) => boolean
  getItemCount: () => number
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      // Add a product to the wishlist. Prevents duplicates.
      addItem: (product) => {
        set((state) => {
          // Check if already exists to prevent duplicates
          const exists = state.items.some((item) => item.id === product.id)
          if (exists) return state

          const newItem: WishlistItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url ?? null, 
            images: product.images,
            category: product.category,
            discount_percent: product.discount_percent,
            in_stock: product.in_stock,
            added_at: new Date().toISOString(),
          }

          return { items: [newItem, ...state.items] } // Prepend for newest-first sorting
        })
      },

      // Remove a product by ID
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }))
      },

      // Toggle: Add if not present, remove if present
      toggleItem: (product) => {
        const state = get()
        const exists = state.items.some((item) => item.id === product.id)
        
        if (exists) {
          get().removeItem(product.id)
        } else {
          get().addItem(product)
        }
      },

      // Clear all items from the wishlist
      clearWishlist: () => {
        set({ items: [] })
      },

      // Helper to check if a specific product is in the wishlist
      isInWishlist: (productId) => {
        return get().items.some((item) => item.id === productId)
      },

      // Helper to get the total count of items
      getItemCount: () => {
        return get().items.length
      },
    }),
    {
      // Unique key for localStorage to prevent collisions with other apps
      name: 'bushal-wishlist-storage',
      
      // Only persist the items array to keep localStorage payload small
      partialize: (state) => ({ items: state.items }),
    }
  )
)
