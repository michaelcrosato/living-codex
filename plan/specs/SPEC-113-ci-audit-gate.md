# SPEC-113 — Enforce `pnpm audit` in CI (production-dependency security gate)

**Wave:** Cycle-11 P0 (supply-chain safety) · **Risk:** LOW · **Status:** Todo

## Description + Impact

CI (`.github/workflows/verify.yml`) runs `verify`, `test:coverage`, and `e2e` (incl. the SPEC-112 axe
scan) — but **never `pnpm audit`**. The repo maintains a clean security posture *manually* (audits were
run by hand; SPEC-41 patched a transitive `qs` advisory), but nothing enforces it: a future PR or
dependency bump that introduces a vulnerable **production** dependency would ship uncaught. This is the
one supply-chain gate the hardened CI (SPEC-06: SHA-pinned actions, least-privilege token,
`--ignore-scripts`) is missing.

Impact: an automated security regression net over the **shipped** dependency surface — the same
"automate a manually-maintained posture" value as SPEC-112's axe scan.

## Approach (files / patterns)

Add a dedicated `audit` job to `verify.yml`, mirroring the existing jobs' hardened setup (SHA-pinned
`checkout`/`action-setup`/`setup-node`, `pnpm install --frozen-lockfile --ignore-scripts`), then:
`pnpm audit --prod`.

- **Scope `--prod`** (production deps only): the shipped surface is small + stable (pixi/inkjs/miniplex/
  idb-keyval/zod), so this is meaningful and low-noise. Dev-tool advisories (e.g. the SPEC-41 `qs` via
  Stryker) do not ship and would otherwise flake a blocking gate; they stay covered by the periodic
  manual full `pnpm audit` (AGENTS.md).
- **Blocking** (no `continue-on-error`): a shipped vulnerability is serious enough to fail CI. Currently
  passes (`pnpm audit --prod` → no vulns), so it goes green immediately and only fires on a real
  regression.

Keep the default least-privilege `permissions: contents: read`.

## DoD + acceptance

- [ ] `verify.yml` has an `audit` job running `pnpm audit --prod` with the hardened install.
- [ ] YAML is valid; the job uses the same SHA-pinned actions as the other jobs (no unpinned refs).
- [ ] Locally, `pnpm audit --prod` exits 0 (current state) — proving the gate is green, not a false
      blocker.
- [ ] No code/content change; `pnpm verify` EXIT 0; golden untouched.

## Test strategy

Static + local: confirm `pnpm audit --prod` exit code is 0 locally (the gate's command). YAML validity
is confirmable on the next CI run; the job structure mirrors the proven existing jobs. (CI workflow
changes can't be fully executed locally — the local audit command IS the gate's behavior.)
