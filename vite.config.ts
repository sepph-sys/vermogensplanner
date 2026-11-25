import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' zodat de build ook vanaf een submap of statische host werkt.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Grafiekbibliotheek en React in aparte, goed cachebare chunks.
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
