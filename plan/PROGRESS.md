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
| SPEC-03 | CI coverage + doctor | 0 | Done | main | (see log) | green | @vitest/coverage-v8 + test:coverage + CI doctor/coverage; report-only; supersedes TICKET005 |
| SPEC-06 | CI supply-chain hardening | 0 | Todo | — | — | — | serialize w/ SPEC-03 (both edit verify.yml) |
| SPEC-07 | depcruise layers + no-orphans | 0 | Done | main | 4f177d8 | green | 3 layer rules + no-orphans; rule fire proven via planted violation |
| SPEC-02 | Wire `talk_to` objective | 1 | Todo | — | — | — | — |
| SPEC-04 | Per-tick state-hash divergence | 1 | Todo | — | — | — | — |
| SPEC-05 | fast-check command fuzz | 1 | Todo | — | — | — | soft-dep SPEC-04 |
| SPEC-12 | Pipeline tolerant pre-parser | 1 | Todo | — | — | — | — |
| SPEC-08 | Offline observability | 2 | Todo | — | — | — | coord main.ts w/ SPEC-09/10 |
| SPEC-09 | Accessibility pass | 2 | Todo | — | — | — | run UI, not just tests |
| SPEC-10 | Durable saves + migration | 2 | Todo | — | — | — | — |
| SPEC-13 | New curated pack (offline) | 2 | Todo | — | — | — | StubProvider; updates golden? |
| SPEC-11 | Storylet / salience layer | 3 | Todo | — | — | — | HARD-dep SPEC-16 ordering; needs design note |
| SPEC-14 | Retrieval-grounded canon | 3 | Todo | — | — | — | — |
| SPEC-15 | Rubric LLM-judge gate | 3 | Todo | — | — | — | hermetic StubProvider |
| SPEC-16 | Zod 4 + native JSON Schema | 4 | Todo | — | — | — | MED risk; isolate; updates golden hash |

## Wave gates
- [ ] **Wave 0 complete** — hygiene+infra; `pnpm verify` green; re-baseline before Wave 1.
- [ ] **Wave 1 complete** — determinism+correctness locked; replay invariant unchanged.
- [ ] **Wave 2 complete** — experience+durability+ops shipped; UI manually verified.
- [ ] **Wave 3 complete** — content depth + pipeline intelligence.
- [ ] **Wave 4 complete** — Zod 4 migration landed in isolation; golden-master updated.

## Changelog (append-only; newest last)
- 2026-05-29 — `/plan/` authored from the 2026 baseline + 4-agent research pass. No code changed yet.
- 2026-05-29 — SPEC-01 doc-sync: SCHEMA §5 +bribe_faction, §7 +credits_at_least, WORLD_STATE §1 +npcDialogue/+unlockedExits (v2). Docs-only; `pnpm verify` green. (67a2ea2)
- 2026-05-29 — SPEC-07 depcruise: +content-schema-is-leaf, +content-loader-only-imports-schema, +render-and-persistence-only-in-app-web, +no-orphans. Corrected mid-impl: narrative-ink is legitimately imported by offline tooling (compile-ink/synthesis) + packages import their own internals. Rule-fire proven via a planted violation. `pnpm verify` green. (4f177d8)
- 2026-05-29 — SPEC-03 CI coverage+doctor: added @vitest/coverage-v8 + `test:coverage` + vitest coverage config; CI runs `agent:doctor` before `verify` and uploads an lcov artifact. Report-only (no floor); verify stays blocking, e2e non-blocking. `pnpm verify` + `pnpm test:coverage` green. (CI run pending a push.)
<!-- Append: `YYYY-MM-DD — SPEC-NN <slug>: <what changed> (<commit>); verify <green/red>.` -->
