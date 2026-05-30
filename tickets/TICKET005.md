# TICKET005 — CI doctor step + coverage reporting

- **Status:** Done
- **Priority:** Medium

## Goal
Report environment readiness and test coverage in CI while keeping the existing blocking gate unchanged.

## Context
CI (`.github/workflows/verify.yml`) runs `pnpm install --frozen-lockfile` + `pnpm verify` and a
non-blocking e2e job. Coverage reporting is already implemented via `pnpm test:coverage`
with `@vitest/coverage-v8`, and readiness is checked via `pnpm agent:doctor`.

## Scope
CI workflow + a `test:coverage` script. Do NOT lower any existing gate or make e2e blocking.

## Files
- `.github/workflows/verify.yml`
- `package.json` (add `test:coverage`; add `agent:doctor` invocation in CI)
- `vitest.config.ts` (coverage config)
- `.aiignore` / `.gitignore` (ensure `coverage/` ignored — already is)
- dev dep: `@vitest/coverage-v8`

## Steps
1. Keep `test:coverage` coverage config intact in `vitest.config.ts` (`text`, `lcov` reporters via v8 provider).
2. Keep CI calling `pnpm agent:doctor` before `pnpm verify` and run `pnpm test:coverage` afterward.
3. Keep `coverage/lcov.info` upload as non-blocking CI artifact (`coverage-report`).
4. Confirm `pnpm verify` remains the blocking gate and e2e remains non-blocking.

## Acceptance Criteria
- `pnpm test:coverage` produces a coverage summary locally.
- CI shows a coverage report and a doctor readiness line; `pnpm verify` still the blocking gate; e2e still non-blocking.

## Commands
`pnpm test:coverage` · inspect CI coverage artifact (`coverage-report`) · e2e remains non-blocking

## Risks
No lockfile changes are required for this ticket; coverage remains report-only.

## Notes
Completed in the AFK readiness pass. No additional implementation blockers.
