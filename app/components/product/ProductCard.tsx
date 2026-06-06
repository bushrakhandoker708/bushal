// components/product/ProductCard.tsx

'use client'

import Link from 'next/link'

import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { useCart } from '@/app/hooks/useCart'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart()

  const discountedPrice =
    product.discount_percent
      ? product.price * (1 - product.discount_percent / 100)
      : null
  // Calculate actual ratings from comments
  const comments = product.comments || []
  const validRatings = comments.map(c => c.rating).filter(r => r != null) as number[]
  const averageRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
    : 0
  const ratingCount = validRatings.length



  return (
    <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden group">
      {/* Product image */}
      <Link href={`/product/${product.id}`}>
        <div className="relative h-52 bg-gray-100 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Discount badge */}
          {product.discount_percent && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              -{product.discount_percent}%
            </span>
          )}

          {/* Out of stock overlay */}
          {!product.in_stock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Product info */}
      <div className="p-4">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-orange-500 transition truncate">
            {product.name}
          </h3>
        </Link>

        {/* Rating placeholder,Dynamic */}
    
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: 5 }).map((_, i) => {
            // Fill the star if its index is less than the rounded average rating
            const isFilled = i < Math.round(averageRating)
            return (
              <svg 
                key={i} 
                className={`w-3.5 h-3.5 ${isFilled ? 'text-yellow-400' : 'text-gray-300'} fill-current`} 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )
          })}
          {/* Display the actual count of ratings */}
          <span className="text-xs text-gray-400 ml-1">({ratingCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(discountedPrice ?? product.price)}
          </span>
          {discountedPrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Stock badge */}
        <div className="mt-2 mb-3">
          <Badge variant={product.in_stock ? 'success' : 'danger'}>
            {product.in_stock ? 'In Stock' : 'Out of Stock'}
          </Badge>
        </div>

        {/* Add to cart */}
        <Button
          onClick={() => addItem(product)}
          disabled={!product.in_stock}
          className="w-full"
          size="sm"
        >
          Add to Cart
        </Button>
      </div>
    </div>
  )
}