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
    },
  },
});
