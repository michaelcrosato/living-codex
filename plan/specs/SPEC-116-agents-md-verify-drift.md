# SPEC-116 — Doc-sync: AGENTS.md verify chain omits `format` (prettier)

**Wave:** Cycle-11 P1 (canonical-doc accuracy) · **Risk:** LOW (docs-only) · **Status:** Done

## Description + Impact
`AGENTS.md` is the canonical agent-instructions doc (CLAUDE.md points to it). Line 28 described the
full gate as `pnpm verify (= typecheck + lint + deps:check + test + content:validate + content:verify +
replay:verify)` — **missing `format`** (prettier `--check`), which was added to the `verify` chain
during the Cycle-7..9 merge. An agent trusting AGENTS.md would not know prettier blocks the gate (the
exact drift that cost a fix-up earlier this session). SPEC-42/107 class: a real gate rule not reflected
in the durable doc.

## Approach
`AGENTS.md`: add `format` to the verify-chain description (in package.json order: after `lint`) + a
`pnpm format` / `pnpm format:write` line. Docs-only; markdown is prettier-ignored, so the gate itself is
unaffected.

## DoD + acceptance
- [x] AGENTS.md verify chain lists `format` in the correct position; a `pnpm format` line is present.
- [x] `pnpm verify` EXIT 0 (markdown change is inert to the gate).

## Test strategy
Static — the description now matches `package.json#verify` verbatim (order + steps).
