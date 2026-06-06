// components/cart/CartItem.tsx

'use client'


import { useCart } from '@/app/hooks/useCart'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { CartItem as CartItemType } from '@/app/types/cart'

interface Props {
  item: CartItemType
}

export default function CartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCart()

  const discountedPrice = item.discount_percent
    ? item.price * (1 - item.discount_percent / 100)
    : item.price

  return (
    <div className="bg-white rounded-xl shadow p-4 flex gap-4 items-start">
      {/* Product image */}
      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatPrice(discountedPrice)} each
        </p>

        {/* Quantity controls */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
          >
            −
          </button>
          <span className="text-sm font-medium w-6 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
          >
            +
          </button>
        </div>
      </div>

      {/* Subtotal + remove */}
      <div className="flex flex-col items-end gap-2">
        <span className="font-bold text-gray-900">
          {formatPrice(discountedPrice * item.quantity)}
        </span>
        <button
          onClick={() => removeItem(item.id)}
          className="text-xs text-red-400 hover:text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  )
}