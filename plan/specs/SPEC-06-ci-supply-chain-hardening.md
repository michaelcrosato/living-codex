# SPEC-06 — CI supply-chain hardening

- **Status:** Todo · **Pillar:** Quality · **Wave:** 0 · **Priority:** P=12 (highest)
- **I**=4 **F**=5 **R**=1 **Ft**=4

## Description
2025–26 saw large npm supply-chain worms (Shai-Hulud / 2.0, post-install-script abuse, token theft). Our
CI uses floating action tags (`@v4`) and default token permissions. Harden it with industry-standard,
zero-functional-risk measures. (Research: [GitHub supply-chain plan](https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/),
[Unit42](https://unit42.paloaltonetworks.com/npm-supply-chain-attack/).)

## Acceptance Criteria
- All `uses:` in `.github/workflows/verify.yml` are **pinned to a full 40-char commit SHA** with a trailing
  `# vX.Y.Z` comment (actions/checkout, pnpm/action-setup, actions/setup-node, actions/upload-artifact).
- A top-level least-privilege `permissions:` block (`contents: read`) is set (jobs override only if they need more).
- **Install scripts disabled in CI**: install runs with `--ignore-scripts` (or `pnpm config set
  enable-pre-post-scripts false` before install). Verify the build/tests still pass without lifecycle scripts
  (our deps don't require postinstall — confirm).
- No secrets added; `GITHUB_TOKEN` not broadened. `pnpm verify` + e2e behavior unchanged functionally.
- Pinning documented inline so a human can re-pin on the next bump.

## Implementation approach
Resolve each action's current tag → its commit SHA (`gh api repos/<owner>/<action>/commits/<tag>` or the
release page). Replace tags with SHAs + version comment. Add `permissions: { contents: read }` at top; the
e2e job needs no extra perms; the coverage-artifact upload (SPEC-03) needs only `contents: read`. Add
`--ignore-scripts` to both `pnpm install` lines. **Coordinate with SPEC-03 (shared verify.yml) — serialize.**

## Files
- `.github/workflows/verify.yml`.

## Dependencies / prereqs
**Collision:** `verify.yml` shared with SPEC-03 — do one, commit, then the other. Resolving SHAs needs network
/ `gh` (read-only).

## Test strategy
Lint the YAML; push to a branch and confirm CI still goes green with pinned SHAs and `--ignore-scripts`
(pushing needs human OK). Locally, `pnpm install --ignore-scripts && pnpm verify` to prove no dep relies on
install scripts.

## Effort
S (~45 min, mostly SHA lookups).

## Out of scope
npm provenance/OIDC trusted publishing (we don't publish to npm — private repo); signing commits;
Dependabot/renovate config (could be a separate BACKLOG item).
