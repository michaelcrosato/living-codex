#!/usr/bin/env bash
# TypeScript typecheck across the pure and DOM tsconfigs (must be zero errors).
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

pm_run typecheck
