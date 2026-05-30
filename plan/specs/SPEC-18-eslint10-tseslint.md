# SPEC-18 — ESLint 9 → 10 + typescript-eslint major bump

- **Status:** Todo · **Pillar:** Future-proofing (deps) · **Wave:** 5 · **Priority:** P=8
- **I**=2 **F**=4 **R**=2 **Ft**=4 · **LOW-MED risk — config only; a new default rule may flag existing code.**

## Description
`eslint` + `@eslint/js` are at **9.39.4 → 10.x**, `typescript-eslint` at **8.x → matching major**
(per `pnpm outdated`). The repo already uses **flat config** (`eslint.config.js`), which ESLint 9
introduced — so the 10.x jump is mostly engine/peer-range + rule-default changes, not a config rewrite.
Keeps the linter current (ESLint 9 ages out of support) and surfaces any newly-recommended rules.

## Acceptance Criteria
- `eslint` and `@eslint/js` at 10.x; `typescript-eslint` at its matching major; `pnpm-lock.yaml` updated.
- `eslint.config.js` reconciled for any renamed/removed options (e.g. removed built-in formatters,
  `linterOptions` changes). **Zero new lint errors** land: fix the code if cheap and in-spirit, otherwise
  pin the specific rule off with a **one-line justification comment** — never blanket-disable, never
  weaken the `no-explicit-any` / vendor-isolation-adjacent rules.
- `pnpm lint` clean and full **`pnpm verify` green**.

## Implementation approach
Bump the four devDeps; `pnpm install`; `pnpm lint`. Read the ESLint 10 + typescript-eslint migration
notes for option renames. Reconcile config; address any new rule firings minimally.

## Files
- `package.json` (devDeps), `eslint.config.js`, `pnpm-lock.yaml`. **No source collision** (config only),
  but **serialize with SPEC-20** (both touch the TS/`typescript-eslint` peer resolution).

## Dependencies / prereqs
Network for the dep bump. Coordinate ordering with SPEC-20 (TypeScript 6) — typescript-eslint's
supported-TS range couples them; do one, re-verify, then the other.

## Test strategy
`pnpm lint` (zero errors) → `pnpm verify` (full gate). If a new rule fires broadly, prefer a scoped fix;
record any justified disable in the spec Notes.

## Effort
S-M.

## Out of scope
Authoring new custom lint rules; stylistic churn; the TypeScript upgrade (SPEC-20); Prettier changes.
