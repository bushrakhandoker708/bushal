// lib/validations/productSchema.ts
import { z } from 'zod'

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Name must be under 200 characters'),
  description: z.string().optional(),
  
  // Selling Price (Visible to customers)
  price: z
    .number()
    .positive('Selling price must be greater than 0')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),
  
  // Cost Price (Buying price from supplier - Admin only)
  cost_price: z
    .number()
    .min(0, 'Cost price cannot be negative')
    .multipleOf(0.01, 'Cost price can have at most 2 decimal places')
    .optional()
    .nullable()
    .default(0),
  
  // Other Costs (Shipping, customs, etc. - Admin only)
  other_costs: z
    .number()
    .min(0, 'Other costs cannot be negative')
    .multipleOf(0.01, 'Other costs can have at most 2 decimal places')
    .optional()
    .nullable()
    .default(0),

  image_url: z.string().url('Must be a valid URL').nullable().optional(),
  images: z.array(z.string()).optional(),
  in_stock: z.boolean().default(true),
  stock_quantity: z.number().int().min(0, 'Stock quantity cannot be negative').default(0),
  discount_percent: z.number().int().min(0).max(100).nullable().optional(),
  
  // FIX: Ensure category always has a default to prevent the "null value in column category" bug
  category: z.string().min(1, 'Category is required').default('General'),
})

export type ProductInput = z.infer<typeof productSchema>