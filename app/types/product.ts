// types/product.ts

import { Comment } from './comment'

export interface Product {
  id: string
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  images: string[]
  in_stock: boolean
  stock_quantity: number
  discount_percent?: number | null
  category?: string
  created_at: string
  updated_at?: string
  comments?: Comment[]
}