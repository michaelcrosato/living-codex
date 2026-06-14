# Roadmap

> **Operator: this is your file.** Plain-English bullets; reorder to change priorities. Agents only ever mark items "✅ shipped (PR #n)" — they never rewrite your words. Sections mean: **Now** = working on it, **Next** = queued, **Later** = someday, **Ideas** = unscoped thoughts.

> Context (2026-06-14): this repo is currently **spec-only** — the engine and content were
> purged on 2026-06-09 and survive in git at tag `pre-purge-20260609`. See
> [`../docs/ENGINEERING_REVIEW.md`](../docs/ENGINEERING_REVIEW.md). The "Now" lane below is the
> first buildable slice: decide recovery, make the docs honest, and stand up the determinism
> spine so a playable beat can follow.

## Now

- **Decide restore-vs-rebuild and write it down.** Either restore the purged engine from tag
  `pre-purge-20260609` into a working branch, or commit to rebuilding from the spec. This is an
  expensive, hard-to-reverse call — record it in `roadmap/DECISIONS.md`. (Recommendation in the
  review: restore — there's a 438-file, tested engine sitting in git.)
- **Make the docs tell the truth.** Land the engineering review and the honest README (this PR),
  then remove or restore the ~12 dead-linked files (`docs/ARCHITECTURE.md`, `docs/SCHEMA.md`,
  `content/PACKS.md`, `STRUCTURE.md`, `tickets/`, root `ROADMAP.md`, `.env.example`) so the
  spec's own read-order resolves. Clear the operations-template leftovers in `PROGRESS.md` that
  claim features this product never shipped.
- **Reconcile the toolchain.** The README promises pnpm/Vite/Vitest/Playwright; `package.json`
  ships none of them. Pick one reality and make `package.json` and the docs agree.
- **Stand up the determinism spine (first code to land).** Event-sourced flat-JSON `World` +
  `applyEvent` fold + deterministic RNG/clock, plus **one golden-replay test** that hashes the
  world after a fixed event log. If restoring from the tag, this is "confirm the existing replay
  test is green." This is the load-bearing invariant; nothing else is trustworthy without it.

## Next

- **First "First Light" beat as a vertical slice.** Open URL → cold open → meet the stranger →
  reach The Drip. Decompose into 3–5 `features.json` entries, each naming its gate (replay hash,
  schema validation, or a Playwright step).
- **Browser app shell (Vite) behind a renderer port.** Vector-first, keyboard-navigable, with the
  controls the README advertises (move/talk/fight, save/load/export/import).
- **Content schema treaty (Zod) + one validated pack.** The minimal `pack.opening` needed for the
  first beat, validated at load. Treat all pack text as untrusted in the renderer (escape, no
  raw HTML).
- **Playwright happy-path** through the first beat, plus content-validation gate in CI.

## Later

- Complete the First Light slice: quest accept → talk/sneak/force routes → one persistent
  consequence → end-on-a-hook.
- Quest journal, interaction/exit affordances, branch-outcome feedback, save import/load UI.
- Ink dialogue runtime with captured/restored state for replay (the riskiest determinism work —
  needs its own golden-replay fixture).
- Pipeline B (offline multi-model propose → curate → validate → bake) — deferred until the engine
  plays one slice. This is a whole sub-product; do not front-load it.

## Ideas

- Reaction matrices (Varga / Syndicate visibly react to the route taken).
- Deepen The Drip patrons: distinct wants, voices, rumors, at least one useful clue.
- Canon export hashes + content-diff / blast-radius view for the human curator.
- Sprite/voice layers swapped in behind the existing ports, with no game-logic changes.
