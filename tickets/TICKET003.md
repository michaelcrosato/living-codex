# TICKET003 — Fix stale README doc paths

- **Status:** Done
- **Priority:** High

## Goal
README navigation points at files that actually exist, so agents/humans don't hunt for them.

## Context
`README.md` referenced `GOAL.md`, `ARCHITECTURE.md`, `WORLD_STATE.md`, `SCHEMA.md`, `TICKETS.md`,
`AGENT_GUIDES.md`, `CONTENT_PIPELINE.md`, `WORLD_BIBLE.md`, `VERTICAL_SLICE.md` as if at the repo
root, but they live under `docs/`. Only `AGENTS.md` and `README.md` are at root. This is a real
broken-path defect (the bug-fix requirement of the AFK initiative).

## Scope
`README.md` link/path corrections + a human quick-start section. No content rewrites of the docs.

## Files
- `README.md`

## Steps
1. Convert the read-order table entries to real relative links into `docs/` (e.g. `[GOAL.md](docs/GOAL.md)`).
2. Point operational links at the new root `GOAL.md`/`ROADMAP.md`/`AGENTS.md`/`tickets/`.
3. Add an install/run/test/build/env quick-start; keep agent instructions in `AGENTS.md`.

## Acceptance Criteria
- Every link in `README.md` resolves to an existing file.
- README contains a runnable quick-start (`pnpm install`, `pnpm dev`, `pnpm test`, `pnpm verify`, env).

## Commands
Manual: open `README.md`, follow each link. (No automated link-checker is configured — `not found`.)

## Risks
Low. Docs-only change; not in any gate.

## Notes
Distinguishes the product north star (`docs/GOAL.md`) from the operational `GOAL.md` (root).
