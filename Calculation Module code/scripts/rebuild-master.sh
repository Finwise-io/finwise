#!/usr/bin/env bash
# Rebuilds the master calculation file end to end, in the only order that works.
#
#   1. scan the code            → inventory.json
#   2. build the inventory      → calculation-inventory-v1.xlsx  (coverage ratchet runs here)
#   3. read code + inventory    → module-map.json
#   4. merge everything         → MoneyKeel-calculation-master-v1.xlsx
#
# Every number in the master file comes from these steps. Nothing in it is typed by hand except the
# cream columns (written by Claude Code) and the two blue ones (yours, never overwritten).
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "── 1/4  scanning the code"
node "Calculation Module code/scripts/scan-calculations.mjs" >/dev/null
echo "── 2/4  building the inventory"
python3 "Calculation Module code/scripts/build-inventory-xlsx.py"
echo "── 3/4  reading the architecture off disk"
node "Calculation Module code/scripts/architecture-map.mjs" | tail -3
echo "── 3b/4  rewriting numeric tab references to names (E6)"
python3 "Calculation Module code/scripts/name-refs-sweep.py"
echo "── 4/4  merging into the master"
python3 "Calculation Module code/scripts/build-master.py"
echo "── done"
