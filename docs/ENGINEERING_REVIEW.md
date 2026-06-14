# Engineering Review — living-codex

> Reviewer: senior engineer, top-to-bottom audit.
> Branch reviewed: `chore/template-reset-20260614`.
> Date: 2026-06-14.
> Method: read every product artifact on this branch, diffed against `develop` and `main`,
> walked the full git history (`git log --all`, 314 commits) and the `pre-purge-20260609` tag.
> The freshly-installed AI-operations engine scaffolding (`.claude/`, `scripts/`, `roadmap/`,
> `.github/`) is explicitly out of scope as a *review target* and is only referenced where it
> contradicts the product docs.

---

## Verdict

**Grade: D.**

This repository is a **well-written product vision attached to a deleted product.** The two
surviving prose artifacts — `GOAL.md` and `README.md` — are genuinely good: the scope is sharp,
the invariants are disciplined, and the "engine an agent can hold in its head + offline curated
content pipeline" thesis is coherent and buildable. As a *spec*, this is a B+/A− piece of work.

But the spec is not telling the truth about the repo it sits in. The README states, in the
present tense, "The engine is built and browser-playable; `pnpm verify` is green." `GOAL.md` lists
"tickets T-00…T-16 plus the ULTRA hardening pass" as complete with "143 tests" green on
2026-05-29. **None of that is true on any current branch.** There is no `src/`, no `packages/`,
no `content/`, no `tests`, no Vite, no Vitest, no Playwright, no pnpm workspace — and every
document the README points a reader toward (`docs/ARCHITECTURE.md`, `docs/SCHEMA.md`,
`docs/WORLD_STATE.md`, `docs/TICKETS.md`, `content/PACKS.md`, `STRUCTURE.md`, `tickets/`,
`.env.example`) **does not exist.** They were all deleted on 2026-06-09 in commit `86ab8ec`
("purge: reset to vision docs for repo overhaul") — a deliberate, recoverable 438-file purge,
not data loss. The work survives in git at tag `pre-purge-20260609` (`66e6973`).

So the grade is not D because the idea is bad — it's D because **the repo actively misrepresents
its own state.** A new contributor (human or agent) who trusts the README will spend their first
hour chasing dead links and running `pnpm install` against a `package.json` that has no pnpm,
no Vite, and no game code in it. Documentation that lies is worse than no documentation. The fix
is cheap (this review + an honest README, included as deliverables), and the underlying spec is
worth building — which is the only reason this isn't an F.

---

## What this actually is (spec vs code)

| | Claimed by README/GOAL.md | Actually present on `chore/template-reset-20260614` |
|---|---|---|
| Engine (`engine-core`) | "built", pure deterministic TS, T-00…T-16 done | **Absent.** No `src/`, no `packages/`. |
| Content packs (`content/`) | 4–10 packs cataloged in `content/PACKS.md` | **Absent.** Whole tree deleted. |
| Tests | "143 tests", `pnpm verify` green | **Zero.** No Vitest, no test files. |
| Browser app (`app-web`, Vite) | "browser-playable via `pnpm dev`" | **Absent.** No Vite, no entry point. |
| E2E (Playwright) | "`pnpm e2e` smoke" | **Absent.** No Playwright; `.github/workflows/e2e.yml` is the *engine* template's, not a product e2e. |
| Content pipeline (Pipeline B) | `pnpm pipeline:cycle/bake`, OPENROUTER_API_KEY | **Absent.** No pipeline code, no `.env.example`. |
| Spec docs (`docs/*.md`) | 10-doc read-order tree | **Only `docs/optional-modules.md`** (an ops-engine artifact, unrelated to the game). |
| Linked files (STRUCTURE.md, tickets/, ROADMAP.md) | linked throughout README/GOAL | **All missing on this branch.** (`ROADMAP.md` exists on `develop`/`main`; not here.) |
| Package manager | pnpm 11.1.2, Node ≥20, CI Node 24 | `package.json` has **no pnpm**, no workspace; `npm`/`ts-node`; devDeps are biome + typescript + ts-node only. |

**The product, as code, is at exactly 0%.** The product, as specification, is roughly 70–80%
complete and high quality — but stale, because it documents a snapshot that was thrown away.

The honest one-liner: **this is a spec-only repo.** It once held a real implementation (the
purge commit removed `content/core/pack.opening/pack.json` at 1576 lines,
`pack.syndicate_offer/pack.json` at 843 lines, Ink dialogue files, the full `docs/` treaty, and
SPEC-01…SPEC-120 of engine work — all visible in history). What's checked out now is the vision
plus a brand-new operations engine that has never built a single line of the game.

---

## Architecture assessment (is the design sound?)

A note on framing first: the review brief described this as "a static, browser-only app — flat
JSON / static data." That undersells the actual spec. The architecture in `GOAL.md` is **not** a
flat-JSON viewer; it is a small **deterministic simulation engine** plus a **strict content
treaty** plus an **offline multi-model authoring pipeline**. It is static *in deployment* (no
backend, no DB, no runtime LLM calls, browser-only, offline-capable) — but it is a real engine,
not a data file with a renderer. Both halves of that distinction matter for any honest estimate.

With that corrected, **the design is sound and, importantly, buildable.** The strongest parts:

- **Static deployment, zero runtime backend.** No server, no DB, no live model calls at play
  time. This is the right call for a browser RPG: trivially hostable (any CDN / GitHub Pages),
  no infra to secure or pay for, and it sidesteps the entire class of "LLM in the hot path"
  latency/cost/safety problems. This is the single best decision in the spec.
- **Determinism as a hard invariant.** "same seed + event log + content fingerprint ⇒ same
  world" via event-sourcing (`applyEvent` fold), with all randomness/time behind engine
  abstractions. This is exactly how you make a content-heavy RPG testable and replayable, and it
  gives you golden-replay fixtures for free. Genuinely good engineering taste.
- **Content as data, behind a schema treaty.** Quests/NPCs/storylets/effects live in
  schema-validated packs (Zod), and the engine is forbidden from special-casing any specific
  quest/NPC/line. This is the seam that lets AI-authored content scale without engine churn —
  the whole "world grows through packs" thesis depends on it, and the spec is disciplined about
  it (invariant 7).
- **Ports for renderer/audio.** Vector-first, with sprite/voice swappable behind stable
  interfaces. Correct layering; keeps game logic clean.
- **Engine purity invariants** (no DOM/`node:*`/fetch/SDK in `engine-core`; `World` is flat JSON
  with no classes/Map/Set/closures). These are real, enforceable constraints that keep the core
  serializable, replayable, and small enough for one agent to own. This is the discipline that
  most hobby engines lack.

Risks / soft spots in the design (not fatal, but real):

- **Ink as the dialogue runtime** adds a non-trivial external dependency whose state must be
  captured and restored deterministically (invariant 6: "replay never re-runs Ink"). That is the
  *hardest* determinism guarantee in the whole spec and the most likely place for a replay-hash
  divergence to hide. It needs a dedicated golden-replay test from day one, not later.
- **The offline pipeline (Pipeline B) is the most expensive, least-specified half.** Multi-model
  propose → human curate → schema-validate → bake, with canon assertions and blast-radius diffs,
  is a whole product on its own. It should be deferred hard until the engine plays one slice;
  the spec's own "next best sequence" mostly agrees, but the README front-loads it.
- **"Flat JSON World, no Map/Set"** is great for serialization but means index structures
  (spatial lookups, id maps) must be rebuilt on load. Fine at this scale; worth a perf note if
  the world ever gets large.

Net: the architecture earns the "sound and buildable" verdict. It is not vaporware *as a design*.
It is only vaporware *as code* right now.

---

## Code quality (or absence)

There is **no product code to assess.** `tsconfig.json` compiles only `scripts/**/*.ts` (the ops
engine). `package.json` defines `verify/shield/state/typecheck/lint` against `scripts/` — none of
the game scripts the README advertises (`dev`, `test`, `e2e`, `pipeline:*`, `content:*`) exist.

The only TypeScript in the tree is the operations-engine tooling (`scripts/*.ts`,
`scripts/*.sh`), which is out of scope for this review and is template-grade infrastructure, not
the Living Codex game.

The prose, judged as prose, is clean: tight scope tables, numbered invariants, an explicit
"two pipelines, never confuse them" framing, and a definition-of-done checklist. If the code that
once matched this spec was as disciplined as the spec, the purged engine was probably decent
(the SPEC-01…SPEC-120 history and 143-test claim are consistent with that). But that's
archaeology — it's not in the working tree.

---

## Tests (absence / plan)

**Test count on this branch: 0.** No Vitest, no Playwright, no fixtures, no `tests/` dir. The
README's "`pnpm verify` is green … 143 tests" is false for the current tree (it was true at
`pre-purge-20260609`).

The *plan* for tests, however, is unusually good and should be kept:

- **Colocated unit tests** per package/system (invariant 10).
- **Golden replay fixtures** — commit a short First Light replay + assert the world hash. This is
  the highest-leverage test type for this architecture and should be the *first* test written
  once the engine exists.
- **Content validation gates** (`content:validate`, `content:verify`) so packs can't ship
  malformed.
- **Playwright browser smoke** (non-blocking) for the playable slice.
- **Exhaustiveness tests** for every new effect/objective/condition/event kind (invariant 8).

When code lands, the order should be: replay-hash determinism test → schema-validation test →
one Playwright happy-path through the First Light slice. Everything else is secondary.

---

## Security & data handling

For a static, browser-only, no-backend app the attack surface is small by construction, which is
a feature of the architecture. Honest notes:

- **No runtime LLM calls and no backend** eliminate the biggest risks (prompt injection in the
  hot path, server compromise, data-at-rest in a DB). Good.
- **Offline pipeline secret:** `OPENROUTER_API_KEY` is used only by the *operator-run* Pipeline B
  (generation), never shipped to the browser. The spec is explicit about this. The current repo
  has no `.env.example` (it was purged) and the README still links to one — a dead link, but not
  a leak. When the pipeline returns, the key must stay server/CLI-side only.
- **Untrusted-content angle (the real one):** packs are AI-authored. Even though they're
  "static," any text rendered into the DOM is attacker-influenced if a malicious/buggy pack lands.
  The browser renderer **must treat all pack text as untrusted** — no `innerHTML`/`dangerouslySetInnerHTML`
  with pack strings, escape everything, and validate pack shape *and* content bounds at load. The
  schema treaty is the right place to enforce this; the spec mentions canon assertions but should
  add an explicit "no executable/HTML content in pack text" rule.
- **Save import (`I` / importSave):** the README advertises importing save files. Imported saves
  are untrusted user input and must be schema-validated and migration-checked before being folded
  into `World` (history shows a real `importSave` migration fix, SPEC-120, so this was a known
  concern). Keep that guard when it's rebuilt.
- **Client-side storage:** saves in localStorage/files are low-risk (single-player, no PII), but
  don't store anything sensitive and treat the save blob as untrusted on the way back in (above).

No critical security finding — because there's no product. The one thing to carry forward is
**"pack text and imported saves are untrusted input."**

---

## Unmerged branches

| Branch | Tip | Date | Ahead of `develop`? | What it is |
|---|---|---|---|---|
| `chore/template-reset-20260614` (this) | `0e616b2` | 2026-06-14 | Diverged: re-installs the current ops-engine template (net −1638 lines vs develop; trims old engine state/cruft) | The working branch. Pure ops-engine reset; **no product code**. |
| `develop` / `origin/develop` | `6898f66` | 2026-06-11 | n/a (base) | Earlier ops-engine drop-in. Has a 133-line root `ROADMAP.md` this branch dropped. **No product code.** |
| `main` / `origin/main` | `86ab8ec` | 2026-06-09 | behind | The purge commit: README + GOAL.md + ROADMAP.md only ("vision docs"). **No product code.** |

There are **no unmerged feature branches** carrying product work. Every branch is either the
vision docs or a flavor of the operations-engine install. The only place real implementation
exists is the **tag** `pre-purge-20260609` (`66e6973`) — not a branch, and intentionally so.

The diff between this branch and `develop` is entirely ops-engine scaffolding (hooks, scripts,
issue templates, CODEOWNERS, settings) — 0 product files. Confirmed via `git diff --stat`.

---

## Tech debt & risks

1. **Documentation actively lies about state (highest priority).** README + GOAL.md describe a
   built, tested, playable engine that does not exist on any branch. This is the #1 risk: it will
   mislead every future contributor/agent and burn time. (Addressed by this review + the rewritten
   README in this PR.)
2. **Dead links everywhere.** README/GOAL.md point to ~12 files that don't exist
   (`docs/ARCHITECTURE.md`, `docs/SCHEMA.md`, `content/PACKS.md`, `STRUCTURE.md`, `tickets/`,
   `.env.example`, even root `ROADMAP.md` on this branch). Following the spec's own "read order"
   leads straight into 404s.
3. **Stack mismatch.** README promises pnpm/Vite/Vitest/Playwright/Node-24; `package.json` ships
   npm + ts-node + biome + typescript and nothing else. `pnpm install` will not do what the
   README says.
4. **No bridge from spec to code.** `roadmap/features.json` is empty `[]`; root `roadmap/ROADMAP.md`
   has empty Now/Next/Later/Ideas. There is no decomposition of the (good) spec into buildable
   tickets. The rich T-00…T-16 ticket plan referenced by the docs was deleted with everything else.
   (`roadmap/PROGRESS.md` mentions "F-0026/F-0028 shipped, 31/31 passing" — that's the *template's*
   own dev history bleeding through, not this repo's product. Misleading and should be cleared.)
5. **Recovery decision is undocumented.** The single most important open question — *rebuild from
   the spec, or restore `pre-purge-20260609` and continue?* — is recorded nowhere
   (`DECISIONS.md` and `QUESTIONS.md` are empty). This is an expensive, hard-to-reverse call and
   it's floating.
6. **Ink determinism debt (latent).** When the engine is rebuilt, capturing/restoring Ink state
   for replay is the riskiest invariant and historically generated real fixes (SPEC-117…120).
   It needs a golden-replay test before any content depends on it.

---

## Top 5 to do first

Goal of this list: **turn the (good) spec into a first buildable vertical slice and stop the
docs from lying.** Not "build the whole engine."

1. **Decide and document the recovery path (1 hour, do this first).** Either (a) restore
   `pre-purge-20260609` into a working branch and continue from a real engine, or (b) rebuild from
   the spec deliberately. This is an operator-level, hard-to-reverse call — write it in
   `roadmap/DECISIONS.md` (and raise it in `QUESTIONS.md` if it's the operator's to make).
   Everything below changes depending on the answer. **My recommendation: restore from the tag.**
   You have a 438-file, SPEC-01…SPEC-120, 143-test engine sitting in git; rebuilding it from prose
   would be willful waste. Treat the purge as "reset the *operations engine*," not "delete the game."
2. **Make the docs honest (this PR does the README; finish the rest).** The rewritten README +
   this review land an accurate status. Then either remove or restore the ~12 dead-linked files so
   the read-order in the spec resolves. Clear the template's leftover `PROGRESS.md`/state so it
   stops claiming features this product never shipped.
3. **Reconcile the toolchain with reality.** Pick one: actually adopt pnpm/Vite/Vitest/Playwright
   (and add them to `package.json`/workspace), or change the docs to the toolchain you'll use.
   Today the README and `package.json` describe two different projects.
4. **Define the smallest buildable slice in `roadmap/`.** Decompose the First Light milestone's
   *first beat only* — "open URL → cold open → meet stranger → reach The Drip" — into 3–5 concrete
   `features.json` entries with acceptance criteria. Each entry names its gate (replay hash,
   schema validation, or Playwright step). Fill the empty `ROADMAP.md` "Now" with this.
5. **Build the determinism spine before any content.** First code to land: the event-sourced
   `World` + `applyEvent` fold + a deterministic RNG/clock + **one golden-replay test** that
   hashes the world after a fixed event log. This is the load-bearing invariant; once it's green,
   content and renderer can be layered on top with confidence. If you restored from the tag (step
   1a), this is "verify the existing replay test still passes," which is far cheaper.

---

*Bottom line: a strong, buildable vision sitting on top of a deleted implementation, with
documentation that hasn't caught up to the deletion. Fix the lying docs, make the
restore-vs-rebuild call (restore), and the path back to a real product is short.*
