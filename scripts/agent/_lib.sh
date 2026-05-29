#!/usr/bin/env bash
# Shared helpers for the agent scripts. Sourced, never run directly.
# Detects the package manager and reuses package.json scripts; skips (not fails)
# checks whose script is absent. No destructive or global operations.
set -euo pipefail

# Run from the repo root regardless of where the script was invoked.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

detect_pm() {
  if [ -f pnpm-lock.yaml ]; then echo pnpm
  elif [ -f yarn.lock ]; then echo yarn
  elif [ -f package-lock.json ]; then echo npm
  else echo pnpm   # repo pins pnpm via package.json "packageManager"
  fi
}
PM="$(detect_pm)"

if ! command -v "$PM" >/dev/null 2>&1; then
  echo "ERROR: package manager '$PM' not found on PATH." >&2
  exit 1
fi

# has_script <name> -> 0 if package.json defines that script, else 1.
has_script() {
  node -e "process.exit((require('./package.json').scripts||{})['$1']?0:1)" 2>/dev/null
}

# pm_run <script> [args...] -> run it if it exists (failure propagates), else print "skipped".
pm_run() {
  local script="$1"; shift || true
  if has_script "$script"; then
    echo "→ $PM run $script $*"
    "$PM" run "$script" "$@"
  else
    echo "skipped: '$script' not found in package.json"
  fi
}
