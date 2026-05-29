# SPEC-07 — dependency-cruiser: layer rules + no-orphans

- **Status:** Todo · **Pillar:** Quality · **Wave:** 0 · **Priority:** P=11
- **I**=3 **F**=5 **R**=2 **Ft**=5

## Description
`.dependency-cruiser.cjs` already enforces the load-bearing bans (engine-core purity, pixi/inkjs isolation,
no tools→shipped, no-circular). Harden it further so the boundary the *whole thesis* rests on can't erode:
add an explicit **layer/import-direction** rule set and a **no-orphans** rule. (Research: dependency-cruiser
[rules-reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md).)

## Acceptance Criteria
- New `error` rules (names indicative):
  - **`content-schema-is-leaf`** — `packages/content-schema/src` may import *nothing* in `packages/*` (it's
    the treaty; depends only on `zod`). 
  - **`content-loader-deps`** — `content-loader/src` may import only `content-schema` (+ zod), not engine/render/etc.
  - **`app-web-is-the-only-composition-root`** — only `app-web` (and tests) may import `render-pixi` / `persistence`
    (mirrors the existing inkjs/pixi rules at the package level).
  - **`ports-direction`** — `render-pixi`/`narrative-ink` may import `engine-core` (port types) but not vice-versa
    (engine-core→render/narrative is already covered by `engine-core-is-pure`; assert the *positive* direction is allowed and the reverse stays banned).
- **`no-orphans`** (`warn` or `error`) excluding legitimate orphans (each package `index.ts`, `*.config.*`,
  `tools/scripts/*` CLI entry points, type-only `.d.ts`). Document the exclusion regex inline.
- `pnpm deps:check` passes (`no dependency violations found`) — i.e. the codebase already satisfies the new
  rules; if a real violation surfaces, fix it or file it (don't weaken the rule to pass).
- The 125-modules/392-deps cruise still completes; rule comments explain each ban.

## Implementation approach
Read the current `.dependency-cruiser.cjs`. Append the new `forbidden` entries using `from`/`to` `path`
regexes consistent with the existing style (note existing rules already use `pathNot: "\\.test\\.ts$"` to
exempt tests — reuse that). Add `no-orphans` via the standard recipe with an `pathNot` allow-list. Run
`pnpm deps:check`; iterate until clean. Keep `options` unchanged (it already excludes dist/node_modules).

## Files
- `.dependency-cruiser.cjs`.

## Dependencies / prereqs
None. Independent of the verify.yml specs.

## Test strategy
`pnpm deps:check` green. Add a deliberate temporary violation (e.g. import persistence into content-loader) to
prove the new rule *fires*, then revert — record the experiment in the commit message. `pnpm verify` green.

## Effort
S (~45 min).

## Out of scope
Restructuring packages; adding a separate `ports/` package (ARCH §5 settled — ports live in engine-core);
changing the existing rules' semantics.
