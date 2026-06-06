// types/comment.ts

export interface Comment {
  id: string
  product_id: string
  user_id: string
  body: string
  rating?: number | null
  admin_reply?: string | null
  created_at: string
  profiles?: {
    full_name?: string | null
  }
  products?: {
    name: string
  }
}