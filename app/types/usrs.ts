// types/user.ts

export type UserRole = 'customer' | 'admin'

export interface Profile {
  id: string
  full_name?: string | null
  email?: string | null
  role: UserRole
  phone?: string | null
  address?: string | null
  created_at: string
}