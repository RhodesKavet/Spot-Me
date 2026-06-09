'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Profile, WORKOUT_TAGS } from '@/lib/types'

interface Props {
  currentUser: Profile | null
  onClose: () => void
  onPost: () => void
}

export default function UploadModal({ currentUser, onClose, onPost }: Props) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [caption, setCaption]   = useState('')
  const [tag, setTag]           = useState('General')
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    setError('')
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.type.startsWith('image') || f.type.startsWith('video'))) handleFile(f)
  }

  const submit = async () => {
    if (!currentUser) return
    if (!caption.trim()) { setError('Add a caption.'); return }
    setUploading(true); setError('')

    let mediaUrl: string | null = null
    let mediaType = 'text'

    if (file) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${currentUser.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('posts').upload(path, file, { upsert: true })
      if (upErr) {
        setError('Upload failed — is the "posts" storage bucket public?')
        setUploading(false); return
      }
      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path)
      mediaUrl = publicUrl
      mediaType = file.type.startsWith('video') ? 'video' : 'image'
    }

    const { error: postErr } = await supabase.from('posts').insert({
      user_id: currentUser.id,
      body: caption.trim(),
      tag,
      media_url: mediaUrl,
      media_type: mediaType,
    })

    if (postErr) { setError(postErr.message); setUploading(false); return }
    onPost()
  }

  const isVideo = file?.type.startsWith('video')

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-bg-2 rounded-t-3xl flex flex-col max-h-[90vh] slide-up">
        {/* Handle bar */}
        <div className="w-12 h-1 bg-bdr-3 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-bdr-1 flex-shrink-0">
          <h2 className="font-head font-bold text-xl text-txt-1 tracking-wide">New Post</h2>
          <button onClick={onClose} className="text-txt-2 text-2xl leading-none hover:text-txt-1 transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Media upload */}
          {!preview ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                dragOver ? 'border-red-p bg-red-p/10' : 'border-bdr-2 hover:border-bdr-3'
              }`}
            >
              <span className="text-4xl">📸</span>
              <p className="text-txt-2 text-sm font-head font-semibold">Tap to add photo or video</p>
              <p className="text-txt-3 text-xs">or drag & drop</p>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-bg-3 h-56">
              {isVideo ? (
                <video src={preview} className="w-full h-full object-cover" controls muted />
              ) : (
                <Image src={preview} alt="preview" fill className="object-cover" />
              )}
              <button
                onClick={() => { setFile(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition-colors"
              >
                ×
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFileChange} />

          {/* Caption */}
          <textarea
            placeholder="What's your workout? Caption your gains…"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={3}
            className="w-full bg-bg-3 border border-bdr-2 rounded-xl px-4 py-3 text-txt-1 text-sm placeholder:text-txt-3 outline-none focus:border-red-p resize-none transition-colors"
          />

          {/* Tags */}
          <div>
            <p className="text-txt-2 text-xs font-head font-bold uppercase tracking-wide mb-2">Workout Type</p>
            <div className="flex gap-2 flex-wrap">
              {WORKOUT_TAGS.map(t => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-head font-bold transition-all ${
                    tag === t
                      ? 'bg-red-p text-white'
                      : 'bg-bg-4 text-txt-2 border border-bdr-2 hover:border-bdr-3'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-b text-sm bg-red-p/10 border border-red-p/20 rounded-xl py-2 px-3 text-center">{error}</p>
          )}
        </div>

        {/* Post button */}
        <div className="px-5 py-4 border-t border-bdr-1 flex-shrink-0 pb-8">
          <button
            onClick={submit}
            disabled={uploading || !caption.trim()}
            className="w-full bg-red-p hover:bg-red-b text-white font-head font-bold py-3.5 rounded-xl text-base uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting…
              </span>
            ) : '🏋️ Post It'}
          </button>
        </div>
      </div>
    </>
  )
}
