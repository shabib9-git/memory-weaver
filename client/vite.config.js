/**
 * vite.config.js — Vite build configuration for MemoryWeaver SPA.
 *
 * Key settings:
 *   • API proxy: forwards /api and /auth calls to the Express server
 *     during local development so CORS cookies work correctly.
 *   • Build output: ../server/../client/dist is co-located so Express
 *     can serve it in production via express.static.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Dev server configuration
  server: {
    port: 5173,
    proxy: {
      // Forward API and auth calls to the Express backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Production build output — served by Express static middleware
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          analytics: ['react-ga4'],
        },
      },
    },
  },
});
