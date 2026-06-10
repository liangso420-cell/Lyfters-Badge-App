/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#6C63FF',
        'primary-soft': '#EEEDFF',
        base: '#F8F9FA',
      },
      borderRadius: {
        card: '16px',
        btn: '8px',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#6C63FF',
          'primary-content': '#ffffff',
          secondary: '#EEEDFF',
          'base-100': '#ffffff',
          'base-200': '#F8F9FA',
        },
      },
    ],
  },
}
