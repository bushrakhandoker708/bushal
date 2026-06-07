// components/ui/Button.tsx
'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'copper' | 'forest' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const variantStyles = {
  copper:
    'btn-copper text-white font-semibold disabled:opacity-60 disabled:shadow-none disabled:translate-y-0',
  forest:
    'btn-forest text-white font-semibold disabled:opacity-60 disabled:shadow-none disabled:translate-y-0',
  outline:
    'bg-white text-bushal-forest border border-bushal-border hover:border-bushal-borderMid hover:bg-bushal-ivory active:scale-[0.97] transition-all duration-150',
  ghost:
    'bg-transparent text-bushal-inkSoft hover:bg-bushal-ivoryDeep hover:text-bushal-ink active:scale-[0.97] transition-all duration-150',
  danger:
    'bg-bushal-danger text-white shadow-lg shadow-bushal-danger/20 hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150',
}

const sizeStyles = {
  sm: 'px-3.5 py-2 text-sm rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3.5 text-base rounded-xl',
}

export default function Button({
  variant = 'copper',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none',
        'disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading…
        </span>
      ) : (
        children
      )}
    </button>
  )
}