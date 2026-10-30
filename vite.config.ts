import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite build --mode browser-demo` builds the demo that runs entirely in the
// visitor's browser (src/browser/main.ts) into dist-demo/.
export default defineConfig(({ mode }) => {
  const browserDemo = mode === 'browser-demo';
  return {
    plugins: [
      react(),
      browserDemo && {
        name: 'browser-demo-entry',
        transformIndexHtml: {
          order: 'pre' as const,
          handler: (html: string) =>
            html.replace(
              '<script type="module" src="/src/web/main.tsx"></script>',
              '<script type="module" src="/src/browser/main.ts"></script>\n    <script type="module" src="/src/web/main.tsx"></script>',
            ),
        },
      },
    ],
    define: browserDemo ? { 'import.meta.env.VITE_BROWSER_DEMO': JSON.stringify('1') } : {},
    resolve: browserDemo
      ? {
          alias: [
            { find: 'hono/cookie', replacement: fileURLToPath(new URL('./src/browser/cookie.ts', import.meta.url)) },
            { find: /^@anthropic-ai\/sdk(\/helpers\/zod)?$/, replacement: fileURLToPath(new URL('./src/browser/no-sdk.ts', import.meta.url)) },
            { find: /^\.\.?\/model$/, replacement: fileURLToPath(new URL('./src/browser/model.ts', import.meta.url)) },
          ],
        }
      : {},
    build: { outDir: browserDemo ? 'dist-demo' : 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
    server: browserDemo
      ? {}
      : { proxy: { '/api': 'http://localhost:8787', '/v': 'http://localhost:8787', '/t': 'http://localhost:8787' } },
  };
});
