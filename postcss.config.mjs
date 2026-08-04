const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extends: {
      fontFamily: {
        nanumSquare: 'var(--font-nanumSqure)',
      },
    },
  },
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
