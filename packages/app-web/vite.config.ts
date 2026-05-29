import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// The playable shell (T-12). `fs.allow` reaches the repo root so the bundled content pack
// (content/core/pack.opening/pack.json) can be imported directly.
export default defineConfig({
  root: here,
  server: { fs: { allow: [resolve(here, "..", "..")] } },
  preview: { port: 4173 },
  build: { outDir: "dist" },
});
