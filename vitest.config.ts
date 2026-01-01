import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only-32-chars',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-only-32-chars',
      GOOGLE_API_KEY: 'test-google-api-key',
      FRONTEND_URL: 'http://localhost:5173',
      CORS_ORIGIN: 'http://localhost:5173',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.ts',
        'src/db/migrations/',
      ],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
