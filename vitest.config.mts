import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Only the `@/` import alias, mirroring tsconfig's paths so component tests can
// import the way the app does. The jsdom environment is chosen per test file
// (a `@vitest-environment jsdom` comment), so the rest run in plain Node.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, ''),
    },
  },
});
