'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [bravoCount, setBravoCount] = useState(post.likes_count || 0)
  const [saved, setSaved]           = useState(false)
  const [saveCount, setSaveCount]   = useState(post.save_count || 0)
  const [muted, setMuted]           = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [bravoAnim, setBravoAnim]   = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)

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

  const toggleBravo = async () => {
    if (!currentUser) return
    setBravoAnim(true)
    setTimeout(() => setBravoAnim(false), 350)
    if (bravo) {
      setBravo(false); setBravoCount(c => c - 1)
      await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
    } else {
      setBravo(true); setBravoCount(c => c + 1)
      await supabase.from('likes').insert({ user_id: currentUser.id, post_id: post.id })
    }
  }

  const toggleSave = async () => {
    if (!currentUser) return
    if (saved) {
      setSaved(false); setSaveCount(c => c - 1)
      await supabase.from('saves').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
    } else {
      setSaved(true); setSaveCount(c => c + 1)
      await supabase.from('saves').insert({ user_id: currentUser.id, post_id: post.id })
    }
  }

  const tag      = post.tag?.toLowerCase() || 'general'
  const gradient = TAG_GRADIENTS[tag] || TAG_GRADIENTS.general
  const isVideo  = post.media_type === 'video' && !!post.media_url
  const isImage  = post.media_type === 'image' && !!post.media_url
  const isText   = !isVideo && !isImage

  return (
    <div ref={containerRef} className="snap-post bg-bg-1">
      {/* ── Background ── */}
      {isVideo && (
        <video
          ref={videoRef}
          src={post.media_url!}
          className="absolute inset-0 w-full h-full object-cover"
          loop muted={muted} playsInline
        />
      )}
      {isImage && (
        <Image src={post.media_url!} alt={post.body} fill className="object-cover" priority />
      )}
      {isText && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* ── Gradient overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.95) 0%, rgba(0,0,0,.2) 40%, transparent 70%)' }} />

      {/* ── Text-only centred caption ── */}
      {isText && (
        <div className="absolute inset-0 flex items-center justify-center px-12 pb-20">
          <p className="font-head font-bold text-white text-center leading-tight drop-shadow-2xl"
             style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)' }}>
            {post.body}
          </p>
        </div>
      )}

      {/* ── Bottom content ── */}
      <div className="absolute bottom-0 left-0 right-0 pb-20 px-4 flex items-end gap-4">
        {/* Left: user + caption */}
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.profiles?.username}`} className="flex items-center gap-2.5 mb-2.5 w-fit active:opacity-70">
            <div className="w-11 h-11 rounded-full border-2 border-red-p overflow-hidden flex-shrink-0 bg-bg-4">
              {post.profiles?.avatar_url ? (
                <Image src={post.profiles.avatar_url} alt={post.profiles.username} width={44} height={44} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-head font-bold text-white bg-red-p">
                  {(post.profiles?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-head font-bold text-white text-sm leading-tight">@{post.profiles?.username}</p>
              {post.profiles?.full_name && (
                <p className="text-white/60 text-xs leading-tight">{post.profiles.full_name}</p>
              )}
            </div>
          </Link>

          {post.tag && (
            <span className="inline-flex items-center text-[11px] font-head font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-p/20 text-red-b border border-red-p/30 mb-2">
              {post.tag}
            </span>
          )}

          {!isText && post.body && (
            <p className="text-white/90 text-sm leading-snug line-clamp-3 drop-shadow">{post.body}</p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col items-center gap-5 pb-1 flex-shrink-0">
          {/* Bravo 🏋️ */}
          <button
            onClick={toggleBravo}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform select-none"
            aria-label="Bravo"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${
              bravo ? 'bg-red-p/30 border-2 border-red-p scale-110' : 'bg-black/40 border border-white/10'
            } ${bravoAnim ? 'bravo-pop' : ''}`}>
              🏋️
            </div>
            <span className={`text-xs font-head font-bold drop-shadow ${bravo ? 'text-red-b' : 'text-white'}`}>
              {bravoCount}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform select-none"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-black/40 border border-white/10">
              💬
            </div>
            <span className="text-xs font-head font-bold text-white drop-shadow">{post.comments_count || 0}</span>
          </button>

          {/* Save */}
          <button
            onClick={toggleSave}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform select-none"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${
              saved ? 'bg-save-blue/30 border-2 border-save-blue' : 'bg-black/40 border border-white/10'
            }`}>
              {saved ? '🔖' : '📋'}
            </div>
            <span className={`text-xs font-head font-bold drop-shadow ${saved ? 'text-save-blue' : 'text-white'}`}>
              {saveCount}
            </span>
          </button>

          {/* Mute (video only) */}
          {isVideo && (
            <button
              onClick={() => setMuted(m => !m)}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform select-none"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-black/40 border border-white/10">
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
