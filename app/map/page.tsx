'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import UploadModal from '@/components/UploadModal'

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), {
  ssr: false,
  loading: () => (
    <div className="h-svh flex items-center justify-center bg-[#060606]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
        <p className="text-txt-3 text-sm font-head">Loading globe…</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [router])

  return (
    <div className="relative bg-[#060606] h-svh overflow-hidden">
      <GlobeMap currentUserId={profile?.id} userGymId={profile?.gym_id} />
      {showUpload && (
        <UploadModal currentUser={profile} onClose={() => setShowUpload(false)} onPost={() => setShowUpload(false)} />
      )}
      <BottomNav onUpload={() => setShowUpload(true)} />
    </div>
  )
}
