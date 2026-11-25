import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // each folder under pages/ is a page, served at the same path: pages/simulator/ → /simulator/
  root: here('pages'),
  publicDir: here('public'),
  // relative asset URLs, so the built site works at any path (a GitHub Pages project site lives at /<repo>/)
  base: './',
  plugins: [react()],
  resolve: {
    // build against the engine's source, so the site always demonstrates the engine in this repo
    alias: { kumihimo: here('../packages/kumihimo/src/index.ts') },
  },
  build: {
    outDir: here('dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: here('pages/index.html'),
        simulator: here('pages/simulator/index.html'),
        explorer: here('pages/explorer/index.html'),
      },
    },
  },
});
