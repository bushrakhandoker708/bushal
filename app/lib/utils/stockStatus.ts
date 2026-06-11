// lib/utils/stockStatus.ts

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface StockStatusDisplay {
  status: StockStatus
  label: string
  color: string
  dotColor: string
}

export function getStockStatus(quantity: number | null | undefined): StockStatusDisplay {
  const qty = quantity ?? 0
  
  if (qty === 0) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      color: 'text-bushal-danger',
      dotColor: 'bg-bushal-danger',
    }
  }
  
  if (qty <= 5) {
    return {
      status: 'low_stock',
      label: `Low Stock — Only ${qty} left`,
      color: 'text-bushal-warning',
      dotColor: 'bg-bushal-warning',
    }
  }
  
  return {
    status: 'in_stock',
    label: 'In Stock',
    color: 'text-bushal-success',
    dotColor: 'bg-bushal-success',
  }
}

export function isStockLow(quantity: number | null | undefined): boolean {
  const qty = quantity ?? 0
  return qty > 0 && qty <= 5
}

export function isOutOfStock(quantity: number | null | undefined): boolean {
  const qty = quantity ?? 0
  return qty === 0
}

export function isInStock(quantity: number | null | undefined): boolean {
  const qty = quantity ?? 0
  return qty > 0
}