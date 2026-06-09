'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import UploadModal from '@/components/UploadModal'
import { BarbellIcon, TrophyIcon } from '@/components/Icons'

interface LeaderEntry extends Profile { totalBravo: number }

/* Medal colours */
const MEDAL = [
  { border: '#FFD700', glow: 'rgba(255,215,0,.55)',   num: '#FFD700', bg: 'rgba(255,215,0,.08)',  label: '1ST' },
  { border: '#C0C0C0', glow: 'rgba(192,192,192,.35)', num: '#C0C0C0', bg: 'rgba(192,192,192,.05)', label: '2ND' },
  { border: '#CD7F32', glow: 'rgba(205,127,50,.4)',   num: '#CD7F32', bg: 'rgba(205,127,50,.07)', label: '3RD' },
]

/* ── Crown SVG ── */
function CrownIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
      <path d="M1 15L3.5 5L8 10L11 1L14 10L18.5 5L21 15H1Z" fill={color} stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="11" cy="1" r="1.5" fill={color}/>
      <circle cx="3.5" cy="5"  r="1.2" fill={color}/>
      <circle cx="18.5" cy="5" r="1.2" fill={color}/>
    </svg>
  )
}

export default function LeaderboardPage() {
  const [leaders, setLeaders]         = useState<LeaderEntry[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showUpload, setShowUpload]   = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }

      const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setCurrentUser(me)

      // Fetch a larger pool so high-bravo users aren't missed by a stale 'points' sort
      const { data: profiles } = await supabase.from('profiles').select('*').limit(50)

      const withBravo: LeaderEntry[] = await Promise.all(
        (profiles || []).map(async (p: Profile) => {
          const { data: postRows } = await supabase.from('posts').select('id').eq('user_id', p.id)
          const postIds = (postRows || []).map((r: { id: number }) => r.id)
          const { count } = postIds.length
            ? await supabase.from('likes').select('*', { count: 'exact', head: true }).in('post_id', postIds)
            : { count: 0 }
          return { ...p, totalBravo: count ?? 0 }
        })
      )

      // Sort by actual bravo, show only users with at least some activity
      withBravo.sort((a, b) => b.totalBravo - a.totalBravo)
      setLeaders(withBravo)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="h-svh flex flex-col items-center justify-center gap-4" style={{ background: '#0d0d0d' }}>
      <TrophyIcon size={36} className="text-red-b/30" />
      <div className="w-6 h-6 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isMe       = (id: string) => currentUser?.id === id
  const totalBravos = leaders.reduce((s, l) => s + l.totalBravo, 0)
  const top3        = leaders.slice(0, 3)
  const rest        = leaders.slice(3)

  return (
    <div className="flex min-h-svh bg-bg-1">
      <SideNav onUpload={() => setShowUpload(true)} currentUser={currentUser} />
      <div className="flex-1 min-w-0 overflow-y-auto pb-28" style={{ background: '#0d0d0d' }}><div className="mx-auto max-w-[740px]">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden pt-14 pb-10 px-5 text-center">
        <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=70"
          alt="" className="absolute inset-0 w-full h-full object-cover opacity-30"
          style={{ objectPosition: 'center 55%' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(13,13,13,1) 100%)' }} />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-head font-bold uppercase tracking-widest"
            style={{ background: 'rgba(192,57,43,.18)', border: '1px solid rgba(192,57,43,.4)', color: '#e8453c' }}>
            <TrophyIcon size={13} />
            All-Time Rankings
          </div>

          <h1 className="font-head font-black uppercase text-white leading-none mb-2"
            style={{ fontSize: 'clamp(2.8rem, 10vw, 4.2rem)', letterSpacing: '-0.02em' }}>
            TOP <span style={{ color: '#e8453c' }}>LIFTERS</span>
          </h1>
          <p className="text-white/35 text-sm font-head tracking-wide">Ranked by total Bravo power</p>

          {/* Stats strip */}
          <div className="flex justify-center gap-12 mt-7">
            <div className="text-center">
              <p className="font-head font-black text-4xl leading-none" style={{ color: '#e8453c' }}>
                {leaders.length}
              </p>
              <p className="text-white/25 text-[10px] font-head font-bold uppercase tracking-widest mt-1.5">Athletes</p>
            </div>
            <div className="w-px bg-white/8" />
            <div className="text-center">
              <p className="font-head font-black text-4xl leading-none" style={{ color: '#e8453c' }}>
                {totalBravos.toLocaleString()}
              </p>
              <p className="text-white/25 text-[10px] font-head font-bold uppercase tracking-widest mt-1.5">Total Bravas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Podium top 3 ── */}
      {top3.length > 0 && (
        <div className="px-4 mb-8">
          {/* 1st by itself, centred and large */}
          {top3[0] && (
            <div className="flex justify-center mb-4">
              <PodiumOne user={top3[0]} isMe={isMe(top3[0].id)} />
            </div>
          )}
          {/* 2nd + 3rd side by side */}
          {top3.length >= 2 && (
            <div className="flex gap-3 justify-center">
              {top3[1] && <PodiumTwo user={top3[1]} rank={1} isMe={isMe(top3[1].id)} />}
              {top3[2] && <PodiumTwo user={top3[2]} rank={2} isMe={isMe(top3[2].id)} />}
            </div>
          )}
        </div>
      )}

      {/* ── Ranked list 4+ ── */}
      <div className="px-4 space-y-2">
        {rest.length > 0 && (
          <p className="text-white/20 text-[10px] font-head font-bold uppercase tracking-widest px-1 mb-3">
            Honourable mentions
          </p>
        )}
        {rest.map((user, i) => {
          const rank = i + 4
          return (
            <Link key={user.id} href={`/profile/${user.username}`}>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all hover:bg-white/[0.05]"
                style={{
                  background: isMe(user.id) ? 'rgba(192,57,43,.08)' : 'rgba(255,255,255,.03)',
                  border: isMe(user.id) ? '1px solid rgba(192,57,43,.35)' : '1px solid rgba(255,255,255,.05)',
                }}>
                {/* Rank pill */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
                  <span className="font-head font-black text-xs text-white/40">{rank}</span>
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                  style={{ border: '1.5px solid rgba(255,255,255,.1)' }}>
                  {user.avatar_url
                    ? <Image src={user.avatar_url} alt={user.username} width={40} height={40} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-head font-bold text-sm text-white"
                        style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                        {user.username[0].toUpperCase()}
                      </div>}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-head font-bold text-white text-sm truncate">
                    @{user.username}
                    {isMe(user.id) && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(192,57,43,.2)', color: '#e8453c' }}>YOU</span>
                    )}
                  </p>
                  {user.full_name && <p className="text-white/30 text-xs truncate">{user.full_name}</p>}
                </div>

                {/* Bravo count */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <BarbellIcon size={14} className="text-red-b/50" />
                  <span className="font-head font-bold text-white/80 text-sm tabular-nums">
                    {user.totalBravo.toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}

        {leaders.length === 0 && (
          <div className="text-center py-24">
            <BarbellIcon size={44} className="text-white/8 mx-auto mb-4" />
            <p className="text-white/25 font-head text-sm leading-relaxed">
              No lifters ranked yet.<br />Post a workout and earn your first Bravo!
            </p>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal currentUser={currentUser} onClose={() => setShowUpload(false)} onPost={() => setShowUpload(false)} />
      )}
      <BottomNav onUpload={() => setShowUpload(true)} />
      </div></div>
    </div>
  )
}

/* ── #1 — Hero card ── */
function PodiumOne({ user, isMe }: { user: LeaderEntry; isMe: boolean }) {
  const m = MEDAL[0]
  return (
    <Link href={`/profile/${user.username}`}
      className="flex flex-col items-center gap-3 w-full max-w-[240px]">

      {/* Crown + avatar */}
      <div className="relative">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <CrownIcon color={m.border} />
        </div>
        <div className="w-24 h-24 rounded-full overflow-hidden relative"
          style={{
            border: `3px solid ${m.border}`,
            boxShadow: `0 0 0 4px ${m.bg}, 0 0 32px ${m.glow}, 0 0 64px ${m.glow}`,
          }}>
          {user.avatar_url
            ? <Image src={user.avatar_url} alt={user.username} width={96} height={96} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center font-head font-black text-2xl text-white"
                style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                {user.username[0].toUpperCase()}
              </div>}
        </div>
      </div>

      {/* Info card */}
      <div className="w-full rounded-2xl px-5 py-4 text-center"
        style={{ background: m.bg, border: `1px solid ${m.border}30` }}>
        <p className="font-head font-black text-lg leading-tight" style={{ color: m.border }}>
          {m.label} PLACE
        </p>
        <p className="font-head font-bold text-white text-base mt-0.5 truncate">
          @{user.username}
          {isMe && <span className="text-[10px] ml-1" style={{ color: m.border }}>(you)</span>}
        </p>
        {user.full_name && <p className="text-white/40 text-xs mt-0.5 truncate">{user.full_name}</p>}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <BarbellIcon size={15} style={{ color: m.border }} />
          <span className="font-head font-black text-xl tabular-nums" style={{ color: m.border }}>
            {user.totalBravo.toLocaleString()}
          </span>
          <span className="text-white/30 text-xs font-head">bravas</span>
        </div>
      </div>
    </Link>
  )
}

/* ── #2 / #3 ── */
function PodiumTwo({ user, rank, isMe }: { user: LeaderEntry; rank: 1 | 2; isMe: boolean }) {
  const m = MEDAL[rank]
  return (
    <Link href={`/profile/${user.username}`}
      className="flex flex-col items-center gap-2.5 flex-1 max-w-[180px]">

      {/* Avatar */}
      <div className="w-16 h-16 rounded-full overflow-hidden"
        style={{
          border: `2.5px solid ${m.border}`,
          boxShadow: `0 0 20px ${m.glow}`,
        }}>
        {user.avatar_url
          ? <Image src={user.avatar_url} alt={user.username} width={64} height={64} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center font-head font-black text-xl text-white"
              style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
              {user.username[0].toUpperCase()}
            </div>}
      </div>

      {/* Info card */}
      <div className="w-full rounded-2xl px-3 py-3 text-center"
        style={{ background: m.bg, border: `1px solid ${m.border}25` }}>
        <p className="font-head font-black text-sm" style={{ color: m.border }}>{m.label}</p>
        <p className="font-head font-bold text-white text-sm mt-0.5 truncate">
          @{user.username}
          {isMe && <span className="text-[10px] ml-0.5" style={{ color: m.border }}> (you)</span>}
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <BarbellIcon size={12} style={{ color: m.border }} />
          <span className="font-head font-black text-base tabular-nums" style={{ color: m.border }}>
            {user.totalBravo.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  )
}
