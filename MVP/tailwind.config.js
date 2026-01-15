/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ffe5e7',
          100: '#ffb3b9',
          500: '#e50914',
          600: '#c40810',
          700: '#85040a',
        },
        charcoal: '#0b0b0f',
        graphite: '#15151d',
      },
      boxShadow: {
        card: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
