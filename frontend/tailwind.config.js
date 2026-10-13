/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0B0F17',
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        pearl: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
        },
        emerald: {
          500: '#10B981',
          600: '#059669',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(245, 158, 11, 0.25)',
        card: '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
