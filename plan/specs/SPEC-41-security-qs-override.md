# SPEC-41 — Patch transitive `qs` advisory via pnpm override

- **Status:** Done · **Pillar:** Security / Supply-chain · **Wave:** Cycle-6 P0 (REPLENISH re-audit) · **Cycle:** 6

## Description & impact
A Cycle-6 REPLENISH security re-audit (`pnpm audit`) surfaced **1 moderate** advisory:
**`qs` ≤6.15.1** (GHSA-q8mj-m7cp-5q26 — array parsing with `encodeValuesOnly`), pulled transitively only
through `@stryker-mutator/{core,typescript-checker,vitest-runner}` → `typed-rest-client` → `qs`.

- **Production was already clean** (`pnpm audit --prod` clean since the Cycle-2 baseline) — `qs` reaches
  only the *dev* mutation-testing toolchain, never the shipped game.
- Still worth fixing: a clean **full** `pnpm audit` (not just `--prod`) is the frontier-quality bar, and
  supply-chain hygiene for the dev toolchain is defense-in-depth (SPEC-06 already SHA-pins CI + drops
  install scripts). The fix is a one-line, fully-reversible version pin.

## DoD & acceptance
- `pnpm audit --audit-level=low` reports **"No known vulnerabilities found"** (rc 0).
- `qs` resolves to **≥6.15.2** (was 6.15.1); lockfile carries the `overrides` entry.
- `pnpm verify` green (the override is dev-only; must not perturb the workspace build).
- Change is minimal + reversible: `pnpm-workspace.yaml` `overrides` + the lockfile delta only.

## Approach
This repo uses pnpm 11's **workspace-level** config convention (`pnpm-workspace.yaml` already carries
`allowBuilds:`, not the legacy `package.json#pnpm` block). So the override goes in `pnpm-workspace.yaml`:

```yaml
overrides:
  qs: "^6.15.2"
```

(A first attempt placing `pnpm.overrides` in root `package.json` was **silently ignored** under pnpm 11
workspace config — resolution was skipped and `qs` stayed 6.15.1. Reverted; moved to the workspace file.)
`pnpm install` re-resolves: `qs` 6.15.1 → 6.15.2 (same major; patch bump — minimal blast radius).

## Test strategy
`pnpm audit` (clean) + `pnpm verify` (green) are the acceptance gates — both real executions. No app code
changes. Reversible via git if any tool regresses.
