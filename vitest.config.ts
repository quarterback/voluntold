import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations');
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            DEV_MODE: '1',
            APP_URL: 'https://app.test',
            APP_SECRET: 'test-secret-0123456789abcdef0123456789',
            ATPROTO_TASK_NSID: 'com.example.volunteer.task',
          },
        },
      }),
    ],
    test: { setupFiles: ['./test/apply-migrations.ts'], include: ['test/**/*.test.ts'] },
  };
});
