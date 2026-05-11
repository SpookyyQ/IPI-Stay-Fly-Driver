/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50:  '#f5f5f5',
          100: '#e9e9e9',
          200: '#d9d9d9',
          700: '#2a2a2a',
          800: '#1e1e1e',
          900: '#141414',
          950: '#0a0a0a',
        },
        accent: {
          DEFAULT: '#f2b65d',
          hover: '#ffd28a',
        },
        atk: {
          plum: '#2b064f',
          violet: '#5b1591',
          glow: '#8d35ff',
          ink: '#12051f',
          panel: 'rgba(78, 25, 123, 0.42)',
        },
      },
    },
  },
  plugins: [],
}
