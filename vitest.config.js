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
        statements: 80,
        branches: 80,
        functions: 60,
        lines: 80
      }
    },
    globals: true
  }
});
