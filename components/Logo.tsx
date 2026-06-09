interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  glow?: boolean
}

export default function Logo({ size = 'md', className = '', glow = false }: LogoProps) {
  const dims = { sm: [145, 30], md: [200, 42], lg: [270, 56] }
  const [w, h] = dims[size]
  const id = `logo-grad-${size}`

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 200 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 12px rgba(192,57,43,.6))' } : undefined}
      aria-label="SpotMe"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#e8453c" />
          <stop offset="50%"  stopColor="#c0392b" />
          <stop offset="100%" stopColor="#922b21" />
        </linearGradient>
        <linearGradient id={`${id}-text`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d4d4d4" />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ── Dumbbell shadow ── */}
      <rect x="1" y="8" width="11" height="30" rx="3.5" fill="rgba(0,0,0,.4)" />
      <rect x="44" y="8" width="11" height="30" rx="3.5" fill="rgba(0,0,0,.4)" />

      {/* ── Left plate ── */}
      <rect x="0" y="6" width="11" height="30" rx="3.5" fill={`url(#${id})`} />
      {/* plate detail line */}
      <rect x="3" y="10" width="2" height="22" rx="1" fill="rgba(255,255,255,.15)" />

      {/* ── Left collar ── */}
      <rect x="11" y="13" width="5" height="16" rx="2" fill="#922b21" />

      {/* ── Bar ── */}
      <rect x="16" y="18" width="24" height="6" rx="3" fill="#7a2519" />
      {/* bar highlight */}
      <rect x="16" y="18" width="24" height="2" rx="1" fill="rgba(255,255,255,.08)" />

      {/* ── Right collar ── */}
      <rect x="40" y="13" width="5" height="16" rx="2" fill="#922b21" />

      {/* ── Right plate ── */}
      <rect x="45" y="6" width="11" height="30" rx="3.5" fill={`url(#${id})`} />
      <rect x="51" y="10" width="2" height="22" rx="1" fill="rgba(255,255,255,.15)" />

      {/* ── SPOT text ── */}
      <text
        x="66"
        y="31"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="800"
        fontSize="27"
        fill={`url(#${id}-text)`}
        letterSpacing="1"
      >SPOT</text>

      {/* ── ME text (red gradient) ── */}
      <text
        x="150"
        y="31"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="800"
        fontSize="27"
        fill={`url(#${id})`}
        letterSpacing="1"
      >ME</text>

      {/* ── Subtle underline accent ── */}
      <rect x="66" y="34" width="118" height="1.5" rx="1" fill="rgba(192,57,43,.25)" />
    </svg>
  )
}
