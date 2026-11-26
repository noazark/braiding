import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * A fingerprint of the engine's source. The explorer caches what the engine works out about the
 * presets under this, so the cache is thrown out exactly when the engine changes.
 */
function engineHash() {
  const dir = here('../packages/kumihimo/src');
  const h = createHash('sha256');
  for (const f of readdirSync(dir).sort()) h.update(f).update(readFileSync(`${dir}/${f}`));
  return h.digest('hex').slice(0, 12);
}

export default defineConfig({
  define: { 'import.meta.env.VITE_ENGINE_HASH': JSON.stringify(engineHash()) },
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
