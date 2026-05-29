# /plan/RISK_REGISTER.md

Risks to this initiative + rollback strategies. Severity = Likelihood × Impact (qualitative).
Re-check each before the spec that touches it. **Ground-truth note:** items marked ✅ were verified
this session and are *not* currently active risks — kept for the record so a future agent doesn't
re-raise them without checking.

## A. Cross-cutting / standing risks

| # | Risk | Sev | Mitigation | Rollback |
|---|------|-----|------------|----------|
| R1 | **Determinism regression** — a change makes `hash(replay)≠hash(live)` (e.g. uses `Math.random`/`Date.now`, mutates `World`, puts a Map/Set in state, re-runs Ink). | **High** | `replay:verify` is in `pnpm verify`; SPEC-04 adds per-tick bisection; SPEC-05 fuzzes it; lint bans the globals in engine-core. | `git revert` the offending commit; the invariant test pinpoints it. |
| R2 | **Golden-master churn** — `cycle.test.ts` byte-hash breaks on any schema/generation change, looking like a failure. | Med | Expect it on SPEC-02/11/13/16; update the hash *deliberately* and call it out in the commit. | Re-derive hash from the intended pack; never weaken the assertion to pass. |
| R3 | **Scope creep** — research surfaced many ideas; an agent gilds beyond a spec. | Med | Specs have explicit "Out of scope"; discoveries go to [BACKLOG.md](BACKLOG.md); self-review step 7. | Drop the out-of-scope hunk from the commit. |
| R4 | **Parallel-worktree file collision** — two agents edit the same file. | Med | ROADMAP §3 collision map; one spec per worktree; serialize the listed shared files. | Rebase/replay the smaller change; never force-push over a peer. |
| R5 | **Doc/code drift re-accumulates** — code changes, docs don't. | Low | DoD requires doc updates; SPEC-01 fixes current drift; keep SCHEMA/WORLD_STATE in the diff when schema/World change. | N/A (prevention). |
| R6 | **Accidental purity/vendor-isolation break** — DOM/pixi/inkjs import leaks into the wrong package. | Med | `deps:check` + split typecheck catch it; SPEC-07 hardens layer rules. | `git revert`; move the import to the owning package. |
| R7 | **File > 600 lines** as features land (apply.ts already 286). | Low | Soft-warn at 400; split by concept before exceeding. | Extract a module; no behavior change. |

## B. Spec-specific risks

| Spec | Risk | Sev | Mitigation | Rollback |
|------|------|-----|------------|----------|
| SPEC-16 | **Zod 4 migration is coupled & broad** — touches every schema file, `json-schema.ts`, the pipeline's `zodToJsonSchema` call, and the golden hash. `.default()` now yields the *output* type (use `.prefault()`), which historically interacted with `generateStructured`'s `z.output<S>` inference. | **High** | Do in isolation (Wave 4, own branch); use the `zod-v3-to-v4` codemod; native `z.toJSONSchema({unrepresentable:"any"})`; run full `pnpm verify` + diff the exported JSON Schema + golden pack before/after. | Single revert restores Zod 3 + zod-to-json-schema; keep the branch unmerged until green. |
| SPEC-11 | **Storylet layer is the biggest surface** — new schema concept + selector system + content + replay implications (selection must be deterministic). | Med-High | Write a 1-page design note first (in the spec); selection ties broken by the single seeded RNG *inside* the fold; additive & engine-ignored where possible; gate behind content that uses it. | Revert; storylets are additive so removal doesn't break existing packs. |
| SPEC-09 | **A11y "done" is not test-provable** — screen-reader UX needs manual/assistive verification. | Med | DOM-mirror + `aria-live` are structural & testable in JSDOM/Playwright; document what was *not* machine-verified honestly. | Revert UI hunk; no engine impact. |
| SPEC-10 | **`navigator.storage.persist()` is a permission prompt / may be denied**; quota errors are async. | Low-Med | Treat persistence as best-effort + handle `QuotaExceededError`; embed `schemaVersion` so old saves still load. | Feature-detect & no-op where unsupported; migration is forward-only and tested. |
| SPEC-13 | **Real multi-model generation needs `OPENROUTER_API_KEY` (paid).** | Med | Unattended path uses **StubProvider** (hermetic) or hand-curates the cycle's output; do not call paid APIs unattended. | N/A — offline by construction. |
| SPEC-14/15 | **LLM-as-judge / retrieval can't be hermetically "real"** without a model; quality claims are soft. | Med | Test the *plumbing* with StubProvider (deterministic scorecard/grounding injection); keep judging advisory (folds into curation bundle), not a hard auto-reject. | Revert; both are additive to the offline cycle. |
| SPEC-05 | **PBT can surface a *latent* real bug** (good) or a flaky/perf-heavy test (bad). | Low-Med | Bound `numRuns`; seed fast-check for reproducibility; shrink to a minimal failing sequence and file it. | Reduce run count / mark `.skip` with a filed BACKLOG bug if it's a perf issue, not a correctness one. |

## C. Verified-clean (NOT active risks — recorded so they aren't re-raised)
| ✅ | Finding | Evidence (this session) |
|----|---------|--------------------------|
| ✅ | **Vite CVE-2026-39363/4/5** (research-flagged High) | Lockfile **Vite 7.3.3** > fixed 7.3.2; **not vulnerable**. |
| ✅ | **esbuild dev-server CORS CVE** | esbuild **0.27.7 & 0.28.0** > fixed 0.25.0. |
| ✅ | **Dependency vulnerabilities generally** | `pnpm audit` (prod **and** dev) → **"No known vulnerabilities found"**. |
| ✅ | **TypeScript behind** | Already **5.9.3** (research target). |
| ⚠️ | **`zod-to-json-schema` unmaintained since Nov 2025** | True; not a vuln, but a maintenance risk → addressed by SPEC-16 (not urgent). |

## D. Rollback posture (general)
Every spec is one logical local commit on its own branch/worktree → `git revert <sha>` is the universal
undo, and `pnpm verify` confirms restoration. Nothing here pushes, drops data, or touches shared infra
without explicit human approval (see [AGENTS.md](AGENTS.md) "Stop and ask").
