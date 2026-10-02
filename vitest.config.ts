import { defineConfig } from 'vitest/config';
import { loadEnvConfig } from '@next/env';
import path from 'node:path';
loadEnvConfig(process.cwd());
export default defineConfig({
  resolve: { alias: { '@': path.resolve('src') } },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
