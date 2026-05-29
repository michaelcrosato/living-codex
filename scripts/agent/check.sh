#!/usr/bin/env bash
# The full project gate: typecheck + lint + deps:check + test + content:validate
# + content:verify + replay:verify (reuses `pnpm verify`). Run before declaring work done.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

pm_run verify
