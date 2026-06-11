// app/lib/utils/stockStatus.ts

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface StockDisplay {
  status: StockStatus
  label: string
  color: string      // tailwind text color
  bg: string         // tailwind bg color
  dotColor: string   // for pulse dot
  badgeVariant: 'success' | 'warning' | 'danger' | 'neutral'
}

/**
 * Determines the stock status based on quantity.
 * - 0: Out of Stock
 * - 1-5: Low Stock
 * - 6+: In Stock
 */
export function getStockStatus(quantity: number): StockDisplay {
  if (quantity === 0) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      color: 'text-bushal-danger',
      bg: 'bg-bushal-dangerBg',
      dotColor: 'bg-bushal-danger',
      badgeVariant: 'danger'
    }
  }
  
  if (quantity <= 5) {
    return {
      status: 'low_stock',
      label: `Low Stock — Only ${quantity} left`,
      color: 'text-bushal-warning',
      bg: 'bg-bushal-warningBg',
      dotColor: 'bg-bushal-warning',
      badgeVariant: 'warning'
    }
  }
  
  return {
    status: 'in_stock',
    label: 'In Stock',
    color: 'text-bushal-success',
    bg: 'bg-bushal-successBg',
    dotColor: 'bg-bushal-success',
    badgeVariant: 'success'
  }
}