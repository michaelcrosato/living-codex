#!/usr/bin/env bash
# Compact AFK progress snapshot — for glancing at an unattended run's state. Read-only.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

echo "[afk-status] HEAD: $(git log --oneline -1 2>/dev/null || echo '(no commits)')"
echo "[afk-status] ahead of origin/main: $(git rev-list --count origin/main..HEAD 2>/dev/null || echo '?') commit(s)"
clean="$(git status --short | grep -v '^?? \.claude/' || true)"
echo "[afk-status] working tree: $([ -z "$clean" ] && echo clean || echo DIRTY)"

if [ -f plan/PROGRESS.md ]; then
  done_count="$(grep -cE '^\| SPEC-[0-9]+ .* Done ' plan/PROGRESS.md || true)"
  todo_count="$(grep -cE '^\| SPEC-[0-9]+ .* Todo ' plan/PROGRESS.md || true)"
  next="$(grep -E '^\| SPEC-[0-9]+ .* Todo ' plan/PROGRESS.md | head -1 \
    | sed -E 's/^\| (SPEC-[0-9]+) \| ([^|]+) \|.*/\1 —\2/' || true)"
  echo "[afk-status] specs: ${done_count:-0} done, ${todo_count:-0} todo"
  echo "[afk-status] next open spec: ${next:-<none — backlog empty, AFK can stop>}"
fi

echo "[afk-status] recent commits:"
git log --oneline -6 2>/dev/null | sed 's/^/    /' || true
