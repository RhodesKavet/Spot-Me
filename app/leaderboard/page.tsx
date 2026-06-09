'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import UploadModal from '@/components/UploadModal'
import { BarbellIcon, TrophyIcon } from '@/components/Icons'

interface LeaderEntry extends Profile { totalBravo: number }

const RANK_STYLE: Record<number, { border: string; glow: string; numColor: string }> = {
  0: { border: '#f5a623', glow: '0 0 24px rgba(245,166,35,.5)', numColor: '#f5a623' },
  1: { border: '#9ca3af', glow: '0 0 20px rgba(156,163,175,.3)', numColor: '#c0c0c0' },
  2: { border: '#cd7f32', glow: '0 0 20px rgba(205,127,50,.3)', numColor: '#cd7f32' },
}

export default function LeaderboardPage() {
  const [leaders, setLeaders]       = useState<LeaderEntry[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }

      const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setCurrentUser(me)

      const { data: profiles } = await supabase.from('profiles').select('*').order('points', { ascending: false }).limit(20)

      const withBravo: LeaderEntry[] = await Promise.all(
        (profiles || []).map(async (p: Profile) => {
          const postIds = (await supabase.from('posts').select('id').eq('user_id', p.id)).data?.map((r: { id: number }) => r.id) || []
          const { count } = postIds.length
            ? await supabase.from('likes').select('*', { count: 'exact', head: true }).in('post_id', postIds)
            : { count: 0 }
          return { ...p, totalBravo: count || p.points || 0 }
        })
      )

      withBravo.sort((a, b) => b.totalBravo - a.totalBravo)
      setLeaders(withBravo)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="h-svh flex items-center justify-center" style={{ background: '#111' }}>
      <div className="w-7 h-7 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isMe = (id: string) => currentUser?.id === id
  const totalBravos = leaders.reduce((s, l) => s + l.totalBravo, 0)

  return (
    <div className="min-h-svh pb-24" style={{ background: '#111111' }}>
      {/* Hero header — PulseFit style */}
      <div className="relative overflow-hidden pt-12 pb-8 px-5 text-center">
        <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=70"
          alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" style={{ objectPosition: 'center 60%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(17,17,17,.9) 100%)' }} />

        <div className="relative z-10">
          {/* Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-head font-bold uppercase tracking-widest"
            style={{ background: 'rgba(192,57,43,.2)', border: '1px solid rgba(192,57,43,.4)', color: '#e8453c' }}>
            <TrophyIcon size={12} />
            This Week's Ranking
          </div>

          {/* Big headline */}
          <h1 className="font-head font-black uppercase text-white leading-none mb-1"
            style={{ fontSize: 'clamp(2.8rem, 10vw, 4rem)', letterSpacing: '-0.01em' }}>
            TOP <span style={{ color: '#e8453c' }}>LIFTERS</span>
          </h1>
          <p className="text-white/40 text-sm font-head">Ranked by total Bravo power</p>

          {/* Community stat strip */}
          <div className="flex justify-center gap-10 mt-6">
            <div className="text-center">
              <p className="font-head font-black text-3xl leading-none text-red-b">{leaders.length}</p>
              <p className="text-white/30 text-[10px] font-head font-bold uppercase tracking-widest mt-1">Athletes</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="font-head font-black text-3xl leading-none text-red-b">{totalBravos.toLocaleString()}</p>
              <p className="text-white/30 text-[10px] font-head font-bold uppercase tracking-widest mt-1">Total Bravas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {leaders.length >= 3 && (
        <div className="px-4 mb-6">
          <div className="flex items-end justify-center gap-2">
            <PodiumCard user={leaders[1]} rank={1} height={88} />
            <PodiumCard user={leaders[0]} rank={0} height={116} />
            <PodiumCard user={leaders[2]} rank={2} height={68} />
          </div>
        </div>
      )}

      {/* Ranked list */}
      <div className="px-4 space-y-2">
        {leaders.slice(3).map((user, i) => (
          <Link key={user.id} href={`/profile/${user.username}`}>
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors ${isMe(user.id) ? 'border border-red-p/40' : 'border border-white/5'}`}
              style={{ background: isMe(user.id) ? 'rgba(192,57,43,.08)' : 'rgba(255,255,255,.03)' }}>
              <span className="font-head font-bold text-white/25 text-sm w-5 text-center">{i + 4}</span>
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '1.5px solid rgba(255,255,255,.1)' }}>
                {user.avatar_url
                  ? <Image src={user.avatar_url} alt={user.username} width={40} height={40} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-head font-bold text-sm text-white bg-red-p">{user.username.charAt(0).toUpperCase()}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-head font-bold text-white text-sm truncate">
                  @{user.username} {isMe(user.id) && <span className="text-red-b text-xs ml-1">YOU</span>}
                </p>
                {user.full_name && <p className="text-white/30 text-xs truncate">{user.full_name}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <BarbellIcon size={14} className="text-red-b/60" />
                <span className="font-head font-bold text-white text-sm">{user.totalBravo.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}

        {leaders.length === 0 && (
          <div className="text-center py-20">
            <BarbellIcon size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 font-head text-sm">No one on the board yet.<br />Start posting to earn Bravo!</p>
          </div>
        )}
      </div>

      {showUpload && <UploadModal currentUser={currentUser} onClose={() => setShowUpload(false)} onPost={() => setShowUpload(false)} />}
      <BottomNav onUpload={() => setShowUpload(true)} />
    </div>
  )
}

function PodiumCard({ user, rank, height }: { user: LeaderEntry; rank: number; height: number }) {
  const s = RANK_STYLE[rank]
  const labels = ['🥇 1ST', '🥈 2ND', '🥉 3RD']
  const isFirst = rank === 0
  return (
    <Link href={`/profile/${user.username}`} className="flex-1 max-w-[130px] flex flex-col items-center gap-2">
      {/* Avatar */}
      <div className={`${isFirst ? 'w-[68px] h-[68px]' : 'w-14 h-14'} rounded-full overflow-hidden flex-shrink-0`}
        style={{ border: `2.5px solid ${s.border}`, boxShadow: s.glow }}>
        {user.avatar_url
          ? <Image src={user.avatar_url} alt={user.username} width={isFirst ? 68 : 56} height={isFirst ? 68 : 56} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center font-head font-bold text-white bg-red-p">{user.username.charAt(0).toUpperCase()}</div>}
      </div>
      {/* Name + score */}
      <div className="text-center">
        <p className="font-head font-bold text-white text-xs truncate w-full">@{user.username}</p>
        <p className="font-head font-black text-sm mt-0.5" style={{ color: s.numColor }}>{user.totalBravo.toLocaleString()}</p>
      </div>
      {/* Podium block */}
      <div className="w-full rounded-t-xl flex items-center justify-center"
        style={{ height, background: `rgba(255,255,255,.04)`, border: `1px solid ${s.border}30`, borderBottom: 'none' }}>
        <span className="font-head font-bold text-xs" style={{ color: s.numColor }}>{labels[rank]}</span>
      </div>
    </Link>
  )
}
