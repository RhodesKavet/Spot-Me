'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProfileRedirect() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      supabase.from('profiles').select('username').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.username) router.replace(`/profile/${data.username}`)
          else router.replace('/auth')
        })
    })
  }, [router])

  return (
    <div className="h-svh flex items-center justify-center bg-bg-1">
      <div className="w-7 h-7 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
