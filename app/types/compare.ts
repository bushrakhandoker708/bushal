// app/types/compare.ts
import { Product } from './product'

export interface CompareItem extends Product {
  in_stock: boolean
  created_at: string
}

export interface CompareState {
  items: CompareItem[]
  toggleItem: (product: Product) => void
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  clearCompare: () => void
  isInCompare: (productId: string) => boolean
}