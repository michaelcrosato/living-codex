# GOAL.md — operational state + strategic roadmap

> Snapshot date: **2026-05-30**. This is the root operating brief for autonomous and human-assisted work.
> The product north star remains [`docs/GOAL.md`](docs/GOAL.md); if this file and `docs/GOAL.md`
> disagree about *what the product is*, `docs/GOAL.md` wins. This file explains *where the repo stands,
> how agents should work today, and what to build next*.

---

## 0. Executive intent

**The Living Codex** is a browser-based, top-down, text-forward 2D RPG whose engine is intentionally
small enough for a single AI coding agent to maintain indefinitely, and whose world is expanded by
frontier-model content proposals that are human-curated, schema-validated, and baked into static packs.

The repository should prove two claims at the same time:

1. **A deterministic, typed, modular TypeScript engine can be evolved by an autonomous coding agent**
   without architectural drift.
2. **A deep RPG world can grow faster than a solo writer could write it** by using AI for draft volume,
   human judgment for taste, and strict schemas for safety and permanence.

The product bet is not graphics-first. It is **agency-first**: dense characters, branching quests,
reactive consequences, replayable world state, and an offline content pipeline that keeps adding
coherent story material without runtime LLM calls.

---

## 1. Hard product scope

These are settled decisions. Do not reopen them without a deliberate human product decision.

| Area | Decision | Practical meaning |
|---|---|---|
| Runtime AI | **No live LLM calls during gameplay.** | The game runs from static validated content. Players never interact with a model. |
| World growth | **AI-authored, human-curated, static packs.** | Pipeline B proposes; a human approves; content is baked under `content/`. |
| Engine ownership | **One primary coding agent model at a time.** | Use parallel agents for research/review only, not uncoordinated writes to the same branch. |
| Engine model | **Pure deterministic core.** | `World` changes only through events folded by `applyEvent`; replay must match live state. |
| Rendering | **Vector/text first; renderer swappable.** | Sprites, generated art, animation, and voice are future ports, not engine rewrites. |
| Performance | **Legibility beats raw speed.** | Prefer a simpler system an agent can reason about over clever hot paths. |
| Content behavior | **Schema verbs only.** | If content needs a new behavior, add a schema/effect/event/system ticket; never smuggle logic into data. |
| Multiplayer/networking | **Out of scope.** | Single-player, browser-playable, offline-capable first. |
| Procedural generation | **Out of scope.** | The world is curated authored content, not infinite filler. |

---

## 2. Current repo state

### 2.1 What is already strong

- The engine is already organized as the intended workspace graph: `engine-core`, `content-schema`,
  `content-loader`, `narrative-ink`, `render-pixi`, `persistence`, and `app-web`.
- `engine-core` is a pure simulation package with public exports for time, state, events, tick,
  conditions, ports, and systems.
- Content is separated from engine logic through `packages/content-schema` and `packages/content-loader`.
- Replay determinism is a first-class invariant: events are logged, `World` is serializable, and
  `hash(replay(log, seed)) === hash(liveWorld)` must stay true.
- Vendor isolation is already encoded into docs and gates: Pixi stays in `render-pixi`, Ink stays in
  `narrative-ink`, and provider SDKs stay out of shipped packages.
- CI already runs the main verification gate, coverage, `pnpm agent:doctor`, and a non-blocking browser
  smoke job.
- `AGENTS.md` is short enough to remain useful to coding agents and already emphasizes negative rules,
  bounded context, and deterministic gates.

### 2.2 Status that should be treated as factual unless a later run contradicts it

- The repo documentation states the original engine tickets **T-00…T-16** plus the ULTRA hardening pass
  are complete.
- The repo documentation states `pnpm verify` was green on **2026-05-29** with **143 tests**. This file
  update did not re-run local gates; it is a documentation/roadmap update.
- The app is browser-playable through `pnpm dev`.
- Current runtime imports in `packages/app-web/src/main.ts` load these packs:
  - `content/core/pack.opening`
  - `content/core/pack.district_barks`
  - `content/core/pack.drip_market`
  - `content/generated/pack.the_drip_patrons`
- Some docs still mention an older pack inventory such as `pack.bribe_demo`; normalize the content-pack
  inventory in the next repo-health pass.
- An open draft PR adds Cursor Cloud environment instructions. Reconcile that PR after review rather
  than duplicating cloud-agent notes in multiple places.

### 2.3 Main gap

The architecture is not the bottleneck. The bottleneck is now **proof quality**:

- Can a first-time player complete the 10-minute slice without guidance?
- Can the repo produce a deterministic replay artifact for that session?
- Can Pipeline B produce a new pack that feels coherent, passes validation, and creates visible gameplay
  value without engine special-casing?
- Can an agent pick a small ticket, make a change, verify it, and leave a reviewable commit without
  consuming the whole repo as context?

The next phase should therefore prioritize **playability, content depth, agent-proof verification, and
repo consistency**, not broad engine expansion.

---

## 3. Operating model for 2026 frontier coding agents

Public AI coding tools have shifted from autocomplete to **asynchronous coding agents**: they can inspect
repos, plan, edit files, run commands, open branches/PRs, and produce artifacts such as logs, screenshots,
and test output. This repo should exploit that capability while protecting itself from the known failure
modes: context bloat, plausible but unverified patches, over-broad edits, weak tests, and destructive tool
access.

### 3.1 What to optimize for

1. **Small ticket surface.** One ticket should be understandable after reading a guide plus a few files.
2. **Hard negative constraints.** Agents respond better to precise “do not violate this boundary” rules
   than to long style sermons.
3. **Executable verification.** Every ticket needs a command, replay, screenshot, or content check that
   proves it worked.
4. **Fresh-context review.** For non-trivial changes, use a separate agent/session to review the diff
   against acceptance criteria.
5. **Artifacts over claims.** A completed task should cite exact checks, generated artifacts, and changed
   files, not just say “done.”
6. **No broad autonomy with destructive access.** Agents may run repo-local commands, tests, and commits;
   they must not receive production secrets, system-wide deletion authority, or broad cloud permissions.

### 3.2 Recommended agent workflow

For any non-trivial ticket:

1. **Orient:** read this file, `AGENTS.md`, `ROADMAP.md`, `docs/ai/REPO_MAP.md`, and the ticket.
2. **Plan:** identify exact files to inspect, expected schema/event/system changes, and verification.
3. **Implement:** change the smallest set of files that satisfy the ticket.
4. **Verify targeted:** package-specific test, typecheck, content check, or Playwright smoke as relevant.
5. **Verify broad:** `pnpm verify`; if browser work changed, also `pnpm e2e` when a browser is available.
6. **Review:** use an independent review pass for correctness and scope, not style bikeshedding.
7. **Document:** update ticket, docs, `index.ts` exports, pack manifests, and repo maps when relevant.
8. **Commit:** local commit with clear message; do not push unless explicitly requested.

For trivial changes where the diff is obvious, skip formal planning but still run the relevant gate.

### 3.3 Parallel-agent policy

Parallel work is useful only when collision is impossible.

Good uses:

- Agent A researches engine impact while Agent B audits content references.
- Agent A implements a ticket in one worktree while Agent B reviews the final diff in a clean context.
- Several agents produce candidate content packs or quest outlines for human curation.
- One agent writes tests from a spec while another implements the code, with separate branches.

Bad uses:

- Multiple agents editing the same branch.
- Multiple agents changing the same schema/event union at once.
- Agents independently updating canon without a single curator.
- Agents making broad “cleanup” changes without a ticket and acceptance criteria.

### 3.4 Agent configuration policy

Keep agent configuration **minimal, interoperable, and executable**.

- `AGENTS.md` remains the root instruction file. Keep it terse.
- `.aiignore` remains the skip list for generated or token-heavy paths.
- `docs/ai/REPO_MAP.md` remains the token-efficient file map.
- Add tool-specific files only when they encode real value not already in `AGENTS.md`.
- Prefer hooks/scripts for rules that must always run. Natural-language reminders are advisory; gates are law.
- Do not create large agent “skill” files unless they wrap a repeatable workflow with exact inputs,
  commands, and outputs.

---

## 4. Engineering invariants

These are defects if violated, even if the game still appears to run.

1. **Engine purity:** `packages/engine-core` imports no DOM, no `node:*`, no fetch, no renderer, no narrative
   implementation, no persistence, no provider SDK.
2. **Content treaty:** Pipeline A and Pipeline B meet only through `packages/content-schema` and validated
   registries.
3. **Event-only mutation:** `World` changes only by folding `GameEvent` through `applyEvent`.
4. **Flat JSON state:** no classes, `Map`, `Set`, dates, functions, closures, or non-serializable values in
   `World`.
5. **Single entropy source:** no `Math.random()` or `Date.now()` in `engine-core`; use the deterministic RNG
   and clock abstractions.
6. **Ink capture:** never re-run Ink on replay. Store and restore the serialized Ink state captured after a
   dialogue choice.
7. **Content-version-relative replay:** saves/replays carry the content fingerprint and refuse or warn on
   mismatch.
8. **No content special-casing:** engine logic references IDs and schemas, not specific quest/NPC strings.
9. **Exhaustive unions:** new event/effect/objective/condition kinds must be handled exhaustively and tested.
10. **File readability:** keep source files small; if a file cannot be summarized in one sentence, split it.
11. **Public API discipline:** public package behavior is exported through `index.ts` and described in package
    README files.
12. **Tests are the contract:** new systems and conditions require colocated tests; UI work requires e2e or
    screenshot evidence where possible.

---

## 5. Product milestone: First Light vertical slice

The immediate product milestone is still the **10-minute “First Light” slice** in Ashfall.

### 5.1 Player-facing target

A first-time player should be able to:

1. Open the app with no install or login.
2. Dismiss the cold open and understand movement within seconds.
3. Meet the stranger, reach The Drip, and understand Varga’s job.
4. Talk to multiple patrons who feel specific rather than generic.
5. Accept the warehouse quest.
6. Choose one of at least three approaches: talk, sneak, or force.
7. See a persistent consequence: reputation, dialogue, NPC reaction, branch flag, or changed affordance.
8. End on a hook that implies a larger world.
9. Export or record a replay/save artifact that can reproduce the session.

### 5.2 Success criteria

The vertical slice is not complete because the engine can run. It is complete when playtest evidence shows:

- A majority of first-time testers understand what to do within the first 90 seconds.
- A majority complete or meaningfully progress the warehouse quest within 10 minutes.
- At least two testers discover different quest solutions without being told they exist.
- At least one visible consequence is noticed without developer explanation.
- The exported replay/save artifact can reproduce or diagnose a tester’s session.
- Pipeline-authored content is indistinguishable from hand-authored content in loading path and quality bar.

### 5.3 First Light priority order

1. **Playable clarity:** prompts, controls, interaction hints, journal, route affordances.
2. **Quest completeness:** all three warehouse branches are reachable, understandable, and consequential.
3. **Content density:** patrons, barks, rumors, follow-up reactions, and hook NPC.
4. **Replay/debug proof:** save/export, replay verification, test fixtures, crash buffer.
5. **Presentation polish:** readable typography, camera feel, basic animation/feedback, accessibility toggles.
6. **Pipeline proof:** one meaningful generated pack that extends the slice without special-casing.

---

## 6. Engine roadmap

Build engine features only when they make the slice or content pipeline better. Avoid “engine hobbyism.”

### 6.1 Tier 0 — repo and determinism hardening

| Ticket idea | Goal | Acceptance gate |
|---|---|---|
| Pack inventory normalizer | One authoritative list of runtime-loaded packs and docs-generated pack catalog. | `pnpm content:validate`; docs and app import list agree. |
| Golden replay fixture | Commit a short First Light replay log and assert hash stability. | `pnpm replay:verify` includes the fixture. |
| Save import UI | In addition to export, allow loading a save/replay JSON in-browser. | Playwright smoke imports a known save. |
| Replay mismatch UX | Show clear message on content fingerprint mismatch. | Unit test + UI smoke. |
| Migration smoke | Ensure world/save/content version migration tests exist for current versions. | `pnpm verify`; migration test from prior version. |
| E2E artifact capture | CI stores screenshots/video/traces for browser smoke failures. | GitHub Actions artifact present on failure. |

### 6.2 Tier 1 — player comprehension systems

| Feature | Why it matters | Notes |
|---|---|---|
| Quest journal UI | Players need to know what they accepted and what branches exist. | Read from `World.quests` + registries; no separate source of truth. |
| Interaction affordances | The player must see who/what can be used. | Deterministic prompts from proximity and conditions. |
| Exit affordances | Gated exits need labels and condition feedback. | Never reveal hidden spoilers; explain immediate blockers. |
| Dialogue transcript | Text-forward RPG needs memory and accessibility. | Runtime-only UI state or persisted transcript event log; must not break replay. |
| Branch feedback | Skill checks and branch failures should feel authored, not silent. | Use `show_text`, flags, reactions, storylets. |
| Consequence panel | Temporary debug/player-facing readout for flags/reputation after choices. | Useful for playtest; hide or stylize later. |
| First-run controls overlay | No install/no tutorial means controls must be self-evident. | Dismissible; e2e asserts presence. |

### 6.3 Tier 2 — content-driven RPG verbs

Add these only as content asks for them. Each verb follows schema → event → apply → system → tests → content pack.

| Verb/system | Gameplay value | Determinism concern |
|---|---|---|
| `lockpick` / `unlock` | Sneak route depth beyond generic skill check. | RNG consumed only in apply or deterministic resolved event. |
| `learn_clue` | Makes investigation mechanically real. | Clue facts live in flags/inventory-like journal state. |
| `spend_favor` | Turns reputation/debt into a resource. | Conservation tests for favors/debts. |
| `intimidate` / `threaten` | Force path without always entering combat. | Skill check + authored failure consequences. |
| `disguise` | Social/sneak hybrid route. | Inventory/flag condition; no special-case NPC logic. |
| `blackmail` | Noir consequence loop. | Requires clue ownership + faction/NPC reaction. |
| `trade` | Barter/economy interactions. | Inventory conservation and value bounds. |
| `rumor` | Propagating local knowledge. | Storylets gated by flags/reputation. |
| `debt` | The Ashfall theme becomes mechanical. | Debt ledger in flat JSON; no negative/overflow states. |

### 6.4 Tier 3 — renderer, audio, and presentation ports

Keep presentation behind stable interfaces.

- **Renderer intents:** formalize draw intents if app rendering starts duplicating logic.
- **Sprite renderer package:** implement a new renderer behind the same port only after vector slice lands.
- **Asset manifest:** static asset IDs validated like content IDs; no runtime asset discovery.
- **Animation hints:** data-driven idle/talk/hit feedback, not simulation logic.
- **AudioOut implementation:** start with subtitles/logged voice-line intents; add real audio later behind the port.
- **Accessibility:** font toggle, keyboard-only play, screen-reader status text, high-contrast mode, reduced motion.

---

## 7. Gameplay and content roadmap

### 7.1 Slice content goals

| Area | Needed work | Success check |
|---|---|---|
| Cold open | Mood + clear first input + no confusion after dismissal. | First-time tester moves within 30 seconds. |
| Stranger | Establish hook and direct player to The Drip. | `flag.met_stranger` affects later text. |
| The Drip | 8–12 patrons with distinct voice, rumors, and at least one mechanically useful clue. | Patron dialogue changes at least one later check/line. |
| Varga | Job offer with clear stakes and branch framing. | Quest enters journal with understandable objective. |
| Warehouse talk path | Persuade check can pass/fail with authored consequences. | Failure does not dead-end; success changes later reaction. |
| Warehouse sneak path | Route and skill check are physically legible. | Player can find route without dev explanation. |
| Warehouse force path | Minimal combat works and reputation changes. | Guard can be defeated; Syndicate/Varga reactions differ. |
| Payoff | Drive acquired, branch-specific flag recorded. | Quest completion is atomic and idempotent. |
| Hook | New NPC or bark reacts to how the job ended. | Player sees “the world remembers.” |

### 7.2 Content expansion after First Light

After the slice proves itself, expand in pack-sized arcs:

1. **Rival fixer pack:** introduces a second power competing with Varga.
2. **Debt ledger pack:** turns Ashfall’s debt economy into mechanics and storylets.
3. **Memory thread pack:** reveals the first layer of the player’s missing-memory hook.
4. **Second district pack:** one new hub with a different social texture and route style.
5. **Faction escalation pack:** consequences of warehouse outcome alter patrols, access, and rumors.
6. **Companion candidate pack:** one NPC can travel/react without requiring full party mechanics.

Every expansion pack should add: one strong NPC, one mechanically meaningful choice, one persistent
consequence, and at least one canon assertion.

### 7.3 Writing quality bar

Pipeline-authored content should be rejected unless it has:

- A specific want, fear, and secret for each important NPC.
- At least one line that could only belong to that NPC.
- A condition or flag that makes the line reactive.
- A cost or tradeoff; no consequence-free “best” option.
- A canon assertion or explicit note that it is only a possible outcome.
- A small integration footprint: no new engine verb unless the content truly earns it.

---

## 8. Pipeline B roadmap

Pipeline B is the world-growth machine. It should become more rigorous without becoming runtime code.

### 8.1 Near-term pipeline improvements

| Improvement | Purpose | Acceptance gate |
|---|---|---|
| Pack proposal bundle | Store candidate JSON, critique scorecard, prompt hash, model list, and human decision. | `pipeline:cycle` produces reviewable bundle. |
| Canon export checksum | Make canon context deterministic and auditable. | Same packs produce same export hash. |
| Schema examples | Provide high-quality few-shot examples for each pack type. | Examples validate and are kept short. |
| Validation repair loop | Feed validation errors back into proposal repair before human review. | Broken proposals produce actionable repair attempts. |
| Human review notes | Curator records why content was accepted/rejected. | Provenance includes curator and approval metadata. |
| Content diff view | Human sees new/changed entities and canon blast radius. | Review UI or CLI prints concise diff. |

### 8.2 Canon assertion graph expansion

Current assertion checks are deliberately small. Add rules only when real contradictions appear.

Candidate rules:

- NPC placed in a location that does not exist in the loaded pack set.
- NPC asserted dead/missing while still used as a required quest giver in global canon.
- Faction ally/enemy loops that contradict declared rivals.
- Item asserted unique while multiple packs grant it as a generic reward.
- A location destroyed/closed in global canon while a base pack still routes through it.
- A “broke” or “debtor” status conflicting with large funding or reward facts.

Do not try to solve arbitrary semantic contradiction in code. Use the graph for closed-form rules, the Critic
role for prose-level suspicion, and the human curator for final taste.

### 8.3 Model/vendor policy

- Keep one provider-agnostic adapter shape for structured generation.
- Keep all provider calls in `tools/pipeline/`; no shipped package imports provider SDKs.
- Prefer multi-model proposal + critique for content, not for engine writes.
- Always support deterministic stub generation so CI and local gates work without paid keys.
- Record model names in provenance but do not make content dependent on a specific model.
- Treat frontier models as interchangeable labor, not as product architecture.

---

## 9. Repo enhancement roadmap

### 9.1 Documentation and navigation

- Normalize pack inventory across `README.md`, `GOAL.md`, `ROADMAP.md`, `STRUCTURE.md`, `docs/ai/REPO_MAP.md`,
  and `app-web` imports.
- Add a generated `content/PACKS.md` or `content/catalog.json` with pack IDs, versions, dependencies,
  provenance, and whether the app loads them by default.
- Add a `docs/STATUS.md` or status section generated from scripts for current gates, pack count, and latest
  completed ticket.
- Keep `AGENTS.md` short. Move deep recipes to `docs/agent-guides/`.
- Keep `ROADMAP.md` as the live ticket index; this file should describe strategy and priorities.

### 9.2 Tickets and PRs

- Add or refine issue templates for: engine verb, content pack, pipeline improvement, UI/e2e, repo-health.
- Add a PR template requiring:
  - changed files summary,
  - commands run,
  - replay/content/e2e evidence when applicable,
  - screenshots/video for UI changes,
  - scope exceptions,
  - follow-up tickets.
- Require every ticket to state “read files,” “touch files,” and “acceptance gate.”
- Prefer ticket IDs that encode area: `REPO-`, `ENGINE-`, `GAME-`, `PIPE-`, `CONTENT-`, `UI-`, `TEST-`.

### 9.3 CI and verification

Current CI is good. Next improvements:

- Store Playwright traces/screenshots/video as artifacts when e2e fails.
- Add a docs sync check for stale paths and mismatched pack inventory.
- Add a content catalog check that verifies app imports match the intended default pack set.
- Add selected mutation testing on pure engine systems before major milestones, not on every PR.
- Add a “golden replay” job once a stable First Light replay exists.
- Keep browser e2e non-blocking until it is stable enough not to create noise; then decide whether to make a
  minimal smoke blocking.
- Keep dependency actions pinned and retain least-privilege permissions.

### 9.4 Security and secrets

- No provider keys in repo, logs, screenshots, or committed generated provenance beyond model names/prompt hashes.
- `OPENROUTER_API_KEY` remains optional and pipeline-only.
- CI install should continue blocking install lifecycle scripts unless a dependency explicitly requires one.
- Add periodic `pnpm audit` or equivalent advisory reporting, but do not fail builds on irrelevant dev-only noise
  without triage.
- Agent sandboxes should not mount user home directories, cloud credentials, or production data.
- Any MCP/server integration must be read-only by default and scoped to the task.

---

## 10. Candidate ticket backlog

The next useful work is below. These are not all mandatory; they are a deep menu for the next roadmap cut.

### 10.1 Repo-health tickets

| ID | Priority | Ticket | Done when |
|---|---:|---|---|
| REPO-001 | P0 | Normalize content pack inventory across docs and app imports. | A generated or documented catalog matches runtime imports. |
| REPO-002 | P0 | Add PR template with verification/artifact checklist. | New PRs ask for checks, screenshots, replay/content evidence. |
| REPO-003 | P1 | Add docs sync script for stale paths and pack references. | CI or `pnpm verify` catches known stale doc paths. |
| REPO-004 | P1 | Add generated `content/PACKS.md` or `content/catalog.json`. | `pnpm pipeline:export` or new script updates catalog deterministically. |
| REPO-005 | P1 | Reconcile open Cursor Cloud PR into `AGENTS.md` or a cloud setup doc. | Cloud instructions exist in one place and do not bloat root agent brief. |
| REPO-006 | P2 | Add tool-specific optional configs only where they add executable workflows. | No duplicate giant instruction files. |

### 10.2 Verification tickets

| ID | Priority | Ticket | Done when |
|---|---:|---|---|
| TEST-001 | P0 | First Light golden replay fixture. | Replay hash is asserted in `pnpm replay:verify`. |
| TEST-002 | P0 | Browser e2e artifact capture. | Failed e2e uploads trace/screenshot/video. |
| TEST-003 | P1 | Save import/export e2e. | Browser imports a known save and exports a valid envelope. |
| TEST-004 | P1 | Content solvability report UX. | `pnpm content:verify` prints actionable quest/branch diagnostics. |
| TEST-005 | P2 | Targeted mutation pass for `applyEvent`, conditions, and quest systems. | Mutation report informs missing tests before milestone. |

### 10.3 Engine tickets

| ID | Priority | Ticket | Done when |
|---|---:|---|---|
| ENGINE-001 | P0 | Quest journal surface. | Player can inspect active quest, branches, and known objectives. |
| ENGINE-002 | P0 | Exit/interaction affordance system. | Prompts explain usable nearby entities/exits and immediate blockers. |
| ENGINE-003 | P1 | Branch consequence feedback. | Skill/combat/quest outcomes surface authored text and state changes. |
| ENGINE-004 | P1 | Dialogue transcript/log. | Player can reread recent conversation without replay divergence. |
| ENGINE-005 | P1 | Save import/load UI. | Exported save can be reloaded in browser. |
| ENGINE-006 | P1 | Storylet cooldowns or one-shot guards. | Reactive barks do not spam while remaining deterministic. |
| ENGINE-007 | P2 | Lockpick/unlock verb. | New content can create a real sneak route without special casing. |
| ENGINE-008 | P2 | Clue/journal fact verb. | Investigation content can alter checks/dialogue. |
| ENGINE-009 | P2 | Trade/favor/debt ledger. | Economy and noir debt become mechanics with conservation tests. |

### 10.4 Gameplay/content tickets

| ID | Priority | Ticket | Done when |
|---|---:|---|---|
| GAME-001 | P0 | First-run controls and objective clarity pass. | New tester knows movement/interact/journal path. |
| GAME-002 | P0 | Warehouse quest branch audit. | Talk, sneak, and force paths are all reachable and consequential. |
| GAME-003 | P0 | The Drip density pass. | 8–12 patrons have distinct voices, rumors, and at least one useful clue. |
| GAME-004 | P1 | Varga reaction matrix. | Varga reacts differently to peaceful/sneak/force outcomes. |
| GAME-005 | P1 | Syndicate reaction pass. | Fighting or bribing changes at least one NPC/exit/dialogue. |
| GAME-006 | P1 | Hook NPC after drive. | Slice ends with a clear continuation prompt. |
| GAME-007 | P2 | Rival fixer pack outline. | Human-approved brief + schema-valid candidate pack. |
| GAME-008 | P2 | Memory thread seed. | One generated pack deepens the player-identity mystery without resolving it. |

### 10.5 Pipeline tickets

| ID | Priority | Ticket | Done when |
|---|---:|---|---|
| PIPE-001 | P0 | Proposal/critique/curation bundle format. | Pipeline emits reviewable artifacts before bake. |
| PIPE-002 | P0 | Deterministic canon export hash. | Same pack set produces same hash and prompt context. |
| PIPE-003 | P1 | Validation repair loop. | Invalid structured output is repaired or surfaced with precise errors. |
| PIPE-004 | P1 | Content diff and blast-radius report. | Human sees new/changed IDs and affected canon assertions. |
| PIPE-005 | P1 | More canon graph rules from real contradictions. | Each new rule has a failing fixture and clear diagnostic. |
| PIPE-006 | P2 | Local review UI. | Human can approve/reject/edit candidate packs without hand-editing JSON. |

---

## 11. Commands

Core commands:

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm deps:check
pnpm test
pnpm test:coverage
pnpm content:validate
pnpm content:verify
pnpm replay:verify
pnpm verify
pnpm e2e
```

Agent wrappers:

```bash
pnpm agent:bootstrap
pnpm agent:doctor
pnpm agent:status
pnpm agent:check
pnpm agent:test
pnpm agent:lint
pnpm agent:typecheck
pnpm agent:format
pnpm agent:preflight
pnpm agent:afk-status
```

Pipeline commands:

```bash
pnpm schema:export
pnpm content:new
pnpm content:compile-ink
pnpm pipeline:export
pnpm pipeline:cycle
pnpm pipeline:bake
```

Environment:

- Node **>= 20**; CI currently uses Node 24.
- Package manager: pinned `pnpm@11.1.2`.
- No secrets are required to build, test, or play.
- `OPENROUTER_API_KEY` is optional and only for real offline content generation.
- Browser e2e needs Playwright Chromium installed in the environment.

---

## 12. Definition of done

A unit of work is done only when every applicable item is true:

- `pnpm verify` is green, or any inability to run it is explicitly recorded.
- Targeted tests for the changed package are green.
- New systems, conditions, effects, or objectives have colocated tests.
- Replay invariant still holds.
- Content changes pass `pnpm content:validate` and `pnpm content:verify`.
- Browser/UI changes have Playwright, screenshot, trace, or manual browser evidence.
- Public API changes are reflected in package `index.ts` exports and package README summaries.
- Docs/tickets/repo map are updated when status, commands, paths, config, or pack inventory changes.
- No shipped package imports provider SDKs or violates vendor isolation.
- No runtime LLM call was added.
- No in-place `World` mutation was added.
- No file was bloated past the readability threshold without splitting or recording a reason.
- Changes are committed locally with a clear message.

---

## 13. Next best sequence

If an agent is picking work without further human direction, do this sequence:

1. **REPO-001:** normalize pack inventory and generate/document the authoritative pack catalog.
2. **TEST-001:** add a short golden replay fixture for First Light.
3. **ENGINE-001:** add or improve the quest journal surface.
4. **ENGINE-002:** improve interaction/exit affordances.
5. **GAME-002:** audit the three warehouse branches against actual play.
6. **TEST-002:** store e2e artifacts on browser smoke failure.
7. **GAME-003:** deepen The Drip patrons and useful rumors.
8. **PIPE-001:** make pipeline proposal/critique/curation bundles first-class artifacts.
9. **GAME-004:** implement Varga reaction matrix.
10. **PIPE-004:** add content diff/blast-radius report for human curation.

This sequence turns a healthy engine repo into a stronger game proof, while preserving the architectural
reason the repo exists: a deterministic agent-owned engine and a curated AI-authored world that can grow
for years without runtime generation or vendor lock-in.
