'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlayIcon, MapPinIcon, PlusIcon, TrophyIcon, UserIcon } from '@/components/Icons'

interface BottomNavProps {
  onUpload: () => void
}

export default function BottomNav({ onUpload }: BottomNavProps) {
  const pathname = usePathname()

  const tabs = [
    { href: '/feed',        label: 'Feed',   Icon: PlayIcon   },
    { href: '/map',         label: 'Map',    Icon: MapPinIcon },
    { href: '__upload__',   label: 'Post',   Icon: PlusIcon   },
    { href: '/leaderboard', label: 'Board',  Icon: TrophyIcon },
    { href: '/profile',     label: 'Me',     Icon: UserIcon   },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30"
      style={{ background: 'rgba(6,6,6,.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,.06)' }}>
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map(({ href, label, Icon }) => {
          if (href === '__upload__') return (
            <button key="upload" onClick={onUpload} className="flex flex-col items-center gap-0.5 px-2" aria-label="Post">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg,#c0392b,#e8453c)', boxShadow: '0 0 16px rgba(192,57,43,.5)' }}>
                <Icon size={20} />
              </div>
            </button>
          )

          const active = pathname === href || (href === '/profile' && pathname.startsWith('/profile'))
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 transition-colors rounded-xl ${
                active ? 'text-red-b' : 'text-txt-3'
              }`}>
              <Icon size={22} filled={active} />
              <span className="text-[9px] font-head font-bold uppercase tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
