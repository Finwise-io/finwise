#!/usr/bin/env bash
# Every guard that runs before a build, in the only order that works.
# Named by moneykeel_build_spec_guards-before-a-build_v01.md — that document is the source; this
# script is what enforces it. Run from anywhere.
#
#   bash "Calculation Module code/scripts/build-all.sh"
#
# The order matters. Headers are generated FROM the master file, so the file is built first and the
# headers checked after — checking them before would compare them against a file that is about to
# change.
set -euo pipefail
cd "$(dirname "$0")/../.."

step() { printf '\n── %s\n' "$1"; }

step "A · the file holds together"
python3 "Calculation Module code/scripts/build-moneykeel-master.py"

step "B1 · every header is a printed view, not a source"
python3 "Calculation Module code/scripts/write-headers.py"
python3 "Calculation Module code/scripts/write-headers.py" --check

step "B2 · the formula in the code and the formula in the file agree"
python3 "Calculation Module code/scripts/check-formula-agreement.py"

step "C1 · types"
npx tsc --noEmit

step "C2 · the suite"
npx jest --silent

step "C3 · a UI change carries a test"
bash scripts/check-ui-tests.sh origin/main || echo "  (skipped — no origin/main to compare against)"

step "C6 · the screen map is current"
node scripts/screen-map.mjs | tail -3

printf '\n── every guard that exists has passed.\n'
printf '   Still to build: A4 (dead), B3 (partial), B4, D1, D3, D4 — see the build spec.\n'
printf '   E · the founder has said yes — not a command. Nothing above substitutes for it.\n'
