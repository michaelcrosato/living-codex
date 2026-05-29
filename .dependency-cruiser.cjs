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
