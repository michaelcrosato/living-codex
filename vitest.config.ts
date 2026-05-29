import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["packages/**/*.test.ts", "packages/**/test/**/*.spec.ts", "tools/**/*.test.ts"],
    environment: "node",
  },
});
