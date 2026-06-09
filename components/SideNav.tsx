'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import Logo from '@/components/Logo'
import { PlayIcon, MapPinIcon, PlusIcon, TrophyIcon, UserIcon, SignOutIcon } from '@/components/Icons'

interface Props {
  onUpload: () => void
  currentUser?: Profile | null
}

const NAV = [
  { href: '/feed',        label: 'Feed',        Icon: PlayIcon   },
  { href: '/map',         label: 'Map',         Icon: MapPinIcon },
  { href: '/leaderboard', label: 'Leaderboard', Icon: TrophyIcon },
  { href: '/profile',     label: 'Profile',     Icon: UserIcon   },
]

export default function SideNav({ onUpload, currentUser }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  return (
    <aside className="hidden sidebar:flex flex-col w-[220px] shrink-0 sticky top-0 h-svh z-30"
      style={{ background: '#080808', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

      {/* ── Logo ── */}
      <div className="px-6 pt-8 pb-6">
        <Logo size="md" />
        <p className="text-txt-3 text-[10px] font-head font-bold uppercase tracking-[0.2em] mt-1.5">
          Where Gains Go Viral
        </p>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href === '/profile' && pathname.startsWith('/profile'))
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 group relative"
              style={active
                ? { background: 'rgba(192,57,43,.12)', color: '#e8453c' }
                : { color: 'rgba(255,255,255,.35)' }}>
              {/* Active bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #c0392b, #e8453c)' }} />
              )}
              <Icon size={20} filled={active} />
              <span className={`font-head font-bold text-sm uppercase tracking-wider transition-colors
                ${active ? 'text-red-b' : 'text-txt-3 group-hover:text-txt-2'}`}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* ── Upload / Post button ── */}
        <button
          onClick={onUpload}
          className="flex items-center gap-3.5 px-4 py-3 rounded-xl w-full mt-3 transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)', boxShadow: '0 0 20px rgba(192,57,43,.35)' }}>
          <PlusIcon size={20} />
          <span className="font-head font-bold text-sm uppercase tracking-wider text-white">Post Workout</span>
        </button>
      </nav>

      {/* ── User mini-profile ── */}
      {currentUser && (
        <div className="px-3 pb-6 pt-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(192,57,43,.6)' }}>
              {currentUser.avatar_url
                ? <Image src={currentUser.avatar_url} alt={currentUser.username} width={36} height={36} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center font-head font-black text-sm text-white"
                    style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)' }}>
                    {currentUser.username[0].toUpperCase()}
                  </div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-head font-bold text-txt-1 text-sm truncate leading-tight">@{currentUser.username}</p>
              {currentUser.full_name && (
                <p className="text-txt-3 text-xs truncate">{currentUser.full_name}</p>
              )}
            </div>
            <button onClick={signOut} className="text-txt-3 hover:text-red-b transition-colors flex-shrink-0 p-1" title="Sign out">
              <SignOutIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
