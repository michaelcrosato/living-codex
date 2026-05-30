# GOAL.md — operational state for autonomous agents

> Snapshot date: **2026-05-30**. This root file is the short operating brief: current repo state,
> boundaries, and next work. The product north star remains [`docs/GOAL.md`](docs/GOAL.md); if the two
> conflict about *what to build*, `docs/GOAL.md` wins.

---

## 1. Purpose

**The Living Codex** is a browser-based, top-down, text-forward 2D RPG. Its engine is a small,
deterministic TypeScript core that one autonomous coding agent can keep in its head. Its world is grown
through an offline content pipeline: frontier models propose story material, a human curates it, schemas
validate it, and the accepted pack ships as static data.

The repo must prove both halves:

1. **Pipeline A — Engine:** an agent-owned, typed, deterministic engine can evolve without architecture drift.
2. **Pipeline B — World:** curated AI-authored content can deepen the RPG while staying static, auditable,
   schema-valid, and loaded through the same path as hand-authored content.

The product is **agency-first**, not graphics-first: branching quests, dense NPCs, persistent consequences,
replayable state, and a world that gets richer through packs.

---

## 2. Hard scope

These are settled unless a human explicitly changes the north star.

| Decision | Meaning |
|---|---|
| **No runtime/live LLM calls.** | Players never call a model during play. Generation is offline-only. |
| **No procedural generation.** | Content is authored, curated, validated, and baked. No filler generator. |
| **One primary engine agent.** | Parallel agents may research or review; they should not independently mutate the same branch/schema. |
| **Determinism is mandatory.** | Same seed + same input/event log + same content fingerprint must reproduce the same world. |
| **Content is data, not code.** | New quests, NPCs, locations, storylets, and effects live in packs and schemas. |
| **Renderer/audio are ports.** | Vector first; sprites/voice can arrive later behind stable interfaces. |
| **No multiplayer/networking for now.** | Single-player, browser-playable, offline-capable remains the target. |

Rejected for this repo unless the north star changes: runtime AI companions, on-device WebLLM gameplay,
MCP gameplay tools, CRDT multiplayer, GraphRAG lore infrastructure, backend services, or self-rewriting
mechanics. Some are reasonable ideas in other projects; they conflict with this repo's current scope.

---

## 3. Current state

Treat this as factual until a later run or commit proves otherwise.

- Original engine tickets **T-00…T-16** plus the ULTRA hardening pass are documented as complete.
- `pnpm verify` was documented green on **2026-05-29** with **143 tests**.
- The app is browser-playable through `pnpm dev`.
- CI runs `pnpm agent:doctor`, `pnpm verify`, coverage, and a non-blocking Playwright browser smoke job.
- `engine-core` is pure simulation with time, state, events, replay, conditions, ports, and systems.
- `content-schema` is the treaty between engine and world; `content-loader` validates and indexes packs.
- Runtime composition currently imports these packs in `packages/app-web/src/main.ts`:
  - `content/core/pack.opening`
  - `content/core/pack.district_barks`
  - `content/core/pack.drip_market`
  - `content/generated/pack.the_drip_patrons`
- Some docs still mention older pack inventories. **Normalize pack catalog/docs/app imports before adding more packs.**
- Open PR #1 contains Cursor Cloud setup notes. Review and reconcile it rather than duplicating cloud-agent
  instructions across docs.

The engine foundation is healthy. The next bottleneck is proof quality: can a first-time player understand,
complete, and remember the 10-minute First Light slice, and can the repo produce deterministic evidence of it?

---

## 4. Working model for coding agents

Modern coding agents can inspect repos, plan, edit files, run commands, commit, and produce logs or PRs.
This repo should use that capability without pretending agents are reliable without constraints.

Use this operating model:

1. **Small tickets.** A task should be understandable after reading a guide plus a few files.
2. **Exact gates.** Every ticket states the command, replay, content check, or browser evidence that proves it.
3. **Artifacts over claims.** Completion summaries cite checks, screenshots/traces when relevant, and changed files.
4. **Fresh review for risky diffs.** A separate agent/session should review schema, event, replay, and content changes.
5. **No broad autonomous authority.** Agents may make local repo changes and run gates; they must not receive production
   secrets or destructive external permissions.
6. **Concise instructions.** Keep `AGENTS.md` short. Put task recipes in `docs/agent-guides/`, not in the root brief.

For non-trivial work: orient → plan → implement → targeted check → broad check → review → document → commit.
For obvious one-line or docs fixes, skip ceremony but still run the relevant gate when available.

---

## 5. Non-negotiable engineering invariants

A violation is a defect even if the app still runs.

1. `engine-core` imports no DOM, `node:*`, fetch, persistence, renderer implementation, narrative implementation,
   provider SDK, or runtime service.
2. `World` is flat JSON data. No classes, `Map`, `Set`, dates, functions, closures, or mutable ECS truth.
3. State changes only by emitting `GameEvent`s and folding them through `applyEvent`.
4. Randomness/time in the core comes only from deterministic engine abstractions.
5. Replay is sacred: live state and replayed state must hash the same for the same seed, log, and content fingerprint.
6. Ink state is captured and restored; replay never re-runs Ink to rediscover dialogue outcomes.
7. Content references IDs and schema verbs. Engine logic must not special-case a quest, NPC, pack, or line of text.
8. New effect/objective/condition/event kinds are implemented exhaustively and tested.
9. Public APIs are exported through package `index.ts` files and reflected in package READMEs.
10. New behavior has colocated tests; UI changes need Playwright or screenshot/manual-browser evidence.
11. Files stay small enough for an agent to reason about. Split before bloat becomes the architecture.

---

## 6. First Light milestone

The immediate product milestone is the **10-minute First Light slice** in Ashfall.

A first-time player should be able to:

1. Open the URL with no install or login.
2. Dismiss the cold open and understand controls quickly.
3. Meet the stranger, reach The Drip, and understand Varga's job.
4. Talk to multiple patrons who feel authored, not generic.
5. Accept the warehouse quest.
6. Complete one of three viable approaches: talk, sneak, or force.
7. See a persistent consequence: reputation, dialogue, NPC reaction, branch flag, exit state, or bark.
8. End on a hook that implies a larger world.
9. Export or reproduce a save/replay artifact useful for debugging.

The slice is not proven by engine completeness alone. It is proven by playtest evidence, deterministic replay,
and a generated/curated pack that adds real value without engine special-casing.

---

## 7. Roadmap lanes

See [`ROADMAP.md`](ROADMAP.md) for tickets and sequencing. Keep the strategy simple:

### Repo + verification

- Normalize the content pack catalog across docs and runtime imports.
- Add a PR template requiring checks, scope, artifacts, and follow-ups.
- Add golden replay fixtures for First Light.
- Capture Playwright screenshots/traces/video on failure.
- Add docs-sync/content-catalog checks once the catalog exists.

### Engine + UX

- Quest journal surface for active branches and known objectives.
- Interaction and exit affordances with immediate blocker text.
- Branch outcome feedback for skill, combat, bribe, storylet, and quest effects.
- Save import/load UI, not just export.
- Dialogue transcript or recent-lines panel if it can remain replay-safe.
- Storylet one-shot/cooldown rules if barks repeat.

### Gameplay + content

- Audit all warehouse routes: talk, sneak, force.
- Deepen The Drip patrons with distinct wants, voices, rumors, and at least one useful clue.
- Add Varga/Syndicate reaction matrices for peaceful, sneaky, violent, and bribed outcomes.
- Land the hook NPC/beat after the encrypted drive.
- Use Pipeline B for pack-sized expansion only after the default pack catalog is reliable.

### Pipeline + canon

- Make proposal/critique/curation bundles reviewable before bake.
- Add deterministic canon export hashes.
- Show content diffs and canon blast radius to the human curator.
- Add validation repair loops for structured output.
- Expand canon assertion rules only from real contradictions discovered in packs.

---

## 8. Definition of done

A unit of work is done only when all applicable conditions hold:

- `pnpm verify` is green, or the inability to run it is recorded with the reason.
- Targeted tests for the touched package are green.
- Content changes pass `pnpm content:validate` and `pnpm content:verify`.
- Replay invariant still holds.
- Browser/UI changes have e2e, screenshot, trace, or explicit manual-browser evidence.
- Public API changes update the relevant `index.ts` and README.
- Status, commands, file paths, pack inventory, or config changes update docs and tickets.
- No runtime LLM call, provider SDK in shipped packages, in-place `World` mutation, or vendor-boundary violation was added.
- The change is committed with a scoped, clear message.

---

## 9. Next best sequence

If no human gives a more specific task, work in this order:

1. **Pack catalog:** make one authoritative runtime/default pack inventory and sync docs to it.
2. **PR template:** require verification, artifacts, scope exceptions, and follow-up tickets.
3. **Golden replay:** commit a short First Light replay fixture and hash check.
4. **Quest journal:** expose active quest, branches, and known objectives.
5. **Affordances:** improve interaction/exit prompts and blocker text.
6. **Warehouse audit:** prove talk/sneak/force are reachable and consequential.
7. **E2E artifacts:** upload browser traces/screenshots/video on smoke failures.
8. **Drip density:** deepen patrons, rumors, clue flow, and hook setup.
9. **Pipeline bundle:** make content proposals reviewable before bake.
10. **Reaction matrix:** Varga and Syndicate visibly react to the route taken.

This sequence turns a healthy engine repo into a stronger game proof without broadening scope.
