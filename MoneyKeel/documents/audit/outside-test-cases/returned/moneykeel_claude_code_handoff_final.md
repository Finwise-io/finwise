# MoneyKeel Net Worth module — independent audit handoff

## Purpose and status

This package contains an independent, source-based formula audit and **505 expected test cases** for the 101 cards in the four supplied card files. It is designed for Claude Code to map to the implementation and execute directly against the code.

**Important:** no application implementation was provided to the auditor, so no runtime tests have been run here. `formula_checks` are independent reviews of the described formulas; `cases[].expected` is the expected result; `cases[].formula_gives` records a known or suspected result of the formula as written when it differs from the expected result. Do not treat these files as implementation pass/fail results.

## Files

- `moneykeel_nw_part1_audit.json` — 26 cards, 130 cases, 67 owner-rule checks, 71 screen-figure checks.
- `moneykeel_nw_part2_audit.json` — 26 cards, 130 cases.
- `moneykeel_nw_part3_audit.json` — 26 cards, 130 cases.
- `moneykeel_nw_part4_audit.json` — 23 cards, 115 cases.

Each card has exactly five cases: two `easy`, two `complex`, and one `edge`. Each batch JSON follows the requested top-level audit structure and is marked `ready_to_close: false` until execution and open questions are resolved.

## Auditor’s overall findings

Formula-check totals across the 101 cards:

- **47 RIGHT** — formula description aligns with the applicable written rule.
- **8 WRONG** — a concrete contradiction with an owner decision or required financial calculation.
- **45 INCOMPLETE** — ambiguity, missing-input handling, cross-function inconsistency, or a required disclosure/validation behavior is not adequately specified.
- **1 CANNOT TELL** — `MK-NW-O-007` delegates to `lookBack`, whose formula/output contract is not supplied in that card; its cases can test pass-through integrity only.

### Highest-priority findings

1. **`MK-NW-F-015 totalAssets` — WRONG.** Missing balances are counted as zero. Owner decision DEC-2747f/DEC-3279e requires omitting unknown-valued accounts from the numeric total and naming them in an amber missing-value warning.
2. **`MK-NW-F-084 categoryEarnings` — WRONG.** Category return is weighted by current market value. The owner rule requires time-weighted returns; where aggregate holding returns are used, beginning values—not current values—are the relevant weights when those inputs are valid.
3. **`MK-NW-F-053 correctClassOf` — WRONG.** Name evidence is checked before maturity date and does not clearly preserve the owner’s confirmed class. A maturity-dated instrument must be Bonds & CDs, and property/place names are not class evidence.
4. **`MK-NW-F-054 reclassifyAccounts` — WRONG.** Its “other class becomes Stocks / Funds” branch can misclassify a holding such as Gold; it must preserve user-confirmed holding classes and leave unsupported holdings Unclassified.
5. **`MK-NW-F-107 propertyUses` and `MK-NW-F-117 propertyUseMap` — WRONG.** Both can preserve a stored `rental` classification when no Income-screen rent entry names the property. This conflicts with DEC-1926/DEC-3035p. F-117 also says “first entered (last in the list),” which needs an explicit ordering contract.
6. **`MK-NW-F-112 yearlyInterest` — WRONG.** Missing coupon rate returns nothing, while DEC-2748c says annual interest is counted as $0 and the app discloses that the rate was not entered. If face value is absent but rate is known, use market value × rate as specified by the owner.
7. **`MK-NW-F-061 bondSummary` — WRONG.** Total face value treats an unentered face value as zero; the face total must remain visibly incomplete and identify bonds whose face value was not entered.
8. **`MK-NW-F-106 mortgagesByProperty` — INCOMPLETE.** The function can return unmatched/duplicate mortgages. Keep diagnostic information if useful, but treat those states as validation errors because the owner requires every mortgage to match a property and mortgage count not to exceed property count.
9. **`MK-NW-F-035 blendedVolatility` — INCOMPLETE.** A weighted average of individual volatilities is not generally portfolio volatility without covariance/correlation. Either label the output as a weighted-average estimate or compute actual portfolio volatility with correlation data.
10. **`MK-NW-F-013 realEstateUseOf` — INCOMPLETE.** Standalone and household property-use branches may disagree when stored use says `rental` but no rent entry names the property.
11. **`MK-NW-F-024 accountLastFour` — INCOMPLETE.** Clarify whether an unusable mask falls back to the account number or returns null.
12. **`MK-NW-F-060 approxYTM` — INCOMPLETE.** The face-value gate can block the CD branch even though the formula says a CD’s YTM is its stated rate. Owner must clarify whether face value is required for CD YTM.

### Screen checks

Part 1 contains 71 screen-figure checks: 57 PASS and 14 FAIL based on the supplied screen register. Highest-priority failures include missing balances displayed as $0 or omitted without a warning (`M-004`, `M-008`, `M-014`, `M-016`, `M-017`), annual interest withheld instead of shown as $0 with a disclosure (`M-024`), “CURRENT PRICE · LIVE” when the screen is showing amount paid instead (`M-029`), incorrect empty realized-gain wording (`M-035`), missing itemization represented as `$0` (`M-039`), face value inferred from market value (`M-042`, `M-055`), and performance walk figures that may conflict with a back-solved beginning (`PF-M-013`, `PF-M-014`). See `screen_checks` for the individual figure IDs, tenets, and rationale.

## Instructions for Claude Code

1. Read the corresponding card part and its audit JSON together. Use the JSON as the independent oracle; do not use the implementation’s output to rewrite `expected`.
2. Map each case’s `inputs` into the real function signature or a narrow adapter. Keep the adapter thin and document any mapping assumptions.
3. Run all 505 cases against the implementation. Record, at minimum, `actual`, `status` (`PASS`, `FAIL`, or `BLOCKED`), and a concise `difference` for every case. Add a reproducible test name/path or log reference.
4. Compare numeric results at full precision; test displayed rounding/formatting separately. Use a tolerance only where the function is intentionally floating-point or iterative (e.g. YTM root solving), and state that tolerance explicitly. Do not round intermediate calculations unless the source formula says to.
5. For each `formula_gives` case, report whether the actual implementation matches the described formula output, the independent expected result, both, or neither.
6. Treat `RULE UNCLEAR`/`CANNOT TELL` expectations as an owner decision or dependency question, not as a license to guess. Report the exact unresolved question and avoid silently choosing whichever behavior the implementation currently has.
7. Run the Part 1 `rules_held` and `screen_checks` work alongside the first batch, as the source brief requires. Check rendered copy and empty/missing states, not only numeric return values.
8. After fixes, rerun all 505 tests as regression tests and update `ready_to_close` only when failures are fixed, unresolved owner decisions are answered, and screen checks are verified.

## 2026 401(k) limit reference

The contribution-limit cases use the 2026 standard elective-deferral limit of $24,500, an $8,000 catch-up for most participants aged 50+, and the $11,250 catch-up for ages 60–63, yielding $35,750 for that age tier. The IRS confirms these amounts in its [401(k) and profit-sharing plan contribution limits](https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits) page. The test cases check the stated monthly cap and match calculation; they do not replace plan-specific eligibility checks.

## Closure criteria

The audit is not closed until Claude Code has executed the test cases, compared actual outputs with the independent expected results, reported reproducible failures, and rerun the full suite after fixes. No runtime pass/fail result is claimed in this handoff.
