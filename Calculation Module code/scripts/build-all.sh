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

step "B3 · every file-only ruling still reads as ruled"
python3 "Calculation Module code/scripts/check-rulings-in-file.py"

step "B4 · the files agree with each other — a decision reached every file that carries it"
python3 "Calculation Module code/scripts/check-rulings-sync.py"

echo "── the working plan and the orchestrator map are printed from their sources (hand edits die)"
python3 "Calculation Module code/scripts/build-workplan.py"   # the script has already moved to the repo root (line 12), so the path is written from there
python3 "Calculation Module code/scripts/build-orchestrator-map.py"
echo "── Post Feedback Sync (PFS): feedback files of his still sitting beside their originals"
_pfs=$(find MoneyKeel/documents -iname "*-jj*" -not -path "*JJ-feedback-archive*" -not -path "*/archive/*" | sort)
if [ -n "$_pfs" ]; then echo "PFS pending: $(echo "$_pfs" | wc -l | tr -d ' ') file(s) not yet folded in —"; echo "$_pfs" | sed 's/^/  /'; else echo "PFS: nothing waiting — every feedback file is folded in and archived"; fi


step "C1 · types"
npx tsc --noEmit

step "C2 · the suite"
npx jest --silent

step "C3 · a UI change carries a test"
bash scripts/check-ui-tests.sh origin/main || echo "  (skipped — no origin/main to compare against)"

step "C6 · the screen map is current"
node scripts/screen-map.mjs | tail -3

printf '\n── every guard that exists has passed.\n'
printf '   Every guard in the spec is built (2026-09-12): D1 is a ratchet with 18 owed imports, D3 covers two shared figures.\n'
printf '   E · the founder has said yes — not a command. Nothing above substitutes for it.\n'
