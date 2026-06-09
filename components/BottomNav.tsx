'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlayIcon, MapPinIcon, PlusIcon, TrophyIcon, UserIcon } from '@/components/Icons'

interface BottomNavProps { onUpload: () => void }

const TABS = [
  { href: '/feed',        label: 'Feed',  Icon: PlayIcon   },
  { href: '/map',         label: 'Map',   Icon: MapPinIcon },
  { href: '__upload__',   label: 'Post',  Icon: PlusIcon   },
  { href: '/leaderboard', label: 'Board', Icon: TrophyIcon },
  { href: '/profile',     label: 'Me',    Icon: UserIcon   },
]

export default function BottomNav({ onUpload }: BottomNavProps) {
  const pathname = usePathname()

  return (
    /* Hidden on desktop — sidebar takes over at the 'sidebar' (900px) breakpoint */
    <nav className="fixed bottom-0 left-0 right-0 z-30 sidebar:hidden"
      style={{
        background: 'rgba(8,8,8,.96)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,.05)',
      }}>
      <div className="flex items-center justify-around h-[60px] px-2 mx-auto max-w-[680px]">
        {TABS.map(({ href, label, Icon }) => {
          if (href === '__upload__') return (
            <button key="upload" onClick={onUpload} className="flex flex-col items-center gap-0.5 px-2 press" aria-label="Post">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)', boxShadow: '0 0 18px rgba(192,57,43,.55)' }}>
                <Icon size={19} />
              </div>
            </button>
          )
          const active = pathname === href || (href === '/profile' && pathname.startsWith('/profile'))
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors press ${
                active ? 'text-red-b' : 'text-txt-3'
              }`}>
              <Icon size={21} filled={active} />
              <span className="text-[8px] font-head font-bold uppercase tracking-widest">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
