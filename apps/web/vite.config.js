import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const api = process.env.FERRY_API ?? 'http://127.0.0.1:8787';
const proxy = {
  '/api': { target: api, changeOrigin: false },
  '/healthz': { target: api },
  '/readyz': { target: api },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 4173, proxy },
  build: {
    target: 'es2022',
    // Never inline assets as data: URIs — the production CSP only allows same-origin fonts/images.
    assetsInlineLimit: 0,
    sourcemap: false,
    reportCompressedSize: true,
  },
});
