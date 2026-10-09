import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build output goes to ../web, which FastAPI serves. `npm run dev` proxies /api to the backend.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../web', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8000' } },
});
