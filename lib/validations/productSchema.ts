// lib/validations/productSchema.ts

import { z } from 'zod'

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Name must be under 200 characters'),
  description: z.string().optional(),
  price: z
    .number()
    .positive('Price must be greater than 0')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),
  image_url: z.string().url('Must be a valid URL').nullable().optional(),
  in_stock: z.boolean().default(true),
  discount_percent: z.number().int().min(0).max(100).nullable().optional(),
  category: z.string().default('General'),
})

export type ProductInput = z.infer<typeof productSchema>