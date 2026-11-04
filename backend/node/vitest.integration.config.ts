import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      // Vem do Compose (TEST_DATABASE_URL); nenhuma credencial escrita aqui.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      MIGRATION_DATABASE_URL: process.env.TEST_MIGRATION_DATABASE_URL ?? '',
      DEMO_IDENTITY_ENABLED: 'true',
    },
  },
});
