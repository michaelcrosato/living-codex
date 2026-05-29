#!/usr/bin/env bash
# Diagnose environment readiness. Fails on hard problems (missing/old Node, missing PM);
# warns (does not fail) on soft ones (deps not installed yet).
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

ok=1

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  echo "[doctor] node $(node -v)"
  if [ "$node_major" -lt 20 ]; then
    echo "[doctor] ERROR: Node >= 20 required (engines.node)." >&2
    ok=0
  fi
else
  echo "[doctor] ERROR: node not found on PATH." >&2
  ok=0
fi

echo "[doctor] package manager: $PM ($("$PM" -v 2>/dev/null || echo '?'))"
[ -f pnpm-lock.yaml ] && echo "[doctor] lockfile: pnpm-lock.yaml present" || echo "[doctor] WARN: no pnpm-lock.yaml"
[ -d node_modules ] && echo "[doctor] node_modules present" || echo "[doctor] WARN: node_modules missing — run scripts/agent/bootstrap.sh"

echo "[doctor] available gate scripts:"
for s in typecheck lint deps:check test content:validate content:verify replay:verify verify; do
  has_script "$s" && echo "  - $s" || echo "  - $s (skipped: not found)"
done

[ "$ok" -eq 1 ] && { echo "[doctor] OK"; } || { echo "[doctor] FAILED"; exit 1; }
