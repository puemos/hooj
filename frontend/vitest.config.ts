import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api/core': path.resolve(__dirname, './src/__mocks__/tauri-api.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/__mocks__/tauri-dialog.ts'),
      '@tauri-apps/plugin-shell': path.resolve(__dirname, './src/__mocks__/tauri-shell.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
