'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import UploadModal from '@/components/UploadModal'

interface LeaderEntry extends Profile {
  totalBravo: number
}

const MEDAL: Record<number, { emoji: string; color: string; bg: string }> = {
  0: { emoji: '🥇', color: 'text-gold',   bg: 'bg-gold/10 border-gold/30' },
  1: { emoji: '🥈', color: 'text-silver', bg: 'bg-silver/10 border-silver/30' },
  2: { emoji: '🥉', color: 'text-bronze', bg: 'bg-bronze/10 border-bronze/30' },
}

export default function LeaderboardPage() {
  const [leaders, setLeaders]       = useState<LeaderEntry[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'users' | 'posts'>('users')
  const [showUpload, setShowUpload] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }

      const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setCurrentUser(me)

      // Get top profiles by points
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('points', { ascending: false })
        .limit(20)

      // For each profile, count total likes on their posts
      const withBravo: LeaderEntry[] = await Promise.all(
        (profiles || []).map(async (p: Profile) => {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .in('post_id',
              (await supabase.from('posts').select('id').eq('user_id', p.id)).data?.map((r: { id: number }) => r.id) || []
            )
          return { ...p, totalBravo: count || p.points || 0 }
        })
      )

      // Sort by totalBravo
      withBravo.sort((a, b) => b.totalBravo - a.totalBravo)
      setLeaders(withBravo)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="h-svh flex items-center justify-center bg-bg-1">
        <div className="w-7 h-7 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMe = (id: string) => currentUser?.id === id

  return (
    <div className="min-h-svh bg-bg-1 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-bg-3 to-bg-1 pt-12 pb-4 px-5 text-center">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="font-head font-bold text-3xl text-txt-1 tracking-wide uppercase">Leaderboard</h1>
        <p className="text-txt-2 text-sm mt-1">Top lifters ranked by Bravo power</p>
      </div>

      {/* Top 3 podium */}
      {leaders.length >= 3 && (
        <div className="px-4 mb-4">
          <div className="flex items-end justify-center gap-3">
            {/* 2nd */}
            <PodiumCard user={leaders[1]} rank={1} />
            {/* 1st */}
            <PodiumCard user={leaders[0]} rank={0} large />
            {/* 3rd */}
            <PodiumCard user={leaders[2]} rank={2} />
          </div>
        </div>
      )}

      {/* Rest of the list */}
      <div className="px-4 space-y-2">
        {leaders.slice(3).map((user, i) => (
          <Link key={user.id} href={`/profile/${user.username}`}>
            <div className={`flex items-center gap-3 bg-bg-3 border rounded-2xl px-4 py-3 transition-colors hover:bg-bg-4 ${isMe(user.id) ? 'border-red-p/50' : 'border-bdr-1'}`}>
              <span className="font-head font-bold text-txt-3 text-sm w-6 text-center">{i + 4}</span>
              <div className="w-9 h-9 rounded-full bg-bg-4 overflow-hidden border border-bdr-2 flex-shrink-0">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.username} width={36} height={36} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-head font-bold text-sm text-white bg-red-p">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-head font-bold text-txt-1 text-sm truncate">
                  @{user.username} {isMe(user.id) && <span className="text-red-p text-xs">(you)</span>}
                </p>
                {user.full_name && <p className="text-txt-3 text-xs truncate">{user.full_name}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-sm">🏋️</span>
                <span className="font-head font-bold text-txt-1 text-sm">{user.totalBravo.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}

        {leaders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-txt-3 font-head text-base">No one on the board yet.<br />Start posting to earn Bravo!</p>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal currentUser={currentUser} onClose={() => setShowUpload(false)} onPost={() => setShowUpload(false)} />
      )}

      <BottomNav onUpload={() => setShowUpload(true)} />
    </div>
  )
}

function PodiumCard({ user, rank, large = false }: { user: LeaderEntry; rank: number; large?: boolean }) {
  const medal = MEDAL[rank]
  return (
    <Link href={`/profile/${user.username}`} className="flex-1 max-w-[140px]">
      <div className={`flex flex-col items-center ${large ? 'pb-0' : 'pb-3 pt-4'} gap-2`}>
        <span className="text-3xl">{medal.emoji}</span>
        <div className={`${large ? 'w-16 h-16' : 'w-12 h-12'} rounded-full overflow-hidden border-2 ${large ? 'border-gold' : rank === 1 ? 'border-silver' : 'border-bronze'} bg-bg-4`}>
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt={user.username} width={large ? 64 : 48} height={large ? 64 : 48} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-head font-bold text-white bg-red-p">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <p className={`font-head font-bold text-txt-1 truncate text-center w-full ${large ? 'text-sm' : 'text-xs'}`}>
          @{user.username}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs">🏋️</span>
          <span className={`font-head font-bold ${medal.color} ${large ? 'text-base' : 'text-sm'}`}>
            {user.totalBravo.toLocaleString()}
          </span>
        </div>
      </div>
      {/* Podium bar */}
      <div className={`rounded-t-xl ${medal.bg} border ${large ? 'h-12' : rank === 1 ? 'h-7' : 'h-4'} w-full mt-1`} />
    </Link>
  )
}
