import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://example.com/api/test-tenant',
    },
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['lib/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
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
