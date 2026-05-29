#!/usr/bin/env bash
# AFK preflight — run ONCE before launching an unattended run. Refuses (exits non-zero, loud)
# unless the base is SAFE to build on: a clean working tree and a fully green `pnpm verify`.
# The loop must never start on a dirty or red base. Read-only except for running the gate.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

fail() { echo "[afk-preflight] BLOCKED: $1" >&2; exit 1; }

echo "[afk-preflight] HEAD: $(git log --oneline -1 2>/dev/null || echo '(no commits)')"

# 1. Clean working tree (the untracked .claude/ runtime lock is expected and ignored).
dirty="$(git status --short | grep -v '^?? \.claude/' || true)"
if [ -n "$dirty" ]; then
  echo "$dirty" >&2
  fail "working tree is not clean — commit or stash before an AFK run."
fi
echo "[afk-preflight] working tree: clean"

# 2. The full gate must be green, or there is nothing safe to extend.
echo "[afk-preflight] running '$PM run verify' (this is the slow part) ..."
if ! pm_run verify >/tmp/afk-verify.log 2>&1; then
  echo "---- last 20 lines of /tmp/afk-verify.log ----" >&2
  tail -20 /tmp/afk-verify.log >&2
  fail "'$PM run verify' is RED — fix before an AFK run."
fi
echo "[afk-preflight] $PM run verify: green"
echo "[afk-preflight] OK — safe to launch the AFK loop."
