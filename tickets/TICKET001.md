# TICKET001 — Bootstrap & dependency readiness

- **Status:** Done
- **Priority:** High

## Goal
A clean checkout can install and self-diagnose with one command each, package-manager-aware.

## Context
Repo is a pnpm workspace (pinned `packageManager: pnpm@11.1.2`, Node ≥ 20). Agents need a
deterministic install + a readiness check before touching code.

## Scope
Install + environment diagnostics only. No changes to build/test logic.

## Files
- `scripts/agent/bootstrap.sh`, `scripts/agent/doctor.sh`, `scripts/agent/_lib.sh`
- `package.json` (`agent:bootstrap`, `agent:doctor`)
- `.env.example`

## Steps
1. `_lib.sh` detects the package manager by lockfile (defaults pnpm) and exposes `has_script`/`pm_run`.
2. `bootstrap.sh` runs `pnpm install` (`--frozen-lockfile` under CI).
3. `doctor.sh` verifies Node ≥ 20 + pnpm present, warns on missing `node_modules`, lists gate scripts.
4. Document env vars in `.env.example`.

## Acceptance Criteria
- `pnpm agent:doctor` exits 0 on a healthy machine and non-zero if Node < 20 or pnpm missing.
- `pnpm agent:bootstrap` installs dependencies without global/destructive ops.
- `.env.example` lists `OPENROUTER_API_KEY` (optional) and `PIPELINE_MODEL`.

## Commands
`pnpm agent:bootstrap` · `pnpm agent:doctor`

## Risks
Requires `bash` on PATH (Git Bash/WSL on Windows).

## Notes
Verified: `doctor.sh` reports Node v24.15.0, pnpm 11.1.2, all 8 gate scripts present.
