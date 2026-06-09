'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import { EyeIcon, EyeOffIcon } from '@/components/Icons'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthPage() {
  const [mode, setMode]           = useState<Mode>('signin')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [username, setUsername]   = useState('')
  const [fullName, setFullName]   = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [loading, setLoading]     = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/feed')
    })
  }, [router])

  const reset = (m: Mode) => { setMode(m); setError(''); setSuccess(''); setEmail(''); setPassword(''); setUsername(''); setFullName('') }

  const handleSignIn = async () => {
    if (!email || !password) { setError('Fill in all fields.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else router.replace('/feed')
  }

  const handleSignUp = async () => {
    if (!email || !password || !username) { setError('Fill in all fields.'); return }
    if (username.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Username: letters, numbers, underscores only.'); return }
    setLoading(true); setError('')

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle()
    if (existing) { setError('Username already taken.'); setLoading(false); return }

    const { error: signUpErr } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName || username } },
    })
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return }

    await new Promise(r => setTimeout(r, 1200))
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles').update({ username: username.toLowerCase(), full_name: fullName || username }).eq('id', session.user.id)
      router.replace('/feed')
    }
  }

  const handleForgot = async () => {
    if (!email) { setError('Enter your email address.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Check your inbox — a reset link is on its way!')
  }

  return (
    <div className="min-h-svh bg-bg-1 flex flex-col items-center justify-center p-5 relative overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-red-p/8 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-red-p/6 blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-red-p/4 blur-3xl" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(192,57,43,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(192,57,43,.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Logo */}
      <div className="mb-8 relative z-10 fade-up">
        <Logo size="lg" glow />
        <p className="text-center text-txt-3 text-xs mt-2 font-head font-bold tracking-widest uppercase">
          Where gains go viral
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10 scale-in">
        <div className="glass grad-border rounded-2xl p-6 shadow-2xl">
          {/* Tabs — only for signin/signup */}
          {mode !== 'forgot' && (
            <div className="flex bg-bg-1/80 rounded-xl p-1 mb-6 border border-bdr-1">
              {(['signin', 'signup'] as const).map(t => (
                <button key={t} onClick={() => reset(t)}
                  className={`flex-1 py-2.5 rounded-[10px] text-sm font-head font-bold uppercase tracking-wider transition-all duration-200 ${
                    mode === t ? 'bg-gradient-to-r from-red-p to-red-b text-white shadow-md glow-red-sm' : 'text-txt-3 hover:text-txt-2'
                  }`}>
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {/* Forgot password mode */}
          {mode === 'forgot' && (
            <div className="mb-6">
              <button onClick={() => reset('signin')} className="flex items-center gap-1.5 text-txt-3 text-sm hover:text-txt-2 transition-colors mb-4">
                <span>←</span> Back to Sign In
              </button>
              <h2 className="font-head font-bold text-xl text-txt-1">Reset Password</h2>
              <p className="text-txt-3 text-sm mt-1">Enter your email and we'll send a reset link.</p>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-3">
            {mode === 'signup' && (
              <>
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="input-dark" autoComplete="username" />
                <input type="text" placeholder="Full Name (optional)" value={fullName} onChange={e => setFullName(e.target.value)} className="input-dark" />
              </>
            )}

            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input-dark" autoComplete="email" />

            {mode !== 'forgot' && (
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
                  className="input-dark pr-12"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt-2 transition-colors select-none"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="bg-red-p/10 border border-red-p/25 rounded-xl py-2.5 px-3 text-red-b text-sm text-center fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/20 border border-green-700/30 rounded-xl py-2.5 px-3 text-green-400 text-sm text-center fade-in">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={mode === 'signin' ? handleSignIn : mode === 'signup' ? handleSignUp : handleForgot}
              disabled={loading}
              className="btn-primary mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'forgot' ? 'Sending…' : 'Loading…'}
                </span>
              ) : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>

            {/* Forgot password link */}
            {mode === 'signin' && (
              <button onClick={() => reset('forgot')} className="w-full text-center text-txt-3 text-xs hover:text-red-p transition-colors pt-1">
                Forgot your password?
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 text-txt-3 text-xs text-center relative z-10">SpotMe © 2025 — Lift. Share. Repeat.</p>
    </div>
  )
}
