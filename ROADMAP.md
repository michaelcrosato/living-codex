# ROADMAP.md

Operational roadmap for autonomous work. Product vision is [`docs/GOAL.md`](docs/GOAL.md); current
operating state is [`GOAL.md`](GOAL.md); implementation rules are [`AGENTS.md`](AGENTS.md).

Snapshot date: **2026-05-30**.

---

## Assessment

The repo is healthy enough to stop treating “build the engine” as the main problem. The documented state is:

- Original engine tickets **T-00…T-16** plus the ULTRA hardening pass are complete.
- `pnpm verify` was green on **2026-05-29** with **143 tests**.
- The app is browser-playable.
- CI runs `pnpm agent:doctor`, `pnpm verify`, coverage, and non-blocking Playwright e2e.
- Architecture boundaries are strong: pure `engine-core`, schema/content separation, replay determinism,
  vendor isolation, and agent workflow docs.
- This pass added a root PR checklist and a first manual content pack catalog.

The next gap is **proof quality**: make First Light clear, playable, replayable, content-rich, and easy for an
agent to extend without broad context.

---

## Current risks

| Risk | Response |
|---|---|
| Pack inventory can still drift because the catalog is manual | Add a docs/runtime pack-sync check before adding more default packs. |
| Browser smoke is non-blocking and artifacts are thin | Store traces/screenshots/video on failure; later decide whether a tiny smoke becomes blocking. |
| First Light may be technically playable but unclear to first-time players | Add journal/affordance/UI feedback and run actual branch audits. |
| Content pipeline can generate, but curation proof is thin | Make proposal/critique/curation bundles reviewable before bake. |
| Open cloud-agent notes may duplicate root docs | Reconcile PR #1 into one concise place. |

No known blocking gate is recorded in repo docs. Real generation still requires `OPENROUTER_API_KEY`; this must
remain optional and pipeline-only.

---

## Roadmap lanes

### Lane A — Repo proof and verification

Goal: make the repo’s state and evidence hard to misread.

1. **Pack sync check** — derive or verify the default pack list against `packages/app-web/src/main.ts` and `content/PACKS.md`.
2. **Golden replay** — commit a short First Light replay fixture and assert its hash.
3. **E2E artifacts** — upload Playwright trace/screenshot/video on browser smoke failure.
4. **Docs sync** — fail or warn on stale doc paths and stale pack references.
5. **Cloud-agent notes** — reconcile Cursor Cloud PR #1 into one concise location.

### Lane B — First Light player clarity

Goal: a new player understands what to do and sees consequence without developer narration.

1. **Quest journal** — active quest, branch labels, known objectives, and completion state.
2. **Interaction affordances** — nearby NPC/exits/use prompts with clear controls.
3. **Exit blocker text** — gated exits explain immediate blockers without spoilers.
4. **Branch outcome feedback** — surface authored feedback for skill checks, combat, bribes, reputation, and quest completion.
5. **Save import/export UX** — exported saves become usable bug/replay artifacts, not only downloads.

### Lane C — Gameplay/content depth

Goal: prove the world remembers and the three-route quest structure works.

1. **Warehouse branch audit** — talk, sneak, and force paths are all reachable, understandable, and consequential.
2. **The Drip density pass** — 8–12 patrons with distinct voice, rumor value, and at least one mechanically useful clue.
3. **Varga reaction matrix** — different lines for peaceful, sneaky, violent, bribed, and failed outcomes.
4. **Syndicate reaction pass** — reputation/violence/bribery affects at least one NPC, exit, or bark.
5. **Hook beat** — post-drive NPC/bark clearly points to a larger mystery.

### Lane D — Pipeline B and canon

Goal: make AI-authored content auditable and useful without changing engine scope.

1. **Proposal bundle** — candidate pack JSON, prompts, model list, critique scorecard, validation errors, and curator decision.
2. **Deterministic canon export hash** — same packs produce same export/context hash.
3. **Content diff report** — new/changed IDs, dependencies, assertions, and blast radius.
4. **Validation repair loop** — invalid structured output is repaired or surfaced with precise errors.
5. **Canon graph rules** — add only from real contradiction shapes found in committed or candidate packs.

### Lane E — Content-driven engine verbs

Goal: add mechanics only when content earns them.

Candidate verbs/systems: `lockpick`, `learn_clue`, `spend_favor`, `intimidate`, `disguise`, `blackmail`, `trade`,
`rumor`, `debt`. Each must follow the same path: schema → event/effect → `applyEvent`/system → tests → content pack →
replay check.

---

## Atomic tickets to create next

| ID | Priority | Title | Acceptance gate |
|---|---:|---|---|
| REPO-001 | P0 | Add pack catalog sync check | Script/CI confirms `content/PACKS.md` matches `app-web` default imports. |
| TEST-001 | P0 | Add First Light golden replay fixture | `pnpm replay:verify` asserts fixture hash. |
| UI-001 | P0 | Add/improve quest journal surface | Active quest/branch/objective state visible in browser; e2e/manual evidence. |
| UI-002 | P0 | Add interaction and exit affordances | Nearby usable entities/exits and blockers are legible; e2e/manual evidence. |
| GAME-001 | P0 | Audit warehouse talk/sneak/force paths | All three routes are reachable and have persistent consequences. |
| TEST-002 | P1 | Capture e2e failure artifacts | Failed browser smoke uploads trace/screenshot/video. |
| CONTENT-001 | P1 | Deepen The Drip patrons and useful rumors | 8–12 patrons remain schema-valid and at least one rumor changes later play. |
| PIPE-001 | P1 | Add proposal/critique/curation bundle | `pnpm pipeline:cycle` produces reviewable artifacts before bake. |
| GAME-002 | P1 | Add Varga/Syndicate reaction matrix | Reactions differ by route and pass content verification. |
| PIPE-002 | P1 | Add content diff/blast-radius report | Candidate pack review shows new/changed IDs and canon assertion impact. |
| REPO-002 | P2 | Add stale-doc reference check | Stale paths/pack references are caught by a script or CI step. |
| REPO-003 | P2 | Reconcile Cursor Cloud PR #1 | Cloud instructions live in one concise place and do not bloat root docs. |

Completed this pass: a manual `content/PACKS.md` catalog and `.github/pull_request_template.md`.

---

## Done criteria for any ticket

A ticket is complete only when:

- The stated acceptance gate is satisfied.
- `pnpm verify` is green, or inability to run it is recorded with the reason.
- Targeted tests/checks for the touched area are green.
- Replay determinism is preserved.
- Content changes pass `pnpm content:validate` and `pnpm content:verify`.
- UI changes have e2e, screenshot, trace, or explicit manual-browser evidence.
- Public API changes update `index.ts` and package README where applicable.
- GOAL/ROADMAP/REPO_MAP/tickets are updated when status, commands, paths, config, or pack inventory changes.

---

## Work loop

Follow [`AGENTS.md`](AGENTS.md): status → orient → pick smallest unblocked ticket → mark/update ticket → change →
targeted checks → broad checks → docs → commit → summarize. Prefer small, reviewable diffs over broad cleanup.
