/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        palace: {
          50: '#f8faf9',
          100: '#edf4f1',
          200: '#d5e4de',
          300: '#afccc1',
          400: '#81ad9f',
          500: '#5e9082',
          600: '#487469',
          700: '#3a5d54',
          800: '#1e3831',
          900: '#0f241f',
          950: '#071512',
        },
        gold: {
          50: '#fbf9f2',
          100: '#f6f1df',
          200: '#ecdcb9',
          300: '#dfc28b',
          400: '#d2a75d',
          500: '#c5913e',
          600: '#af7733',
          700: '#8c592b',
          800: '#734829',
          900: '#613d26',
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};

