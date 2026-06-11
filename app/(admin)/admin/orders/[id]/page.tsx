// app/(admin)/admin/orders/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminOrderDetail from '@/app/components/admin/AdminOrderDetail'
import { Skeleton } from '@/app/components/ui/Skeleton'

// Define the OrderDetail interface locally to avoid import issues
interface OrderItemDetail {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  quantity: number
  unit_price: number
  cost_price: number | null
  delivery_charge: number | null
  subtotal: number
  item_profit: number
}

interface OrderAddress {
  division: string
  zilla: string
  upazilla: string
  detailed_address: string
  delivery_instructions?: string | null
}

interface OrderDetail {
  id: string
  user_id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  delivery_address: string | null
  delivery_address_obj: OrderAddress | null
  customer_note: string | null
  phone: string | null
  payment_method: string
  bkash_invoice: string | null
  total: number
  status: string
  delivery_status: string
  delivery_steps: any[]
  inventory_reduced: boolean
  created_at: string
  updated_at: string
  items: OrderItemDetail[]
}

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${id}`)
        if (!res.ok) throw new Error('Failed to fetch order')
        const data = await res.json()
        setOrder(data)
      } catch (err) {
        setError('Failed to load order details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchOrder()
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }
      
      // Refresh order data
      const orderRes = await fetch(`/api/admin/orders/${id}`)
      const updatedOrder = await orderRes.json()
      setOrder(updatedOrder)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleConfirm = async () => {
    await handleStatusChange('confirmed')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-bushal-dangerBg border border-bushal-danger/20 text-bushal-danger px-4 py-3 rounded-xl">
          {error || 'Order not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <a 
          href="/admin/orders" 
          className="inline-flex items-center gap-2 text-sm text-bushal-inkSoft hover:text-bushal-forest transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </a>
      </div>
      
      <AdminOrderDetail 
        order={order} 
        onStatusChange={handleStatusChange} 
        onConfirm={handleConfirm}
        loading={updating}
      />
    </div>
  )
}