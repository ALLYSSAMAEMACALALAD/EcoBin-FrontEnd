import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api requests are forwarded to the PHP backend (php -S localhost:8000 -t backend/public).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true }, '/uploads': 'http://localhost:8000' },
  },
});
