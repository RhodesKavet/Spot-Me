'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Post, Profile, Comment } from '@/lib/types'

interface Props {
  post: Post
  currentUser: Profile | null
  onClose: () => void
  onNewComment?: () => void
}

export default function CommentModal({ post, currentUser, onClose, onNewComment }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [posting, setPosting]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchComments() }, [])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id(id, username, full_name, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) || [])
    setLoading(false)
  }

  const postComment = async () => {
    if (!currentUser || !body.trim() || posting) return
    setPosting(true)
    const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: currentUser.id, body: body.trim() })
    if (!error) onNewComment?.()   // update the count badge in FeedPost
    setBody('')
    await fetchComments()
    setPosting(false)
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-bg-3 rounded-t-2xl flex flex-col max-h-[72vh] slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bdr-1 flex-shrink-0">
          <h3 className="font-head font-bold text-txt-1 text-lg tracking-wide">Comments</h3>
          <button onClick={onClose} className="text-txt-2 text-2xl leading-none hover:text-txt-1 transition-colors">×</button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-red-p border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-txt-3 py-10 font-head text-base">No comments yet — be first! 💪</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-bg-4 border border-bdr-2 overflow-hidden flex-shrink-0">
                  {c.profiles?.avatar_url ? (
                    <Image src={c.profiles.avatar_url} alt={c.profiles.username} width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-head font-bold text-xs text-white bg-red-p">
                      {(c.profiles?.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-txt-1 text-sm leading-snug">
                    <span className="font-head font-bold text-txt-1">@{c.profiles?.username} </span>
                    {c.body}
                  </p>
                  <p className="text-txt-3 text-xs mt-0.5">{fmt(c.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-bdr-1 flex-shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Add a comment…"
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && postComment()}
                className="flex-1 bg-bg-4 border border-bdr-2 rounded-full px-4 py-2.5 text-txt-1 text-sm placeholder:text-txt-3 outline-none focus:border-red-p transition-colors"
              />
              <button
                onClick={postComment}
                disabled={!body.trim() || posting}
                className="text-red-p font-head font-bold text-sm disabled:opacity-40 px-1"
              >
                Post
              </button>
            </div>
          ) : (
            <p className="text-center text-txt-2 text-sm py-1">Sign in to comment</p>
          )}
        </div>
      </div>
    </>
  )
}
