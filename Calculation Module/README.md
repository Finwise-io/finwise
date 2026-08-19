# Calculation Module

**`MoneyKeel-calculation-master-v1.xlsx` is the one file.** Everything else here supports it.

| Tab | What it holds |
|---|---|
| 0 · Read Me | How to read the file |
| 1 · Metrics | The 50 figures a person reads — formula, inputs, whether an institution can supply them, the trap |
| 2 · Engines | 158 rows, one per calculation in the code, each proved by a test that runs the real code |
| 3 · Work list | The 19 rows needing a fix or a decision, with a column for your verdict |
| **4 · Architecture** | The whole app as modules and layers, plus the folder-move plan and its guards |
| 5–11 | The research it rests on: transaction taxonomy, field crosswalk, asset classes, cost basis, the snapshot store, gaps, SnapTrade |

## Rebuilding it

    bash "Calculation Module code/scripts/rebuild-master.sh"

Four steps in the only order that works: scan the code, build the inventory, read the architecture
off disk, merge. **Every number in the file comes from those steps.** The only hand-written parts are
the cream columns and the two blue ones, which are yours and are never overwritten.

## Two guards worth knowing about

**The coverage ratchet.** Documented rows may only ever go up. A cleanup script once deleted four
finished rows and the count fell silently from 109 to 105 — the rebuild now refuses to run when that
happens and prints the git command to recover them.

**The standard checker.** Every documented row must list its possible answers, state its formula as
real rules, name a real source, and carry no internal jargon. It has caught me five times.

## The files that are not committed

`real-downloads/` holds institution files and is gitignored. Only `fixtures/` inside it is
committed, and only for files carrying no real balances.
