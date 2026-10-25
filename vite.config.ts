import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: {
    proxy: { '/api': 'http://localhost:8787', '/v': 'http://localhost:8787', '/t': 'http://localhost:8787' },
  },
});
