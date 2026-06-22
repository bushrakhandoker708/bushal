'use client'

// app/components/dashboard/VerificationToast.tsx
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/app/components/ui/Toast'

export default function VerificationToast() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const verified = searchParams.get('verified')

    if (verified === 'true') {
      toast('Welcome! Your email has been successfully verified.', 'success', 5000)

      const url = new URL(window.location.href)
      url.searchParams.delete('verified')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, toast])

  return null
}