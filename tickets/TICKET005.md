# TICKET005 — CI doctor step + coverage reporting

- **Status:** Todo
- **Priority:** Medium

## Goal
Make the CI gate report environment readiness and test coverage, so regressions in either are visible.

## Context
CI (`.github/workflows/verify.yml`) runs `pnpm install --frozen-lockfile` + `pnpm verify` and a
non-blocking e2e job. There is no coverage report and no explicit readiness step. Vitest supports
coverage via `@vitest/coverage-v8` (not currently a dependency — `not found`).

## Scope
CI workflow + a `test:coverage` script. Do NOT lower any existing gate or make e2e blocking.

## Files
- `.github/workflows/verify.yml`
- `package.json` (add `test:coverage`; add `agent:doctor` invocation in CI)
- `vitest.config.ts` (coverage config)
- `.aiignore` / `.gitignore` (ensure `coverage/` ignored — already is)
- dev dep: `@vitest/coverage-v8`

## Steps
1. Add `"test:coverage": "vitest run --coverage"` and `@vitest/coverage-v8` to devDependencies.
2. Configure `coverage` in `vitest.config.ts` (v8 provider, text + lcov reporters).
3. In `verify.yml`, add a `pnpm agent:doctor` step before `pnpm verify` and upload the coverage report artifact.
4. Decide a coverage floor only if the team wants enforcement (default: report-only).

## Acceptance Criteria
- `pnpm test:coverage` produces a coverage summary locally.
- CI shows a coverage report and a doctor readiness line; `pnpm verify` still the blocking gate; e2e still non-blocking.

## Commands
`pnpm add -D @vitest/coverage-v8` · `pnpm test:coverage` · push to a branch and inspect the CI run.

## Risks
Adding a dependency changes the lockfile — keep it a single, reviewed change. Coverage thresholds
can cause flaky failures; start report-only.

## Notes
Unblocked. Good first AFK ticket: small, additive, no gate-lowering. Bump status to `In progress`
when picked up.
