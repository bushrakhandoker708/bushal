// components/ui/Button.tsx
'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const variantStyles = {
  primary:
    'bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:bg-orange-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-600/25 active:scale-[0.97] active:shadow-md disabled:bg-orange-300 disabled:shadow-none disabled:translate-y-0',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.97] disabled:bg-slate-400',
  outline:
    'bg-white text-slate-800 border border-slate-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.97]',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.97]',
  danger:
    'bg-rose-500 text-white hover:bg-rose-600 hover:-translate-y-0.5 active:scale-[0.97] shadow-lg shadow-rose-500/20',
}

const sizeStyles = {
  sm: 'px-3.5 py-2 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
}

export default function Button({
  variant = 'primary',
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
        'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}