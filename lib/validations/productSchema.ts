// lib/validations/productSchema.ts
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Name must be under 200 characters'),
  // NEW: Details (short description)
  details: z.string().max(500, 'Details must be under 500 characters').optional().nullable(),
  // Description (full description)
  description: z.string().optional().nullable(),
  // Selling Price
  price: z.number().positive('Selling price must be greater than 0').multipleOf(0.01, 'Price can have at most 2 decimal places'),
  // Cost Price
  cost_price: z.number().min(0, 'Cost price cannot be negative').multipleOf(0.01).optional().nullable().default(0),
  // Other Costs
  other_costs: z.number().min(0, 'Other costs cannot be negative').multipleOf(0.01).optional().nullable().default(0),
  image_url: z.string().url('Must be a valid URL').nullable().optional(),
  images: z.array(z.string()).optional(),
  in_stock: z.boolean().default(true),
  stock_quantity: z.number().int().min(0, 'Stock quantity cannot be negative').default(0),
  discount_percent: z.number().int().min(0).max(100).nullable().optional(),
  category: z.string().min(1, 'Category is required').default('General'),
})

export type ProductInput = z.infer<typeof productSchema>