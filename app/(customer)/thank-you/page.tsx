// app/(customer)/thank-you/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/app/components/layout/Navbar'
import BottomNav from '@/app/components/layout/BottomNav'
import PageWrapper from '@/app/components/layout/PageWrapper'
import { createServerClient } from '@/lib/supabase/server'
import { formatPrice } from '@/app/lib/utils/formatPrice'

interface Props {
  searchParams: { orderId?: string }
}

export const metadata: Metadata = {
  title: 'Order Confirmed',
  description: 'Your order has been successfully placed. Track your delivery status on Bushal.',
  robots: { index: false, follow: false }, // Prevent indexing of dynamic transactional pages
}

export default async function ThankYouPage({ searchParams }: Props) {
  let order = null
  if (searchParams.orderId) {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', searchParams.orderId)
      .single()
    order = data
  }

  return (
    <div className="min-h-screen bg-bushal-ivory">
      <Navbar />
      
      <PageWrapper maxWidth="2xl" withBottomNav={false} className="py-24 text-center">
        <div className="flex justify-center mb-8 animate-bounce-pop">
          <div className="w-24 h-24 rounded-full bg-bushal-successBg border border-bushal-success/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-bushal-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h1 className="font-heading text-4xl font-bold text-bushal-forest mb-4 animate-fade-up">
          Order Confirmed!
        </h1>
        <p className="text-bushal-inkSoft text-lg mb-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
          Thank you for shopping with Bushal. We have received your order.
        </p>

        {order && (
          <div className="bg-bushal-surface rounded-2xl border border-bushal-border shadow-card p-6 mb-8 text-left space-y-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex justify-between items-center pb-3 border-b border-bushal-border">
              <span className="text-sm text-bushal-inkSoft">Order ID</span>
              <span className="font-mono font-semibold text-bushal-forest">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            {order.bkash_trx_id && (
              <div className="flex justify-between items-center pb-3 border-b border-bushal-border">
                <span className="text-sm text-bushal-inkSoft">bKash Transaction ID</span>
                <span className="font-mono font-semibold text-bushal-forest">{order.bkash_trx_id}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-bushal-inkSoft">Total Amount Paid</span>
              <span className="font-heading text-xl font-bold text-bushal-copper">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        )}

        <p className="text-bushal-inkSoft mb-10 animate-fade-up" style={{ animationDelay: '300ms' }}>
          The admin has been notified and will process your order shortly. You can track its status in your dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <Link 
            href="/dashboard" 
            className="btn-copper text-white px-8 py-3.5 rounded-xl font-semibold w-full sm:w-auto text-center"
          >
            Continue Shopping
          </Link>
          <Link 
            href="/orders" 
            className="px-8 py-3.5 rounded-xl font-semibold border border-bushal-border text-bushal-forest hover:bg-bushal-ivoryDeep transition-colors w-full sm:w-auto text-center"
          >
            View All Orders
          </Link>
        </div>
      </PageWrapper>
      
      <BottomNav />
    </div>
  )
}