'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FollowUpPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/leads/follow-up/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  )
}
