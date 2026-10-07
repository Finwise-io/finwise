# MoneyKeel — how folders and files are named

Approved by the founder 2026-08-22. This document is itself named by the rule it describes.

**In two sentences:** `functions/` is the maths and `documents/` is the paper; the same six
sub-folders sit under every top folder, so anything can be found in one guess. A file with **no
date** in its name is the live one, and the moment it is replaced it gains its date and moves to
`archive/`.

## The top folders

| Folder | Lives here | Never here |
|---|---|---|
| `MoneyKeel/documents/` | Workbooks, specifications, decisions, standards — the paper the founder reads and approves | Code of any kind |
| `MoneyKeel/functions/` | Every calculation the app makes, one family per file, its test beside it | Screens, wording, colours |
| `MoneyKeel/screens/` | Layout, wording, what to show when | Arithmetic — a screen asks an orchestrator function |
| `MoneyKeel/data/` | Reading downloads, connections, saving and loading | Arithmetic |
| `MoneyKeel/archive/` | Dated copies of anything replaced | Anything the app still uses |

## The six sub-folders, the same under every top folder

1. `networth-and-performance` — net worth, holdings, **the ledger of money movements**, returns.
2. `cashflow` — income, spending, budget, debts.
3. `retirement` — projections, the odds, required withdrawals, Social Security, the nest egg.
4. `home-screen` — the glance, insights, what greets the person.
5. `other` — serves several screens at once: **tax**, and anything that is no single screen's own.
6. `standards` — the rules themselves.
7. `audit` — verification records: per-build device-test sheets, audit findings and outcomes.
   Added by the founder 2026-09-01: checking the work is its own kind of paper, and filing test
   sheets under `standards` (or the old `docs/`) hid the record of what was verified.
8. `decision-log` — **every decision he has made, wherever he made it.** ONE file, and it is the
   master source: `moneykeel_log_decisions_v01.xlsx`, printed from `moneykeel_decisions.json`.
   Added by the founder 2026-09-28: *"Rulings in master file needs to be one place to record all
   decisions, no matter where they are made... After mistakes over and over, I no longer trust you."*

   The `rulings` tab is REMOVED from the calculation master on the same day, by his instruction, so
   there is one record and not two. A decision recorded in a changelog, a standard, an audit sheet or
   a mock is recorded THERE TOO, and that file is where it is read from.

   Why it exists, in one line each — these are the misses that earned it:
   · his 2026-09-12 correction of income-end-to-end v07 lived in the design Changelog and the mock,
     in no ledger and no test, so the same defect was live one screen over sixteen days later;
   · the design Changelog itself lost ten rows between its 2026-08-12 and 2026-08-14 versions,
     including three of his decisions, silently;
   · the rulings ledger it replaces began in August 2026 and held 43 of the 238 decisions his own
     Changelog records — so "check the rulings ledger" was advice that could not be relied on.

### Where the founder placed the shared machinery (2026-08-22)

| Subject | Folder | Why |
|---|---|---|
| How assets are classified | `standards` | It is a rule about what counts as what |
| Decimal arithmetic — what rounds, what stays whole | `standards` | It is a rule about how numbers are held |
| What each institution's words mean (Sweep out, Redemption…) | `standards` | It is the translation table |
| Tax | `other` | It serves several screens |
| The ledger functions | `networth-and-performance` | Founder's ruling |

A rule has two homes and one identifier: the **written rule** in `documents/standards/`, and the
**code that obeys it** in `functions/standards/`.

## Naming a document

    [Domain]_[Layer]_[Type]_[Descriptor]_[Version].[ext]

and once it is superseded, the same name with its date in front:

    YYYY-MM-DD_[Domain]_[Layer]_[Type]_[Descriptor]_[Version].[ext]

| Field | What it is | Values |
|---|---|---|
| Date | Only on superseded copies, in `archive/`. **The live file carries no date.** | `2026-08-22` |
| Domain | The product | `moneykeel` (older files keep `finwise` until next touched) |
| Layer | What kind of work it is | `naming` standards and dictionaries · `calc` maths and functions · `data` schemas and contracts · `pres` screens and mockups |
| Type | What the artifact is | `spec`, `enum`, `formula`, `schema`, `master`, `audit`, `mock`, `mockup`, `component`, `plan` (the working plan — one tab, one row per task, added 2026-09-12), `log` (a record kept row by row as things happen — the decision log, added by the founder 2026-09-28) |
| Descriptor | **The only part you invent** — see the rule below | `will-money-last`, `monte-carlo-simulator` |
| Version | Lifecycle | `v01`, `v02`, `draft`, `final` |

`audit` was added 2026-09-01 with the folder of the same name — a test sheet is not a spec,
and rule 5 would otherwise force it into `standards`.

`master` was added 2026-08-28 (founder). It is the one workbook that carries every metric, input and
function on one page — `moneykeel_calc_master_calculation-master_v01.xlsx`. It existed before the
pattern did and had no type that fitted; naming it `schema` would have been a lie about what it is.

Examples: `moneykeel_naming_spec_retirement-metrics-dictionary_v01.md` ·
`moneykeel_data_schema_plan-inputs-contract_v02.json` ·
`archive/2026-08-19_moneykeel_naming_spec_retirement-metrics-dictionary_v01.md`

### A new version says what changed, inside itself (founder, 2026-09-26)

> *"Why do we have two versions in the folder? … How do I know what changed between V06 and V07?"*

One live version per file, the rest dated in `archive/` — that rule was being kept. What was missing
is the answer to his second question: **income v07 existed with nothing anywhere saying why.** Its own
eyebrow still called it v6, and the changelog had no row for it, so the only way to know was to diff
two files by hand.

From now on, a version bump carries three things, on the day it is made:

1. **A "what changed from vNN, and why" block at the top of the new file** — every change, in plain
   words, separated into figures that moved, copy that changed, and anything else. A reader opening
   the file alone learns what happened without opening the old one.
2. **The file's own eyebrow names its version and date**, and says which version it supersedes.
3. **One row in the design changelog**, the same day, with his words in the Why when it came from him.

If a version cannot say what changed, it is not a version — it is an edit that has not been recorded.

### The descriptor is the only part you invent — and there is one rule for it

Every other field is picked from a fixed list. The descriptor is written fresh each time, so it is
the only place a name can go wrong, and this single rule governs it:

**Write it the way you would say it out loud, naming the answer rather than the machinery.**
`net-worth`, never `nw`. `required-withdrawal`, never `rmd-utils`. `depletion-age-solver`, not
`sim-helper-2`.

**The same one rule names folders and code files**, which carry no pattern at all — a folder is just
a descriptor, and a code file is a descriptor plus its extension. So there is one naming judgement
in the whole system, used in three places:

| What | Pattern | Descriptor rule |
|---|---|---|
| Document | Full pattern | Applies to the descriptor field |
| Folder | No pattern — the name is the descriptor | Applies |
| Code file | No pattern, no date, no version | Applies |

## Naming code — the one deliberate exception

**Code files carry no date and no version in their name.** A code file's name is how every other
file finds it; renaming it on each version means editing everything that uses it, and a wrong
rename breaks the build. So a code file is named plainly for the answer it produces, inside the
folder that gives it its domain and layer:

    MoneyKeel/functions/retirement/depletion-age-solver.ts
    MoneyKeel/functions/retirement/depletion-age-solver.test.ts

The date, the version and the identifier live in a header block **inside** the file and in its row
in the master file — the same information, nothing breakable.

## The founder's own files

When the founder gives feedback he keeps the same filename and adds `-jj` at the end:
`..._v02-jj.xlsx`. **No script ever writes to, overwrites or renames a `-jj` file.** It is an
input of record, like his answered metrics file, and it is kept forever.

## Rules the pattern does not cover

1. The test sits beside the thing it proves, same name plus `.test`.
2. Banned names anywhere: `utils`, `helpers`, `common`, `core`, `lib`, `misc`, `v2`, `new`,
   `final`, `temp`. Duplicate maths hides in folders named like this.
3. Only one live file per subject. Two undated files covering the same thing is a defect.
4. `README.md` is the one exempt filename: every folder carries one, saying what lives there and
   what never does.
5. **Every specification lives in a `standards` folder.** If the type field says `spec`, the file
   sits in `standards` — never in `other`, never beside the thing it specifies. Founder, 2026-08-22.

## Guards to be built (not yet true)

- The build fails on any filename that breaks this pattern.
- The build fails if a dated file appears outside `archive/`, or an undated one inside it.
- The build fails if two live documents cover the same subject.
- The build fails if any live file imports from an old folder location.

## Still to decide

The repository already has a `docs/` folder holding 81 files. Keeping both `docs/` and
`documents/` recreates exactly the confusion this document exists to end. Recommendation: `docs/`
is folded into `documents/` during the move, and only `documents/` survives.


## His feedback files — and where they go once they are folded in (founder, 2026-09-10)

- His feedback carries `-jj` before the extension (or sits in a `jj/` folder). No script writes, overwrites or renames one.
- Every sub-folder of `documents/` carries a `JJ-feedback-archive/` folder.
- When every comment in a feedback file has been read and written into the original file (the master, the decisions workbook, the assessment), the feedback file moves to that folder's `JJ-feedback-archive/` with the date it was folded in as a prefix: `2026-09-10_folded-in_<his filename>`.
- Why: he always starts his next review from the latest original, and the original and his feedback copy can never drift apart. A feedback file still sitting beside the original is one not yet folded in.

## THE DECISION LOG IS THE ONE CONSOLIDATED MASTER (founder, 2026-09-30 — DEC-0011)

His wording, typed onto the wording asks and replacing mine:

> *"Every Approval is logged in decision log with date in addition to change log, standards, Audit,
> Master and other files. Decision-log is one consolidated master"*

Two things follow, and the second is the one that changed:

1. **Every approval he gives is logged with its date** — that part my summary already had, and it is
   the same-day rule.
2. **The decision log is THE consolidated master, and the other files are IN ADDITION to it.** My
   summary said an approval gets a dated row in the design Changelog. That has it backwards: the
   Changelog is one of the places a decision also appears. The decision log is where every decision
   lives, whatever file it was made in.

So the order of work on any approval is: **the decision log first**, then the changelog, the standard
it belongs to, the master file's own rows, the working plan, and the code and its test. A decision that
reaches a changelog and not the decision log is not recorded.

## Post Feedback Sync — PFS (founder, 2026-09-14)

The founder named the fold-and-archive process so he can ask for it in three letters: **PFS**. When he
says it, every feedback file of his not yet in a `JJ-feedback-archive/` folder — the master file and the
audit files, unless he names one — goes through these seven steps:

1. **Find** every unarchived feedback file under `MoneyKeel/documents/`.
2. **Read every comment in full**: his own columns, cell comments, and a cell-by-cell comparison of his
   copy with the current original for anything typed elsewhere.
3. **Sort each one**: already in the original · new, written into its durable home (a generated file is
   never hand-edited) · a ruling, coded and tested the same day · a question, answered on its row.
4. **His words are kept exactly as he typed them.** The canon never rewrites them, and the master build
   stops if any cell he typed, or any ruling in his words, has changed.
5. **Rebuild and check** that every comment now appears in the original.
6. **Archive** the feedback file as `YYYY-MM-DD_folded-in_<his filename>`.
7. **Report with a coverage line** — comments read, already in, newly folded, answered, files archived —
   and update the working plan.

### What PFS covers since 2026-10-07 — every change, not only his feedback files (founder, DEC-2634)

> *"The changes we are making with this audit are also changes I am approving, and while not my direct
> feedback - these are findings and changes."*

Twice I answered a request for PFS by saying that no feedback file of his was waiting. That was the narrow
reading above. His point: a code change from the outside review of the calculations goes out of date in
the files exactly as his notes do, and the mess the one-master rule prevents — two files disagreeing,
no one able to tell the latest version — comes from either.

**So a PFS is the sweep that brings every file level with the code, whatever caused the change:**

1. **The decision log** — his words where he gave them; a review's changes are his decisions by DEC-2634
   (batches 1 and 2 by DEC-2484), so each batch's changes are recorded against it when the batch is done.
2. **The Changelog** — a row for every decision of his, the same day (the gate below stops the build
   without it).
3. **The standard** the rule belongs to — written or amended, and named on the decision as its carrier.
4. **The master file** — printed from the code by the build; never hand-edited.
5. **The formula in words** for every changed function — re-read and stamped (gate B7 stops the build
   when a function changed and its words did not).
6. **The tracker** — the row that says what was done, measured, and what is held.
7. **The drawings** — a change table at the top of every drawing whose screen changed.
8. **The outside pack** — a supplement or a final-audit file carrying the cards as they stand.

**Two gates hold this, so it is not held by attention:**
- `src/__tests__/guard_standards_name_live_things.test.ts` — every function id and every file path a
  standard names must exist and be live; a standard that names a function that is gone is out of date.
- `check-changelog-anchored.py` (step B6) — every decision of his since the one-master rule
  (2026-09-27) must have its Changelog row, or the build stops.

### What PFS was missing, and now covers (founder, 2026-09-26)

> *"something is broken — the whole purpose of executing PFS after every change or decision is to
> ensure all files are in sync and not out of sync, and this is how we wasted 6 hours, and months."*

The seven steps above move HIS FEEDBACK FILE into its original. They never said where a **decision**
has to land, so one could sit in the rulings ledger while every other file knew nothing about it.
That is exactly what happened with G6 and G7 on tax: on the master's rulings tab, in no standard, on
no screen row, and contradicted by a row I had left open in the working plan. The question was asked
again, and the wrong words reached a mock.

**Every decision lands in all of these, the same day, or it is not recorded:**

| Where | What goes there |
|---|---|
| `moneykeel_rulings.json` | His words, verbatim · what it governs (`rows`) · a test (`proof`) or a file check (`expect`) |
| A **standard** | Any rule that is not about one screen — named on the ruling as `standard:` — or the ruling says `screen_only: true` |
| The **screen's own rows** on the master | So someone reading the figure sees the rule that governs it |
| The **working plan** | Every open row the decision answers is CLOSED, not left asking |
| The **design changelog** | One dated row, his words in the Why |
| **Code and a test** | Or the ruling stays RULED, never TESTED |

**The gate:** `Calculation Module code/scripts/check-rulings-sync.py`, step B4 of the build. It fails
when a ruling governs nothing, when its proof does not exist, or when a ruling made after 2026-09-26
names no standard and is not marked screen-only. It also prints every open working-plan row that
still ASKS about a subject already ruled — the shape of this miss — so a repeat question is caught by
the build rather than by him.

**Before writing copy or a mock on a ruled subject:** `python3 "Calculation Module code/scripts/rulings-for.py" <topic>`.

### When PFS runs — and why an agreed-but-not-coded decision is not a mismatch

The founder's question, 2026-09-26: *"at what step do we run PFS — considering calculation file is
written from code, so if we have only agreed but not coded, we will have mismatch."*

It is not one step. It runs at three moments, and the STATUS LADDER carries the gap between a
decision and its code, so the two never have to pretend to agree:

| When | What updates | The status |
|---|---|---|
| **The moment he decides** — any document, any channel | The rulings ledger (his words) · the standard, if the rule is not about one screen · the screen's own row · the working plan (every asking row CLOSED) · the design changelog | **RULED, NOT CODED** |
| **The moment the code lands** | The code and its test; the master is rebuilt, and formula-agreement and the headers now check code against file | **CODED → TESTED** |
| **His mark on the device** | Nothing but the status | **VERIFIED** |

**Why there is no mismatch in between.** The master's code-derived cells are printed FROM THE CODE.
A decision never edits one — it edits its own source: the ruling, an override, a standard. So while
a decision is agreed and not yet built, the file says two true things at once: *this is what the code
does today*, and *this is what he has ruled, not yet coded*. The moment the code lands, the ladder
moves and the generated cells change with it. A file that could not say both would force us to
choose between recording his decision late and printing something the code does not do.

**The sweep.** `pfs-sweep.py` (step B4 of the build) reads all five kinds of document — the master,
the standards, the audit files, the planning files and the mock-ups — and prints every question
raised in one of them that has no row in the working plan. A question may be RAISED anywhere; it is
not a question until it is a row. That is what stops the same thing being asked twice in two files.

The build prints how many feedback files are waiting for a PFS, so a copy left beside its original is
seen rather than remembered.

---

## How a workbook is formatted

**Founder, 2026-09-27:** *"in future learn how to format excel file so it is readable in terms of
column width."*

Every workbook this repository writes is formatted by one helper —
`Calculation Module code/scripts/xlsx_readable.py` — and none of them sets widths by hand again.

**What was wrong.** Three things, in every file:

1. **Wrapped text with no row height.** Every cell was set to wrap and no row was ever given a height,
   so a 300-character question rendered as a one-line sliver with the rest cut off.
2. **Columns sized by guess.** The workplan's first two columns were 70 characters each — 140 characters
   before the STATUS column, so the one column that says who a row waits on sat off the side of the
   screen.
3. **His columns behind mine.** The orchestrator map put the question he must answer in column Q, behind
   thirteen columns of generated inventory that is mine to check and not his to read.

**The rules.**

| Rule | Why |
|---|---|
| A column is as wide as its longest line needs, between **9 and 52** characters. | Past about 52 the eye loses the start of the line on the way back. |
| A row is as tall as its tallest visible cell needs, capped at **4 lines** — or more where the cell is a paragraph he must read in place (the Map's question uses 9). | Eight lines is 120 points: five rows to a screen, and a 189-row tab becomes forty screens. |
| **A folded column never drives the row height.** | The Map's inventory columns hold hundred-line lists; letting them count made every row nine lines tall to fit text nobody can see. |
| The header row is frozen and carries a filter. | He finds his rows by filtering STATUS, not by scrolling. |
| Columns that are **mine** — generated inventory — are grouped and **folded away**, so the sheet opens on the columns he reads and answers. The `+` above the column letters opens them. | He was asked to validate 189 figure rows once. He was right to refuse. |

**When a column is pinned by hand,** it is because its content is one word (a status, a date) and the
measured width would make it wider than it reads — those widths are passed to the helper, which keeps
them and caps them.
