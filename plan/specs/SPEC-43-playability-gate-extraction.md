# SPEC-43 — Make the "schema-valid ≠ playable" gate testable + tested

- **Status:** Done · **Pillar:** Quality / Safety · **Wave:** Cycle-6 P0 (REPLENISH frontier) · **Cycle:** 6

## Description & impact
The content-safety boundary has three layers: referential integrity (`integrity.ts`, hardened SPEC-39),
the semantic canon graph (`canon-graph.ts`, hardened SPEC-40), and the **static playability gate**
(solvability / island-reachability / `unlock_exit` bounds / contradictory `offerWhen` / dead storylets) —
the "schema-valid ≠ playable" net (ARCHITECTURE.md §7). The first two are tested modules; the third lived
**inline in `tools/scripts/content-verify.ts`**, exported and tested nowhere. So while it runs over shipped
content in `pnpm verify`, a regression in its logic (e.g. island detection or exit-bounds) would silently
weaken the gate that stops unwinnable AI-authored content from shipping. This closes that gap — the
least-protected part of the safety boundary — without changing the gate's behavior.

## DoD & acceptance
- Extract the pure rules into `@codex/content-loader`'s `staticPlayabilityCheck(registries) →
  { errors, warnings }` (exported from the package index). `content-verify.ts` becomes a thin CLI:
  discover packs → load + validate → run `auditCanon` + `staticPlayabilityCheck` → report → exit 1 on error.
- **Behavior-preserving:** `pnpm content:verify` over the real content prints the identical OK summary
  (4 quests / 7 locations / 5 storylets) — confirmed.
- New `playability.test.ts`: a planted-violation case per rule (unsolvable branch, out-of-range
  `unlock_exit`, island `reach` target, contradictory `offerWhen`, always-on storylet warning) **plus** a
  clean pack that yields nothing. All pass via real execution; `pnpm verify` green.

## Approach
Move the script-local functions (`objectiveSatisfiable`, `checkUnlockExits`, `checkQuest`,
`checkReachability`, `checkOfferWhen`, the enterable-set, the storylet loop) verbatim into the new module
as closures over a local `errors`/`warnings` pair — identical messages, identical logic. `auditCanon`
(already tested) stays called from the script. No production behavior change; pure refactor + tests.

## Test strategy
Unit tests build registries via `buildRegistries(ContentPack.parse(fixture))` — schema-valid packs that are
playability-broken in exactly one way — and assert the specific error/warning fires (and a clean pack is
silent). Behavior-preservation verified by running the real `content:verify` (identical output). Reversible.
