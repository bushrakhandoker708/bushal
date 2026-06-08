// components/checkout/OrderSummary.tsx
import { formatPrice } from "@/app/lib/utils/formatPrice"
import { CartItem } from "@/app/types/cart"

interface Props {
  items: CartItem[]
}

export default function OrderSummary({ items }: Props) {
  const subtotal = items.reduce((sum, item) => {
    const price = item.discount_percent
      ? item.price * (1 - item.discount_percent / 100)
      : item.price
    return sum + price * item.quantity
  }, 0)
  
  const shipping = subtotal >= 1000 ? 0 : 120
  const total = subtotal + shipping

  return (
    <div className="bg-bushal-surface rounded-2xl border border-bushal-border p-6 sticky top-24 shadow-card">
      <h2 className="text-lg font-heading font-bold text-bushal-forest mb-5">Order Summary</h2>
      
      {/* Items list */}
      <div className="space-y-4 mb-5 max-h-64 overflow-y-auto pr-2 no-scrollbar">
        {items.map((item) => {
          const price = item.discount_percent
            ? item.price * (1 - item.discount_percent / 100)
            : item.price
            
          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-bushal-ivoryDeep border border-bushal-border overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bushal-borderMid">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-bushal-ink truncate">
                  {item.name}
                </p>
                <p className="text-xs text-bushal-inkSoft mt-0.5">Qty: {item.quantity}</p>
              </div>
              <span className="text-sm font-bold text-bushal-forest flex-shrink-0">
                {formatPrice(price * item.quantity)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-bushal-border pt-4 space-y-3 text-sm">
        <div className="flex justify-between text-bushal-inkSoft">
          <span>Subtotal</span>
          <span className="font-medium text-bushal-ink">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-bushal-inkSoft">
          <span>Shipping</span>
          <span className={shipping === 0 ? "text-bushal-success font-semibold" : "font-medium text-bushal-ink"}>
            {shipping === 0 ? "FREE" : formatPrice(shipping)}
          </span>
        </div>
        
        {shipping > 0 && (
          <div className="bg-bushal-ivoryDeep rounded-lg px-3 py-2 text-xs text-bushal-inkSoft">
            Add {formatPrice(1000 - subtotal)} more for free shipping
          </div>
        )}
        
        <div className="flex justify-between font-heading font-bold text-bushal-forest text-base border-t border-bushal-border pt-3 mt-2">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-bushal-inkSoft">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          SSL Secured
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-bushal-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          bKash Verified
        </span>
      </div>
    </div>
  )
}