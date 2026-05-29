#!/usr/bin/env bash
# Read-only snapshot: branch, last commit, working-tree status, available gates.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

echo "[status] branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(no git)')"
echo "[status] HEAD:   $(git log --oneline -1 2>/dev/null || echo '(no commits)')"
echo "[status] working tree:"
if [ -n "$(git status --short 2>/dev/null)" ]; then
  git status --short
else
  echo "  clean"
fi
echo "[status] full gate: $PM run verify (or scripts/agent/check.sh)"
