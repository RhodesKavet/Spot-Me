'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/feed',        label: 'Feed',        icon: '▶' },
  { href: '/map',         label: 'Map',         icon: '📍' },
  { href: '__upload__',   label: 'Post',        icon: '+' },
  { href: '/leaderboard', label: 'Board',       icon: '🏆' },
  { href: '/profile',     label: 'Me',          icon: '👤' },
]

interface BottomNavProps {
  onUpload: () => void
}

export default function BottomNav({ onUpload }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 bg-bg-2/95 backdrop-blur-sm border-t border-bdr-1">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV.map(({ href, label, icon }) => {
          if (href === '__upload__') {
            return (
              <button
                key="upload"
                onClick={onUpload}
                className="flex flex-col items-center gap-0.5 px-3"
                aria-label="Create post"
              >
                <div className="w-11 h-11 rounded-full bg-red-p flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-red-p/30 active:scale-95 transition-transform">
                  +
                </div>
              </button>
            )
          }

          const active = pathname === href || (href === '/profile' && pathname.startsWith('/profile'))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? 'text-red-p' : 'text-txt-3 hover:text-txt-2'
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className={`text-[10px] font-head font-bold uppercase tracking-wide ${active ? 'text-red-p' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
