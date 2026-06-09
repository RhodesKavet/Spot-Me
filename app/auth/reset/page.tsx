'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import { EyeIcon, EyeOffIcon } from '@/components/Icons'

export default function ResetPasswordPage() {
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
    })
  }, [router])

  const handleReset = async () => {
    if (!password || !confirm) { setError('Fill in both fields.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }
    if (password.length < 6)   { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) setError(err.message)
    else     setSuccess(true)
  }

  if (success) return (
    <div className="min-h-svh bg-bg-1 flex flex-col items-center justify-center p-5">
      <Logo size="lg" glow />
      <div className="mt-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <h2 className="font-head font-bold text-2xl text-txt-1 mb-2">Password updated!</h2>
        <p className="text-txt-2 mb-6 text-sm">You can now sign in with your new password.</p>
        <button onClick={() => router.replace('/auth')} className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }}>
          Go to Sign In
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-svh bg-bg-1 flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full bg-red-p/8 blur-3xl" />
      </div>
      <div className="mb-8 relative z-10"><Logo size="lg" glow /></div>
      <div className="w-full max-w-sm glass grad-border rounded-2xl p-6 shadow-2xl relative z-10 scale-in">
        <h2 className="font-head font-bold text-xl text-txt-1 mb-1">Set New Password</h2>
        <p className="text-txt-3 text-sm mb-5">Choose a strong password for your account.</p>
        <div className="space-y-3">
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} placeholder="New password"
              value={password} onChange={e => setPassword(e.target.value)} className="input-dark pr-12" />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt-2">
              {showPass ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
          <input type="password" placeholder="Confirm password"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReset()} className="input-dark" />
          {error && <p className="text-red-b text-sm text-center bg-red-p/10 border border-red-p/20 rounded-xl py-2 px-3">{error}</p>}
          <button onClick={handleReset} disabled={loading} className="btn-primary mt-1">
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
