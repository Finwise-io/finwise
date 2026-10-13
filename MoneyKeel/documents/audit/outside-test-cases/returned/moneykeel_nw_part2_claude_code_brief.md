# Claude Code execution brief — MoneyKeel Net Worth Part 2

**Batch:** `nw module final — part 2`

## Scope and caution

Run the 150 cases in `moneykeel_nw_part2_audit_and_claude_brief.json` against the actual repository implementations for the 30 functions represented by cards F-031–F-041 and F-044–F-062. Use the function names/signatures in the card file. Do **not** assume `calcF031` naming. The JSON includes specification review notes, test inputs, hand-worked expectations, and conditional cases that need source-level resolution.

The provided audit source is formula descriptions and type declarations, not the implementation code. Treat this as a test plan, not as proof that implementation defects have been reproduced.

## Required work

1. Read `moneykeel_audit_module_nw_for-openai_v02(1).md` and `moneykeel_audit_module_nw_for-openai_v02_cards-part-2-of-4(1).md`.
2. Locate each actual function and any dependent helpers. Map every card to the actual file and symbol. If a function is absent or has a different name/signature, report that rather than guessing.
3. Resolve conditional test notes from source/types, especially volatility defaults, exact asset-kind IDs, history sentence wording, `priceAtYield` coupon timing/bracketing, and helper behavior for missing face/rate. Do not silently change the expected business rule.
4. Implement/run the 150 tests in the JSON as tests only; do not modify production code. Use fixed dates for date-sensitive tests.
5. Report each case as **PASS**, **FAIL**, or **BLOCKED** with actual output, expected output, assertion method, source file and line/function. Distinguish numeric floating-point tolerance from exact decimal-cent checks.
6. For a failure, explain the mismatch and cite the controlling rule/card. Do not classify a test as a code defect until actual execution reproduces it.
7. Add integration checks for `getAssetsState`: absent document, empty list, uid isolation, and storage error behavior. For `buildItemizedAccounts`, verify all-or-nothing refusal when any holding value is missing and that original data remains unchanged. For `reclassifyAccounts`, verify confirmed accounts and user-classed/pending holdings remain untouched and the operation is idempotent.
8. Return an execution summary: total PASS/FAIL/BLOCKED, failures by severity, unresolved assumptions, files changed (should be none), and exact command used to run tests.

## High-priority assertions

- **Unknown is not zero:** missing balances, face values, rates, holding values, sync timestamps, and history start dates must not be represented as known zeros or fabricated dates. Apply explicit aggregate exceptions only where the spec says so, and ensure missing items are separately disclosed.
- **Benchmark override `0` is present:** never use truthiness to decide whether an override exists. Exact kind matching is case-sensitive per the card.
- **Earmark weights:** `blendedReturn` and `blendedVolatility` use retirement-earmarked amounts; zero weight contributes nothing; zero total weight returns `null`.
- **Itemization:** use exact decimal arithmetic for cents; equal totals produce exactly zero remainder; any missing holding value blocks committing new accounts; never infer bond face value from market value.
- **Bond/CD distinction:** institution name alone does not make an account a CD. Bank CDs return their stated rate for YTM; broker CDs are priced like bonds. Accrued interest is excluded from current yield and included in YTM price as entered or estimated.
- **Dates:** `yearsToMaturity` uses calendar dates, not time of day; invalid dates do not roll into a later date; matured bonds have no YTM and no ongoing coupon income.
- **History:** user-entered history date outranks synced date; invalid/future dates produce the exact refusal and no invented duration.
- **Class correction:** explicit user class and confirmation win; money-market funds are Stocks / Funds; CD classification never comes from institution name; leaving cash must not silently assign taxable treatment.

## Output

Produce a machine-readable test run (JSON or JUnit) and a concise markdown summary. Keep this audit plan unchanged and include any source-driven clarifications in the run report. Do not claim the audit passed unless the actual repository tests ran successfully.
