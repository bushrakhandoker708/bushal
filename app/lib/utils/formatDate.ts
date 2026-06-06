// lib/utils/formatDate.ts

/**
 * Formats an ISO date string into a human-readable date.
 * e.g. "2024-04-10T12:00:00Z" → "Apr 10, 2024"
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}