/**
 * Architecture enforcement (ARCHITECTURE.md §7). These are CI gates, not suggestions.
 * Encodes the dependency graph (§2) and the vendor-isolation bans (AGENTS.md).
 */
module.exports = {
  forbidden: [
    {
      name: "engine-core-is-pure",
      comment:
        "engine-core depends on content-schema ONLY — never render/narrative/loader/persistence or their vendors.",
      severity: "error",
      from: { path: "^packages/engine-core/src", pathNot: "\\.test\\.ts$" },
      to: {
        path: "node_modules/(pixi\\.js|inkjs|idb-keyval)|^packages/(render-pixi|narrative-ink|content-loader|persistence)/",
      },
    },
    {
      name: "engine-core-no-node-builtins",
      comment: "The pure core must not touch node builtins (no fs, path, crypto, …).",
      severity: "error",
      from: { path: "^packages/engine-core/src", pathNot: "\\.test\\.ts$" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "pixi-only-in-render-pixi",
      comment: "Exactly one package may import the renderer vendor.",
      severity: "error",
      from: { pathNot: "^packages/render-pixi/|\\.test\\.ts$" },
      to: { path: "node_modules/pixi\\.js" },
    },
    {
      name: "inkjs-only-in-narrative-ink",
      comment: "Exactly one package may import the narrative vendor.",
      severity: "error",
      from: { pathNot: "^packages/narrative-ink/|\\.test\\.ts$" },
      to: { path: "node_modules/inkjs" },
    },
    {
      name: "no-offline-pipeline-in-shipped",
      comment: "tools/ is offline-only and must never be imported by a shipped package.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^tools/" },
    },
    {
      name: "content-schema-is-leaf",
      comment:
        "content-schema is the treaty (ARCHITECTURE.md §2). It imports nothing from other workspace packages — only zod.",
      severity: "error",
      from: { path: "^packages/content-schema/src", pathNot: "\\.test\\.ts$" },
      to: {
        path: "^packages/(engine-core|content-loader|render-pixi|narrative-ink|persistence|app-web)/",
      },
    },
    {
      name: "content-loader-only-imports-schema",
      comment: "content-loader depends on content-schema ONLY (ARCHITECTURE.md §2 graph).",
      severity: "error",
      from: { path: "^packages/content-loader/src", pathNot: "\\.test\\.ts$" },
      to: {
        path: "^packages/(engine-core|render-pixi|narrative-ink|persistence|app-web)/",
      },
    },
    {
      name: "render-and-persistence-only-in-app-web",
      comment:
        "Only the app-web composition root imports render-pixi and persistence (ARCHITECTURE.md §5). Exempts each package importing its own internals. (narrative-ink is deliberately omitted: the offline Ink-compile tooling in tools/ also imports it — that's how inkjs stays isolated to one package — so it's governed by the inkjs-isolation rule instead.)",
      severity: "error",
      from: { pathNot: "^packages/(app-web|render-pixi|persistence)/|\\.test\\.ts$" },
      to: { path: "^packages/(render-pixi|persistence)/" },
    },
    {
      name: "no-orphans",
      comment:
        "Every module should be reachable (dead code / missing wiring). Excludes legit non-import targets: package index surfaces, type decls, configs, CLI entry points, and tests.",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)index\\.ts$",
          "\\.d\\.ts$",
          "\\.(config|setup)\\.(c|m)?[jt]s$",
          "^tools/scripts/",
          "\\.test\\.ts$",
          "\\.spec\\.ts$",
          "(^|/)(test|e2e)/",
        ],
      },
      to: {},
    },
    {
      name: "no-circular",
      comment: "Cyclic dependencies erode legibility.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    exclude: { path: "(^|/)(dist|node_modules)/" },
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
