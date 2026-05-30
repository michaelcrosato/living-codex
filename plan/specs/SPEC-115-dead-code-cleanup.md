# SPEC-115 — Remove genuinely-dead exports + a stale placeholder (code health)

**Wave:** Cycle-11 P1 (code health) · **Risk:** LOW · **Status:** Todo

## Description + Impact

A heuristic unused-export scan over `packages/*/src` + `tools` (depcruise already catches orphan
*modules* via no-orphans, but not unused *exports* within used files) — followed by careful per-symbol
verification — found the codebase is **clean** (nearly every candidate was a false positive: used
in-file like `EXIT_RADIUS`/`EntityRef`, or a real test helper like `appendEvent`, used by 4 test files).
Two genuine items remain:

1. **`appendInput`** (`engine-core/src/events/log.ts`) — a dead helper: zero usage anywhere (incl.
   tests). Its sibling `appendEvent` IS used by the replay/skillcheck/dialogue/adapter tests, so it
   stays; the session appends via `log.entries.push` directly, so `appendInput` is never called.
2. **`APP_WEB_PENDING`** (`app-web/src/index.ts`) — a stale `"T-12"` placeholder with an **actively
   misleading** comment ("The playable shell + fixed-timestep loop land in T-12") — T-12 shipped long
   ago (the shell lives in `main.ts`). The file is app-web's nominal package `main` entry but is
   imported by nothing (the app builds from `index.html` → `main.ts`).

**Not** removed: the **Audio port** (`ports/audio.ts` `createNoopAudio`/`AudioOut`) — a *deliberate*
forward-looking seam ("Voice is a FUTURE plug-in; the interface exists from day one… ARCHITECTURE.md
§5"), documented intentional, kept.

Impact: removes genuinely-dead code and a misleading stale comment — frontier-quality hygiene.

## Approach (files / patterns)

- `engine-core/src/events/log.ts`: delete the `appendInput` function (keep `appendEvent`).
- `app-web/src/index.ts`: replace the stale placeholder + comment with an accurate nominal-entry note,
  keeping it a valid ES module (`export {}`).

## DoD + acceptance

- [ ] `appendInput` removed; `appendEvent` and the rest of `log.ts` intact.
- [ ] `app-web/src/index.ts` has no stale `T-12` placeholder; remains a valid module (package `main`).
- [ ] `pnpm verify` EXIT 0 (typecheck/lint/deps/test all green — no dangling import); golden untouched.

## Test strategy

No new test (removal-only). `pnpm verify` proves nothing imported the removed symbols (typecheck +
depcruise + the full suite stay green).
