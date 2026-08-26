# The objectives of the calculation work, and the standard that proves them

Named by the rule in `moneykeel_naming_spec_file-and-folder-naming_v01.md`, in the same folder.

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

## "Right" means: the same maths gives the same answer (founder, 2026-08-22)

The same rule as file-versus-code, applied to every comparison in the module:

**If the inputs, the variables, the assumptions and the formula are the same, the output is the
same. This is arithmetic — 2 + 2 is always 4.**

So wherever two figures ought to agree — the file against the code, our number against the broker's
own statement, our number against an outside calculator, the same figure on two different screens,
the bench against the app — they must either **match**, or the difference must be **clearly
explained by a named difference in inputs or assumptions**. The founder's example: the target
retirement pot differs because one side retires at 59 and the other at 67.

Anything else is flagged and work stops until it matches or is explained. No unexplained difference
is carried forward, and no difference is explained by hand-waving.

**The bar for "explained" is reproducible, not narrated.** An explanation must name the exact input
or assumption that differs, and setting that one input to the other side's value must make the two
numbers agree. If they still differ, the explanation is wrong and the difference is still open.

Every such reconciliation is recorded — what was compared, the difference, the named cause, and the
proof that aligning the input closes it — so a known difference is not re-argued and a NEW
difference is visible the moment it appears.

### The three kinds of figure, and what "right" can mean for each (founder approved, 2026-08-22)

The same-maths rule says two figures that ought to agree must agree. But not every figure has
something outside the app to agree WITH. There are three kinds, and each is checked differently.

**Kind A — rules with a published authority.** Tax tables and brackets, the standard deduction and
its over-65 addition, Social Security full-retirement ages and claim factors, required-withdrawal
starting ages and their table, the day count that decides a long-term gain. For these, "right"
means the app's numbers equal the published source. The source is **named in the file** — which
publication, which year — and it is **re-checked when the year rolls over**; a test already fails
the build once the calendar passes the tax year the tables were written for.

**Kind B — figures with a real-world truth to reconcile against.** The broker's own stated account
total, an account's beginning value on a statement, a holding's share count. For these, "right"
means our figure reconciles to the institution's, to the cent, or the difference is named and
reproducible (the same-maths rule above).

**Kind C — figures with no outside truth at all.** The odds the money lasts, the recommended nest
egg, the assumed return, a projected balance at an age. Nothing outside can settle these. For
these, "right" means exactly two things: **the method is the one the founder approved**, and **the
code does exactly what the method says** — no more, no less. Where such a figure is compared with
an outside calculator, a difference is expected and must still be explained by a named, reproducible
difference in inputs or conventions, not treated as a defect in either side.

## When the founder's approved formula is the thing that must change

Where analysis shows the file's formula itself is wrong, the change goes to the founder for a
verdict before either side is edited. Nothing reaches an engine that is not written in the master
spreadsheet with his approval.

## "Documented" means the founder approved it (founder, 2026-08-22)

A row is not documented because I wrote it. **A row is documented when the founder has read it and
approved it.** His approval lives in the file as his own column, and the coverage count counts
APPROVED rows — never rows I have written.

Consequence, stated plainly: today's "161 of 161 documented" is **my** count of rows written, not
his count of rows approved. Against this objective the honest approved figure is zero until he
starts giving verdicts. The counter and its ratchet have to be re-based on approval, and the old
number must stop being reported as if it meant this.

## "Every calculation" includes the small ones (founder, 2026-08-22)

Not only the metrics a person reads. Subtotals, a percentage of a total, a difference between two
dates, a rounding step, a unit conversion — **anything that can put a wrong number in front of a
person counts**, because a subtotal is exactly where the founder's interest got counted twice.

Consequence, stated plainly: the inventory today counts **engines** (161). Small calculations that
live inline inside screens are not all in it, so the true denominator is larger than 161 and is not
yet known. Finding them is a sweep of its own, and the count will GROW before it is complete — the
ratchet that only allows the documented count to rise must not be read as completeness while the
denominator is still moving.

## Three working rules the founder settled (2026-08-22)

**What stops when something disagrees.** Work stops on the disagreeing figure and on everything
built from it — anything that consumes it, directly or through another engine. Unrelated work
continues. The disagreement is raised as its own visible open item, never buried in a commit
message, and a build still fails while file and code disagree.

**Who marks the engines for rungs 4 and 5.** I recommend a list with the reason for each; the
founder approves, strikes or adds; his marks live in the file. The strongest checks are aimed by
him, not chosen by me.

**Closing an explained difference needs his sign-off.** I may not close one on my own, however well
it reproduces. Each stays on an open list carrying what was compared, the difference, the named
cause, and the proof that aligning that one input closes it — ready for a quick verdict.
My reading, to be corrected if wrong: once the explanation is complete and reproducible the work
downstream may resume; his sign-off is what closes the record, not what unblocks the day.

## Two independent lists, never one generated from the other (founder, 2026-08-25)

When two records describe the same thing — the engines' own input lists and the inputs tab, the
master file and the code — it is tempting to generate one from the other so they always agree.
**That is forbidden.** Agreement by construction hides the failure that matters: an input an engine
reads that nobody ever captured. The orphan disappears into the generated list and the wrong number
reaches the screen with nothing flagged.

Both records are kept independently, and a **reconciliation engine** checks them against each other
as a build gate. It must report, in both directions:

- an input an engine names that appears on no row of the inputs tab (the orphan);
- an input declared on the inputs tab that no engine names (the dead entry);
- a metric whose engine identifier names an engine that does not exist;
- an engine that no metric identifier reaches.

Any of these fails the build. This is the same discipline as rung 4: two independent statements of
the same rule, checked against each other, rather than one copy of one statement.

## Two assumptions I am running with unless corrected

- **A refusal is a case that needs its own test.** Where the file says a figure cannot honestly be
  shown — a missing cost basis, a window the history does not cover — the test proves the screen
  refuses. Silently showing a number there is the failure being guarded against.
- **The completion sentence is said per piece of work and again at each build**, not once at the
  end of the project.

## Objectives 3 and 4, as the founder defined them (2026-08-22)

**Who must be able to trace:** the founder himself, and a future engineer who has never seen this
code. (Not a support person with no code access — that bar is not being set.)

**Where a trace starts:** the screen, plus the label **as it is actually worded on that screen**.
Not an internal metric name. If a person can say "the Plan screen, the line that reads Projected at
retirement", that is enough to begin.

**Objectives 3 and 4 are the same thing, with one addition.** Objective 4 additionally requires a
**unique identifier for every label on screen**, which is what makes the trace mechanical rather
than a search. The founder's example: `MK-CM-Mv1-NW-M-45` — Calculation Module, Net Worth tab,
metric 45. **Each metric identifier is connected to a unique engine identifier.**

**The identifier standard is still to be determined — jointly.** Nothing is assigned until the
standard is agreed.

### The chain in objective 4 carries all three kinds of decision (founder, 2026-08-22)

- **His rulings** — the verdicts he gave in his answered file, and every ruling since.
- **The person's own inputs** — their retirement age, their typed target, their stated spending.
- **The built-in assumptions nobody chose on a screen** — return rate, inflation, rounding rules,
  the timing convention that makes our recommended pot differ from an outside calculator's.

Each is labelled with **whose** decision it was, because when a number looks wrong the assumption
nobody chose is usually the cause.

### Scope: the 55-70 core screens first (founder, 2026-08-22)

The objectives apply to the core screens for the 55-70 person first. The rest of the app follows
after. This bounds the denominator as much as the small-calculations ruling widens it.

### One identifier per figure, or one per label — held

The founder agrees in principle with one identifier per calculated figure, with each place it
appears recorded against it, so a trace from any screen lands on the same row. **Held deliberately**
until the identifier nomenclature is designed, which is its own piece of work.

## Open work created by this document

- The verification-level column on the Engines tab, and the build guard that reads it.
- Rung 3 coverage across the grid (roughly 990 cells today) — to be priced and sequenced.
- Rungs 4 and 5 on the engines the founder marks.
- The build-time file-versus-code check, run on every build.
- A founder-approval column, and re-basing the coverage count and its ratchet on APPROVED rows.
- The sweep for small inline calculations, to find the true denominator.
- The identifier standard itself, then identifiers assigned to every on-screen label and every
  engine, with a guard that none is duplicated, reused or silently renumbered.
- The open-differences list, carrying each unclosed difference to the founder for sign-off.
- The reconciliation record: every compared pair, its difference, the named cause, and the proof
  that aligning that one input closes it.

## Parked until every objective is clear

**Which document is "the file"** — the master workbook, the decomposition sections, the
architecture page, or something not yet built. Founder, 2026-08-22: none of today's documents meet
the objectives, so this is decided AFTER all four objectives are fully clear, not before.


## A note on the word "engine"

This document was written before the vocabulary was settled, and says "engine" where it now means
**function** — and, where it means the one function that answers a whole question, **orchestrator
function**. His rulings are left in the words he used; the vocabulary standard
`moneykeel_naming_spec_calculation-vocabulary_v01.md` governs which word is used from here on.
