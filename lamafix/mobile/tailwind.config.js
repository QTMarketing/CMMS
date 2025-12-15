/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{native.js,native.jsx,native.ts,native.tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{native.js,native.jsx,native.ts,native.tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#d2e5ff',
          200: '#a7ccff',
          300: '#74acff',
          400: '#4b90ff',
          500: '#1f6eff',
          600: '#1653db',
          700: '#123fb0',
          800: '#0f328b',
          900: '#0d296f',
        },
      },
    },
  },
  plugins: [],
};

