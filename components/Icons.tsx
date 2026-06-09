interface P {
  size?: number
  className?: string
  filled?: boolean
}

export function BarbellIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="1" y="5.5" width="3.5" height="13" rx="1.5"
        fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
      <rect x="4.5" y="8.5" width="2" height="7" rx="1"
        fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
      <rect x="6.5" y="10.5" width="11" height="3" rx="1.5"
        fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
      <rect x="17.5" y="8.5" width="2" height="7" rx="1"
        fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
      <rect x="20" y="5.5" width="3.5" height="13" rx="1.5"
        fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

export function CommentIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-5 3V6z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}/>
    </svg>
  )
}

export function BookmarkIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}/>
    </svg>
  )
}

export function VolumeOffIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function VolumeOnIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function MapPinIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}/>
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"
        fill={filled ? 'rgba(0,0,0,.35)' : 'none'}/>
    </svg>
  )
}

export function SearchIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function GridIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3"  y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={filled ? 'currentColor' : 'none'}/>
      <rect x="14" y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={filled ? 'currentColor' : 'none'}/>
      <rect x="3"  y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={filled ? 'currentColor' : 'none'}/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={filled ? 'currentColor' : 'none'}/>
    </svg>
  )
}

export function TrophyIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 2h12v8a6 6 0 0 1-12 0V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={filled ? 'currentColor' : 'none'}/>
      <path d="M6 2H2v3a4 4 0 0 0 4 4M18 2h4v3a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 16v4M9 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function UserIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill={filled ? 'currentColor' : 'none'}/>
      <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill={filled ? 'currentColor' : 'none'}/>
    </svg>
  )
}

export function PlayIcon({ size = 24, className = '', filled = false }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 3l14 9-14 9V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={filled ? 'currentColor' : 'none'}/>
    </svg>
  )
}

export function PlusIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5"  y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

export function ArrowLeftIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function XIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="18" y1="6" x2="6"  y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6"  y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function EyeIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

export function EyeOffIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function CameraIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

export function SignOutIcon({ size = 24, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
