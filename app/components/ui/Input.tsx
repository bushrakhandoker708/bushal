// components/ui/Input.tsx
import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/app/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-semibold text-bushal-inkMid mb-1.5"
          >
            {label}
          </label>
        )}
        
        <input
          id={id}
          type={type}
          ref={ref}
          // FIX: Enforce minimum touch target size (44px height) for accessibility on mobile devices.
          // This ensures the input is easy to tap and meets WCAG guidelines.
          className={cn(
            'w-full min-h-[44px] rounded-xl border bg-bushal-surface px-4 py-2.5 text-sm text-bushal-ink placeholder-bushal-inkSoft/60 transition-all duration-200',
            'border-bushal-border hover:border-bushal-borderMid',
            'focus:outline-none focus:border-bushal-copper focus:ring-2 focus:ring-bushal-copper/20',
            'disabled:bg-bushal-ivoryDeep disabled:text-bushal-inkSoft disabled:cursor-not-allowed',
            error && 'border-bushal-danger focus:border-bushal-danger focus:ring-bushal-danger/20 animate-shake',
            className
          )}
          // FIX: Add aria-label for screen readers if a visible label is not provided,
          // or ensure the id matches the label's htmlFor for proper association.
          aria-label={label || props['aria-label'] || props.placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        
        {hint && !error && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-bushal-inkSoft">{hint}</p>
        )}
        
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-xs text-bushal-danger flex items-center gap-1.5 animate-fade-in">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input