'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? '/feed' : '/auth')
    })
  }, [router])

  return (
    <div className="h-svh flex items-center justify-center bg-bg-1">
      <div className="w-8 h-8 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
