#!/usr/bin/env bash
# Run the test suite (Vitest). Pass extra args through, e.g. test.sh -t "replay invariant".
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

pm_run test "$@"
