import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure a single copy of three is used; postprocessing relies on instanceof
  // checks that fail (and render a black screen) when three is duplicated.
  resolve: {
    dedupe: ['three'],
  },
  optimizeDeps: {
    include: ['three'],
  },
  build: {
    // The three.js 3D engine is inherently large (~250 kB gzipped); that single
    // chunk legitimately exceeds the default warning size, so raise the limit.
    chunkSizeWarningLimit: 1200,
    // Split vendors into long-lived cache chunks (3D engine vs. React runtime)
    // so repeat visits and app-only changes don't re-download everything.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (
            id.includes('three') ||
            id.includes('@react-three') ||
            id.includes('postprocessing')
          ) {
            return 'three';
          }
          if (id.includes('react') || id.includes('zustand') || id.includes('scheduler')) {
            return 'react';
          }
          return 'vendor';
        },
      },
    },
  },
})
