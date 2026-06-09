'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Post, Profile, TAG_GRADIENTS } from '@/lib/types'
import FeedPost from '@/components/FeedPost'
import UploadModal from '@/components/UploadModal'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import Logo from '@/components/Logo'
import { SearchIcon, XIcon, BarbellIcon, CommentIcon } from '@/components/Icons'

const SEARCH_TAGS = [
  { label: 'Chest',     value: 'chest'     },
  { label: 'Back',      value: 'back'      },
  { label: 'Legs',      value: 'legs'      },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Arms',      value: 'arms'      },
  { label: 'Core',      value: 'core'      },
  { label: 'Cardio',    value: 'cardio'    },
  { label: 'Full Body', value: 'full body' },
  { label: 'Posing',    value: 'posing'    },
  { label: 'Meals',     value: 'meals'     },
  { label: 'PR',        value: 'pr'        },
  { label: 'Progress',  value: 'progress'  },
]

export default function FeedPage() {
  const [posts, setPosts]             = useState<Post[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showUpload, setShowUpload]   = useState(false)
  const [showSearch, setShowSearch]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Post[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth'); return }
    const [{ data: profile }, { data: postsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('posts').select('*, profiles:user_id(id, username, full_name, avatar_url)')
        .order('created_at', { ascending: false }).limit(30),
    ])
    setCurrentUser(profile)
    setPosts((postsData as Post[]) || [])
    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const openSearch = () => {
    setShowSearch(true)
    setSearchQuery('')
    setSearchResults([])
    setTimeout(() => searchInputRef.current?.focus(), 80)
  }

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, profiles:user_id(id, username, full_name, avatar_url)')
      .or(`body.ilike.%${q}%,tag.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(25)
    setSearchResults((data as Post[]) || [])
    setSearchLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(searchQuery), 320)
    return () => clearTimeout(t)
  }, [searchQuery, runSearch])

  if (loading) return (
    <div className="h-svh flex items-center justify-center bg-bg-1">
      <div className="flex flex-col items-center gap-4">
        <Logo size="md" />
        <div className="w-6 h-6 border-2 border-red-p border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    </div>
  )

  return (
    /* Outer flex: sidebar + content */
    <div className="flex min-h-svh bg-bg-1">
      <SideNav onUpload={() => setShowUpload(true)} currentUser={currentUser} />

      {/* Feed column */}
      <div className="flex-1 flex justify-center relative min-w-0">

        {/* Desktop side background */}
        <div className="fixed inset-0 -z-10 hidden sidebar:block pointer-events-none">
          <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=50"
            alt="" className="w-full h-full object-cover opacity-[0.05]" />
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 100% at 55% 50%, transparent 0%, #080808 70%)' }} />
        </div>

        {/* Snap scroll */}
        <div className="snap-feed no-scrollbar w-full max-w-[520px]">
          {posts.length > 0
            ? posts.map(post => <FeedPost key={post.id} post={post} currentUser={currentUser} />)
            : (
              <div className="snap-post flex flex-col items-center justify-center text-center px-8 pb-20 relative overflow-hidden">
                <img src="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=60"
                  alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.07] pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(8,8,8,.95) 0%, rgba(8,8,8,.5) 60%, rgba(8,8,8,.75) 100%)' }} />
                <div className="relative z-10 spring-in">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 mx-auto"
                    style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)', boxShadow: '0 0 40px rgba(192,57,43,.55)' }}>
                    <BarbellIcon size={36} />
                  </div>
                  <h2 className="font-head font-black text-4xl text-white mb-2 uppercase tracking-tight">Be First.</h2>
                  <p className="text-white/40 mb-8 text-sm leading-relaxed font-body">
                    Drop the first workout post.<br />Show the world your gains.
                  </p>
                  <button onClick={() => setShowUpload(true)}
                    className="font-head font-black px-8 py-3.5 rounded-xl text-base uppercase tracking-wider text-white press"
                    style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)', boxShadow: '0 0 28px rgba(192,57,43,.55)' }}>
                    Post Your First Lift
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Top bar */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] sidebar:max-w-none sidebar:left-[220px] sidebar:translate-x-0 sidebar:right-0 px-4 pt-3 pb-2 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[520px] mx-auto flex items-center justify-between"
            style={{ background: 'linear-gradient(to bottom, rgba(8,8,8,.9) 0%, transparent 100%)', backdropFilter: 'blur(4px)', borderRadius: 12, padding: '8px 16px' }}>
            <div className="w-8 sidebar:hidden" />
            <Logo size="sm" />
            <button onClick={openSearch}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all press"
              aria-label="Search">
              <SearchIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Search overlay ── */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(8,8,8,.98)', backdropFilter: 'blur(28px)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search workouts, meals, tags…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setShowSearch(false)}
                className="input-dark text-sm"
                style={{ paddingLeft: '2.6rem' }}
              />
              <SearchIcon size={15} className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: '0.875rem', color: 'rgba(255,255,255,.25)' }} />
            </div>
            <button onClick={() => setShowSearch(false)}
              className="text-txt-3 hover:text-txt-1 transition-colors p-1 press">
              <XIcon size={22} />
            </button>
          </div>

          {/* Quick tag chips */}
          <div className="px-4 pt-5 pb-3">
            <p className="text-txt-3 text-[10px] font-head font-bold uppercase tracking-[0.18em] mb-3">Quick tags</p>
            <div className="flex flex-wrap gap-2">
              {SEARCH_TAGS.map(tag => {
                const active = searchQuery.toLowerCase() === tag.value
                return (
                  <button key={tag.value}
                    onClick={() => setSearchQuery(active ? '' : tag.value)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-head font-bold uppercase tracking-wide transition-all press"
                    style={active
                      ? { background: 'linear-gradient(135deg,#c0392b,#e8453c)', color: '#fff', boxShadow: '0 0 14px rgba(192,57,43,.4)' }
                      : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.45)' }}>
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {searchLoading && (
              <div className="flex justify-center pt-12">
                <div className="w-6 h-6 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center pt-16">
                <BarbellIcon size={38} className="mx-auto mb-3 text-white/8" />
                <p className="text-txt-3 text-sm font-head">No results for <span className="text-txt-2">"{searchQuery}"</span></p>
              </div>
            )}
            {!searchLoading && !searchQuery && (
              <div className="text-center pt-16">
                <SearchIcon size={38} className="mx-auto mb-3 text-white/8" />
                <p className="text-txt-3 text-sm font-head">Type or tap a tag above</p>
              </div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                {searchResults.map(post => <SearchCard key={post.id} post={post} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {showUpload && (
        <UploadModal currentUser={currentUser} onClose={() => setShowUpload(false)}
          onPost={() => { setShowUpload(false); loadData() }} />
      )}
      <BottomNav onUpload={() => setShowUpload(true)} />
    </div>
  )
}

function SearchCard({ post }: { post: Post }) {
  const tag      = post.tag?.toLowerCase() || 'general'
  const gradient = TAG_GRADIENTS[tag] || TAG_GRADIENTS.general
  const isImage  = post.media_type === 'image' && !!post.media_url
  const isVideo  = post.media_type === 'video' && !!post.media_url
  return (
    <div className="flex gap-3 rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
      <div className="w-20 h-20 flex-shrink-0 relative overflow-hidden">
        {isImage && <Image src={post.media_url!} alt="" fill className="object-cover" />}
        {isVideo && (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#181818' }}>
            <span className="text-white/30 text-xl">▶</span>
          </div>
        )}
        {!isImage && !isVideo && <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />}
      </div>
      <div className="flex-1 min-w-0 py-3 pr-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-txt-3 text-xs font-head font-bold truncate">@{post.profiles?.username}</span>
          {post.tag && (
            <span className="text-[9px] font-head font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(192,57,43,.18)', color: '#e8453c' }}>{post.tag}</span>
          )}
        </div>
        <p className="text-txt-1 text-sm leading-snug line-clamp-2 mb-2">{post.body}</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-txt-3 text-xs"><BarbellIcon size={11} /> {post.likes_count || 0}</span>
          <span className="flex items-center gap-1 text-txt-3 text-xs"><CommentIcon size={11} /> {post.comments_count || 0}</span>
        </div>
      </div>
    </div>
  )
}
