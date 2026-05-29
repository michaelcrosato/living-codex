# /plan/PROGRESS.md — Execution tracker

Single source of truth for *what's been done*. Update at loop steps 4 (mark `In progress`) and 8
(record outcome). Keep the table honest — `Done` means **DoD met** (see [AGENTS.md](AGENTS.md) DoD).

Baseline at authoring (2026-05-29): `pnpm verify` green — **143 tests / 33 files**, 0 dep violations,
`pnpm audit` clean. HEAD `029994e`.

## Status board

Status legend: `Todo` · `In progress` · `Blocked` · `Done` · `Dropped` (with reason).

| Spec | Title | Wave | Status | Branch/worktree | Commit | Verify | Notes |
|------|-------|------|--------|-----------------|--------|--------|-------|
| SPEC-01 | Doc-sync | 0 | Done | main | 67a2ea2 | green | bribe_faction + credits_at_least + v2 World fields |
| SPEC-03 | CI coverage + doctor | 0 | Done | main | 47d769d | green | @vitest/coverage-v8 + test:coverage + CI doctor/coverage; report-only; supersedes TICKET005 |
| SPEC-06 | CI supply-chain hardening | 0 | Done | main | a4a6056 | green | SHA-pinned actions + least-priv permissions + --ignore-scripts |
| SPEC-07 | depcruise layers + no-orphans | 0 | Done | main | 4f177d8 | green | 3 layer rules + no-orphans; rule fire proven via planted violation |
| SPEC-02 | Wire `talk_to` objective | 1 | Done | main | e471cc8 | green | world.dialogue signal (no new World field/migration); questSystem gains optional npcs; +1 test |
| SPEC-04 | Per-tick state-hash divergence | 1 | Done | main | 12c6f63 | green | replayTrace + firstDivergence (pure, reuse hash()); bisects divergence to a step; +1 test |
| SPEC-05 | fast-check command fuzz | 1 | Done | main | 0ffff81 | green | session-level input fuzz (60 runs, full systems path); replay-invariant-tagged; no divergence found |
| SPEC-12 | Pipeline tolerant pre-parser | 1 | Done | main | d552be1 | green | tolerantParse: fences/CoT/trailing-comma (string-aware); golden-master byte-stable; +7 tests (143→150) |
| SPEC-08 | Offline observability | 2 | Todo | — | — | — | coord main.ts w/ SPEC-09/10 |
| SPEC-09 | Accessibility pass | 2 | Todo | — | — | — | run UI, not just tests |
| SPEC-10 | Durable saves + migration | 2 | Done | main | (see log) | green | persist()/estimate/quota + migrate-on-load; **migration moved tools/migrate→engine-core** (shipped can't import tools/); +6 tests |
| SPEC-13 | New curated pack (offline) | 2 | Todo | — | — | — | StubProvider; updates golden? |
| SPEC-11 | Storylet / salience layer | 3 | Todo | — | — | — | HARD-dep SPEC-16 ordering; needs design note |
| SPEC-14 | Retrieval-grounded canon | 3 | Todo | — | — | — | — |
| SPEC-15 | Rubric LLM-judge gate | 3 | Todo | — | — | — | hermetic StubProvider |
| SPEC-16 | Zod 4 + native JSON Schema | 4 | Todo | — | — | — | MED risk; isolate; updates golden hash |

## Wave gates
- [x] **Wave 0 complete** (2026-05-29) — SPEC-01/07/03/06 shipped; `pnpm verify` green; `pnpm audit` clean. Re-baseline before Wave 1.
- [x] **Wave 1 complete** (2026-05-29) — SPEC-12/04/05/02 shipped; replay invariant intact (now also session-fuzzed); 153 tests. `pnpm verify` green. Re-baseline before Wave 2.
- [ ] **Wave 2 in progress** — SPEC-10 durable saves done; SPEC-08 observability next. (SPEC-09 a11y + SPEC-13 content deferred to a UI/curation-focused session.)
  - 2026-05-29 — SPEC-10 durable saves: `requestPersistentStorage()`/`estimateStorage()` (best-effort, feature-detected) + `SaveQuotaError` handling in persistence; `loadGame` forward-migrates the snapshot World. **Spec correction:** the AC said reuse `tools/migrate`, but a shipped package can't import `tools/` (deps rule) — so the canonical runner+worldMigrations+`migrateWorld` **moved into engine-core** (pure; owns World/WORLD_VERSION) and `tools/migrate` now re-exports them (single source of truth; its test passes unchanged). app-web requests persistence on startup + toasts save failures. +6 tests (159). `pnpm verify` green. **UNVERIFIED:** live-browser persist()/quota/toast behavior (covered by typecheck + non-blocking CI e2e; not run locally this turn).
- [ ] **Wave 3 complete** — content depth + pipeline intelligence.
- [ ] **Wave 4 complete** — Zod 4 migration landed in isolation; golden-master updated.

## Changelog (append-only; newest last)
- 2026-05-29 — `/plan/` authored from the 2026 baseline + 4-agent research pass. No code changed yet.
- 2026-05-29 — SPEC-01 doc-sync: SCHEMA §5 +bribe_faction, §7 +credits_at_least, WORLD_STATE §1 +npcDialogue/+unlockedExits (v2). Docs-only; `pnpm verify` green. (67a2ea2)
- 2026-05-29 — SPEC-07 depcruise: +content-schema-is-leaf, +content-loader-only-imports-schema, +render-and-persistence-only-in-app-web, +no-orphans. Corrected mid-impl: narrative-ink is legitimately imported by offline tooling (compile-ink/synthesis) + packages import their own internals. Rule-fire proven via a planted violation. `pnpm verify` green. (4f177d8)
- 2026-05-29 — SPEC-03 CI coverage+doctor: added @vitest/coverage-v8 + `test:coverage` + vitest coverage config; CI runs `agent:doctor` before `verify` and uploads an lcov artifact. Report-only (no floor); verify stays blocking, e2e non-blocking. `pnpm verify` + `pnpm test:coverage` green. (CI run pending a push.) (47d769d)
- 2026-05-29 — SPEC-06 CI hardening: pinned all 4 GitHub Actions to commit SHAs (+ tag comments), added top-level least-privilege `permissions: contents: read`, and `--ignore-scripts` on CI installs. Proved locally `pnpm install --frozen-lockfile --ignore-scripts` succeeds (no dep needs a lifecycle script). `pnpm verify` green. **Wave 0 complete.** (YAML validity confirmable on next push.) (a4a6056)
- 2026-05-29 — SPEC-12 tolerant pre-parser: `generateStructured` now runs a string-aware `tolerantParse` (code fences / prose-wrapped JSON / trailing commas) before counting a repair, so recoverable output costs 0 re-prompts. No new dep. Golden-master byte-stable (StubProvider clean path unchanged). 150 tests (+7). `pnpm verify` green. (d552be1)
- 2026-05-29 — SPEC-04 per-tick state-hash: added pure `replayTrace`/`firstDivergence` to engine-core (reuse `hash()`), exported via the log barrel; replay.test.ts gains a divergence-bisection test (perturb an event -> pinpoints the step). Caught+fixed a `exactOptionalPropertyTypes` error mid-impl (conditional-spread the optional fields). 151 tests (+1). `pnpm verify` green. (12c6f63)
- 2026-05-29 — SPEC-05 fast-check command fuzz: new app-web/test/replay-fuzz.spec.ts drives random valid-shaped input sequences (Move/Interact/Attack/UseExit/Attempt/Bribe) through a headless GameSession and asserts hash(replay)==hash(live) — exercising the full systems->events->apply->log path (complements the applyEvent-level fuzz in replay.test.ts). 60 runs, seed-pinned; no divergence surfaced. 152 tests (+1). `pnpm verify` green. (0ffff81)
- 2026-05-29 — SPEC-02 wire talk_to: the `talk_to` objective (previously a runtime stub) now completes once the player has engaged the NPC's dialogue — detected via `world.dialogue` (set by DialogueAdvanced, replay-safe), so NO new World field/migration. `questSystem` takes an optional `npcs` registry to resolve the NPC's (base or overridden) dialogue id; session wires it in. +1 test (153). **Wave 1 complete.** `pnpm verify` green.
<!-- Append: `YYYY-MM-DD — SPEC-NN <slug>: <what changed> (<commit>); verify <green/red>.` -->
