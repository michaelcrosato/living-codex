import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Banned in engine-core: it must stay pure (no DOM, no node, no vendor SDKs, no wall-clock/random). */
const engineCoreForbiddenImports = [
  { name: "pixi.js", message: "Renderer vendor — only render-pixi may import it." },
  { name: "inkjs", message: "Narrative vendor — only narrative-ink may import it." },
  { name: "idb-keyval", message: "Persistence vendor — engine-core is pure." },
  { name: "@codex/render-pixi", message: "engine-core must not depend on a vendor package." },
  { name: "@codex/narrative-ink", message: "engine-core must not depend on a vendor package." },
  { name: "@codex/content-loader", message: "engine-core is handed registries; it never loads them." },
  { name: "@codex/persistence", message: "engine-core must not depend on persistence." },
];
const engineCoreForbiddenPatterns = ["node:*", "fs", "path", "crypto"];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/e2e/**",
      ".dependency-cruiser.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": { descriptionFormat: "^ reason: " }, "ts-expect-error": { descriptionFormat: "^ reason: " } },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["packages/engine-core/src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "engine-core forbids Math.random — use time/rng.ts (the single seeded RNG).",
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "engine-core forbids Date.now — time comes from time/clock.ts.",
        },
      ],
      "no-restricted-imports": [
        "error",
        { paths: engineCoreForbiddenImports, patterns: engineCoreForbiddenPatterns },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/test/**/*.ts", "tools/scripts/**/*.ts"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },
);
