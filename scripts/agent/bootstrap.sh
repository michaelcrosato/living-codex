#!/usr/bin/env bash
# Install dependencies for a clean checkout. Uses a frozen lockfile in CI.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

echo "[bootstrap] package manager: $PM"
if [ "${CI:-}" = "true" ] && [ "$PM" = "pnpm" ]; then
  pnpm install --frozen-lockfile
else
  "$PM" install
fi
echo "[bootstrap] done. Next: scripts/agent/doctor.sh"
