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
| SPEC-08 | Offline observability | 2 | Done | main | 7e99f1e | green | telemetry.ts: window error boundary + bounded ring + User Timing marks; engine-core untouched; +5 tests; browser walk PASSES (clean server) |
| SPEC-09 | Accessibility pass | 2 | Done | main | 8b5eafd | green | DialogueView: role=dialog/aria-live/focusable buttons/focus-trap+restore; reduced-motion; dyslexia-font toggle; 3 e2e a11y specs PASS (browser) |
| SPEC-10 | Durable saves + migration | 2 | Done | main | 827a741 | green | persist()/estimate/quota + migrate-on-load; **migration moved tools/migrate→engine-core** (shipped can't import tools/); +6 tests |
| SPEC-13 | New curated pack (offline) | 2 | Done | main | (see log) | green | pack.kestrel (rival fixer + 3-branch quest + Ink + canon assertions); same-path load+play test; +4 tests; golden untouched |
| SPEC-11 | Storylet / salience layer | 3 | Done | main | bb10696 | green | minimal additive schema + salience-selected ambient barks system; tie-breaker RNG inside applyEvent fold; +3 tests |
| SPEC-14 | Retrieval-grounded canon | 3 | Done | main | 816552a | green | subgraph query + cycle prompt grounding + integration spy test |
| SPEC-15 | Rubric LLM-judge gate | 3 | Todo | — | — | — | hermetic StubProvider |
| SPEC-16 | Zod 4 + native JSON Schema | 4 | Todo | — | — | — | MED risk; isolate; updates golden hash |

## Wave gates
- [x] **Wave 0 complete** (2026-05-29) — SPEC-01/07/03/06 shipped; `pnpm verify` green; `pnpm audit` clean. Re-baseline before Wave 1.
- [x] **Wave 1 complete** (2026-05-29) — SPEC-12/04/05/02 shipped; replay invariant intact (now also session-fuzzed); 153 tests. `pnpm verify` green. Re-baseline before Wave 2.
- [x] **Wave 2 complete** (2026-05-29) — SPEC-10/08/09/13 shipped & browser-verified; 168 tests; content = 4 packs / 14 NPCs / 3 quests; `pnpm verify` green, `pnpm audit` clean. Re-baseline before Wave 3.
  - 2026-05-29 — SPEC-10 durable saves: `requestPersistentStorage()`/`estimateStorage()` (best-effort, feature-detected) + `SaveQuotaError` handling in persistence; `loadGame` forward-migrates the snapshot World. **Spec correction:** the AC said reuse `tools/migrate`, but a shipped package can't import `tools/` (deps rule) — so the canonical runner+worldMigrations+`migrateWorld` **moved into engine-core** (pure; owns World/WORLD_VERSION) and `tools/migrate` now re-exports them (single source of truth; its test passes unchanged). app-web requests persistence on startup + toasts save failures. +6 tests (159). `pnpm verify` green. (827a741)
  - 2026-05-29 — SPEC-08 offline observability: new `app-web/src/telemetry.ts` — a top-level window `error`/`unhandledrejection` boundary records into a bounded ring (tagged with the current tick), plus no-op-safe User Timing `mark`/`measure` wrappers; `main.ts` installs the boundary, marks sim/draw phases, and exposes `__codex.telemetry()`. NO network/SaaS; engine-core untouched; `beats.ts` stays pure. +5 tests (164). `pnpm verify` green. **Browser-verified:** `pnpm e2e` first failed on `#cold-open not found` — investigated to a **foreign server squatting :4173** (`reuseExistingServer` reused it; build+serve of the real app confirmed correct, `#cold-open` present); the slice walk **PASSES** against a clean server (temp :4199 config). Filed e2e port-robustness in BACKLOG. (7e99f1e)
  - 2026-05-29 — SPEC-09 accessibility: new `app-web/src/dialogue-view.ts` makes the dialogue an ARIA modal — `role=dialog`/`aria-modal`, an `aria-live=polite` text region, real focusable `<button>` choices (rebuilt only on frame change, so the live region/focus don't churn), focus on the first choice, Tab focus-trap, and focus-restore on close; `InputController.choose()` lets buttons drive the existing Choose path (number keys still work). index.html adds the structure + `:focus-visible`, a `prefers-reduced-motion` query, readable type, and a dyslexia-friendly font toggle (`#font-toggle`, aria-pressed). engine-core untouched. 3 committed e2e a11y specs (modal contract, font toggle, **dynamic: open→focus→Esc-restores**) all PASS in chromium (run against a clean :4199 since :4173 was squatted). `pnpm verify` green; 164 unit tests. **Honest note:** structural + interactive a11y machine-verified; not audited with a real screen reader (NVDA/VoiceOver). (8b5eafd)
  - 2026-05-29 — SPEC-13 new curated pack: hand-curated `content/core/pack.kestrel` — a rival fixer (Kestrel + `faction.kestrel_outfit`, rival of Varga's crew) with a **3-branch** intro quest (take-job / play-both / stay-loyal), real Ink dialogue (compiled via `content:compile-ink`), and grounded canon assertions. `content:validate` (4 packs/14 npcs/3 quests) + `content:verify` (solvable, reachable, **canon-clean**) pass. New `rival-fixer.spec.ts` proves same-path load alongside hand-authored + generated packs, cross-pack faction refs resolve, the Ink plays, and the quest completes end-to-end through the real engine (exercising the SPEC-02 `talk_to` wiring on authored content). +4 tests (168). Golden-master untouched (no pipeline change). `pnpm verify` green. **Wave 2 complete.** Found+filed SCHEMA §3 doc-drift (combat/homeLocationId) in BACKLOG.
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
- 2026-05-29 — SPEC-11 storylet-layer: added Zod schema, integrity checker, deterministic salience selector system, and TriggerStorylet tie-breaker event handler inside the fold (bb10696); verify green.
- 2026-05-29 — SPEC-14 retrieval-grounded canon: queried 1-hop relevant subgraph over the S5 graph and injected as stable prompt context grounding (816552a); verify green.
<!-- Append: `YYYY-MM-DD — SPEC-NN <slug>: <what changed> (<commit>); verify <green/red>.` -->
