// hooks/useCart.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/app/types/cart'
import { Product } from '../types/product'

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id)
          
          if (existingItem) {
            // Check stock limit
            const newQuantity = Math.min(existingItem.quantity + 1, product.stock_quantity ?? 99)
            return {
              items: state.items.map((item) =>
                item.id === product.id ? { ...item, quantity: newQuantity } : item
              ),
            }
          }

          const newItem: CartItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            discount_percent: product.discount_percent ?? 0,
            image_url: (Array.isArray(product.images) && product.images[0]) || product.image_url || null,
            quantity: 1,
            in_stock: product.in_stock,
          }

          return { items: [...state.items, newItem] }
        })
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }))
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === productId
              ? { ...item, quantity: Math.min(quantity, item.in_stock ? 99 : 0) }
              : item
          ).filter((item) => item.quantity > 0), // Auto-remove if quantity drops to 0
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'bushal-cart-storage', // Unique name for localStorage
      partialize: (state) => ({ items: state.items }), // Only persist items
    }
  )
)