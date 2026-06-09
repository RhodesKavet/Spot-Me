/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Dark Elite surface scale ── */
        'bg-1': '#080808',
        'bg-2': '#0d0d0d',
        'bg-3': '#121212',
        'bg-4': '#181818',
        'bg-5': '#202020',
        /* borders */
        'bdr-1': '#1e1e1e',
        'bdr-2': '#282828',
        'bdr-3': '#343434',
        /* brand red */
        'red-p':  '#c0392b',
        'red-b':  '#e8453c',
        /* text */
        'txt-1':  '#f0f0f0',
        'txt-2':  '#888888',
        'txt-3':  '#444444',
        /* medal */
        'gold':   '#f5a623',
        'silver': '#a8a9ad',
        'bronze': '#cd7f32',
        /* save */
        'save-blue': '#3b82f6',
      },
      fontFamily: {
        head: ['var(--font-barlow-condensed)', 'sans-serif'],
        body: ['var(--font-barlow)', 'sans-serif'],
      },
      screens: {
        /* sidebar breakpoint */
        'sidebar': '900px',
      },
      animation: {
        'spring-in':   'springIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-up':    'slideUp 0.32s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':     'fadeIn 0.2s ease-out both',
        'pulse-red':   'pulseRed 0.4s ease-out',
        'float-up':    'floatUp 0.8s ease-out forwards',
        'spin-slow':   'spin 2s linear infinite',
        'shimmer':     'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        springIn: {
          '0%':   { opacity: '0', transform: 'scale(0.88) translateY(16px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseRed: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        floatUp: {
          '0%':   { opacity: '1', transform: 'translate(-50%,-50%) scale(1)' },
          '100%': { opacity: '0', transform: 'translate(-50%,-160%) scale(1.9)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      boxShadow: {
        'red-glow':  '0 0 24px rgba(192,57,43,.5), 0 0 48px rgba(192,57,43,.18)',
        'red-sm':    '0 0 14px rgba(192,57,43,.4)',
        'gold-glow': '0 0 24px rgba(245,166,35,.5)',
        'card':      '0 4px 24px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
}
