'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Post, Profile, TAG_GRADIENTS } from '@/lib/types'
import CommentModal from './CommentModal'
import { BarbellIcon, CommentIcon, BookmarkIcon, VolumeOffIcon, VolumeOnIcon } from '@/components/Icons'

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
  const [curlAnim, setCurlAnim]     = useState(false)
  const [floatAnim, setFloatAnim]   = useState(false)
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
    setCurlAnim(true)
    setTimeout(() => setCurlAnim(false), 600)
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
      setSaved(false); setSaveCount(c => Math.max(0, c - 1))
      await supabase.from('saves').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
    } else {
      setSaved(true); setSaveCount(c => c + 1)
      await supabase.from('saves').insert({ user_id: currentUser.id, post_id: post.id })
    }
  }

  // Double-tap to bravo
  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 350) {
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
    <div ref={containerRef} className="snap-post bg-bg-1" onClick={handleDoubleTap}>
      {/* Background */}
      {isVideo && (
        <video ref={videoRef} src={post.media_url!} className="absolute inset-0 w-full h-full object-cover"
          loop muted={muted} playsInline />
      )}
      {isImage && (
        <Image src={post.media_url!} alt={post.body} fill className="object-cover" priority />
      )}
      {isText && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,.98) 0%, rgba(0,0,0,.35) 30%, rgba(0,0,0,.0) 55%, rgba(0,0,0,.25) 100%)'
      }} />
      {/* Red vignette edge */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(192,57,43,.08) 100%)'
      }} />

      {/* Double-tap barbell float */}
      {floatAnim && (
        <div className="heart-float flex items-center justify-center text-red-b" style={{ fontSize: 0 }}>
          <BarbellIcon size={72} filled />
        </div>
      )}

      {/* Text-only centred caption */}
      {isText && (
        <div className="absolute inset-0 flex items-center justify-center px-10 pb-24 pointer-events-none">
          <p className="font-head font-bold text-white text-center leading-tight drop-shadow-2xl select-none"
            style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.6rem)', textShadow: '0 2px 20px rgba(0,0,0,.8)' }}>
            {post.body}
          </p>
        </div>
      )}

      {/* Bottom row */}
      <div className="absolute bottom-0 left-0 right-0 pb-20 px-4 flex items-end gap-3">
        {/* Left: user info + caption */}
        <div className="flex-1 min-w-0 mb-1">
          <Link href={`/profile/${post.profiles?.username}`}
            className="flex items-center gap-2.5 mb-3 w-fit" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-bg-4"
              style={{ boxShadow: '0 0 0 2px #c0392b, 0 0 10px rgba(192,57,43,.4)' }}>
              {post.profiles?.avatar_url ? (
                <Image src={post.profiles.avatar_url} alt={post.profiles.username} width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-head font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                  {(post.profiles?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-head font-bold text-white text-sm drop-shadow leading-tight">
                @{post.profiles?.username}
              </p>
              {post.profiles?.full_name && (
                <p className="text-white/45 text-xs leading-tight">{post.profiles.full_name}</p>
              )}
            </div>
          </Link>

          {post.tag && (
            <span className="inline-flex items-center gap-1 text-[10px] font-head font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2"
              style={{ background: 'rgba(192,57,43,.2)', border: '1px solid rgba(192,57,43,.35)', color: '#e8453c', backdropFilter: 'blur(8px)' }}>
              {post.tag}
            </span>
          )}

          {!isText && post.body && (
            <p className="text-white/85 text-sm leading-snug line-clamp-2 drop-shadow">{post.body}</p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col items-center gap-5 pb-2 flex-shrink-0">
          {/* Bravo */}
          <button onClick={e => { e.stopPropagation(); toggleBravo() }}
            className="flex flex-col items-center gap-1.5" aria-label="Bravo">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              bravo ? 'text-red-b' : 'text-white'
            } ${curlAnim ? 'barbell-curl' : ''}`}
              style={{
                background: bravo ? 'rgba(192,57,43,.3)' : 'rgba(255,255,255,.08)',
                border: bravo ? '1.5px solid rgba(192,57,43,.7)' : '1.5px solid rgba(255,255,255,.12)',
                boxShadow: bravo ? '0 0 16px rgba(192,57,43,.4)' : 'none',
                backdropFilter: 'blur(8px)',
              }}>
              <BarbellIcon size={26} filled={bravo} />
            </div>
            <span className={`text-xs font-head font-bold drop-shadow ${bravo ? 'text-red-b' : 'text-white/80'}`}>
              {bravoCount}
            </span>
          </button>

          {/* Comment */}
          <button onClick={e => { e.stopPropagation(); setShowComments(true) }}
            className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.12)', backdropFilter: 'blur(8px)' }}>
              <CommentIcon size={24} />
            </div>
            <span className="text-xs font-head font-bold text-white/80 drop-shadow">{post.comments_count || 0}</span>
          </button>

          {/* Save */}
          <button onClick={e => { e.stopPropagation(); toggleSave() }}
            className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: saved ? 'rgba(59,130,246,.25)' : 'rgba(255,255,255,.08)',
                border: saved ? '1.5px solid rgba(59,130,246,.6)' : '1.5px solid rgba(255,255,255,.12)',
                color: saved ? '#3b82f6' : 'white',
                boxShadow: saved ? '0 0 14px rgba(59,130,246,.35)' : 'none',
                backdropFilter: 'blur(8px)',
              }}>
              <BookmarkIcon size={24} filled={saved} />
            </div>
            <span className={`text-xs font-head font-bold drop-shadow ${saved ? 'text-[#3b82f6]' : 'text-white/80'}`}>
              {saveCount}
            </span>
          </button>

          {/* Mute (video only) */}
          {isVideo && (
            <button onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
              className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.12)', backdropFilter: 'blur(8px)' }}>
                {muted ? <VolumeOffIcon size={22} /> : <VolumeOnIcon size={22} />}
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
