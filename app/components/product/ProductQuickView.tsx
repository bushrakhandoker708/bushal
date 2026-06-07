// components/product/ProductQuickView.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/app/hooks/useCart'
import { formatPrice } from '@/app/lib/utils/formatPrice'
import { Product } from '@/app/types/product'
import { cn } from '@/app/lib/utils/cn'
import BottomSheet from '@/app/components/ui/BottomSheet'
import Badge from '@/app/components/ui/Badge'

interface Props {
  product: Product | null
  onClose: () => void
}

export default function ProductQuickView({ product, onClose }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)

  if (!product) return null

  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : []
  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : null

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <BottomSheet isOpen={!!product} onClose={onClose} height="auto">
      <div className="px-5 py-4 space-y-5">
        {/* Image */}
        {images.length > 0 && (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-bushal-ivoryDeep">
            <img
              src={images[imgIndex]}
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            {product.discount_percent && (
              <span className="absolute top-3 left-3 bg-bushal-danger text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{product.discount_percent}%
              </span>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={cn('w-1.5 h-1.5 rounded-full transition-all', i === imgIndex ? 'bg-white w-4' : 'bg-white/50')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div>
          <h3 className="font-heading text-xl font-semibold text-bushal-forest leading-snug mb-2">{product.name}</h3>

          {!product.in_stock && <Badge variant="danger" className="mb-3">Out of Stock</Badge>}

          <div className="flex items-center gap-2 mb-3">
            <span className="font-heading text-2xl font-bold text-bushal-forest">
              {formatPrice(discountedPrice ?? product.price)}
            </span>
            {discountedPrice && (
              <span className="text-sm text-bushal-inkSoft line-through">{formatPrice(product.price)}</span>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-bushal-inkSoft leading-relaxed line-clamp-3">{product.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-2">
          <button
            onClick={handleAdd}
            disabled={!product.in_stock}
            className={cn(
              'flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]',
              product.in_stock
                ? added
                  ? 'bg-bushal-success text-white'
                  : 'btn-copper text-white'
                : 'bg-bushal-ivoryDeep text-bushal-inkSoft cursor-not-allowed'
            )}
          >
            {added ? '✓ Added to Cart' : product.in_stock ? 'Add to Cart' : 'Out of Stock'}
          </button>
          <Link
            href={`/product/${product.id}`}
            onClick={onClose}
            className="px-4 py-3.5 rounded-xl text-sm font-semibold border border-bushal-border text-bushal-forest hover:bg-bushal-ivory transition-colors"
          >
            View
          </Link>
        </div>
      </div>
    </BottomSheet>
  )
}