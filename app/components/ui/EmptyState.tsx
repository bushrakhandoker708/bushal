// components/ui/EmptyState.tsx
import { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-bushal-ivoryDeep border border-bushal-border flex items-center justify-center mb-5 text-bushal-borderMid">
          {icon}
        </div>
      )}
      <h3 className="font-heading text-lg font-semibold text-bushal-forest mb-1.5">{title}</h3>
      {description && <p className="text-sm text-bushal-inkSoft max-w-xs leading-relaxed mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}