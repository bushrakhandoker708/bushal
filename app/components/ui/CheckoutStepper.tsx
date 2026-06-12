//  app/components/ui/CheckoutStepper.tsx

// An enhanced, premium checkout stepper component that replaces
// the basic CSS transitions with buttery-smooth Framer Motion
// animations. Features animated connecting lines that fill as
// the user progresses through checkout steps (Cart → Shipping → 
// Payment → Confirmation), reinforcing the luxury brand identity.

'use client'

import { motion } from 'framer-motion'
import { cn } from '@/app/lib/utils/cn'

interface Step {
  label: string
  key: string
  icon?: React.ReactNode
}

interface CheckoutStepperProps {
  steps: Step[]
  currentStep: string
  className?: string
}

export default function CheckoutStepper({ 
  steps, 
  currentStep, 
  className 
}: CheckoutStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className={cn('flex items-center justify-center gap-0 mb-8', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === steps.length - 1

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 20 
                }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors duration-300 relative',
                  isCompleted && 'bg-bushal-success border-bushal-success text-white',
                  isCurrent && 'bg-bushal-surface border-bushal-copper text-bushal-copper ring-4 ring-bushal-copper/15',
                  !isCompleted && !isCurrent && 'bg-bushal-surface border-bushal-border text-bushal-inkSoft'
                )}
              >
                {isCompleted ? (
                  <motion.svg
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                ) : isCurrent ? (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {step.icon ?? index + 1}
                  </motion.span>
                ) : (
                  <span className="text-bushal-inkSoft">
                    {step.icon ?? index + 1}
                  </span>
                )}

                {/* Current step pulse indicator */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-bushal-copper"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </motion.div>

              {/* Step Label */}
              <motion.span
                initial={false}
                animate={{
                  color: isCurrent ? '#1A362D' : isCompleted ? '#059669' : '#6B7280',
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'text-[10px] font-semibold mt-2 text-center max-w-[70px] leading-tight',
                )}
              >
                {step.label}
              </motion.span>
            </div>

            {/* Animated Connecting Line */}
            {!isLast && (
              <div className="w-12 sm:w-16 h-0.5 mx-1 mb-5 relative overflow-hidden rounded-full bg-bushal-border">
                <motion.div
                  className="absolute inset-0 bg-bushal-success"
                  initial={{ width: '0%' }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ 
                    duration: 0.6, 
                    ease: [0.22, 1, 0.36, 1] // Luxury easing curve
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
