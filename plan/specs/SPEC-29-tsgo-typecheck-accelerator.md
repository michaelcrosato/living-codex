# SPEC-29 — `tsgo` (TypeScript 7 native) typecheck accelerator

- **Status:** Todo · **Pillar:** Future-proofing / DX · **Wave:** Cycle-3 Phase 1 (Core Upgrades) · **P=11**
- **I**=4 **F**=4 **R**=2 **Ft**=5 · **LOW-MED risk — `tsc` stays the authoritative gate; tsgo is an opt-in accelerator.**

## Description & expected impact
The dual-tsconfig `pnpm typecheck` is the **long pole of `pnpm verify`**, which the AFK loop runs constantly.
TypeScript 7's Go-native compiler (`tsgo`, via `@typescript/native-preview`) is **~10× faster type-checking
with ~2.9× less memory** and, as of mid-2026, is **production-ready specifically for `--noEmit` type checking**
(>98% compatible with tsc 6.0; only ~74 known intentional edge-case diffs). **This repo is the ideal case:
its `tsc` usage is `--noEmit`-only** — Vite/esbuild does all emit — so the incomplete tsgo emit pipeline is
irrelevant here. Adopt tsgo as a fast typecheck path while keeping `tsc` (TS 6) as the canonical gate.
(Research: [TS 7 beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/), [progress Dec 2025](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/).)

## Definition of Done & Acceptance Criteria
- `@typescript/native-preview` added (dev); a new script **`typecheck:fast`** runs `tsgo --noEmit` on **both**
  `tsconfig.json` and `tsconfig.dom.json`.
- **Parity proven on THIS codebase:** `pnpm typecheck:fast` reports **zero errors**, matching `pnpm typecheck`
  (tsc). Document any tsgo/tsc diff found (expect none given the union-heavy, enum-free style).
- **`tsc` remains authoritative:** `pnpm verify` still calls `pnpm typecheck` (tsc). tsgo is the accelerator
  for local/inner-loop use and (optionally) a fast CI pre-check — NOT the canonical gate (emit pipeline +
  watch still maturing). State this clearly in AGENTS.md.
- Engine purity still holds under tsgo: a planted DOM import in engine-core errors under the pure config via
  `typecheck:fast` too (prove once, revert).
- `pnpm verify` green.

## Implementation approach
`pnpm add -Dw @typescript/native-preview`; add `"typecheck:fast": "tsgo --noEmit -p tsconfig.json && tsgo
--noEmit -p tsconfig.dom.json"`. Run both `typecheck` and `typecheck:fast`; diff their outputs (must agree).
Optionally add a CI job that runs `typecheck:fast` first (fast feedback) with `typecheck` (tsc) as the
blocking gate. Do NOT remove or replace `tsc`.

## Files
- `package.json` (devDep + script), `pnpm-lock.yaml`, possibly `.github/workflows/verify.yml`, `plan/AGENTS.md`
  (document tsgo-accelerator vs tsc-authoritative), `docs/ai/REPO_MAP.md` (commands). No source.

## Test strategy
`pnpm typecheck` (tsc) and `pnpm typecheck:fast` (tsgo) both zero-error and agree; planted-purity-violation
errors under both; full `pnpm verify`.

## Effort
M (mostly proving parity + wiring the script/CI).

## Out of scope
Replacing `tsc` as the gate; using tsgo for emit (Vite does emit); `--watch`/`--build` via tsgo; bumping the
authoritative TypeScript beyond 6.x (SPEC-20).
