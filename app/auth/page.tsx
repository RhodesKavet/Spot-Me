'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

export default function AuthPage() {
  const [tab, setTab]           = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/feed')
    })
  }, [router])

  const switchTab = (t: 'signin' | 'signup') => {
    setTab(t)
    setError('')
    setEmail('')
    setPassword('')
    setUsername('')
    setFullName('')
  }

  const handleSignIn = async () => {
    if (!email || !password) { setError('Fill in all fields.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else router.replace('/feed')
  }

  const handleSignUp = async () => {
    if (!email || !password || !username) { setError('Fill in all fields.'); return }
    if (username.length < 3)  { setError('Username must be at least 3 characters.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Username: letters, numbers, underscores only.'); return }

    setLoading(true); setError('')

    // Check username availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    if (existing) { setError('Username already taken.'); setLoading(false); return }

    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || username } },
    })

    if (signUpErr) { setError(signUpErr.message); setLoading(false); return }

    // Wait for trigger to create profile row, then patch the username
    await new Promise(r => setTimeout(r, 1200))
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase
        .from('profiles')
        .update({ username: username.toLowerCase(), full_name: fullName || username })
        .eq('id', session.user.id)
      router.replace('/feed')
    }
  }

  return (
    <div className="min-h-svh bg-bg-1 flex flex-col items-center justify-center p-5 relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 w-80 h-80 rounded-full bg-red-p/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-red-p/8  blur-3xl" />
      </div>

      {/* Logo */}
      <div className="mb-8 relative z-10">
        <Logo size="lg" />
        <p className="text-center text-txt-3 text-sm mt-2 font-head font-semibold tracking-wide uppercase">
          Where gains go viral
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-bg-2 border border-bdr-1 rounded-2xl p-6 relative z-10 shadow-2xl">
        {/* Tabs */}
        <div className="flex bg-bg-3 rounded-xl p-1 mb-6">
          {(['signin', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-head font-bold uppercase tracking-wide transition-all duration-200 ${
                tab === t ? 'bg-red-p text-white shadow-md' : 'text-txt-2 hover:text-txt-1'
              }`}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {tab === 'signup' && (
            <>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                autoComplete="username"
              />
              <input
                type="text"
                placeholder="Full Name (optional)"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="input-field"
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'signin' ? handleSignIn() : handleSignUp())}
            className="input-field"
            autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
          />

          {error && (
            <p className="text-red-b text-sm text-center bg-red-p/10 border border-red-p/20 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          <button
            onClick={tab === 'signin' ? handleSignIn : handleSignUp}
            disabled={loading}
            className="w-full mt-2 bg-red-p hover:bg-red-b active:scale-95 text-white font-head font-bold py-3.5 rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed text-base tracking-wide uppercase"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading…
              </span>
            ) : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>

      <p className="mt-6 text-txt-3 text-xs text-center relative z-10">
        SpotMe © 2025 — Lift. Share. Repeat.
      </p>

      <style jsx>{`
        .input-field {
          display: block;
          width: 100%;
          background: #131313;
          border: 1px solid #262626;
          border-radius: 12px;
          padding: 13px 16px;
          color: #f2f2f2;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field::placeholder { color: #424242; }
        .input-field:focus { border-color: #c0392b; }
      `}</style>
    </div>
  )
}
