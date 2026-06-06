// components/ui/Input.tsx

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-400',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input