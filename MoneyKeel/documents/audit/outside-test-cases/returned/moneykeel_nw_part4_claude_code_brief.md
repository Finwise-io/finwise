# Claude Code execution brief — MoneyKeel Net Worth audit, Part 4

## Scope
Run all 145 cases in `moneykeel_nw_part4_audit_and_claude_brief.json`: 29 cards, comprising 21 function cards (`MK-NW-F-117`–`MK-NW-F-137`) and 8 orchestrators (`MK-NW-O-001`–`MK-NW-O-008`). This is an independently authored oracle based on the card file and master brief. It is not a runtime test report; the repository was not supplied to the auditor.

## Required protocol
1. Read the master audit brief and inspect each named function, its dependencies, and relevant screens. Map conceptual fixture keys to the real TypeScript interfaces without changing case values or expected behavior.
2. Execute every case with fixed `now`/date fixtures. Capture expected, actual, status (`PASS`, `FAIL`, or `BLOCKED`), diff, and regression-test path/line. Preserve `null`/missing versus numeric zero.
3. For the blocked accrued-interest case on `MK-NW-F-119`, inspect the implementation’s coupon-year/day-count convention and document the source-backed exact expected amount before running; do not guess the denominator.
4. For orchestrators, test the full helper chain and assert totals/rows reconcile. A test that only checks “returns an object” is insufficient.
5. Do not edit production behavior to make tests pass. If the card and master brief conflict, report `SPECIFICATION_CONFLICT` with both source statements and do not silently choose one.
6. Do not mark `PASS` unless the expected assertion was actually run. If a conceptual fixture cannot be mapped without changing its meaning, report `BLOCKED` and explain why.

## P0 / critical priorities
- `MK-NW-O-003` and `MK-NW-O-008`: time-weighted return, unknown gain refusal, no missing-data substitution, movement dates/amounts, same-day flow semantics, measured account inclusion and ending-value consistency. DEC-2440 requires every return to be time-weighted.
- `MK-NW-O-004`: debt minimums counted once; exclude logged debt payments and mortgage budget duplicates; live rent is net rent only; unknown rent produces qualified months; no runway when rent covers all monthly essentials.
- `MK-NW-F-117` / `MK-NW-O-004`: clarify `rentals === null` (unavailable) versus `rentals: []` (known none). DEC-1926 says rental only when a live Income-screen entry names the property, while F-117 allows stored rental fallback when entries were not handed in. Report a spec conflict if the intended contract cannot be established.

## Other high-priority checks
- Bond/CD: maturity day boundaries, missing face/rate, coupon based on face, current yield vs YTM price basis, accrued interest, average yield exclusion reasons, bank CD no sensitivity, broker CD priced like a bond. Detail orchestrator maturity (`today or earlier`) is intentionally different from `isPastMaturity` (`strictly earlier`) and should be explicitly covered.
- Classification: money-market funds are Stocks / Funds; CD/T-bill evidence is Bonds & CDs; account institution name must not determine CD status; tags round-trip only for supported classes.
- Unknown values: `heldValueOf` and `gainOfRow` must not convert unknown positive holdings to zero. `cannotWorkBackSentence` must deduplicate names and use singular/plural grammar.
- Alternatives: blended rate and growth use classified value only; disclose unclassified remainder and ensure rows reconcile.
- Holding detail: FIFO sale lots, option multiplier, missing-price semantics, exact one-year short/long-term boundary, ticker-matched income and realised gains.
- Account detail: no income figure when there are no transactions; inbound transfer display differs from cash-effect display; non-linked accounts have no inside-class breakdown.

## Output format
Produce a machine-readable result for every case with `card_id`, `case_id`, `case_title`, `function`, `status`, `expected`, `actual`, `diff`, `failure_reason`, `regression_test_path`, `notes`, and `could_not_test`. Provide a card-level rollup and an executive summary grouping repeated failures by root cause. List every blocked/unrun case explicitly.

## Invariants
- `assets - debts = netWorth`.
- Cash + Investments + Property reconciles to known asset value; class rows reconcile without counting linked-account cash twice.
- Bond coupon income uses face value when available; current yield and YTM use their distinct prescribed price bases.
- Debt minimums are included once; rent only offsets the emergency-fund draw when validly mapped.
- Alternatives growth is based only on classified alternative value.
- Performance returns are time-weighted; never substitute Dietz or zero for an unmeasurable return.

Do not report the audit as passed until every runnable case is executed, blocked cases are explained, and critical spec conflicts are resolved.
