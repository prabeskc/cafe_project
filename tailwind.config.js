/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        background: {
          DEFAULT: '#ffffff', // Light mode: white
          dark: '#0e1411',    // Dark mode: dark green-black
        },
        card: {
          DEFAULT: '#ffffff',   // Light mode: white
          dark: '#0f1713',      // Dark mode: dark green
        },
        accent: {
          DEFAULT: '#10b981',   // Mint green for both modes
          dark: '#34d399',      // Lighter mint for dark mode
        },
        accentMuted: {
          DEFAULT: '#059669',   // Darker mint for light mode
          dark: '#1f7a5d',      // Muted mint for dark mode
        },
        textPrimary: {
          DEFAULT: '#111827',   // Light mode: dark text
          dark: '#e5e7eb',      // Dark mode: light text
        },
        textSecondary: {
          DEFAULT: '#6b7280',   // Light mode: gray text
          dark: '#9ca3af',      // Dark mode: lighter gray
        },
        border: {
          DEFAULT: '#e5e7eb',   // Light mode: light border
          dark: 'rgba(255,255,255,0.05)', // Dark mode: transparent white
        },
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.1)',     // Light mode shadow
        'soft-dark': '0 4px 24px rgba(0,0,0,0.25)', // Dark mode shadow
      },
    },
  },
  plugins: [],
}