# TICKET004 — Agent docs & repo map

- **Status:** Done
- **Priority:** High

## Goal
An agent can orient in minimal tokens: a workflow loop, a repo map, and skip paths.

## Context
Rich `docs/` exist but there was no single agent loop, no concise file-location map, and no
machine-readable skip list. Token efficiency and a repeatable loop are core AFK requirements.

## Scope
Add the loop + read-first order + autonomous-vs-ask rules to `AGENTS.md`; add `docs/ai/REPO_MAP.md`
and `.aiignore`. Do not duplicate the existing invariants already in `AGENTS.md`/`docs/GOAL.md`.

## Files
- `AGENTS.md` (append loop / read-first / autonomy / pointers)
- `docs/ai/REPO_MAP.md`, `.aiignore`
- `STRUCTURE.md` (correct stale "empty, ready for T-00" claims)

## Steps
1. Add "Read-first order", "Workflow loop", and "Autonomous vs ask" sections to `AGENTS.md`.
2. Write `docs/ai/REPO_MAP.md`: core logic, tests, entry points, config, skip paths.
3. Write `.aiignore` covering generated/vendor/build/cache/log + token-heavy artifacts.
4. Fix `STRUCTURE.md` sections that describe the tree as empty/pre-T-00.

## Acceptance Criteria
- `AGENTS.md` states the loop and when to act vs ask, and links GOAL/ROADMAP/REPO_MAP/tickets.
- `docs/ai/REPO_MAP.md` paths all exist; `.aiignore` lists the generated/heavy paths.
- `STRUCTURE.md` no longer claims the source tree is empty.

## Commands
Manual review; `pnpm verify` unaffected (docs only).

## Risks
Low. Keep docs factual — re-check after future structural changes.

## Notes
`REPO_MAP.md` is the agent map; `STRUCTURE.md` is the visual tree + doc-location table (not duplicated).
