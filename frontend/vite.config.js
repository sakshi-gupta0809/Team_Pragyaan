import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://email_backend:8000',
        changeOrigin: true
      },
      '/scheduler': {
        target: 'http://email_backend:8000',
        changeOrigin: true
      }
    }
  }
})
