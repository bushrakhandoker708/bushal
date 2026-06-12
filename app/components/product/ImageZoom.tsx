// app/components/product/ImageZoom.tsx

// A premium, Apple-like image zoom component using react-medium-image-zoom.
// Replaces the basic CSS scale zoom with a smooth, accessible, and highly 
// polished magnification experience, reinforcing the luxury feel of Bushal.

'use client'

import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import { cn } from '@/app/lib/utils/cn'

interface ImageZoomProps {
  src: string
  alt: string
  className?: string
}

export default function ImageZoom({ src, alt, className }: ImageZoomProps) {
  return (
    <Zoom zoomMargin={40}>
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-cover cursor-zoom-in rounded-2xl transition-transform duration-300 hover:scale-[1.02]',
          className
        )}
        draggable={false}
      />
    </Zoom>
  )
}
