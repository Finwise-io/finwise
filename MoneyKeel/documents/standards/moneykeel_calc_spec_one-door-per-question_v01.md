# One door per question — the orchestrator architecture

Proposal, 2026-08-22. Status 2026-09-13: **the machinery is built** (photograph, ratchet — see
"Where it stands"); **no question has moved behind a door**, because step 1 for every question is the founder's row.

Named by `moneykeel_naming_spec_file-and-folder-naming_v01.md`. Serves the objectives in
`moneykeel_calc_spec_objectives-and-verification_v01.md` — objective 1 (one source of truth),
objective 3 (trace in a minute) and objective 4 (screen to function to formula to inputs to
decisions).

## The problem, measured

Renaming, redesigning or breaking the functions behind "will my money last" today means changing **65 places**:

| Where | How many |
|---|---|
| App files — screens and components | 17 |
| Tests and probes | 23 |
| Rows in the master workbook | 25 |
| **Total** | **65** |

Across the code files there are **150 call sites**, because the question has no single door.
It exposes nine: `simulate` (used in 22 files), `selectWillItLast` (16), `RetirementInputs` (14),
`willItLastInputs` (9), `projectNestEgg` (8), `displayOdds` (6), `capitalNeeded` (3), `volOf` (2),
`solveRetireAge` (2).

The retirement functions are called from screens that are not about retirement: Net worth, Cash flow,
Budget, Big costs, Home, the mortgage comparison, the spend-more control, and setup. **Each one
assembles its own inputs.**

### What that already costs, in the code as it stands

Cash flow, Budget, Social Security timing and Goals all pass the person's planned big costs into
the functions. Net worth does not:

    Cash flow screen:  willItLastInputs({ op, accounts, assumptions, bigCosts, inflation, employment })
    Net worth screen:  willItLastInputs({ op, accounts, assumptions,           inflation, employment })

Both then ask for the projected pot at retirement. For anyone who has entered a big cost, Net worth
therefore shows a **larger** nest egg than Cash flow for the same person on the same day. Visible
in the code; not yet confirmed on screen, and deliberately not chased — recorded here so it is not
lost.

## The proposal: one door

A screen asks for **the person's plan** and reads figures off it. It cannot assemble its own inputs.

    Any screen:   const plan = thePlan()

                  plan.oddsItLasts
                  plan.projectedAtRetirement
                  plan.recommendedNestEgg
                  plan.moneyRunsOutAt

Three parts make it real, and all three are needed:

1. **One entry point.** `MoneyKeel/functions/retirement/the-plan.ts` (planned; not yet built) is the only thing a screen may
   call for this family.
2. **One place the inputs are assembled** — big costs, inflation, employment, Social Security —
   so no screen can quietly leave one out.
3. **A guard that fails the build** if any screen reaches past the door to the inner parts. Without
   it the old habit returns within a month.

## What it changes

| | Today | With one door |
|---|---|---|
| Rename or redesign the functions behind one question | 65 places, 150 call sites | 1 code file + 1 row in the master file |
| Two screens disagreeing | Possible, and visible in the code today | Impossible — there is one answer |
| Tracing a wrong number | Which of 17 callers? | The door, then its row |

The door carries the identifier. That is what makes the one-minute trace mechanical rather than a
search.

## How it would be executed — six steps per question

1. **The row before the code.** The orchestrator's row in the master file first: what it answers, the
   formula in plain English, its inputs, the decisions it applies, its identifier, and the exact
   list of figures the door hands out. **The founder's verdict on that row is the gate.**
2. **Photograph today's answers.** For real profiles and test ones, record every figure the current
   screens show for this question. This is the "before" record that proves the door changed nothing
   it should not have.
3. **Build the door beside the old code, not instead of it.** One entry point, inputs assembled
   once, rungs 1 to 3 from the start.
4. **Move the callers one at a time, suite green after each**, each compared against the
   photograph. Where a number changes, work stops on that caller — flagged, analysed, brought to
   the founder, because a difference has no winner.
5. **Close the old doors.** Delete or seal the old entry points and add the guard.
6. **Reconcile and say the sentence.** The row's worked example runs through the real orchestrator, the
   identifier joins them, then: *file and code are both updated and they match 100%.*

## Order

Prove the machinery on one small question first — door, photograph, guard, row — so the pattern is
argued once, cheaply. Then "will it last" second: at 65 places it is the largest single piece of
work in the app and the one carrying the founder's money decisions. Then the rest by blast radius.

This **is** the careful file transfer: each question's functions move into `MoneyKeel/` exactly once,
deliberately, with its row and its identifier — never dragged across in bulk.

## What the founder does

- Approves the row before anything is built, per question.
- Signs off any number that genuinely changes.

Everything else is mine.

## Where it stands — 2026-09-13

Measured against the code on 2026-09-13:

| What the architecture needs | Today |
|---|---|
| A screen calls only an orchestrator | 4 orchestrators exist, all in Cash flow (MK-CF-O-001 basePay, O-002 expenses, O-003 thisMonth, O-004 incomeSummary). 67 screen or component files still import 299 functions straight from `src/domain` or `Calculation Module code/engines`. |
| One door for "will it last" | None. The retirement functions expose nine inner parts (simulate, selectWillItLast, willItLastInputs, projectNestEgg, displayOdds, capitalNeeded, volOf, solveRetireAge, RetirementInputs) and **16 files** reach for them, each assembling its own inputs. |
| Functions living in `MoneyKeel/functions/` | 32 of 607 (all Cash flow: 4 orchestrators, 8 displayed, 19 dependent, 5 action — by identifier on the functions_from_code tab). The folders `retirement/`, `networth-and-performance/`, `home-screen/`, `other/` are empty. |
| Step 2, the photograph | ✅ Built. `src/__tests__/photograph_figures.test.tsx` renders two people — Pat, 55 and working; Lee, 68 and retired — on eight screens (Home, Net worth, Cash flow, Plan hub, Performance, Retirement, Will it last, Income summary) and records every dollar, percent, month and age a person could read: 237 figures in 16 snapshots under `__snapshots__/`, taken at a fixed date so they do not change overnight. Moving a caller behind a door must leave that file byte-identical; a difference stops the work and goes to the founder. |
| Step 5, the guard | ✅ Built as a ratchet. `src/__tests__/guard_one_door_will_it_last.test.ts` freezes the 16 files; no file may start reaching past the door, and a file that stops is struck from the list so the count only falls. At zero the ratchet is the wall. D1 (nobody in the kitchen) holds the same line for dependent functions generally: 18 imports in 9 files, only ever down. |
| Step 1, the row | ⏳ **Waiting on the founder.** No row has been put in front of him yet — the pilot question is not chosen (below). |

Steps still ahead, per question, in the order the six steps give: the row (his verdict), the door
beside the old code, callers moved one at a time against the photograph, old doors closed, the
row's worked example run through the real orchestrator.

## Closing the loop — screen → orchestrator → screen

Proposed 2026-09-13, for the founder's decision. Objective 4 asks for the master key: screen figure →
function → formula → inputs → decisions. A key that only runs one way cannot be checked, so the loop
is: **a screen shows a figure → the figure's row names one orchestrator → the orchestrator's row and
its code header name every figure and screen it serves → the screen's file imports that orchestrator
and nothing deeper → one guard reads all four hops from the code and the file and fails on a break.**

Measured on the built master of 2026-09-13 (164 figure rows on the seven screen tabs; 607 functions):

| Hop | Today |
|---|---|
| Figure row → function (the file) | 106 of 164 rows name a function: 7 an orchestrator, 93 a displayed function, 6 a dependent one. 58 name none (finding B24, on the workplan). |
| Figure row → function (confirmed by the code) | Of the rows whose tab maps to a screen file, 63 name a function the screen's own file imports; 18 name one it does not import — reached through another function, or wrong. |
| Function → figures (the reverse) | The column "Figures that name it" and the header line "Serves" come from the old inventory, not from the figure rows: 540 of 607 headers say NO FIGURE ON RECORD. |
| Screen → orchestrator only | 18 dependent-function imports in 9 files (D1 ratchet); 16 files past the will-it-last door (D6 ratchet). |

The steps, each with its guard so it cannot drift back:

1. **One producer per figure row.** Every one of the 164 rows names exactly one function identifier — the orchestrator where one exists, otherwise the displayed function that prints it today. Guard: the 58 blanks become a ratchet that only falls, then a wall at zero.
2. **The forward hop read from the code, not typed.** The builder parses every screen file's imports (the way guard D1 does) and writes, per function, the screen files that call it; a figure row whose producer is not imported by its screen's file fails the build. Needs a screen → file column on `core_screens`, taken from the route table the screen map already reads. The 18 are the starting ratchet.
3. **The reverse hop generated from the forward hop.** "Figures that name it" and the header line "Serves" derive from the figure rows, never from the old inventory. The 540 NO FIGURE ON RECORD collapse to the true number, and every displayed function that no figure names is then either a missing row or dead code — each one a finding. Guard: the two directions reconcile, the way the inputs tab and the functions' own input lists already do — a row names O if and only if O lists the row.
4. **The orchestrator as the only door, one question at a time.** This is the six-step work above. A question's loop is closed when all its rows name its orchestrator, the orchestrator's served list equals those rows, each screen file imports the orchestrator and nothing deeper, and the ratchets for that question read zero.
5. **The minute trace, proven.** A test picks any figure row and walks row → orchestrator → formula → inputs → decisions in the file, and the same orchestrator's header in the code, asserting every hop exists. Objectives 3 and 4 become a test instead of a promise.

Steps 1, 2, 3 and 5 are mechanical and mine; they can start before any question moves. Step 4 waits on
the founder's pilot choice and on his verdict on each question's row.

## The design rules — ruled 2026-09-13

The founder ruled on these on 2026-09-13 ("I like your recommendations"). They are on the rulings ledger as Orchestrator rule 1 to 10, RULED; each becomes a guard as the loop is built.

1. **Orchestrator rule 1.** One question, one orchestrator — orchestrators are grouped by the question a screen asks (what am I worth · will my money last · what did my pay come to this month), never by data type; an orchestrator composes dependent functions and hands out figures, and does no arithmetic of its own; the same question asked on different screens is answered by the same orchestrator — a screen never gets its own copy (founder, 2026-09-13: "same question on different screen — same orchestrator").
2. **Orchestrator rule 2.** One concept, one function — a concept is computed by exactly one dependent function, called over whatever set it is asked about (total assets over all accounts, and over one institution's accounts, is the same function); a total and the sum of its parts are pinned by an invariant test, never assumed.
3. **Orchestrator rule 3.** Orchestrators do not call orchestrators — a figure two questions need is a dependent function both call; a screen that needs two questions answered calls two orchestrators.
4. **Orchestrator rule 4.** Inputs assembled once per family — one function builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and no screen assembles its own.
5. **Orchestrator rule 5.** Screens compute nothing — a figure derived on screen from two others (a share, a difference, a percentage) is a function with a row, however small.
6. **Orchestrator rule 6.** Shared dependent functions are allowed and are recorded on every orchestrator row whose closure holds them; the closure is generated from the code, never typed.
7. **Orchestrator rule 7.** A door hands out figures and the walk behind them; it is named MK-<family>-O-NNN plus a verb-noun, the form the four cash-flow doors already use.
8. **Orchestrator rule 8.** Action functions and bring-data-in functions sit outside every orchestrator, and each is listed as such so the closure check has nothing unexplained.
9. **Orchestrator rule 9.** Completeness is proven three ways before a question is closed — every figure rendered on a screen is claimed by one row (figure census from the rendered screens, not from reading); every displayed or dependent function is inside at least one orchestrator's closure; every orchestrator is named by at least one row and imported by at least one screen file.
10. **Orchestrator rule 10.** The map before the code — no orchestrator is built before its row on the orchestrator map is approved by the founder; grouping conflicts go to him one row each, by identifier, with a recommendation.

**His example, resolved by rules 1 and 2.** Total assets and total assets by institution are one dependent function, called over two account lists by the net-worth orchestrator; the total equals the sum of the institution totals because the same function runs over the same accounts, and an invariant test pins it.

## The plan — phases, in order

Each task is a row on the working plan (`moneykeel_calc_plan_workplan_v01.xlsx`, rows 62 onward). Nothing in a later phase starts before the earlier phase's gate.

| Phase | What | Whose | Gate to the next phase |
|---|---|---|---|
| 0 · Rules | The ten design rules above, on the ledger and in this document. | Done 2026-09-13 | — |
| 1 · The map | **Delivered 2026-09-13** — `moneykeel_calc_spec_orchestrator-map_v01.xlsx`, built by `build-orchestrator-map.py` from the master, `moneykeel_figure_census.json` (written by `src/__tests__/figure_census.test.tsx`: 46 screens × 4 data states, every in-screen tab opened) and `moneykeel_orchestrator_questions.json` (the hand-kept questions). 22 questions, 164 of 164 rows assigned, 30 conflicts, census findings on every screen. One workbook, `moneykeel_calc_spec_orchestrator-map_v01.xlsx`. Tab "Map": one row per proposed orchestrator — the question, the screens that ask it, the figures it hands out by identifier, the functions in its closure by identifier (generated from the code), the inputs it assembles, the decisions it applies, STATUS, QUESTION FOR YOU, YOUR ANSWER. Tab "Census": the three completeness results as rows — figures rendered on a screen that no row claims (from the photograph run on every screen and every data state), functions inside no orchestrator's closure, orchestrators nobody names or imports. Tab "Conflicts": every grouping conflict, one row each by identifier, with a recommendation — the "two totals" cases, functions that would fall under two questions, two functions for one concept. | Claude | The founder approves the Map rows and rules on every Conflicts row, and names the pilot question. |
| 2 · The loop guards | Steps 1, 2, 3 and 5 of "Closing the loop": one producer per figure row; the forward hop read from screen imports; the reverse hop generated from the rows; the trace test. Ratchets start at today's numbers and only fall. | Claude | All four guards in the build chain, green. |
| 3 · The pilot | The pilot question through the six steps: row (his verdict) → photograph → door beside the old code → callers one at a time → old doors closed → reconcile. | Claude; the row's verdict his | The pilot's three census proofs and its ratchets read zero; photograph byte-identical; "file and code are both updated and they match 100%". |
| 4 · Will my money last | MK-PL-O-001 thePlan through the six steps; 16 files move behind the door. | Claude; the row's verdict his | Same gate as the pilot. |
| 5 · The rest | Every remaining question on the Map, by blast radius, one at a time, same gate each. | Claude; each row's verdict his | Every Map row TESTED. |
| 6 · The walls | Every ratchet at zero and turned into a wall; `Calculation Module code/engines/` empty and removed (the last home of the retired word); the trace test over all figure rows; the loop closed for every question. | Claude | The founder's VERIFIED marks. |

What can start today without a decision: phase 1, all of it — it moves no function and changes no number. What waits on the founder: the Map approval, the Conflicts rulings, the pilot question, and each orchestrator's row.

## Rule 11 — the figure is declared in the code, and the file is printed from it

**RULED 2026-09-14 ("go ahead and execute on step 1, 2, 3") and built the same day — see "What rule 11 looks like now" below.** Proposed 2026-09-14, after the founder asked whether the door as specified makes a figure a named
thing and generates its row. **As specified it does not.** The door hands out `plan.oddsItLasts` — a
property name, not an identifier — and step 1 still has the row typed by hand and approved before the
code is built. That leaves two records to keep in agreement, which is the very thing that drifted.

The proposal, three additions:

1. **A door declares its figures by identifier, beside the code that computes them.** One declaration
   per figure: the identifier, the label a person reads, the unit, the formula in plain English, the
   inputs, the decisions, and what it says when it cannot be computed.

        export const FIGURES = {
          'MK-PL-M-017': { label: 'Monthly check (today’s dollars)', unit: 'money',
                           answers: 'what Social Security pays each month at the claim age they set',
                           formula: 'benefit at full retirement age × the claim-age factor',
                           inputs: ['MK-XS-I-017 birth year', 'MK-PL-I-004 claim age', 'MK-PL-I-005 statement amount'],
                           decisions: ['MK-PL-D-002 factors from the published schedule'],
                           refusal: 'Add your statement amount to see this.' },
        } as const;

2. **A screen prints a figure only from the door, by identifier.** No arithmetic on the screen, so the
   place that prints carries the identifier.

3. **The builder generates the master's figure rows from those declarations**, and the four hand-written
   lists in `build-moneykeel-master.py` (about 140 typed lines, the origin of every mismatch) are deleted.

A guard then fails the build on any dollar or percent printed from a value that is not a declared
figure, starting at today's count and only falling.

**What it changes for the founder.** He still approves the row before the code is built — step 1 is
unchanged. After approval the row lives in the code, and the master file is a printout of it. His
file-and-code rule stops being something to maintain and becomes something that cannot be false.

### What rule 11 looks like now, 2026-09-14

| Step | Built |
|---|---|
| 1 · A door declares its figures | `MoneyKeel/functions/_figure-spec.ts` says what a declaration holds; `figures.ts` merges every door's and refuses two doors claiming one identifier. **17 figures declared**: MK-CF-M-030…036, 045, 046 by MK-CF-O-001 basePay, and MK-CF-M-037…044 by MK-CF-O-004 incomeSummary. |
| 2 · A screen prints by identifier | `src/components/figure.ts` — `fig` (the number), `figPer` (the number and its period, worded by the canon), `figSpoken` (the label and the number, as a screen reader says it). Your base pay and Your income print every figure through it; **zero** raw money calls remain on either. The photograph is byte-identical, so no number and no word on either screen changed. |
| 3 · The file is printed from the code | The builder reads `moneykeel_figures.json` (written from the declarations by a test, so it cannot rot) and prints those rows on the cashflow tab: formula, inputs, decisions, refusal, grain, period and the door's identifier, all from the code. The master went from 164 figure rows to **181**, and **17 of them are no longer typed anywhere**. |
| The guard | `guard_figures_declared.test.ts` froze the 673 places in 57 files that still format a number directly. A file may only print fewer and no new file may appear; the two screens above are already at zero. |

Two figures the base-pay screen used to work out itself are now the door's (rule 5), and the household
figure is the **sum of the earners'** rather than a second subtraction, so a total and its parts cannot
disagree — the founder's total-assets example, settled in code.


## Not yet decided

- Which small question is the pilot — proposed: Social Security timing (4 callers, 8 functions, a real money decision, statutory figures already registered). Decided with the Map.

## The word this document does not use

Earlier drafts said "engine". The identifier standard retired that word on 2026-08-22 — what produces a figure is a **function**, and the one that answers a whole question is an **orchestrator function** — so this document says *question* for the thing that gets one door, and *orchestrator* for the door. The 2026-08-22 draft is kept as `MoneyKeel/archive/2026-09-13_moneykeel_calc_spec_engine-architecture-one-door_v01.md`.
