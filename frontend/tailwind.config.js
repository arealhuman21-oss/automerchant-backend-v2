/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gradient-flow': 'gradient-flow 3s ease infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'pulse-button': 'pulse-button 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            textShadow: '0 0 10px currentColor',
          },
          '50%': {
            opacity: '0.8',
            textShadow: '0 0 20px currentColor, 0 0 30px currentColor',
          },
        },
        'gradient-flow': {
          '0%, 100%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'pulse-button': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.7)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(168, 85, 247, 0)',
          },
        },
      },
    },
  },
  plugins: [],
}
