import { defineConfig } from '@playwright/test';

/**
 * Smoke test of the live demo (e2e/). Needs a web app with NEXT_PUBLIC_DEMO_MODE=true and an API
 * with DEMO_MODE=true. Locally: `pnpm test:smoke`; against the live site:
 * SMOKE_URL=https://campusly.uz pnpm test:smoke (4 demo sign-ins of the 20 per 15 minutes).
 * Uses the Chrome installed on this computer, so nothing extra is downloaded.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  // One worker: the demo sign-ins count per IP on the API
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.SMOKE_URL ?? 'http://localhost:3001',
    channel: 'chrome',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
});
