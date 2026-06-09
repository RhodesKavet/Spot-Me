'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Post, Profile } from '@/lib/types'
import FeedPost from '@/components/FeedPost'
import UploadModal from '@/components/UploadModal'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/Logo'
import { SearchIcon } from '@/components/Icons'

export default function FeedPage() {
  const [posts, setPosts]           = useState<Post[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const router = useRouter()

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth'); return }

    const [{ data: profile }, { data: postsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase
        .from('posts')
        .select('*, profiles:user_id(id, username, full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    setCurrentUser(profile)
    setPosts((postsData as Post[]) || [])
    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="h-svh flex items-center justify-center bg-bg-1">
        <div className="flex flex-col items-center gap-4">
          <Logo size="md" />
          <div className="w-6 h-6 border-2 border-red-p border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-bg-1">
      {/* Feed — snap scroll container */}
      <div className="snap-feed no-scrollbar">
        {posts.length > 0 ? (
          posts.map(post => (
            <FeedPost key={post.id} post={post} currentUser={currentUser} />
          ))
        ) : (
          /* Empty state */
          <div className="snap-post flex flex-col items-center justify-center text-center px-8 pb-20 bg-bg-1">
            <div className="text-7xl mb-5 animate-bounce">🏋️</div>
            <h2 className="font-head font-bold text-2xl text-txt-1 mb-2 tracking-wide">No posts yet</h2>
            <p className="text-txt-2 mb-8 text-sm leading-relaxed">
              Be the first to drop a workout post.<br />Show the world your gains!
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-red-p hover:bg-red-b text-white font-head font-bold px-8 py-3.5 rounded-full text-base uppercase tracking-wide transition-all active:scale-95 shadow-lg shadow-red-p/30"
            >
              Post Your First Lift
            </button>
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pt-3 pb-2 z-20 flex items-center justify-between"
        style={{ background: 'linear-gradient(to bottom, rgba(6,6,6,.85) 0%, transparent 100%)', backdropFilter: 'blur(4px)' }}>
        <div className="w-8" />
        <Logo size="sm" />
        <button className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <SearchIcon size={20} />
        </button>
      </div>

      {showUpload && (
        <UploadModal
          currentUser={currentUser}
          onClose={() => setShowUpload(false)}
          onPost={() => { setShowUpload(false); loadData() }}
        />
      )}

      <BottomNav onUpload={() => setShowUpload(true)} />
    </div>
  )
}
