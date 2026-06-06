// lib/utils/cn.ts
// Merges Tailwind class names safely, resolving conflicts.
// Uses clsx for conditional classes + tailwind-merge to deduplicate.

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}