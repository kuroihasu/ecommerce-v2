import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    setupFiles: ['dotenv/config'],
    include: ['**/*.e2e-spec.ts'],
  },
});
