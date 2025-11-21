import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    cors: true,
  },

  // Build configuration
  build: {
    target: 'ES2022',
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          'core-managers': [
            './src/core/managers/NodeSystem.ts',
            './src/core/managers/ViewportManager.ts',
            './src/core/managers/ConnectionManager.ts',
          ],
        },
      },
    },
  },

  // Path resolution (mirrors tsconfig paths)
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/core': resolve(__dirname, './src/core'),
      '@/components': resolve(__dirname, './src/components'),
      '@/services': resolve(__dirname, './src/services'),
      '@/state': resolve(__dirname, './src/state'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/styles': resolve(__dirname, './src/styles'),
    },
  },

  // Environment variable prefix
  envPrefix: 'VITE_',

  // CSS configuration
  css: {
    devSourcemap: true,
  },
});
