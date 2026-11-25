import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { kumihimo: fileURLToPath(new URL('./packages/kumihimo/src/index.ts', import.meta.url)) },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'demo/{pages,components,hooks,lib}/**/*.test.{ts,tsx}'],
    testTimeout: 120_000,
  },
});
