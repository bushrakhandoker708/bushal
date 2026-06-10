// app/components/dashboard/VerificationToast.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/app/components/ui/Toast'

export default function VerificationToast() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const verified = searchParams.get('verified')
    
    if (verified === 'true') {
      // Show success toast
      toast('Welcome! Your email has been successfully verified.', 'success', 5000)
      
      // Clean up the URL search params without triggering a page reload
      // This prevents the toast from showing again if the user refreshes the page
      const url = new URL(window.location.href)
      url.searchParams.delete('verified')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, toast])

  // This component renders nothing visually, it only handles the side effect
  return null
}