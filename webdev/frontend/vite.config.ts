import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // No source maps in production — prevents code exposure
    sourcemap: false,
    // Minification (oxc is the default in Vite 8+)
    minify: 'oxc',
    // Chunk size warning at 500KB
    chunkSizeWarningLimit: 500,
    // Manual chunk grouping: heavy libs cached long-term, rarely rebuilt.
    // Function form required by Vite 8 / Rollup 4 typings.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Core React stays separate — changes least often.
          if (
            id.includes('/react-router') ||
            id.includes('/react-dom/') ||
            /[\\/]react[\\/]/.test(id)
          ) {
            return 'react-vendor';
          }
          // PDF toolchain is ~1MB; only pulled in when user reaches report/cta.
          if (
            id.includes('html2canvas-pro') ||
            id.includes('/jspdf') ||
            id.includes('/pdf-lib')
          ) {
            return 'pdf-vendor';
          }
          return undefined;
        },
      },
    },
  },
})