// types/cart.ts

export interface CartItem {
  id: string
  name: string
  price: number
  image_url?: string | null
  discount_percent?: number | null
  quantity: number
  in_stock: boolean 
}