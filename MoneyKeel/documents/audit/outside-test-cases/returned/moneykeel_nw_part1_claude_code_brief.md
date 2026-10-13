# Claude Code execution brief — MoneyKeel Net Worth audit, Part 1

## Scope
Run the 150 independent hand-worked cases in `moneykeel_nw_part1_audit_and_claude_brief.json` against the current implementation. The JSON contains 30 formula judgments, five cases per card, 93 decision-log checks, and 71 screen-register checks. This is an independent oracle, not a report of code execution: no repository implementation was supplied to this auditor.

## Required run protocol
1. Map each case's plain-language `inputs` to the real function input schema. Do not change the case values or expected answers to match current behavior. If mapping is impossible, report the exact case ID and why under `could_not_test`; do not silently skip it.
2. Run each case against the current function, capture actual output, compare to `expected`, and report PASS/FAIL with the smallest failing assertion. Preserve null/absent versus numeric zero distinctions.
3. For each `formula_checks` entry with verdict `WRONG` or `INCOMPLETE`, add a regression test demonstrating the described defect and retain the expected answer from the audit JSON.
4. Do not treat `rules_held` or `screen_checks` as implementation test results. `CANNOT TELL` means inspect the relevant governing implementation outside the Part 1 card subset. `screen_checks` judge the supplied register specification only; validate each figure against the actual screen/orchestrator implementation.
5. Prioritize high-severity findings: `MK-NW-F-015 totalAssets` (unknown balance incorrectly counted as zero), `MK-NW-F-027 accountClassBreakdown` (reconciliation/unpriced class branches), and `MK-NW-F-029 assetAllocation` (unknown-balance completeness).
6. Check invariant across all applicable tests: `cashTotal + investmentsTotal = investableAssets`; the seven allocation classes reconcile to the known account values; unpriced holdings are never misclassified as cash; no unknown value is presented as an entered zero.
7. For `MK-NW-F-004 portfolioActualReturn`, respect the owner’s explicit kept rule DEC-2484o / DEC-3035b: aggregate by reconstructed beginning retirement-allocated amounts. Do not replace it with current-value weighting. The return series/orchestrator time-weighting requirement remains applicable to performance returns.
8. Return a machine-readable result with case ID, function, expected, actual, pass/fail, failure reason, regression-test path, and any unmappable inputs. Include an executive summary of unique defects, grouping repeated failures by root cause.

## Audit cautions
- The hand-worked cases use conceptual field names, as required by the owner; map them to actual schema without altering numeric values.
- The `accountClassBreakdown` negative-delta case deliberately tests the tolerance boundary. For a $10,000 balance, 1% is $100, so a $50 discrepancy is within tolerance and is removed from the largest class.
- This audit package does not claim the code was run. Claude Code must run these cases directly against the repository.
