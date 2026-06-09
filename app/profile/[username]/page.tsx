'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile, Post } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import UploadModal from '@/components/UploadModal'
import Logo from '@/components/Logo'
import { GridIcon, BookmarkIcon, BarbellIcon, ArrowLeftIcon, CameraIcon, SignOutIcon } from '@/components/Icons'

type Tab = 'posts' | 'saved' | 'liked'

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()

  const [profile, setProfile]           = useState<Profile | null>(null)
  const [viewer, setViewer]             = useState<Profile | null>(null)
  const [posts, setPosts]               = useState<Post[]>([])
  const [savedPosts, setSavedPosts]     = useState<Post[]>([])
  const [likedPosts, setLikedPosts]     = useState<Post[]>([])
  const [tab, setTab]                   = useState<Tab>('posts')
  const [tabLoaded, setTabLoaded]       = useState<Set<Tab>>(new Set(['posts']))
  const [isFollowing, setIsFollowing]   = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [editMode, setEditMode]         = useState(false)
  const [editBio, setEditBio]           = useState('')
  const [editName, setEditName]         = useState('')
  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [gymName, setGymName]           = useState<string | null>(null)
  const [showUpload, setShowUpload]     = useState(false)
  const [spottersModal, setSpottersModal] = useState<'spotters' | 'spotting' | null>(null)
  const [spottersList, setSpottersList] = useState<Profile[]>([])
  const [spottingList, setSpottingList] = useState<Profile[]>([])
  const avatarRef = useRef<HTMLInputElement>(null)

  const isOwn = viewer?.username === username

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth'); return }

    const [{ data: me }, { data: prof }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('profiles').select('*').eq('username', username).single(),
    ])

    if (!prof) { router.replace('/feed'); return }
    setViewer(me)
    setProfile(prof)
    setEditBio(prof.bio || '')
    setEditName(prof.full_name || '')

    // Posts + stats
    const [{ data: postsData }, { count: fwrs }, { count: fwng }] = await Promise.all([
      supabase.from('posts').select('*').eq('user_id', prof.id).order('created_at', { ascending: false }),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
    ])
    setPosts((postsData as Post[]) || [])
    setFollowerCount(fwrs || 0)
    setFollowingCount(fwng || 0)

    // Follow status
    if (me && me.id !== prof.id) {
      const { data: f } = await supabase.from('follows').select('id').eq('follower_id', me.id).eq('following_id', prof.id).maybeSingle()
      setIsFollowing(!!f)
    }

    // Gym name
    if (prof.gym_id) {
      const { data: gym } = await supabase.from('gyms').select('name').eq('id', prof.gym_id).single()
      setGymName(gym?.name || null)
    }

    setLoading(false)
  }, [username, router])

  useEffect(() => { loadData() }, [loadData])

  // Lazy load saved / liked tabs
  const loadTab = useCallback(async (t: Tab) => {
    if (!profile || tabLoaded.has(t)) return
    setTabLoaded(prev => new Set([...prev, t]))
    if (t === 'saved') {
      const { data } = await supabase.from('saves').select('posts(*)').eq('user_id', profile.id).order('created_at', { ascending: false })
      setSavedPosts(((data || []) as any[]).map(r => r.posts).filter(Boolean))
    }
    if (t === 'liked') {
      const { data } = await supabase.from('likes').select('posts(*)').eq('user_id', profile.id).order('created_at', { ascending: false })
      setLikedPosts(((data || []) as any[]).map(r => r.posts).filter(Boolean))
    }
  }, [profile, tabLoaded])

  useEffect(() => { if (tab !== 'posts') loadTab(tab) }, [tab, loadTab])

  const loadSpotters = async () => {
    if (!profile) return
    const { data } = await supabase.from('follows').select('profiles!follows_follower_id_fkey(*)').eq('following_id', profile.id)
    setSpottersList(((data || []) as any[]).map(r => r.profiles).filter(Boolean))
  }
  const loadSpotting = async () => {
    if (!profile) return
    const { data } = await supabase.from('follows').select('profiles!follows_following_id_fkey(*)').eq('follower_id', profile.id)
    setSpottingList(((data || []) as any[]).map(r => r.profiles).filter(Boolean))
  }

  const toggleFollow = async () => {
    if (!viewer || !profile || isOwn) return
    if (isFollowing) {
      setIsFollowing(false); setFollowerCount(c => Math.max(0, c - 1))
      await supabase.from('follows').delete().eq('follower_id', viewer.id).eq('following_id', profile.id)
    } else {
      setIsFollowing(true); setFollowerCount(c => c + 1)
      await supabase.from('follows').insert({ follower_id: viewer.id, following_id: profile.id })
    }
  }

  const saveEdit = async () => {
    if (!viewer) return
    setSaving(true)
    const { data } = await supabase.from('profiles').update({ bio: editBio, full_name: editName }).eq('id', viewer.id).select().single()
    if (data) setProfile(data as Profile)
    setSaving(false); setEditMode(false)
  }

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !viewer) return
    setUploading(true)
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `${viewer.id}/avatar.${ext}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = publicUrl + `?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', viewer.id)
    setProfile(p => p ? { ...p, avatar_url: url } : p)
    setUploading(false)
  }

  if (loading) return (
    <div className="h-svh flex items-center justify-center bg-bg-1">
      <span className="text-4xl animate-bounce">🏋️</span>
    </div>
  )
  if (!profile) return null

  const displayPosts = tab === 'posts' ? posts : tab === 'saved' ? savedPosts : likedPosts

  return (
    <div className="min-h-svh bg-bg-1 pb-20">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 glass sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-txt-2 p-1 w-9 h-9 flex items-center justify-center">
          <ArrowLeftIcon size={22} />
        </button>
        <Logo size="sm" />
        {isOwn ? (
          <button onClick={() => supabase.auth.signOut().then(() => router.replace('/auth'))}
            className="text-txt-3 hover:text-red-b transition-colors w-9 h-9 flex items-center justify-center">
            <SignOutIcon size={20} />
          </button>
        ) : <div className="w-9" />}
      </div>

      {/* Hero */}
      <div className="relative px-4 pt-8 pb-4">
        {/* Gym photo banner */}
        <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=70"
          alt="" className="absolute top-0 left-0 right-0 h-48 w-full object-cover opacity-30 pointer-events-none" style={{ objectPosition: 'center 30%' }} />
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, rgba(17,17,17,.95) 100%)' }} />

        <div className="relative flex items-end gap-4 mb-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[82px] h-[82px] rounded-full overflow-hidden bg-bg-4"
              style={{ boxShadow: '0 0 0 3px #c0392b, 0 0 20px rgba(192,57,43,.4)' }}>
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.username} width={82} height={82} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-head font-bold text-3xl text-white bg-gradient-to-br from-red-p to-red-b">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOwn && (
              <button onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-red-p flex items-center justify-center border-2 border-bg-1 text-white">
                {uploading
                  ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/>
                  : <CameraIcon size={13} />}
              </button>
            )}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />

          {/* Name / username / gym */}
          <div className="flex-1 min-w-0 pb-1">
            {editMode ? (
              <input value={editName} onChange={e => setEditName(e.target.value)} className="input-dark text-base mb-1 py-2" placeholder="Display name" />
            ) : (
              <h1 className="font-head font-bold text-xl text-txt-1 leading-tight truncate">
                {profile.full_name || profile.username}
              </h1>
            )}
            <p className="text-txt-3 text-sm">@{profile.username}</p>
            {gymName && (
              <p className="text-[11px] text-txt-3 mt-1 flex items-center gap-1">
                🏋️‍♂️ <span className="text-red-b/80 font-head font-bold">{gymName}</span>
              </p>
            )}
          </div>

          {/* Action button */}
          {isOwn ? (
            editMode ? (
              <div className="flex gap-2 pb-1">
                <button onClick={saveEdit} disabled={saving}
                  className="px-4 py-2 rounded-xl bg-red-p text-white text-sm font-head font-bold disabled:opacity-50">
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditMode(false)}
                  className="px-3 py-2 rounded-xl glass border border-bdr-1 text-sm text-txt-2">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setEditMode(true)}
                className="pb-1 px-4 py-2 rounded-xl glass border border-bdr-1 text-sm font-head font-bold text-txt-2 hover:text-txt-1 transition-colors">
                Edit
              </button>
            )
          ) : (
            <button onClick={toggleFollow}
              className={`pb-1 px-5 py-2 rounded-xl text-sm font-head font-bold transition-all ${
                isFollowing ? 'glass border border-bdr-1 text-txt-2' : 'bg-gradient-to-r from-red-p to-red-b text-white glow-red-sm'
              }`}>
              {isFollowing ? 'Spotting ✓' : 'Spot Them'}
            </button>
          )}
        </div>

        {/* Bio */}
        {editMode ? (
          <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3}
            placeholder="Bio — tell your story…" className="input-dark text-sm resize-none mb-4 py-3" />
        ) : profile.bio ? (
          <p className="text-txt-2 text-sm mb-4 leading-relaxed">{profile.bio}</p>
        ) : null}

        {/* Stats — PulseFit-style big impact numbers */}
        <div className="flex border-t border-b border-white/5 -mx-4 px-4 py-4 gap-0">
          <div className="flex-1 text-center border-r border-white/5">
            <p className="font-head font-black text-4xl leading-none text-red-b">{posts.length}</p>
            <p className="text-white/35 text-[10px] font-head font-bold uppercase tracking-widest mt-1.5">Posts</p>
          </div>
          <button onClick={() => { setSpottersModal('spotters'); loadSpotters() }}
            className="flex-1 text-center border-r border-white/5 active:scale-95 transition-transform">
            <p className="font-head font-black text-4xl leading-none text-red-b">{followerCount}</p>
            <p className="text-white/35 text-[10px] font-head font-bold uppercase tracking-widest mt-1.5">Spotters</p>
          </button>
          <button onClick={() => { setSpottersModal('spotting'); loadSpotting() }}
            className="flex-1 text-center active:scale-95 transition-transform">
            <p className="font-head font-black text-4xl leading-none text-red-b">{followingCount}</p>
            <p className="text-white/35 text-[10px] font-head font-bold uppercase tracking-widest mt-1.5">Spotting</p>
          </button>
        </div>
      </div>

      {/* Tabs — icon-only with distinct accent colors */}
      <div className="flex border-b border-bdr-1 sticky top-[57px] bg-bg-1 z-10">
        {/* Posts — red */}
        <button onClick={() => setTab('posts')} className={`flex-1 py-3.5 flex flex-col items-center gap-1 transition-colors relative ${tab === 'posts' ? 'tab-red' : 'text-txt-3'}`}>
          <GridIcon size={22} filled={tab === 'posts'} />
          {tab === 'posts' && <span className="tab-active-indicator tab-active-red" />}
        </button>
        {/* Saved — blue */}
        <button onClick={() => setTab('saved')} className={`flex-1 py-3.5 flex flex-col items-center gap-1 transition-colors relative ${tab === 'saved' ? 'tab-blue' : 'text-txt-3'}`}>
          <BookmarkIcon size={22} filled={tab === 'saved'} />
          {tab === 'saved' && <span className="tab-active-indicator tab-active-blue" />}
        </button>
        {/* Liked — gold */}
        <button onClick={() => setTab('liked')} className={`flex-1 py-3.5 flex flex-col items-center gap-1 transition-colors relative ${tab === 'liked' ? 'tab-gold' : 'text-txt-3'}`}>
          <BarbellIcon size={22} filled={tab === 'liked'} />
          {tab === 'liked' && <span className="tab-active-indicator tab-active-gold" />}
        </button>
      </div>

      {/* Grid */}
      {displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-4xl mb-3">{tab === 'posts' ? '📸' : tab === 'saved' ? '🔖' : '🏋️'}</p>
          <p className="text-txt-2 text-sm">
            {tab === 'posts' && (isOwn ? 'Post your first workout!' : 'No posts yet.')}
            {tab === 'saved' && 'No saved posts yet.'}
            {tab === 'liked' && 'No liked posts yet.'}
          </p>
          {tab === 'posts' && isOwn && (
            <button onClick={() => setShowUpload(true)}
              className="mt-4 bg-gradient-to-r from-red-p to-red-b text-white font-head font-bold px-6 py-2.5 rounded-full text-sm">
              Post Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {displayPosts.map(post => (
            <div key={post.id} className="aspect-square relative overflow-hidden bg-bg-4">
              {post.media_url && post.media_type === 'image' && (
                <Image src={post.media_url} alt={post.body} fill className="object-cover" />
              )}
              {post.media_url && post.media_type === 'video' && (
                <video src={post.media_url} className="w-full h-full object-cover" muted playsInline />
              )}
              {(!post.media_url || post.media_type === 'text') && (
                <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-red-p/25 to-bg-3">
                  <p className="text-white text-xs text-center leading-tight font-head font-bold line-clamp-4">{post.body}</p>
                </div>
              )}
              <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                {(post.likes_count || 0) > 0 && (
                  <span className="text-white text-[10px] font-bold drop-shadow">🏋️ {post.likes_count}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal currentUser={viewer} onClose={() => setShowUpload(false)}
          onPost={() => { setShowUpload(false); loadData() }} />
      )}

      {/* Spotters / Spotting modal */}
      {spottersModal && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSpottersModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full bg-bg-2 rounded-t-2xl slide-up max-h-[70svh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-bdr-1 sticky top-0 bg-bg-2">
              <h3 className="font-head font-bold text-base text-txt-1">
                {spottersModal === 'spotters' ? `Spotters · ${followerCount}` : `Spotting · ${followingCount}`}
              </h3>
              <button onClick={() => setSpottersModal(null)} className="text-txt-3 text-2xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              {(spottersModal === 'spotters' ? spottersList : spottingList).map(u => (
                <Link key={u.id} href={`/profile/${u.username}`} onClick={() => setSpottersModal(null)}
                  className="flex items-center gap-3 active:opacity-70">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-bg-4"
                    style={{ boxShadow: '0 0 0 2px #c0392b' }}>
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt={u.username} width={44} height={44} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-head font-bold text-white bg-gradient-to-br from-red-p to-red-b">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-head font-bold text-txt-1 text-sm">@{u.username}</p>
                    {u.full_name && <p className="text-txt-3 text-xs">{u.full_name}</p>}
                  </div>
                </Link>
              ))}
              {(spottersModal === 'spotters' ? spottersList : spottingList).length === 0 && (
                <p className="text-txt-3 text-sm text-center py-8">Nobody yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav onUpload={() => setShowUpload(true)} />
    </div>
  )
}
