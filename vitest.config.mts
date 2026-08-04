import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    env: {
      API_BASE_URL: 'http://example.com',
    },
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/index.ts',
        'configs/**',
        'types/**',
        'assets/**',
        '**/*.schema.ts',
        '**/schemas/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@assets': path.resolve(__dirname, './assets'),
      '@pages': path.resolve(__dirname, './pages'),
      '@components': path.resolve(__dirname, './components'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@lib': path.resolve(__dirname, './lib'),
    },
  },
});
