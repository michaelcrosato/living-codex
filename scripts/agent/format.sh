#!/usr/bin/env bash
# Check formatting (Prettier). Pass --write via the package script `format:write` to fix.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

pm_run format
