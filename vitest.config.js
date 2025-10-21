import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app.js', 'worker.js'],
      exclude: ['tests/**', 'node_modules/**'],
      thresholds: {
        statements: 96,
        branches: 96,
        functions: 96,
        lines: 96
      }
    },
    globals: true
  }
});
