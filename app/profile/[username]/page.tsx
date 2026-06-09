'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile, Post } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import UploadModal from '@/components/UploadModal'

const WORKOUT_TAGS_ICONS: Record<string, string> = {
  Chest: '🔴', Back: '🔵', Legs: '🟢', Shoulders: '🟡',
  Arms: '🟠', Core: '🩵', Cardio: '🟣', 'Full Body': '🩷', General: '⚪',
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()

  const [profile, setProfile]       = useState<Profile | null>(null)
  const [posts, setPosts]           = useState<Post[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postCount, setPostCount]   = useState(0)
  const [loading, setLoading]       = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  // Edit state
  const [editMode, setEditMode]     = useState(false)
  const [editBio, setEditBio]       = useState('')
  const [editName, setEditName]     = useState('')
  const [saving, setSaving]         = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const isOwn = currentUser?.username === username

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/auth'); return }

    const [
      { data: me },
      { data: prof },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('profiles').select('*').eq('username', username).single(),
    ])

    if (!prof) { router.replace('/feed'); return }

    setCurrentUser(me)
    setProfile(prof)

    const [
      { data: userPosts },
      { count: followers },
      { count: following },
      { count: pcount },
    ] = await Promise.all([
      supabase.from('posts').select('*').eq('user_id', prof.id).order('created_at', { ascending: false }),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', prof.id),
    ])

    setPosts((userPosts as Post[]) || [])
    setFollowerCount(followers || 0)
    setFollowingCount(following || 0)
    setPostCount(pcount || 0)

    if (me && me.id !== prof.id) {
      const { data: followData } = await supabase.from('follows').select('id')
        .eq('follower_id', me.id).eq('following_id', prof.id).maybeSingle()
      setIsFollowing(!!followData)
    }

    setLoading(false)
  }, [username, router])

  useEffect(() => { loadData() }, [loadData])

  const toggleFollow = async () => {
    if (!currentUser || !profile || isOwn) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id)
      setIsFollowing(false); setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
      setIsFollowing(true); setFollowerCount(c => c + 1)
    }
    setFollowLoading(false)
  }

  const saveEdit = async () => {
    if (!currentUser) return
    setSaving(true)
    await supabase.from('profiles').update({ bio: editBio, full_name: editName }).eq('id', currentUser.id)
    setProfile(p => p ? { ...p, bio: editBio, full_name: editName } : p)
    setSaving(false); setEditMode(false)
  }

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${currentUser.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) return
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id)
    setProfile(p => p ? { ...p, avatar_url: publicUrl } : p)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  if (loading) {
    return (
      <div className="h-svh flex items-center justify-center bg-bg-1">
        <div className="w-7 h-7 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-svh bg-bg-1 pb-20">
      {/* ── Header gradient ── */}
      <div className="h-32 bg-gradient-to-br from-red-p/30 via-bg-4 to-bg-1 relative">
        {/* Back button (if not own) */}
        {!isOwn && (
          <button onClick={() => router.back()} className="absolute top-4 left-4 bg-bg-4/80 backdrop-blur-sm border border-bdr-2 rounded-full w-9 h-9 flex items-center justify-center text-txt-1 text-sm">
            ←
          </button>
        )}
        {/* Sign out (own profile) */}
        {isOwn && (
          <button onClick={signOut} className="absolute top-4 right-4 bg-bg-4/80 backdrop-blur-sm border border-bdr-2 rounded-xl px-3 py-1.5 text-txt-2 text-xs font-head font-bold">
            Sign Out
          </button>
        )}
      </div>

      {/* ── Avatar ── */}
      <div className="px-5 -mt-14 mb-3 flex items-end justify-between">
        <div
          className={`relative ${isOwn ? 'cursor-pointer' : ''}`}
          onClick={() => isOwn && avatarInputRef.current?.click()}
        >
          <div className="w-24 h-24 rounded-full border-4 border-bg-1 bg-bg-4 overflow-hidden shadow-xl">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-head font-bold text-4xl text-white bg-red-p">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {isOwn && (
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-red-p rounded-full flex items-center justify-center text-white text-xs border-2 border-bg-1">
              📷
            </div>
          )}
        </div>

        {/* Action button */}
        {isOwn ? (
          <div className="flex gap-2 mt-14">
            <button
              onClick={() => { setEditMode(true); setEditBio(profile.bio || ''); setEditName(profile.full_name || '') }}
              className="px-4 py-2 bg-bg-4 border border-bdr-2 rounded-xl text-txt-1 text-sm font-head font-bold hover:border-bdr-3 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className={`mt-14 px-6 py-2 rounded-xl text-sm font-head font-bold transition-all active:scale-95 disabled:opacity-60 ${
              isFollowing
                ? 'bg-bg-4 border border-bdr-2 text-txt-1'
                : 'bg-red-p text-white hover:bg-red-b'
            }`}
          >
            {isFollowing ? 'Spotting ✓' : 'Spot Them'}
          </button>
        )}
      </div>

      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />

      {/* ── Profile info ── */}
      <div className="px-5 mb-4">
        {editMode ? (
          <div className="space-y-3">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Full Name"
              className="w-full bg-bg-3 border border-bdr-2 rounded-xl px-4 py-2.5 text-txt-1 text-sm outline-none focus:border-red-p"
            />
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              placeholder="Bio — tell your story…"
              rows={3}
              className="w-full bg-bg-3 border border-bdr-2 rounded-xl px-4 py-2.5 text-txt-1 text-sm outline-none focus:border-red-p resize-none"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-red-p text-white font-head font-bold py-2 rounded-xl text-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditMode(false)}
                className="flex-1 bg-bg-4 border border-bdr-2 text-txt-1 font-head font-bold py-2 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-head font-bold text-txt-1 text-xl leading-tight">
              {profile.full_name || profile.username}
            </h1>
            <p className="text-txt-2 text-sm">@{profile.username}</p>
            {profile.bio && (
              <p className="text-txt-1 text-sm mt-2 leading-relaxed">{profile.bio}</p>
            )}
            {profile.points > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-gold text-sm">⭐</span>
                <span className="text-gold font-head font-bold text-sm">{profile.points.toLocaleString()} pts</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="mx-5 mb-4 bg-bg-3 border border-bdr-1 rounded-2xl grid grid-cols-3 divide-x divide-bdr-1">
        {[
          { label: 'Posts', value: postCount },
          { label: 'Spotters', value: followerCount },
          { label: 'Spotting', value: followingCount },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-4 gap-1">
            <span className="font-head font-bold text-xl text-txt-1">{value.toLocaleString()}</span>
            <span className="text-xs text-txt-2 font-head uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Post grid ── */}
      {posts.length > 0 ? (
        <div className="px-1 grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <div key={post.id} className="aspect-square relative bg-bg-4 overflow-hidden">
              {post.media_url && post.media_type === 'image' && (
                <Image src={post.media_url} alt={post.body} fill className="object-cover" />
              )}
              {post.media_url && post.media_type === 'video' && (
                <video src={post.media_url} className="w-full h-full object-cover" />
              )}
              {(!post.media_url || post.media_type === 'text') && (
                <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-bg-5 to-bg-3">
                  <p className="text-txt-1 text-xs text-center leading-tight font-head font-bold line-clamp-4">
                    {post.body}
                  </p>
                </div>
              )}
              {/* Tag badge */}
              {post.tag && (
                <div className="absolute top-1 left-1">
                  <span className="text-xs">{WORKOUT_TAGS_ICONS[post.tag] || '⚪'}</span>
                </div>
              )}
              {/* Bravo count */}
              <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                <span className="text-[10px]">🏋️</span>
                <span className="text-white text-[10px] font-head font-bold drop-shadow">{post.likes_count || 0}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <span className="text-5xl mb-3">🏋️</span>
          <p className="text-txt-2 font-head text-base">
            {isOwn ? 'Post your first workout!' : 'No posts yet.'}
          </p>
          {isOwn && (
            <button onClick={() => setShowUpload(true)}
              className="mt-4 bg-red-p text-white font-head font-bold px-6 py-2.5 rounded-full text-sm">
              Post Now
            </button>
          )}
        </div>
      )}

      {showUpload && (
        <UploadModal currentUser={currentUser} onClose={() => setShowUpload(false)} onPost={() => { setShowUpload(false); loadData() }} />
      )}

      <BottomNav onUpload={() => setShowUpload(true)} />
    </div>
  )
}
