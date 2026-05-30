import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["packages/**/*.test.ts", "packages/**/test/**/*.spec.ts", "tools/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["packages/*/src/**/*.ts", "tools/*/src/**/*.ts"],
      // Not executable logic / not unit-tested in this suite: tests, e2e specs, build output,
      // and the offline CLI script bodies (covered via the tools they call).
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/test/**", "**/e2e/**", "**/dist/**"],
      // Non-regression floor (SPEC-28): ~3pt under the measured baseline (stmts 75.13 / branch 65.14
      // / funcs 76.14 / lines 76.93 at 2026-05-30) so routine work never trips it but a real drop fails
      // `pnpm test:coverage` (CI). Global only — per-file thresholds are too brittle.
      thresholds: { statements: 72, branches: 60, functions: 72, lines: 72 },
    },
  },
});
