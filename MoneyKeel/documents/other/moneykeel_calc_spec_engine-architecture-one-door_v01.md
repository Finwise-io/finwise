# Engine architecture — one door per engine

Proposal, 2026-08-22. **Nothing has been built or changed.** This describes what is proposed and
how it would be executed, for the founder's decision.

Named by `moneykeel_naming_spec_file-and-folder-naming_v01.md`. Serves the objectives in
`moneykeel_calc_spec_objectives-and-verification_v01.md` — objective 1 (one source of truth),
objective 3 (trace in a minute) and objective 4 (screen to engine to formula to inputs to
decisions).

## The problem, measured

Renaming, redesigning or breaking the "will it last" engine today means changing **65 places**:

| Where | How many |
|---|---|
| App files — screens and components | 17 |
| Tests and probes | 23 |
| Rows in the master workbook | 25 |
| **Total** | **65** |

Across the code files there are **150 call sites**, because the engine does not expose one thing.
It exposes nine: `simulate` (used in 22 files), `selectWillItLast` (16), `RetirementInputs` (14),
`willItLastInputs` (9), `projectNestEgg` (8), `displayOdds` (6), `capitalNeeded` (3), `volOf` (2),
`solveRetireAge` (2).

The retirement engine is called from screens that are not about retirement: Net worth, Cash flow,
Budget, Big costs, Home, the mortgage comparison, the spend-more control, and setup. **Each one
assembles its own inputs.**

### What that already costs, in the code as it stands

Cash flow, Budget, Social Security timing and Goals all pass the person's planned big costs into
the engine. Net worth does not:

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

1. **One entry point.** `MoneyKeel/engines/retirement/the-plan.ts` is the only thing a screen may
   call for this family.
2. **One place the inputs are assembled** — big costs, inflation, employment, Social Security —
   so no screen can quietly leave one out.
3. **A guard that fails the build** if any screen reaches past the door to the inner parts. Without
   it the old habit returns within a month.

## What it changes

| | Today | With one door |
|---|---|---|
| Rename or redesign this engine | 65 places, 150 call sites | 1 code file + 1 row in the master file |
| Two screens disagreeing | Possible, and visible in the code today | Impossible — there is one answer |
| Tracing a wrong number | Which of 17 callers? | The door, then its row |

The door carries the identifier. That is what makes the one-minute trace mechanical rather than a
search.

## How it would be executed — six steps per engine

1. **The row before the code.** The engine's row in the master file first: what it answers, the
   formula in plain English, its inputs, the decisions it applies, its identifier, and the exact
   list of figures the door hands out. **The founder's verdict on that row is the gate.**
2. **Photograph today's answers.** For real profiles and test ones, record every figure the current
   screens show from this engine. This is the "before" record that proves the door changed nothing
   it should not have.
3. **Build the door beside the old code, not instead of it.** One entry point, inputs assembled
   once, rungs 1 to 3 from the start.
4. **Move the callers one at a time, suite green after each**, each compared against the
   photograph. Where a number changes, work stops on that caller — flagged, analysed, brought to
   the founder, because a difference has no winner.
5. **Close the old doors.** Delete or seal the old entry points and add the guard.
6. **Reconcile and say the sentence.** The row's worked example runs through the real engine, the
   identifier joins them, then: *file and code are both updated and they match 100%.*

## Order

Prove the machinery on one small engine first — door, photograph, guard, row — so the pattern is
argued once, cheaply. Then "will it last" second: at 65 places it is the largest single piece of
work in the app and the one carrying the founder's money decisions. Then the rest by blast radius.

This **is** the careful file transfer: each engine moves into `MoneyKeel/` exactly once,
deliberately, with its row and its identifier — never dragged across in bulk.

## What the founder does

- Approves the row before anything is built, per engine.
- Signs off any number that genuinely changes.

Everything else is mine.

## Not yet decided

- Which small engine is the pilot.
- Whether the door hands out figures only, or also the walk behind them.
- What the doors are called, which waits on the identifier nomenclature.
