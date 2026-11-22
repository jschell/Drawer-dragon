import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: ['es2022', 'safari16'],
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
} as never);
