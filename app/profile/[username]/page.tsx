'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile, Post } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import UploadModal from '@/components/UploadModal'
import { GridIcon, BookmarkIcon, BarbellIcon, ArrowLeftIcon, CameraIcon, MapPinIcon } from '@/components/Icons'

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
    <div className="flex min-h-svh bg-bg-1">
      <SideNav onUpload={() => setShowUpload(true)} currentUser={viewer} />

      {/* Scrollable profile content */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-24">
        <div className="mx-auto max-w-[680px]">

          {/* ── Strava-style full-width banner ── */}
          <div className="relative h-52 w-full overflow-hidden">
            <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=70"
              alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 40%' }} />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.2) 0%, rgba(8,8,8,.9) 100%)' }} />
            {/* Back button */}
            <button onClick={() => router.back()}
              className="absolute top-4 left-4 w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)' }}>
              <ArrowLeftIcon size={20} />
            </button>
          </div>

          {/* ── Avatar overlapping banner ── */}
          <div className="px-5 -mt-16 relative z-10">
            <div className="flex items-end justify-between mb-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl overflow-hidden"
                  style={{ border: '3px solid #080808', boxShadow: '0 0 0 2px #c0392b, 0 0 24px rgba(192,57,43,.4)' }}>
                  {profile.avatar_url
                    ? <Image src={profile.avatar_url} alt={profile.username} width={112} height={112} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-head font-black text-4xl text-white"
                        style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                        {profile.username[0].toUpperCase()}
                      </div>}
                </div>
                {isOwn && (
                  <button onClick={() => avatarRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-bg-1"
                    style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                    {uploading
                      ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/>
                      : <CameraIcon size={14} />}
                  </button>
                )}
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />

              {/* Action button */}
              <div className="pb-1">
                {isOwn ? (
                  editMode ? (
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving}
                        className="px-5 py-2.5 rounded-xl font-head font-bold text-sm text-white uppercase tracking-wide disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                        {saving ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditMode(false)} className="btn-ghost text-xs px-4 py-2.5">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditMode(true)} className="btn-ghost">Edit Profile</button>
                  )
                ) : (
                  <button onClick={toggleFollow}
                    className={`px-6 py-2.5 rounded-xl font-head font-bold text-sm uppercase tracking-wide transition-all press ${
                      isFollowing
                        ? 'btn-ghost'
                        : 'text-white'
                    }`}
                    style={isFollowing ? {} : { background: 'linear-gradient(135deg,#c0392b,#e8453c)', boxShadow: '0 0 16px rgba(192,57,43,.4)' }}>
                    {isFollowing ? 'Spotting ✓' : 'Spot Them'}
                  </button>
                )}
              </div>
            </div>

            {/* Name + handle */}
            {editMode ? (
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="input-dark text-lg mb-1 py-2.5 font-head font-bold" placeholder="Display name" />
            ) : (
              <h1 className="font-head font-black text-2xl text-txt-1 leading-tight">
                {profile.full_name || profile.username}
              </h1>
            )}
            <p className="text-txt-3 text-sm font-head font-bold mb-1">@{profile.username}</p>

            {/* Gym badge */}
            {gymName && (
              <div className="inline-flex items-center gap-1.5 mt-1 mb-2 px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.25)' }}>
                <MapPinIcon size={11} style={{ color: '#e8453c' }} />
                <span className="text-[11px] font-head font-bold text-red-b">{gymName}</span>
              </div>
            )}

            {/* Bio */}
            {editMode ? (
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3}
                placeholder="Bio — tell your story…" className="input-dark text-sm resize-none mt-3" />
            ) : profile.bio ? (
              <p className="text-txt-2 text-sm mt-3 leading-relaxed">{profile.bio}</p>
            ) : null}
          </div>

          {/* ── Stats strip ── */}
          <div className="mx-5 mt-5 mb-1 grid grid-cols-3 rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,.05)', background: '#0d0d0d' }}>
            <div className="text-center py-4">
              <p className="font-head font-black text-3xl leading-none text-red-b">{posts.length}</p>
              <p className="text-white/30 text-[9px] font-head font-bold uppercase tracking-widest mt-1.5">Posts</p>
            </div>
            <button onClick={() => { setSpottersModal('spotters'); loadSpotters() }}
              className="text-center py-4 border-x border-white/5 press transition-colors hover:bg-white/[0.02]">
              <p className="font-head font-black text-3xl leading-none text-red-b">{followerCount}</p>
              <p className="text-white/30 text-[9px] font-head font-bold uppercase tracking-widest mt-1.5">Spotters</p>
            </button>
            <button onClick={() => { setSpottersModal('spotting'); loadSpotting() }}
              className="text-center py-4 press transition-colors hover:bg-white/[0.02]">
              <p className="font-head font-black text-3xl leading-none text-red-b">{followingCount}</p>
              <p className="text-white/30 text-[9px] font-head font-bold uppercase tracking-widest mt-1.5">Spotting</p>
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex mx-5 mt-4 mb-0.5 rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,.05)', background: '#0d0d0d' }}>
            {[
              { key: 'posts', Icon: GridIcon,     color: 'tab-red',  indicator: 'tab-active-red'  },
              { key: 'saved', Icon: BookmarkIcon,  color: 'tab-blue', indicator: 'tab-active-blue' },
              { key: 'liked', Icon: BarbellIcon,   color: 'tab-gold', indicator: 'tab-active-gold' },
            ].map(({ key, Icon, color, indicator }) => (
              <button key={key} onClick={() => setTab(key as Tab)}
                className={`flex-1 py-3.5 flex items-center justify-center gap-2 transition-colors relative ${
                  tab === key ? color : 'text-txt-3 hover:text-txt-2'
                }`}>
                <Icon size={19} filled={tab === key} />
                <span className="font-head font-bold text-xs uppercase tracking-wide hidden sm:block">
                  {key === 'posts' ? 'Posts' : key === 'saved' ? 'Saved' : 'Liked'}
                </span>
                {tab === key && <span className={`tab-active-indicator ${indicator}`} />}
              </button>
            ))}
          </div>

          {/* ── Post grid ── */}
          {displayPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <BarbellIcon size={38} className="text-white/8 mb-4" />
              <p className="text-txt-3 text-sm font-head">
                {tab === 'posts' && (isOwn ? 'Post your first workout!' : 'No posts yet.')}
                {tab === 'saved' && 'Nothing saved yet.'}
                {tab === 'liked' && 'No bravos given yet.'}
              </p>
              {tab === 'posts' && isOwn && (
                <button onClick={() => setShowUpload(true)}
                  className="mt-5 font-head font-bold px-6 py-2.5 rounded-xl text-sm text-white uppercase tracking-wide press"
                  style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                  Post Now
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {displayPosts.map(post => (
                <div key={post.id} className="aspect-square relative overflow-hidden bg-bg-4 group">
                  {post.media_url && post.media_type === 'image' && (
                    <Image src={post.media_url} alt={post.body} fill className="object-cover" />
                  )}
                  {post.media_url && post.media_type === 'video' && (
                    <video src={post.media_url} className="w-full h-full object-cover" muted playsInline />
                  )}
                  {(!post.media_url || post.media_type === 'text') && (
                    <div className="w-full h-full flex items-center justify-center p-2"
                      style={{ background: 'linear-gradient(135deg,rgba(192,57,43,.3),#121212)' }}>
                      <p className="text-white text-xs text-center leading-tight font-head font-bold line-clamp-4">{post.body}</p>
                    </div>
                  )}
                  {/* Hover overlay with bravo count */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,.55)' }}>
                    <div className="flex items-center gap-1.5">
                      <BarbellIcon size={16} className="text-white" />
                      <span className="font-head font-black text-white text-sm">{post.likes_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal currentUser={viewer} onClose={() => setShowUpload(false)}
          onPost={() => { setShowUpload(false); loadData() }} />
      )}

      {/* Spotters / Spotting modal */}
      {spottersModal && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSpottersModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full rounded-t-2xl slide-up max-h-[70svh] overflow-y-auto"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,.06)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 sticky top-0"
              style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <h3 className="font-head font-bold text-txt-1 text-base">
                {spottersModal === 'spotters' ? `Spotters · ${followerCount}` : `Spotting · ${followingCount}`}
              </h3>
              <button onClick={() => setSpottersModal(null)} className="text-txt-3 text-2xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-3">
              {(spottersModal === 'spotters' ? spottersList : spottingList).map(u => (
                <Link key={u.id} href={`/profile/${u.username}`} onClick={() => setSpottersModal(null)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ border: '2px solid rgba(192,57,43,.5)' }}>
                    {u.avatar_url
                      ? <Image src={u.avatar_url} alt={u.username} width={44} height={44} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center font-head font-black text-white"
                          style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                          {u.username[0].toUpperCase()}
                        </div>}
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
