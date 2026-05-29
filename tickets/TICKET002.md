# TICKET002 — Agent workflow scripts

- **Status:** Done
- **Priority:** High

## Goal
Thin, reusable shell entry points for every gate so an agent runs checks uniformly.

## Context
`pnpm verify` and the sub-gates already exist. Agents benefit from stable script names that
reuse those package scripts and degrade gracefully when one is absent.

## Scope
`scripts/agent/*` wrappers + `agent:*` package scripts. No new check logic; reuse existing ones.

## Files
- `scripts/agent/{check,test,lint,typecheck,format,status,bootstrap,doctor}.sh` + `_lib.sh`
- `package.json` (`agent:check`, `agent:status`, plus `agent:bootstrap`/`agent:doctor` from TICKET001)

## Steps
1. Each script sets `set -euo pipefail`, sources `_lib.sh`, and calls `pm_run <existing script>`.
2. `check.sh` → `verify`; `test/lint/typecheck/format` → respective scripts; `status.sh` is read-only git state.
3. Absent scripts print `skipped: …` rather than failing the run.

## Acceptance Criteria
- `bash scripts/agent/check.sh` runs the full gate and fails iff `pnpm verify` fails.
- `bash scripts/agent/status.sh` prints branch, HEAD, and working-tree status; never mutates.
- No script performs destructive or global operations.

## Commands
`pnpm agent:check` · `pnpm agent:status` · `bash scripts/agent/{test,lint,typecheck,format}.sh`

## Risks
PATH must include `bash`; scripts run from any CWD (they `cd` to repo root).

## Notes
`status.sh` and `doctor.sh` smoke-tested successfully this session.
