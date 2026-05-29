#!/usr/bin/env bash
# Lint (ESLint) and the dependency-cruiser vendor-isolation gate.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

pm_run lint
pm_run deps:check
