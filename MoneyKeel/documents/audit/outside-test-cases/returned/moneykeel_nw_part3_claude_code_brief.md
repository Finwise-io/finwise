# Claude Code execution brief — MoneyKeel Net Worth audit, Part 3

## Scope
Run the 150 independent cases in `moneykeel_nw_part3_audit_and_claude_brief.json` against the current implementation. It covers 30 function cards from `nw module final — part 3` (F-063–F-073, F-084, F-090–F-094, F-103–F-116). The package is an independent oracle, not a report of code execution: no implementation repository was supplied to this auditor.

## Required protocol
1. Read the main audit brief and inspect each real function and its dependencies before running tests. Map conceptual fields in the cases to actual TypeScript input schemas without changing numeric values or the intended assertion.
2. Run every case against the current implementation with fixed dates/times. Capture actual output, compare with expected, and report PASS/FAIL/BLOCKED. If mapping is impossible or a specification is genuinely ambiguous, report the exact case ID and reason under BLOCKED; do not silently skip it.
3. For outputs that depend on helpers (`bondRateSensitivity`, `priceAtYield`, `accruedInterestCaveat`, `rowOf`, `categoryEarnings`), exercise the real helper chain. Do not substitute a generic finance formula for the source's annual-approximation/date conventions.
4. Preserve null/absent versus numeric zero. Missing rates, balances, or returns are not zero unless the card explicitly says so. A positive holding with unknown gain makes `pricedGainOf` return null for the whole total.
5. Verify classification precedence: user answer; asked-but-unanswered → Unclassified; ticker/name evidence (with money-market funds as Stocks / Funds and CD/T-bill as Bonds & CDs); stored class/fallback. Institution name must not decide CD status.
6. Verify reconciliation invariants: known class-split amounts add to the account's balance when the split is complete; ledger rows and group totals agree; bond summary interest treats matured bonds as $0 while unknown rates remain “not entered”; alternatives remainder > half a cent remains unclassified and gets no rate.
7. Date-sensitive tests must use the supplied fixed `now` and calendar-day semantics. Test month-end clamping and prevent timezone shifts.
8. For mortgage/property mapping, do not guess when more than one assignment is possible. Rent with no property identifier is excluded. Confirm the primary-home fallback only applies under the card's stated conditions.
9. Do not edit production behavior to fit the cases. If a case reveals an apparent contradiction in the card or main brief, record it separately as SPECIFICATION_CONFLICT and show both source statements.
10. Return a machine-readable results file with case ID, function, expected, actual, PASS/FAIL/BLOCKED, failure reason, regression-test path/line, and any unmappable inputs. Include a summary of unique defects grouped by root cause and list tests not run.

## Priorities
- **P0:** unknown-is-not-zero and unknown-gain propagation (`sumWhere`, `pricedGainOf`, `ledgerGroups`, `yearlyInterest`).
- **P0:** bond/CD maturity, yield, accrued interest and sensitivity interactions.
- **P0:** `holdingClassOf`, CD detection and alternative remainder classification.
- **P1:** `categoryEarnings`, `windowStartKey`, investment history dates, `closedWith`, and `whyNoReturn` integration.
- **P1:** mortgage/property matching and live-rent filtering.

## Deliverable
Run the full suite and return the results plus the exact command used. Do not call the audit “passed” unless all applicable cases ran and passed. This audit does not replace the global DEC-2440 invariant that every investment return is time-weighted; include integration coverage where these helpers feed the return engine.
