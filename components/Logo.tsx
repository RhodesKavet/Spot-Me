interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const dims = { sm: [145, 30], md: [200, 42], lg: [262, 55] }
  const [w, h] = dims[size]

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 200 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SpotMe"
    >
      {/* ── Dumbbell ── */}
      {/* Left plate */}
      <rect x="0" y="5" width="11" height="32" rx="3.5" fill="#c0392b" />
      {/* Left collar */}
      <rect x="11" y="12" width="5" height="18" rx="2" fill="#9b2d22" />
      {/* Bar */}
      <rect x="16" y="17" width="22" height="8" rx="4" fill="#7a2519" />
      {/* Right collar */}
      <rect x="38" y="12" width="5" height="18" rx="2" fill="#9b2d22" />
      {/* Right plate */}
      <rect x="43" y="5" width="11" height="32" rx="3.5" fill="#c0392b" />

      {/* ── Text ── */}
      <text
        x="64"
        y="31"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="800"
        fontSize="28"
        fill="#f2f2f2"
        letterSpacing="0.5"
      >
        SPOT
      </text>
      <text
        x="148"
        y="31"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="800"
        fontSize="28"
        fill="#c0392b"
        letterSpacing="0.5"
      >
        ME
      </text>
    </svg>
  )
}
