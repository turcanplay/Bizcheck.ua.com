/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Only our own tests — never walk node_modules or the build output.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
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
    // Chunk grouping: heavy libs cached long-term, rarely rebuilt.
    //
    // IMPORTANT — use rolldown's `advancedChunks`, NOT the legacy `manualChunks`
    // function. With `manualChunks`, rolldown folds the virtual module
    // `\0vite/preload-helper.js` (which exports `__vitePreload`, needed by every
    // chunk that uses dynamic import()) into the FIRST manual group that also
    // references it — which was `pdf-vendor`. The entry chunk then had to
    // statically `import { __vitePreload } from "./pdf-vendor-*.js"`, so Vite
    // emitted a <link rel="modulepreload"> for the whole 1.15 MB PDF bundle in
    // index.html and every landing visitor downloaded it before first paint.
    // `advancedChunks` groups only the modules matched by `test`, leaving the
    // preload helper in the entry where it belongs. Do not "simplify" this back
    // to manualChunks — re-check dist/index.html for a pdf-vendor
    // modulepreload if you ever touch it.
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [
            // Core React stays separate — changes least often, caches best.
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
            },
            // PDF toolchain is ~1.1 MB. Reached only via `await import()` inside
            // utils/pdfGenerator, so this is an async-only chunk: it must never
            // appear in the entry's static import graph.
            {
              name: 'pdf-vendor',
              test: /[\\/]node_modules[\\/](jspdf|html2canvas-pro|pdf-lib)[\\/]/,
            },
          ],
        },
      },
    },
  },
})