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
import Button from '@/app/components/ui/Button'

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
      <div className="px-5 py-5 space-y-5 max-w-2xl mx-auto">
        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-bushal-ivoryDeep group">
            <img
              src={images[imgIndex]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {product.discount_percent && (
              <Badge variant="danger" className="absolute top-3 left-3">
                -{product.discount_percent}% OFF
              </Badge>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      i === imgIndex ? 'bg-white w-6' : 'bg-white/50 w-2'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div>
          <p className="text-xs font-semibold text-bushal-copper uppercase tracking-wider mb-1">
            {product.category || 'Collection'}
          </p>
          <h3 className="font-heading text-2xl font-semibold text-bushal-forest leading-snug mb-2">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-3 mb-3">
            <span className="font-heading text-3xl font-bold text-bushal-copper">
              {formatPrice(discountedPrice ?? product.price)}
            </span>
            {discountedPrice && (
              <span className="text-sm text-bushal-inkSoft line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-bushal-inkMid leading-relaxed line-clamp-3">
              {product.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-2 pt-2">
          <Button
            onClick={handleAdd}
            disabled={!product.in_stock}
            className="flex-1"
            size="lg"
            variant={added ? 'forest' : 'copper'}
          >
            {added ? '✓ Added to Bag' : product.in_stock ? 'Add to Bag' : 'Out of Stock'}
          </Button>
          <Link
            href={`/product/${product.id}`}
            onClick={onClose}
            className="flex items-center justify-center px-5 py-3.5 rounded-xl text-sm font-semibold border border-bushal-border text-bushal-forest hover:bg-bushal-ivory transition-colors"
          >
            Full Details
          </Link>
        </div>
      </div>
    </BottomSheet>
  )
}