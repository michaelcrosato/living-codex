import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Standalone Playwright (kept independent of vitest, which is v3 while @vitest/browser is v4).
 * Builds the app and serves the preview, then runs the slice smoke test against it. Not part of
 * `pnpm verify` (needs a browser via `playwright install chromium`); run with `pnpm e2e`.
 */
export default defineConfig({
  testDir: resolve(here, "e2e"),
  timeout: 30_000,
  use: { baseURL: "http://localhost:4173", headless: true },
  webServer: {
    command:
      "pnpm --filter @codex/app-web build && pnpm --filter @codex/app-web preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
