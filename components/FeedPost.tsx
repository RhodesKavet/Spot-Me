'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Post, Profile, TAG_GRADIENTS } from '@/lib/types'
import CommentModal from './CommentModal'
import { BarbellIcon, CommentIcon, BookmarkIcon, VolumeOffIcon, VolumeOnIcon } from '@/components/Icons'

interface Props { post: Post; currentUser: Profile | null }

export default function FeedPost({ post, currentUser }: Props) {
  const [bravo, setBravo]           = useState(false)
  const [bravoCount, setBravoCount] = useState(Math.max(0, post.likes_count || 0))
  const [saved, setSaved]           = useState(false)
  const [saveCount, setSaveCount]   = useState(Math.max(0, post.save_count || 0))
  const [commentCount, setCommentCount] = useState(Math.max(0, post.comments_count || 0))
  const [muted, setMuted]           = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [curlAnim, setCurlAnim]     = useState(false)
  const [floatAnim, setFloatAnim]   = useState(false)
  const [bravoAnim, setBravoAnim]   = useState(false)
  const [saveAnim, setSaveAnim]     = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const lastTapRef   = useRef(0)

  /* Fetch live counts + user state */
  useEffect(() => {
    if (!currentUser) return
    Promise.all([
      supabase.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle(),
      supabase.from('saves').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle(),
      supabase.from('likes').select('*',     { count: 'exact', head: true }).eq('post_id', post.id),
      supabase.from('saves').select('*',     { count: 'exact', head: true }).eq('post_id', post.id),
      supabase.from('comments').select('*',  { count: 'exact', head: true }).eq('post_id', post.id),
    ]).then(([likeStatus, saveStatus, lc, sc, cc]) => {
      setBravo(!!likeStatus.data)
      setSaved(!!saveStatus.data)
      setBravoCount(lc.count ?? 0)
      setSaveCount(sc.count ?? 0)
      setCommentCount(cc.count ?? 0)
    })
  }, [currentUser, post.id])

  /* Video autoplay via IntersectionObserver */
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) video.play().catch(() => {})
        else video.pause()
      })
    }, { threshold: 0.65 })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  const giveBravo = useCallback(async () => {
    if (!currentUser || bravo) return
    setBravo(true)
    setBravoCount(c => c + 1)
    setCurlAnim(true)
    setBravoAnim(true)
    setTimeout(() => { setCurlAnim(false); setBravoAnim(false) }, 650)
    await supabase.from('likes').insert({ user_id: currentUser.id, post_id: post.id })
  }, [currentUser, bravo, post.id])

  const toggleBravo = async () => {
    if (!currentUser) return
    if (bravo) {
      setBravo(false)
      setBravoCount(c => Math.max(0, c - 1))
      await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
    } else {
      await giveBravo()
    }
  }

  const toggleSave = async () => {
    if (!currentUser) return
    if (saved) {
      setSaved(false)
      setSaveCount(c => Math.max(0, c - 1))
      await supabase.from('saves').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
    } else {
      setSaved(true)
      setSaveCount(c => c + 1)
      setSaveAnim(true)
      setTimeout(() => setSaveAnim(false), 500)
      await supabase.from('saves').insert({ user_id: currentUser.id, post_id: post.id })
    }
  }

  /* Double-tap */
  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 340) {
      setFloatAnim(true)
      setTimeout(() => setFloatAnim(false), 900)
      giveBravo()
    }
    lastTapRef.current = now
  }, [giveBravo])

  const tag      = post.tag?.toLowerCase() || 'general'
  const gradient = TAG_GRADIENTS[tag] || TAG_GRADIENTS.general
  const isVideo  = post.media_type === 'video' && !!post.media_url
  const isImage  = post.media_type === 'image' && !!post.media_url
  const isText   = !isVideo && !isImage

  return (
    <div ref={containerRef} className="snap-post select-none" onClick={handleDoubleTap}>

      {/* ── Background layer ── */}
      {isVideo && (
        <video ref={videoRef} src={post.media_url!}
          className="absolute inset-0 w-full h-full object-cover"
          loop muted={muted} playsInline />
      )}
      {isImage && (
        <Image src={post.media_url!} alt={post.body} fill className="object-cover" priority />
      )}
      {isText && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* ── Cinematic gradient overlays ── */}
      {/* Bottom black ramp — strong so text is always readable */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,.97) 0%, rgba(0,0,0,.55) 28%, rgba(0,0,0,.1) 55%, rgba(0,0,0,.28) 100%)' }} />
      {/* Edge red vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(192,57,43,.07) 100%)' }} />

      {/* ── Double-tap barbell float ── */}
      {floatAnim && (
        <div className="heart-float text-red-b">
          <BarbellIcon size={80} filled />
        </div>
      )}

      {/* ── Centred text caption (text-only posts) ── */}
      {isText && (
        <div className="absolute inset-0 flex items-center justify-center px-10 pb-24 pointer-events-none">
          <p className="font-head font-black text-white text-center leading-tight select-none"
            style={{ fontSize: 'clamp(1.7rem,5.5vw,2.8rem)', textShadow: '0 2px 24px rgba(0,0,0,.9)' }}>
            {post.body}
          </p>
        </div>
      )}

      {/* ══ BOTTOM CONTENT ROW ══ */}
      <div className="absolute bottom-0 left-0 right-0 pb-[72px] px-3 flex items-end gap-3 pointer-events-none">

        {/* ── Left: user card + caption ── */}
        <div className="flex-1 min-w-0 pointer-events-auto">

          {/* User info card */}
          <Link href={`/profile/${post.profiles?.username}`}
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-2.5 mb-3 px-3 py-2 rounded-2xl"
            style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.08)' }}>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
              style={{ boxShadow: '0 0 0 2px #c0392b, 0 0 12px rgba(192,57,43,.5)' }}>
              {post.profiles?.avatar_url
                ? <Image src={post.profiles.avatar_url} alt={post.profiles.username} width={36} height={36} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center font-head font-black text-sm text-white"
                    style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                    {(post.profiles?.username || '?')[0].toUpperCase()}
                  </div>}
            </div>
            <div className="min-w-0">
              <p className="font-head font-bold text-white text-sm leading-tight truncate">
                @{post.profiles?.username}
              </p>
              {post.profiles?.full_name && (
                <p className="text-white/45 text-[11px] truncate leading-tight">{post.profiles.full_name}</p>
              )}
            </div>
          </Link>

          {/* Tag pill */}
          {post.tag && (
            <div className="mb-2">
              <span className="inline-flex items-center text-[10px] font-head font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(192,57,43,.18)', border: '1px solid rgba(192,57,43,.4)', color: '#e8453c', backdropFilter: 'blur(8px)' }}>
                {post.tag}
              </span>
            </div>
          )}

          {/* Caption */}
          {!isText && post.body && (
            <p className="text-white/90 text-[13px] leading-snug line-clamp-2 drop-shadow-lg font-body"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,.8)' }}>
              {post.body}
            </p>
          )}
        </div>

        {/* ── Right: action column ── */}
        <div className="flex flex-col items-center gap-4 pb-1 flex-shrink-0 pointer-events-auto">

          {/* Bravo */}
          <button onClick={e => { e.stopPropagation(); toggleBravo() }} className="flex flex-col items-center gap-1" aria-label="Bravo">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${curlAnim ? 'barbell-curl' : ''}`}
              style={{
                background:  bravo ? 'rgba(192,57,43,.28)' : 'rgba(0,0,0,.45)',
                border:      bravo ? '1.5px solid rgba(192,57,43,.7)' : '1.5px solid rgba(255,255,255,.1)',
                backdropFilter: 'blur(12px)',
                boxShadow:   bravo ? '0 0 20px rgba(192,57,43,.45)' : 'none',
                color:       bravo ? '#e8453c' : 'rgba(255,255,255,.85)',
                transform:   bravoAnim ? 'scale(1.12)' : 'scale(1)',
              }}>
              <BarbellIcon size={26} filled={bravo} />
            </div>
            <span className={`text-xs font-head font-black tabular-nums drop-shadow ${bravo ? 'text-red-b' : 'text-white/75'}`}>
              {bravoCount}
            </span>
          </button>

          {/* Comments */}
          <button onClick={e => { e.stopPropagation(); setShowComments(true) }} className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,.45)', border: '1.5px solid rgba(255,255,255,.1)', backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,.85)' }}>
              <CommentIcon size={24} />
            </div>
            <span className="text-xs font-head font-black text-white/75 drop-shadow tabular-nums">{commentCount}</span>
          </button>

          {/* Save */}
          <button onClick={e => { e.stopPropagation(); toggleSave() }} className="flex flex-col items-center gap-1">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                background:  saved ? 'rgba(59,130,246,.25)' : 'rgba(0,0,0,.45)',
                border:      saved ? '1.5px solid rgba(59,130,246,.65)' : '1.5px solid rgba(255,255,255,.1)',
                backdropFilter: 'blur(12px)',
                boxShadow:   saved ? '0 0 18px rgba(59,130,246,.4)' : 'none',
                color:       saved ? '#3b82f6' : 'rgba(255,255,255,.85)',
                transform:   saveAnim ? 'scale(1.14)' : 'scale(1)',
              }}>
              <BookmarkIcon size={24} filled={saved} />
            </div>
            <span className={`text-xs font-head font-black drop-shadow tabular-nums ${saved ? 'text-[#3b82f6]' : 'text-white/75'}`}>
              {saveCount}
            </span>
          </button>

          {/* Mute — video only */}
          {isVideo && (
            <button onClick={e => { e.stopPropagation(); setMuted(m => !m) }} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,.45)', border: '1.5px solid rgba(255,255,255,.1)', backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,.85)' }}>
                {muted ? <VolumeOffIcon size={22} /> : <VolumeOnIcon size={22} />}
              </div>
            </button>
          )}
        </div>
      </div>

      {showComments && (
        <CommentModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowComments(false)}
          onNewComment={() => setCommentCount(c => c + 1)}
        />
      )}
    </div>
  )
}
