// components/ui/CheckoutStepper.tsx
// Stepper component for the checkout process, showing progress through steps like Cart, Shipping, Payment, and Confirmation.

import { cn } from '@/app/lib/utils/cn'

interface Step {
  label: string
  key: string
}

interface Props {
  steps: Step[]
  currentStep: string
}

export default function CheckoutStepper({ steps, currentStep }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === steps.length - 1

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                isCompleted && 'bg-bushal-success border-bushal-success text-white',
                isCurrent && 'bg-bushal-surface border-bushal-copper text-bushal-copper ring-4 ring-bushal-copper/15',
                !isCompleted && !isCurrent && 'bg-bushal-surface border-bushal-border text-bushal-inkSoft',
              )}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : index + 1}
              </div>
              <span className={cn(
                'text-[10px] font-semibold mt-1.5 text-center max-w-[60px] leading-tight',
                isCurrent ? 'text-bushal-forest' : isCompleted ? 'text-bushal-success' : 'text-bushal-inkSoft'
              )}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={cn(
                'w-12 sm:w-16 h-0.5 mx-1 mb-5 transition-all duration-300',
                isCompleted ? 'bg-bushal-success' : 'bg-bushal-border'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}