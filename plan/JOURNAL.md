# /plan/JOURNAL.md — append-only resume log

Newest entries at the bottom. Each cycle: A(audit) → B(research) → C(plan) → D(execute) → R(replenish).
On resume after compaction/restart: read PROGRESS/ROADMAP/AGENTS/BACKLOG/BLOCKED + this tail; disk wins.

VERIFY_CMD: `pnpm verify` (= typecheck[tsc x2] + lint + deps:check + test + content:validate + content:verify + replay:verify). Mutation (report-only): `pnpm mutation`.

---

- **2026-05-30 — Cycles 1–3 recap (pre-JOURNAL).** SPEC-01…33 all Done; pushed to origin/main (`dbb1fd0..5507430`, 23 commits). Baseline at Cycle-4 start: `pnpm verify` green — **195 tests / 42 files**, 0 dep violations, `pnpm audit --prod` clean, 6 content packs, coverage 75.7/65.8/76.9/77.6 (floor 72/60/72/72), **mutation score 73.31%** (engine-core). HEAD 5507430, main≡origin/main.
- **2026-05-30 — Cycle 4 START.** Continuity check OK. Created JOURNAL.md + BLOCKED.md. Phase A (incremental): the live quality gap is the **mutation score (73.31%)** — weak engine-core modules `effects.ts` (0%), `snapshot.ts` (44%), `combat.ts` (50%), `world.ts` (60%), `rng.ts` (64%), `quests.ts` (65%). These are the SPEC-30 survivors. Cycle-4 theme: **harden the determinism-critical test suite** (kill survivors with meaningful tests) + the deferred drip_market exit wiring. Unattended → local commits only, never push (push deny restored).
- **2026-05-30 — Cycle 4 / SPEC-34 [x].** combat.test.ts: added the "no negative HP under overkill" invariant test (GOAL §5.8). Investigation finding logged: the SPEC-30 effects.ts "0%" is a TS-checker-error artifact (not a survivor gap); engine safety bounds (reputation clamp, no-neg-inventory, skill floor, HP clamp) were ALREADY tested — so a broad mutation-chase is low-value (per SPEC-30). Did the ONE real gap only. 196 tests, pnpm verify green. Next: SPEC-35 (wire Drip Market reachable).
