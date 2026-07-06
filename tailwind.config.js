/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#0a0b0f',
          850: '#0e1015',
          800: '#12141c',
          750: '#171a24',
          700: '#1d2130',
          600: '#272c3d',
          500: '#343b52'
        },
        accent: {
          DEFAULT: '#4ade80',
          soft: '#22c55e',
          dim: '#166534'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 1.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
