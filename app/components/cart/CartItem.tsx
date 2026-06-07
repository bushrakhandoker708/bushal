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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-4 items-start hover:border-slate-300 transition-colors">
      <div className="w-20 h-20 bg-bushal-ivoryDeep rounded-xl overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-bushal-forest truncate text-sm">{item.name}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{formatPrice(discountedPrice)} each</p>
        {item.discount_percent && (
          <p className="text-xs text-rose-500 font-medium mt-0.5">
            {item.discount_percent}% off applied
          </p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-bushal-ivory hover:border-slate-300 transition-colors font-medium"
          >
            −
          </button>
          <span className="text-sm font-bold text-slate-800 w-6 text-center">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-bushal-ivory hover:border-slate-300 transition-colors font-medium"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3 flex-shrink-0">
        <span className="font-bold text-bushal-forest">
          {formatPrice(discountedPrice * item.quantity)}
        </span>
        <button
          onClick={() => removeItem(item.id)}
          className="text-xs text-bushal-inkSoft hover:text-rose-500 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </button>
      </div>
    </div>
  )
}