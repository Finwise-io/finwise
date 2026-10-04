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

step "A2 · his answers on the map become rulings, so the gates carry them"
python3 "Calculation Module code/scripts/map-answers-to-rulings.py"

step "B1 · every header is a printed view, not a source"
python3 "Calculation Module code/scripts/write-headers.py"
python3 "Calculation Module code/scripts/write-headers.py" --check

step "B2 · the formula in the code and the formula in the file agree"
python3 "Calculation Module code/scripts/check-formula-agreement.py"

# THE DECISION LOG is printed before the gates read it — one file, every decision he has made,
# wherever he made it (his instruction 2026-09-28). The `rulings` tab came off the calculation master
# the same day, so this is the one record and B3 below reads its file-checks.
step "A3 · the decision log is printed from its source (hand edits die)"
python3 "Calculation Module code/scripts/extract-decisions.py"
# an answer to a numbered question IS a decision: it lives in the decision log, and this PRINTS it
# into the file the master reads, so the two cannot disagree (2026-09-30)
python3 "Calculation Module code/scripts/build-question-answers.py"
python3 "Calculation Module code/scripts/build-decision-log.py"

step "B3 · every file-only ruling still reads as ruled"
python3 "Calculation Module code/scripts/check-rulings-in-file.py"

step "B5 · a question about a screen was read FROM the approved design"
python3 "Calculation Module code/scripts/check-read-from-approved.py"

step "B4 · the files agree with each other — a decision reached every file that carries it"
python3 "Calculation Module code/scripts/check-rulings-sync.py"
python3 "Calculation Module code/scripts/check-questions-answered.py"

# B6 (2026-09-28). B4 checks that every ruling IN the ledger is anchored to a test. It cannot see a
# decision that never became a ledger row — which is exactly what happened to his 2026-09-12
# correction of income-end-to-end v07: it reached the design Changelog and the mock, no ledger, no
# standard, no test, and the same defect was still live one screen over sixteen days later. This
# reads his own Changelog and fails when a row he approved reaches no ruling.
step "B6 · every decision he approved is in the rulings ledger"
python3 "Calculation Module code/scripts/check-changelog-anchored.py"
python3 "Calculation Module code/scripts/pfs-sweep.py"

# The formula in words for every function an outside model judges (founder, 2026-10-04: "How outside
# AI will even test it if you do not give them the rule?"). Each was written by reading its function
# and carries that function's fingerprint — so a function that changes without its rule being read
# again stops here, and so does a figure in a rule that the function does not hold.
step "B7 · every tested function has its formula in words, read from the function as it stands"
python3 "Calculation Module code/scripts/build-outside-test-cards.py"

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
# 2026-09-26: this line used to end `|| echo "(skipped …)"`, which swallowed a REAL failure and let the
# closing line still say every guard passed. A guard that cannot run is not a guard that passed.
C3_FAILED=0
bash scripts/check-ui-tests.sh origin/main || C3_FAILED=1

step "C6 · the screen map is current"
node scripts/screen-map.mjs | tail -3

if [ "$C3_FAILED" -ne 0 ]; then
  printf '\n── NOT every guard passed: C3 above could not run or failed.\n'
  printf '   Read what it printed. Do not cut a build on this run.\n'
  exit 1
fi

printf '\n── every guard that exists has passed.\n'

printf '   Every guard in the spec is built (2026-09-12): D1 is a ratchet with 18 owed imports, D3 covers two shared figures.\n'
printf '   E · the founder has said yes — not a command. Nothing above substitutes for it.\n'
