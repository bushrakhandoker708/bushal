// app/lib/utils/formatPrice.ts
export function formatPrice(amount: number, currency = '৳'): string {
  return `${currency}${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}