// app/types/product.ts
import { Comment } from './comment'

export interface Product {
  id: string
  name: string
  details?: string | null       // NEW: Short description / key features
  description?: string | null   // Full, broader description
  price: number
  // Admin-only cost tracking
  cost_price?: number | null
  other_costs?: number | null
  image_url?: string | null
  images: string[]
  in_stock: boolean
  stock_quantity: number
  discount_percent?: number | null
  category?: string
  // Soft delete fields
  is_deleted?: boolean
  deleted_at?: string | null
  created_at: string
  updated_at?: string
  comments?: Comment[]
}