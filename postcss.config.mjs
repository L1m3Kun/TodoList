const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extends: {
      fontFamily: {
        nanumSquare: ['var(--font-nanum-squre)'],
      },
    },
  },
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
