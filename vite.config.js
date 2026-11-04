import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.ECO_BIN_API_TARGET || 'http://localhost:8080';

// In development, forward API and upload requests to the PHP backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/uploads': apiTarget,
    },
  },
});
