/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      fontSize: {
        'hero': ['clamp(2.15rem, 3.8vw, 3.35rem)', { lineHeight: '1.14', letterSpacing: '-0.025em' }],
        'section': ['clamp(1.75rem, 2.4vw, 2.25rem)', { lineHeight: '1.22', letterSpacing: '-0.02em' }],
        'card-title': ['clamp(1.125rem, 1.3vw, 1.25rem)', { lineHeight: '1.32', letterSpacing: '-0.015em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65' }],
        'body-base': ['1rem', { lineHeight: '1.6' }],
        'sub': ['0.875rem', { lineHeight: '1.5' }],
        'metric': ['clamp(1.85rem, 2.4vw, 2.25rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      }
    },
  },
  plugins: [],
}
