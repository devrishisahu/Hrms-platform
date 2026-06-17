/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: '#C50337',
          50: '#fef1f4',
          100: '#fce5ea',
          200: '#fac0cc',
          300: '#f68fa6',
          400: '#f05276',
          500: '#C50337',
          600: '#b0002b',
          700: '#940021',
          800: '#7e0420',
          900: '#6b061e',
          950: '#3e000c',
        },
        noir: {
          DEFAULT: '#02060E',
          50: '#f5f6f8',
          100: '#eef0f3',
          200: '#d7dbdf',
          300: '#b2bac3',
          400: '#8694a1',
          500: '#64748b',
          600: '#4e5c70',
          700: '#404c5c',
          800: '#363f4c',
          900: '#303641',
          950: '#02060E',
        },
        slate: {
          neutral: '#1a1f29', 
        }
      },
      backgroundImage: {
        'crimson-noir': 'radial-gradient(circle at top right, rgba(197, 3, 55, 0.15), #02060E 60%)',
        'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
