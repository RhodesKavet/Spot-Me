'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Post, Profile, TAG_GRADIENTS } from '@/lib/types'
import CommentModal from './CommentModal'

interface Props {
  post: Post
  currentUser: Profile | null
}

export default function FeedPost({ post, currentUser }: Props) {
  const [bravo, setBravo]           = useState(false)
  const [bravoCount, setBravoCount] = useState(Math.max(0, post.likes_count || 0))
  const [saved, setSaved]           = useState(false)
  const [saveCount, setSaveCount]   = useState(Math.max(0, post.save_count || 0))
  const [muted, setMuted]           = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [bravoAnim, setBravoAnim]   = useState(false)
  const [doubleTapHeart, setDoubleTapHeart] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const lastTapRef   = useRef(0)

  useEffect(() => {
    if (!currentUser) return
    supabase.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
      .then(({ data }) => setBravo(!!data))
    supabase.from('saves').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [currentUser, post.id])

  // Video autoplay via IntersectionObserver
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) video.play().catch(() => {}); else video.pause() })
    }, { threshold: 0.6 })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const giveBravo = useCallback(async () => {
    if (!currentUser || bravo) return
    setBravo(true)
    setBravoCount(c => c + 1)
    setBravoAnim(true)
    setTimeout(() => setBravoAnim(false), 400)
    await supabase.from('likes').insert({ user_id: currentUser.id, post_id: post.id })
  }, [currentUser, bravo, post.id])

  const toggleBravo = async () => {
    if (!currentUser) return
    if (bravo) {
      setBravo(false)
      setBravoCount(c => Math.max(0, c - 1))   // never go negative
      await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
    } else {
      await giveBravo()
    }
  }

  const toggleSave = async () => {
    if (!currentUser) return
    if (saved) {
      setSaved(false); setSaveCount(c => Math.max(0, c - 1))
      await supabase.from('saves').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
    } else {
      setSaved(true); setSaveCount(c => c + 1)
      await supabase.from('saves').insert({ user_id: currentUser.id, post_id: post.id })
    }
  }

  // Double-tap to bravo (TikTok-style)
  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 350) {
      setDoubleTapHeart(true)
      setTimeout(() => setDoubleTapHeart(false), 800)
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
    <div ref={containerRef} className="snap-post bg-bg-1" onClick={handleDoubleTap}>
      {/* ── Background ── */}
      {isVideo && (
        <video ref={videoRef} src={post.media_url!}
          className="absolute inset-0 w-full h-full object-cover" loop muted={muted} playsInline />
      )}
      {isImage && (
        <Image src={post.media_url!} alt={post.body} fill className="object-cover" priority />
      )}
      {isText && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* ── Cinematic gradient overlays ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,.97) 0%, rgba(0,0,0,.3) 35%, rgba(0,0,0,.05) 60%, rgba(0,0,0,.2) 100%)'
      }} />
      {/* top vignette */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

      {/* ── Double-tap heart ── */}
      {doubleTapHeart && (
        <div className="heart-float">🏋️</div>
      )}

      {/* ── Text-only centred caption ── */}
      {isText && (
        <div className="absolute inset-0 flex items-center justify-center px-10 pb-24">
          <p className="font-head font-bold text-white text-center leading-tight drop-shadow-2xl select-none"
            style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.4rem)' }}>
            {post.body}
          </p>
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div className="absolute bottom-0 left-0 right-0 pb-20 px-4 pt-8 flex items-end gap-4"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 100%)' }}>

        {/* Left: user + caption */}
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.profiles?.username}`}
            className="flex items-center gap-2.5 mb-3 w-fit active:opacity-70">
            <div className="relative">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-bg-4"
                style={{ boxShadow: '0 0 0 2px #c0392b, 0 0 12px rgba(192,57,43,.4)' }}>
                {post.profiles?.avatar_url ? (
                  <Image src={post.profiles.avatar_url} alt={post.profiles.username}
                    width={44} height={44} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-head font-bold text-white bg-gradient-to-br from-red-p to-red-b">
                    {(post.profiles?.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="font-head font-bold text-white text-sm drop-shadow">
                @{post.profiles?.username}
              </p>
              {post.profiles?.full_name && (
                <p className="text-white/50 text-xs leading-tight">{post.profiles.full_name}</p>
              )}
            </div>
          </Link>

          {post.tag && (
            <span className="inline-flex items-center gap-1 text-[11px] font-head font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2"
              style={{ background: 'rgba(192,57,43,.25)', border: '1px solid rgba(192,57,43,.4)', color: '#e8453c', backdropFilter: 'blur(8px)' }}>
              🏋️ {post.tag}
            </span>
          )}

          {!isText && post.body && (
            <p className="text-white/90 text-sm leading-snug line-clamp-2 drop-shadow">{post.body}</p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col items-center gap-4 pb-2 flex-shrink-0">
          {/* Bravo 🏋️ */}
          <button onClick={e => { e.stopPropagation(); toggleBravo() }}
            className="flex flex-col items-center gap-1.5 select-none"
            aria-label="Bravo">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
              bravo
                ? 'bg-red-p/40 border-2 border-red-p glow-red-sm'
                : 'glass border border-white/10'
            } ${bravoAnim ? 'bravo-pop' : ''}`}>
              🏋️
            </div>
            <span className={`text-xs font-head font-bold drop-shadow transition-colors ${bravo ? 'text-red-b' : 'text-white'}`}>
              {bravoCount}
            </span>
          </button>

          {/* Comment */}
          <button onClick={e => { e.stopPropagation(); setShowComments(true) }}
            className="flex flex-col items-center gap-1.5 select-none">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl glass border border-white/10">
              💬
            </div>
            <span className="text-xs font-head font-bold text-white drop-shadow">{post.comments_count || 0}</span>
          </button>

          {/* Save */}
          <button onClick={e => { e.stopPropagation(); toggleSave() }}
            className="flex flex-col items-center gap-1.5 select-none">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
              saved ? 'bg-save-blue/30 border-2 border-save-blue' : 'glass border border-white/10'
            }`}>
              {saved ? '🔖' : '📋'}
            </div>
            <span className={`text-xs font-head font-bold drop-shadow transition-colors ${saved ? 'text-save-blue' : 'text-white'}`}>
              {saveCount}
            </span>
          </button>

          {/* Mute (video only) */}
          {isVideo && (
            <button onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
              className="flex flex-col items-center gap-1.5 select-none">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl glass border border-white/10">
                {muted ? '🔇' : '🔊'}
              </div>
            </button>
          )}
        </div>
      </div>

      {showComments && (
        <CommentModal post={post} currentUser={currentUser} onClose={() => setShowComments(false)} />
      )}
    </div>
  )
}
