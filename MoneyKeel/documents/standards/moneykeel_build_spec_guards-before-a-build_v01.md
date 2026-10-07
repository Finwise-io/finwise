# MoneyKeel — every guard that runs before a build

Agreed with the founder 2026-08-26. **A guard is a gate, not an intention.** Nothing on this list
is a thing to remember; each one either passes or stops the work.

Why this document exists, in the founder's own lesson: *"enforce with GATES not intentions."* Three
guards built before today — orphan routes, the banned word, the brief figures — **each caught a real
defect within minutes of being written**, on surfaces that had already been read carefully by hand.
Careful reading finds some. A gate finds the rest.

---

## The order

Guards are grouped by what they protect, and they run in this order because a later one is
meaningless if an earlier one has failed.

    A · the file holds together        →  B · the file and the code agree
    C · the code is sound              →  D · what a person sees is right
    E · the founder has said yes

---

## A · The file holds together

Run by `build-moneykeel-master.py` on every build of the master file. A **BREAK** stops the build;
an **OPEN FINDING** is counted on every build until it reaches zero.

| # | Guard | What it catches | Where it lives | Built? |
|---|---|---|---|---|
| A1 | **One identifier, once** | The same metric identifier on two rows | `moneykeel_reconcile.py` check 1 | ✅ |
| A2 | **No unknown input** | A figure naming an input identifier that no row of the inputs tab defines | check 2 | ✅ |
| A2b | **No input list · not an input · orphan input** | Three different problems the orphan check used to miss entirely: it looked for a string the builder never writes. Now separated so each says what is true — 74 figures record no input at all, 12 list only another function's answer | check 2 | ✅ (2026-08-26) |
| A3 | **No dead input** | An input declared and named by no function — counted, not fatal | check 3 | ✅ |
| A4 | **No unknown function** | A figure depending on a function that is in no row | check 4 | ✅ (2026-08-26) The pattern excluded type `F` and carried the retired `E`, so it had never once fired. Fixed. |
| A5 | **No broken fold** | A row saying it is the same figure as an identifier that does not exist | check 5 | ✅ |
| A6 | **Every question lands** | A numbered question for the founder that sits on no row — a question he cannot see is one he will never answer | `build-moneykeel-master.py` | ✅ |
| A7 | **Nothing of his is lost** | An answer he typed whose row has gone. Written to `kept-but-unplaced.md` and named out loud, never dropped | `moneykeel_keep.py` | ✅ (2026-08-26) |

---

## B · The file and the code agree

The founder's rule: *when the file and the code disagree there is no winner.* These make the
disagreement impossible to walk past.

| # | Guard | What it catches | Built? |
|---|---|---|---|
| B1 | **Every header is a printed view** | A header hand-edited in the code. A header is generated from the file and the code; edit one by hand and the next build silently wipes it. `write-headers.py --check` | ✅ (2026-08-26) |
| B2 | **The formula agrees** | The arithmetic in a code header differing from the arithmetic in the master file. Both read from disk, never from one generator checked against itself | ✅ (2026-08-26) `check-formula-agreement.py` |
| B3 | **Every function has a row** | A function in the calculation code with no row in the file — rung 1 | ✅ (2026-08-26; widened 2026-09-12) The sweep read only exported functions, so 88 module-private ones had no identifier and no row: 455 → 533. `src/store` added to the swept roots 2026-09-12 — `recomputeBalances`, which builds the balance net worth is made of, is MK-XS-F-174 now (595 → 601). The two roots lists (functions and inputs) are asserted equal by the build. |
| B3½ | **Every file-only ruling still reads as ruled** | A row the founder ruled on (words, a function named, a column) that has drifted since — an override lost, a regenerated column that no longer says it. Each such ruling carries `expect` on the rulings ledger; `check-rulings-in-file.py` reads the built file against it. | ✅ (2026-09-12) 23 expectations on 14 rulings; runs in build-all.sh after B2. |
| B4 | **No name means two things** | One name declared at more than one place, all answering to a single identifier. Counted 2026-08-26 once the sweep was widened: **11 names across 26 declarations**. By 2026-09-12 every one had been consolidated to a single declaration in the calculation code (the last pair, `secureGet` / `secureSet`, on 2026-09-12). | ✅ (2026-09-12) `src/__tests__/guard_b4_one_name_one_function.test.ts` holds the count at ZERO across every swept root. Outside its scope, and owed: the screen-local `num` helper is re-typed in 24 screens — screens carry no identifiers, so it is a tidy-up, not a two-functions-one-identifier defect. |

---

## C · The code is sound

| # | Guard | Command | Built? |
|---|---|---|---|
| C1 | **Types** | `npx tsc --noEmit` — must be zero | ✅ |
| C2 | **The suite** | `npx jest` — all green | ✅ |
| C3 | **A UI change carries a test** | `bash scripts/check-ui-tests.sh origin/main` | ✅ |
| C4 | **The eight guard tests** | a11y · banned word · brief figures · class label · colour token · keyboard · orphan route · type floor | ✅ |
| C5 | **The invariants** | `src/domain/invariants.test.ts` — laws that must hold for every input, not examples. Rung 5 | ✅ |
| C6 | **The screen map is current** | `node scripts/screen-map.mjs`, then read the three lines it prints: what has no way in, what appears only if an insight fires, what hangs on a single door | ✅ |

---

## D · What a person sees is right

The three guards from the vocabulary standard (D1–D3), the source register (D4), and the two pieces of one-door machinery (D5, D6). Only D3 and D5 do not rely on discipline — they look at what a person would see.

| # | Guard | What it catches | Built? |
|---|---|---|---|
| D1 | **Nobody in the kitchen** | A screen calling a dependent function directly instead of an orchestrator | ✅ (2026-09-12) `src/__tests__/guard_d1_nobody_in_the_kitchen.test.ts` reads every screen's imports against the categories the build writes (`moneykeel_function_categories.json`). It is a RATCHET: 18 such imports stood in 9 files on 2026-09-12 (modules.tsx 7, IncomeDetail 2, IncomeManager 2, TaxOrganizer 2, CashFlow 1, Home 1, ImportHoldings 1, Performance 1, SsTiming 1); a file may only shrink, no new file may appear. The 18 are owed. |
| D2 | **One identifier, one producer** | Two functions claiming the same metric identifier | ⚠️ partial, see A4 |
| D3 | **The screens must agree** | For one test person, every metric shown on more than one screen rendered on each and compared. **The guard that does not rely on discipline, because it looks at what a person would see.** | ✅ (2026-09-12, first two figures) `src/__tests__/guard_d3_screens_agree.test.tsx` renders one person — 55, working, $9,000 a month gross, $4,500 of expenses, $300,000 brokerage, $20,000 savings — and reads MK-NW-M-017 net worth off Home and the Net worth tab, and MK-XS-M-002 the odds off Home and the Plan hub, the way VoiceOver reads them. Every further shared figure is added the day it lands on a second screen. |
| D4 | **A published figure names its source** | A Kind A figure — tax bands, the standard deduction, Social Security factors, the required-withdrawal table — with no publication and year named in the file, and no re-check when the year rolls. | ✅ (2026-09-12) ONE register, `moneykeel_published_sources.json` (12 figures: publication, year it applies to, checked date, file). The builder prints it on the master's Reference tab (A41 closed), and `src/__tests__/guard_d4_published_sources.test.ts` fails when a statutory symbol is missing from the register, when an entry names a symbol that no longer exists, or when a figure's year has rolled past without a re-check. What the figures ARE is checked by `statutory_constants.test.ts`. |
| D5 | **The photograph** | A figure a person sees that changed while a question's functions were being moved behind their door — step 2 of the one-door architecture. | ✅ (2026-09-13) `src/__tests__/photograph_figures.test.tsx` renders two people (Pat, 55, working; Lee, 68, retired) on eight screens at a fixed date and snapshots every dollar, percent, month and age a person could read — 237 figures, 16 snapshots. A move must leave the file byte-identical; a difference has no winner and goes to the founder. Re-taken only with `jest -u` and a ruling. |
| D6 | **One door for "will it last"** | A screen reaching past the will-it-last door to an inner part (simulate, selectWillItLast, willItLastInputs, projectNestEgg, displayOdds, capitalNeeded, volOf, solveRetireAge, RetirementInputs). | ✅ (2026-09-13) `src/__tests__/guard_one_door_will_it_last.test.ts` — a RATCHET like D1: the 16 files that reached past on 2026-09-13 are frozen by name; no new file may appear, a file that stops is struck so the count only falls; at zero it is the wall. The 16 are owed to the planned Plan door MK-PL-O-001 thePlan once the founder approves that row. |

---

## E · The founder has said yes

From the release gate. None of the above substitutes for these.

1. **Scope complete** — every row of the agreed scope, not "the important ones".
2. **Audits finished** — an audit is a gate, never parallel work.
3. **Journey pass complete** — findings fixed *before* the cut, never after.
4. **The checklist presented, and an explicit "cut the build".** Go on a plan, silence, or
   enthusiasm is not approval. Only the literal ask counts.

---

## What to run, in one place

    bash "Calculation Module code/scripts/build-all.sh"

That script runs every guard on this list that exists, in the order above, and stops on the first
failure. It is the enforcement; this document is the source. If the two ever disagree, this
document wins and the script is corrected.

The order is not arbitrary: headers are generated FROM the master file, so the file is rebuilt
before the headers are checked. Checking them first would compare them against a file that is
about to change.

## The honest state of this list

Of the guards named here: **17 built, 1 partial, 4 still to build.** Two of the partial ones are
worse than missing, because they report clean and get trusted — A4 has never been able to fire, and
B3 cannot see a third of the functions. Those two come first.

## Complies with

- `moneykeel_calc_spec_objectives-and-verification_v01.md` — the verification ladder these serve.
- `moneykeel_naming_spec_calculation-vocabulary_v01.md` — the three guards in section D.
- `moneykeel_naming_spec_file-and-folder-naming_v01.md` — how this file is named.
