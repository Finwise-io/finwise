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
| A3 | **No dead input** | An input declared and named by no engine — counted, not fatal | check 3 | ✅ |
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
| B3 | **Every function has a row** | A function in the calculation code with no row in the file — rung 1 | ✅ (2026-08-26) The sweep read only exported functions, so 88 module-private ones — 87 of them doing arithmetic — had no identifier and no row. 455 → 533. Still blind to `src/store`, which is not a calculation folder and holds `recomputeBalances`. |
| B4 | **No name means two things** | One name declared at more than one place, all answering to a single identifier. Counted 2026-08-26 once the sweep was widened: **11 names across 26 declarations** — `round2` five times, `daysBetween` three, and `moneyWeightedReturn`, `classifyHolding`, `rmdDivisor`, `median`, `num`, `monthsToClear`, `firstDate`, `onOrBefore`, `parseReceipt` twice each. The header at every one of those sites now says so out loud, which is honesty, not a guard. | ⚠️ named, not yet enforced |

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

The three guards from the vocabulary standard. Only one of them does not rely on discipline.

| # | Guard | What it catches | Built? |
|---|---|---|---|
| D1 | **Nobody in the kitchen** | A screen calling a dependent function directly instead of an orchestrator | ⬜ — and `CashFlowScreen` breaks it today, calling `monthlyTaxRates` |
| D2 | **One identifier, one producer** | Two functions claiming the same metric identifier | ⚠️ partial, see A4 |
| D3 | **The screens must agree** | For one test person, every metric shown on more than one screen rendered on each and compared. **The guard that does not rely on discipline, because it looks at what a person would see.** | ⬜ — the recommended next build |
| D4 | **A published figure names its source** | A Kind A figure — tax bands, the standard deduction, Social Security factors, the required-withdrawal table — with no publication and year named in the file, and no re-check when the year rolls. Today only the tax tables have one; the file names no source at all (finding A41) | ⬜ |

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
