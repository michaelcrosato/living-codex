# SPEC-03 — CI coverage reporting + doctor readiness step

- **Status:** Todo · **Pillar:** Quality · **Wave:** 0 · **Priority:** P=10
- **I**=3 **F**=5 **R**=2 **Ft**=4 · **Supersedes** root `tickets/TICKET005`.

## Description
CI runs `pnpm install --frozen-lockfile` + `pnpm verify` + a non-blocking e2e job, but emits **no coverage
report** and **no explicit readiness line**. Add coverage (report-only, no enforced floor to start) and a
`pnpm agent:doctor` step so environment/test-health regressions are visible. Keep `pnpm verify` the single
blocking gate; keep e2e non-blocking.

## Acceptance Criteria
- `@vitest/coverage-v8` added to root devDependencies (lockfile updated in one reviewed change).
- `package.json` gains `"test:coverage": "vitest run --coverage"`.
- `vitest.config.ts` configures `coverage` (provider `v8`, reporters `text` + `lcov`, `reportsDirectory:
  "coverage"`, sensible `exclude` for `**/*.test.ts`, `**/test/**`, `dist`, `tools/scripts` CLIs).
- `pnpm test:coverage` runs locally and prints a text summary; `coverage/` is git-ignored (confirm `.gitignore`/`.aiignore`).
- `.github/workflows/verify.yml`: a `pnpm agent:doctor` step runs **before** `pnpm verify`; a coverage
  artifact (lcov) is uploaded. `pnpm verify` stays the blocking gate; e2e stays `continue-on-error`.
- **No coverage threshold enforced yet** (report-only — avoids flaky CI). Note the option for a future floor.
- `pnpm verify` green locally; CI run shows the coverage summary + doctor line.

## Implementation approach
`pnpm add -D -w @vitest/coverage-v8`. Extend `vitest.config.ts` `test.coverage`. Add the script. In
`verify.yml`'s `verify` job, insert `- run: pnpm agent:doctor` after install, and after `pnpm verify`
add a coverage step (`pnpm test:coverage`) + `actions/upload-artifact` for `coverage/lcov.info`.
**Coordinate with SPEC-06 (also edits verify.yml) — serialize; do not run these two in parallel.**

## Files
- `package.json`, `vitest.config.ts`, `.github/workflows/verify.yml`, possibly `.gitignore`. Dev-dep add.

## Dependencies / prereqs
None hard. **Collision:** `verify.yml` shared with SPEC-06 (sequence). `agent:doctor` already exists.

## Test strategy
`pnpm test:coverage` locally → text summary present, exit 0. Push to a branch and inspect the CI run shows
coverage + doctor line and that verify is still blocking / e2e still non-blocking. (Pushing needs human OK.)

## Effort
S (~1 hr incl. CI round-trip).

## Out of scope
Enforcing a coverage floor; per-package coverage gating; making e2e blocking; Vitest 4 migration (BACKLOG).
