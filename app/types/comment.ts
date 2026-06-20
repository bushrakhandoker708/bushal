// app/types/comment.ts

export interface Comment {
  id: string
  product_id: string
  user_id: string
  
  // Either rating OR body (or both) can be provided
  rating: number | null 
  body: string | null 
  
  admin_reply: string | null
  
  // Admin moderation flag
  is_hidden: boolean 
  
  created_at: string
  updated_at?: string
  
  // Joined profile data (populated in API/Server Component)
  profiles?: {
    full_name: string | null
    role?: string
  }
  
  // Joined product data (optional, for admin views)
  products?: {
    name: string
  }
}

export interface CreateCommentInput {
  product_id: string
  rating?: number | null
  body?: string | null
}

export interface UpdateCommentInput {
  comment_id: string
  type: 'comment' | 'reply' | 'hide'
  rating?: number | null
  body?: string | null
  reply?: string | null
  is_hidden?: boolean
}