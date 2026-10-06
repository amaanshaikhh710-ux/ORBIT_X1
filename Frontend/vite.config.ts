import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/history': 'http://localhost:8000',
      '/missions': 'http://localhost:8000',
      '/spacecraft': 'http://localhost:8000',
      '/simulation': 'http://localhost:8000',
      '/faults': 'http://localhost:8000',
      '/recovery': 'http://localhost:8000',
      '/reports': 'http://localhost:8000',
      '/sse': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three')) {
            return 'three';
          }
          if (id.includes('react') || id.includes('lucide-react')) {
            return 'vendor';
          }
        },
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: ['orbit-x1-2.onrender.com'],
  },
})