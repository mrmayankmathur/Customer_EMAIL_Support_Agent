/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#15191C',
        darkCard: '#212936',
        darkText: '#D1D5DB',
        lightBg: '#FFFFFF',
        lightSidebar: '#F3F4F6',
        lightText: '#1F2937',
        accentCyan: '#06B6D4',
        accentGreen: '#4ADE80',
        accentRed: '#EF4444',
        borderDark: '#374151',
        borderLight: '#E5E7EB',
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(6, 182, 212, 0.5)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.5)',
      }
    },
  },
  plugins: [],
}
