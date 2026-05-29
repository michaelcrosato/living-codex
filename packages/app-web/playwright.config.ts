import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Standalone Playwright (kept independent of vitest, which is v3 while @vitest/browser is v4).
 * Builds the app and serves the preview, then runs the slice smoke test against it. Not part of
 * `pnpm verify` (needs a browser via `playwright install chromium`); run with `pnpm e2e`.
 *
 * Port 4319 is deliberately off the beaten path: `reuseExistingServer` trusts whatever is already on
 * the port, and a foreign dev server on Vite's default 4173/5173 would silently make the suite test
 * the WRONG app ("#cold-open not found"). A dedicated, unusual port avoids that collision.
 */
export default defineConfig({
  testDir: resolve(here, "e2e"),
  timeout: 30_000,
  use: { baseURL: "http://localhost:4319", headless: true },
  webServer: {
    command:
      "pnpm --filter @codex/app-web build && pnpm --filter @codex/app-web preview --port 4319 --strictPort",
    url: "http://localhost:4319",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
