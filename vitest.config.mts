import { fileURLToPath } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

// Only the `@/` import alias, mirroring tsconfig's paths so component tests can
// import the way the app does. The jsdom environment is chosen per test file
// (a `@vitest-environment jsdom` comment), so the rest run in plain Node.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, ''),
    },
  },
  test: {
    // Playwright owns e2e/; its specs would otherwise match Vitest's pattern.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // Blocks real network calls in every test, and supplies the browser APIs
    // jsdom lacks in the component tests.
    setupFiles: ['./tests/setup.ts'],
    // Only for `npm run test:coverage`. components/ui and ai-elements are
    // vendored, so they'd measure someone else's code. No thresholds yet.
    coverage: {
      provider: 'v8',
      include: ['components/**/*.{ts,tsx}', 'lib/**/*.ts'],
      exclude: [
        'components/ui/**',
        'components/ai-elements/**',
        '**/*.test.{ts,tsx}',
      ],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
