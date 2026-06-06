// components/product/ProductDetail.tsx

'use client'


import { useCart } from '@/app/hooks/useCart'
import { Product } from '@/app/types/product'
import { useState } from 'react'
import Badge from '../ui/Badge'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import Button from '../ui/Button'

interface Props {
  product: Product
}

export default function ProductDetail({ product }: Props) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      {/* Product image */}
      <div className="rounded-2xl overflow-hidden bg-gray-100 h-96">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>

        <div className="flex items-center gap-3 mb-4">
          <Badge variant={product.in_stock ? 'success' : 'danger'}>
            {product.in_stock ? 'In Stock' : 'Out of Stock'}
          </Badge>
          {product.discount_percent && (
            <Badge variant="danger">{product.discount_percent}% OFF</Badge>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-4xl font-bold text-gray-900">
            {formatPrice(discountedPrice ?? product.price)}
          </span>
          {discountedPrice && (
            <span className="text-xl text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-gray-600 leading-relaxed mb-8">
            {product.description}
          </p>
        )}

        {/* Quantity selector */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-medium text-gray-700">Quantity:</span>
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
            >
              −
            </button>
            <span className="px-4 py-2 text-gray-900 font-medium min-w-[3rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Add to cart */}
        <Button
          onClick={handleAddToCart}
          disabled={!product.in_stock}
          size="lg"
          className="w-full"
        >
          {added ? '✓ Added to Cart!' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  )
}