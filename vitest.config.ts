import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite 8 resolves tsconfig `paths` (@codex/* → package src) natively — no plugin needed (SPEC-65).
  resolve: { tsconfigPaths: true },
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
      // Non-regression floor — ratcheted (SPEC-101, the ratchet SPEC-28 anticipated "once the baseline
      // stabilizes"). The Cycle-7–9 test work raised coverage to 81.83 stmts / 76.63 branch / 81.92 funcs
      // / 83.09 lines (2026-05-30); floor set ~3pt under to lock in the gains with an anti-flake margin so
      // routine work never trips it but a real drop fails `pnpm test:coverage` (CI). Global only.
      thresholds: { statements: 78, branches: 73, functions: 78, lines: 80 },
    },
  },
});
