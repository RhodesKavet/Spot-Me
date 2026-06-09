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
        'bg-1': '#060606',
        'bg-2': '#0c0c0c',
        'bg-3': '#131313',
        'bg-4': '#1a1a1a',
        'bg-5': '#212121',
        'bdr-1': '#1c1c1c',
        'bdr-2': '#262626',
        'bdr-3': '#323232',
        'red-p':  '#c0392b',
        'red-b':  '#e8453c',
        'txt-1':  '#f2f2f2',
        'txt-2':  '#848484',
        'txt-3':  '#424242',
        'gold':   '#f5a623',
        'silver': '#a8a9ad',
        'bronze': '#cd7f32',
        'save-blue': '#4a9eff',
      },
      fontFamily: {
        head: ['var(--font-barlow-condensed)', 'sans-serif'],
        body: ['var(--font-barlow)', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in':  'fadeIn 0.2s ease-out',
        'pulse-red': 'pulseRed 0.4s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseRed: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
