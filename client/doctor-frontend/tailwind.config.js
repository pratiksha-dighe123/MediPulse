/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slatex: '#0b1220',
        mint: '#2dd4bf',
        amberx: '#f59e0b',
        rosex: '#f43f5e',
        ink: '#0f1222',
        neon: '#23d5ab',
        coral: '#ff6b6b',
        sky: '#3f8cff',
      },
      boxShadow: {
        panel: '0 18px 60px rgba(7, 13, 26, 0.45)',
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 80px rgba(35, 213, 171, 0.25)',
      },
      animation: {
        fadeUp: 'fadeUp 0.7s ease-out both',
        float: 'float 5s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        scaleIn: 'scaleIn 0.3s ease-out both'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(35, 213, 171, 0.4)' },
          '50%': { opacity: .5, boxShadow: '0 0 0 10px rgba(35, 213, 171, 0)' }
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' }
        }
      }
    },
  },
  plugins: [],
};
