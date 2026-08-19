# Founder requirements — use-case decomposition (verbatim, 2026-08-19)

Standing context: "You are a Certified Financial Advisor, and building this for your client."
"Organize everything across all tabs in the same way."
"For each metric — list all possible use cases, and how you will calculate that metric for that
use, instead of bundling everything in one."

## Unrealized gain — five cases the founder named, verbatim

"Unrealized Gain = sum of (quantity * (today price - cost)). Now various use cases are
(1) cost basis not available,
(2) only average cost basis available not by lot,
(3) quantity not available,
(4) If showing on performance page, and duration is 3 months — do you show unrealized gain for the
duration of 3 months or total purchase period. If Unrealized gain needed to calculated for only
3 days or 3 weeks or 3 months, how you determine cost basis for this calculation.
(5) if stock / fund / cd / bond is generating dividend — and dividend is marked as re-investment
versus cash. how do you calculate income for holding, and unrealized gain?"

Also standing (same date): threaded comments K6 (never circular; calculated vs live EMV with an
Unknown gap the user categorises), K12 (realized gain must respect the selected period), G6/G13
(realized gain on account detail + performance pages; harvest-losses insight in the change-driver
box), and the 54-item audit in audits/cross-tab-consistency-audit-2026-08-19.md as mandatory input.

## Founder clarification (same day) — the five cases are a TYPE, required for ALL metrics

"My feedback on use cases was to tell you that was ONE SET of use cases, and you need to make sure
to include this type of use cases for all metrics."

Therefore every metric is decomposed on TWO axes, and the workflow must fill the grid:

**Axis 1 — PURPOSE** (what the person is asking): the use cases in tab 9 "Comprehensive Metrics".

**Axis 2 — DATA CONDITION** (what state the inputs are in), applied to every purpose:
  A. An input MISSING entirely → the honest refusal, what the screen says, how the user supplies it
  B. An input in DEGRADED form (average not lots · totals not per-share · month-end not daily ·
     stated not measured) → what is still honest, what must be suppressed
  C. An input in a DIFFERENT SHAPE per road (file vs connection vs manual · signed vs unsigned ·
     per-share vs per-contract)
  D. TIME-BOUNDED variant (3 days / 3 weeks / 3 months) → which baseline replaces since-inception,
     what history it needs, refusal when the window is not covered
  E. RELATED-EVENT interactions → reinvestment, transfers in/out, splits, return of capital, fees,
     corrections/restatements
  F. ACCOUNT-TYPE and confidence variant → taxable vs IRA/Roth · stale vs fresh · measured vs
     estimated, per the CFA stance

A metric row is complete only when every purpose × condition cell holds either a calculation or a
named refusal. "Not applicable" must be argued, not assumed.
