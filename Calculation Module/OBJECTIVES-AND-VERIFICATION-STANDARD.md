# Calculation Module — the objectives, and the standard that proves them

Founder's words, recorded 2026-08-22, governing the work begun 2026-08-18.
This document outranks any plan of mine. Work is judged against it, not against my framing of it.

## Why this exists

The founder loaded his own Vanguard download and the app showed $1.4 million of contributions into
an account where nothing had moved, and interest of $2,387 that was really $1,193 counted twice.
Two wrong numbers, on his own screen, in his own money. A wrong number in a finance app is trust
that does not come back.

## The four objectives

1. **One single source of truth for every calculation in the app.** One place where each figure is
   defined. The same figure is never worked out two different ways on two screens.
2. **100% confidence that every formula and calculation is right, tested, and clearly documented in
   the master file.** All three at once — correct, proved by a test, and readable by the founder.
3. **A module architecture anyone can trace.** When a number looks wrong in the app, a person can
   find which engine produced it and what its formula is **in one minute**, without reading code
   and without asking me.
4. **A master key from screen to source.** For every metric a person sees: the metric on screen →
   the engine and code that produce it → the formula → the inputs → the decisions used.

## The file-and-code rule (objective 1, as the founder stated it)

If all of this is executed properly, **the file and the code say the same thing**. Therefore:

- **Neither changes alone.** Change the code and the file is corrected in the same piece of work.
  Change the file and the code is corrected in the same piece of work.
- **This binds during debugging too.** A fix made while chasing a bug is not finished until the
  file carries it. No moving on with a note to update the file later.
- **Finishing is said out loud.** When the work is done the statement is explicit: *"File and code
  are both updated and they match 100%."* No claim of completion without that sentence.
- **Every build checks it.** From here on, each build runs the code against the file and the build
  fails if they do not match.

## When the file and the code disagree

**There is no winner.** If the inputs and assumptions are the same and the formula is right, the
answers are the same. A disagreement therefore means something is genuinely wrong and it is not
known yet which side. So:

1. **Stop.** A disagreement is not a note for later and not something to work around.
2. **Flag it** — visibly, as its own item, not buried in a commit message.
3. **Analyse it** — find which side is wrong, and why, before changing either.
4. **Fix it**, correct both sides, and only then move forward.

Where the analysis shows the founder's approved formula itself needs to change, the change goes to
him for a verdict before either side is edited — nothing reaches an engine that is not written in
the master spreadsheet with his approval.

## The verification standard — how "100% confident" is proved

Five rungs. **Rungs 1, 2 and 3 apply to every calculation.** Rungs 4 and 5 apply to the engines
explicitly marked for them.

**Rung 1 — everything is accounted for.** Every engine in the code has a row in the file, and no row
names an engine, function or constant that does not exist. Catches deletions and renames. Proves
nothing about the arithmetic.

**Rung 2 — one worked example per row, re-run for real.** Each row carries a worked example (these
inputs → this answer) that the build re-runs through the actual engine and must reproduce exactly.
Catches drift. Blind spot: a formula right for the example and wrong elsewhere — right for a single
filer, wrong for a married one; right with full data, wrong when a cost is missing.

**Rung 3 — an example for every case the file itself names.** Each cell of the grid that holds a
calculation gets its own worked example, all re-run on every build: the refusals when data is
missing, the degraded inputs, the time-bounded windows, the related events, the account types. The
file's own stated coverage becomes the test's coverage. This is the floor for every metric.

**Rung 4 — the file's formula is executable, and the two must agree on generated inputs.** The sheet
keeps the plain-English formula as the readable column and gains a machine-readable column saying
the same rule. The build runs the sheet's formula and the app's engine against thousands of
generated inputs and demands identical answers to the cent. Honest caveat: the executable column is
written by me, so this proves the code agrees with a second independent statement of the rule; the
English original is still checked by the founder, not by a machine.

**Rung 5 — laws that must hold for every input.** Not examples: truths the numbers may never break.
Ending equals beginning plus money in, minus money out, plus income, minus costs, plus market
change. The parts always sum to the whole. No dollar is ever counted twice. Generated inputs try to
break them. This is the class of check that found the $1.4 million.

### How an engine gets marked for rungs 4 and 5

The marking is explicit and lives in the master file, not in my judgement — a verification-level
column on the Engines tab, set by the founder. Candidates recommended at the time of writing: the
ledger and money flows, returns, tax, required withdrawals, Social Security, and the retirement
odds. *(The column and its build guard are still to be built — noted as open work.)*

## Open work created by this document

- The verification-level column on the Engines tab, and the build guard that reads it.
- Rung 3 coverage across the grid (roughly 990 cells today) — to be priced and sequenced.
- Rungs 4 and 5 on the engines the founder marks.
- The build-time file-versus-code check, run on every build.
