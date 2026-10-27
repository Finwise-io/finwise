# MoneyKeel CashFlow — Claude Code handoff

**Status: not ready to close.** The independent review covers all 219 calculation cards and all 19 parts of the supplied October 24, 2026 package.

| Formula verdict | Cards |
|---|---:|
| RIGHT | 114 |
| WRONG | 26 |
| INCOMPLETE | 75 |
| CANNOT TELL | 4 |

These are judgments of the **written specifications**, not observed failures of the running app. No repository code, existing tests, or live app results were used to derive the expected answers. Supplied screen-register `worked` values were excluded. Owner decisions and approved drawing households were used as authorized specifications; their inconsistencies are recorded.

The package contains 1,095 dated case fixtures: two easy, two complex, and one edge case per card. These include numerical answers, refusals, missing-contract witnesses, and relational or composition checks. They are **not 1,095 completed application tests**. Some need an adapter or a missing public contract before execution. No simulation probabilities or missing literal label/icon mappings were invented.

The review also records all 175 distinct decisions in the parts where they apply, all 67 figures against all eight tenets (536 checks), six published-source topics, and seven cross-card checks.

## What to read

1. This brief and `README.md`.
2. `audit_results/MoneyKeel_CashFlow_Formula_Index.md` for every card’s verdict and reason.
3. `audit_results/MoneyKeel_CashFlow_Audit_Part_01.json` through `MoneyKeel_CashFlow_Audit_Part_19.json`. Parts 1–17 contain formulas and cases; parts 18–19 contain screen checks.
4. `audit_results/MoneyKeel_CashFlow_Source_Checks.json` for primary sources, statutory checks, and 48 ordinary-tax band-top/one-dollar-above witnesses.
5. `audit_results/MoneyKeel_CashFlow_Audit_Validation.json` and `MoneyKeel_CashFlow_Output_QA.json` for coverage, arithmetic checks, and limitations.
6. The owner’s decisions and original files under `source_packet/` before making changes. Original input files are unchanged; `source_manifest.json` records their hashes.

`build_audit.py` and `verify_outputs.py` are independent arithmetic and serialization aids written for this review. They contain no MoneyKeel app code or existing app tests. Their presence does not make the supplied expectations automatically correct: review the working, input domain, and governing decision.

## Highest-priority implementation checks

IDs below have the prefix `MK-CF-`. Exact IDs and case references are in the JSON files.

| IDs | Finding and acceptance target |
|---|---|
| F-233, F-234, F-188, F-180, F-145, F-230 | Align wages, entered take-home, and employee contributions to the same paid months. Six months of work cannot automatically become twelve months of take-home or contributions. |
| F-210 | A salary source must return that earner’s annual salary, rather than the household salary repeated on each source. |
| F-049, F-048, F-020 | Legacy readers disagree with the current household path: single-filer monthly tax, omitted state tax, omitted 401(k)s, reinvested money counted as cash, or debt omitted from outflow. Establish whether each ID is live, retired, or guarded. |
| O-005, F-056, F-055 | Contribution room needs confirmed year-to-date contributions, combined IRA usage, actual excess contributions, coverage, and eligible months. A monthly plan × 12 is not money already contributed. |
| F-126, F-229 | Add the zero-return annuity branch to the written contract: $500 saved monthly for 12 months grows to $6,000 at 0%; with a $10,000 opening pot, the ending pot is $16,000. |
| F-146 | A warning in an early month must not hide an impossible take-home in a later month. Check all months for failures before returning a warning. |
| F-186 | Calculated legacy conversion must solve gross − contributions − tax(gross − contributions) = entered net. The described calculated branch omits the contributions. |
| F-084, O-007 | Separate retirement cash received from taxable income. Select the requested tax year, include taxable reinvested distributions, and retain cents until display. |
| F-222, F-133, F-135 | Preserve unknown investment cash. A property’s market value is not immediately spendable settlement cash. Check caller-domain restrictions before changing a helper. |
| F-014, F-013, F-019, F-008 | Use the dated plan for a selected month. Resolve missing bill months and verify that storing an annual-average figure does not cause the annual bill to be added twice. |
| F-183, F-119, F-157, F-150 | Exclude future payouts from trailing income. Match debt payments by unique identity: two debts called “Loan” must not each receive the same $250 expense. |
| F-063, F-071, F-018, F-066 | Preserve unknown dates. Distinguish actual tax-year vesting from an illustrative annual run-rate. |
| F-034, F-125, F-106 | An iteration cap does not prove “never,” and bisection needs a verified feasible/infeasible bracket. Use the requested chance floor. |
| F-031, F-033, F-010 | Undefined ratios must not appear as zero with a favorable status. Separate internal sentinels from valid financial answers. |

A finding can concern numerical arithmetic, a dependency, an unclear contract, or a caller’s permitted input domain. Do not blindly rewrite a correctly guarded helper because its general description is incomplete.

## Worked acceptance examples

**Part-year pay.** A worker earns $60,000.30 across six paid months, contributes $501.13 per paid month, and enters $3,799.17 monthly take-home. Annual contributions are $3,006.78; annual entered take-home is $22,795.02. The implied share taken out beyond contributions is:

`(60000.30 − 3006.78 − 22795.02) / 60000.30`

Applying that share to $10,000.05 gross in a paid month and subtracting $501.13 must still leave $3,799.17. The written F-233 subtracts twelve months of entered take-home instead, leading to $7,598.34 in a paid month.

**Contribution room.** On January 1, an eligible 50-year-old with confirmed $0 contributed has $32,500 of 2026 employee 401(k) room. A future $1,000/month plan does not establish $12,000 already contributed. An eligible 60-year-old’s ceiling is $35,750; a recorded $40,000 contribution must show a $4,250 excess instead of capping “used” at the ceiling.

**Midyear Medicare.** An otherwise eligible 65-year-old with self-only coverage who enrolls July 1 has six eligible months. The ordinary prorated 2026 HSA ceiling is `(4400 + 1000) × 6 / 12 = 2700`. Current enrollment does not erase the eligible first six months. Apply retroactive coverage and other eligibility rules explicitly.

**Dated budget.** $2,000 recurring monthly expenses plus $1,200 insurance due in December means $2,000 in September, $3,200 in December, and $25,200 over the year. $2,100 is the annual average, rather than either selected month’s expenses.

**Warning before failure.** January gross $10,000.17 − contributions $1,000.13 − take-home $2,000.19 leaves $6,999.85 and triggers a warning. February gross $3,000.17 − contributions $500.13 − take-home $2,800.19 is −$300.15 and fails. The whole check must fail even when January is processed first.

**Finite capital gain.** Single-filer ordinary taxable income of $48,111.17 leaves $1,338.83 below the $49,450 zero-rate top. Of a $3,311.43 gain, the remaining $1,972.60 is taxed at 15%, giving $295.89. A baseline 0% lookup cannot price the whole gain. F-104 may remain a clearly labeled marginal lookup if callers do not misuse it as a finite-gain tax calculation.

**Iteration limits.** $60,100 at 0% with $100 monthly payments clears in 601 months; $120,100 clears in 1,201 months. A 600- or 1,200-month search cap must return “horizon exhausted” with the remaining balance, rather than a false claim of “never.”

## Approved households and later corrections

The approved This month household reconciles exactly:

- Planned: `5000 − 2000 − 250 − 2000 − 200 − 200 = 350`.
- Actual: `5000 − 2000 − 0 − 500 − 1200 − 200 − 200 = 900`.
- Expenses drawing: `$500 manual + $1,200 imported + $200 HELOC + $200 card = $2,100`, when those debt payments are counted as expenses.

DEC-8152 corrects older $750/$1,300 surplus prose. Preserve the corrected $350/$900 household. A linked card whose purchases are already captured has a separate expenditure-classification rule; keep expense measurement and bank cash movement explicit.

The older Base pay drawing states $11,500 gross − $1,058 tax − $1,200 contributions = $9,242. For its $138,000 joint wages and $14,400 annual contributions, the current 2026 standard-deduction model gives $91,400 taxable income and $10,472 annual federal tax: $872.666666… tax and $9,427.333333… take-home per month. DEC-1625 already names the corrected $873 tax/$9,427 take-home sentence. Retain the drawing with its named correction rather than adjusting tax to force $1,058.

The Income summary drawing gives `$5,000 + $3,300 + ($1,800 − $600) = $9,500` usual-month cash and $167,400 taxable-source gross before contributions. Its household description omits contribution amounts, so today’s “What it is taxed on” after contributions cannot be reconstructed fully. Do not borrow contribution amounts from another drawing without evidence.

## Published-source results

The six printed groups of statutory constants matched the primary sources reviewed: ordinary bands, standard/age deductions, enhanced senior deduction mechanics, capital-gain thresholds, contribution ceilings, and payroll withholding constants. Correct constants do not validate their application. The appendix records source URLs, sections, witnesses, and eligibility qualifications.

Keep employee Additional Medicare withholding above $200,000 separate from final household liability. Two $150,000 wages produce $0 additional employer withholding but $450 additional tax on a joint return: `0.9% × (300000 − 250000)`. Do not replace the correct withholding rule with the household filing rule.

## Implementation and close-out

1. Map all 219 IDs to current registry entries, dependencies, and permitted domains. Report retired or unreachable IDs with evidence; retain their audit identities.
2. Map the fixtures’ plain economic input names to actual types. Some objects assert a selected output, multiple related calls, or an invariant. Decimal/rational strings preserve precision; use suitable numerical tolerances rather than binary equality.
3. Report input, expected, actual, relevant decision, and proposed change for each discrepancy. Never turn `REFUSES` or `RULE UNCLEAR` into zero, or change expectations to make an adapter pass.
4. Distinguish a numerical counterexample from missing evidence or a product ambiguity. Record documented domain exclusions instead of silently dropping cases.
5. Fix settled shared readers and add regression cases for the demonstrated defects. Check two earners, employment gaps, known zero versus missing, dated annual bills, balloon debts, signed reversals, FIFO lots, and contract multipliers.
6. Preserve entered values and approved drawings. Record each correction and any newly approved rule with all affected IDs. Use the drawing’s required correction note rather than silently redrawing it.
7. Return changed files, actual before/after results, unresolved contracts, and remaining display evidence. Keep `ready_to_close: false` until financial discrepancies and required evidence are resolved.

## Review limits

Screen checks concern declarations: 339 PASS and 197 FAIL. Many FAIL entries are explicitly `evidence_gap` for edit/sync preservation or latest-drawing compliance; they do not allege 197 observed UI bugs. Four formula cards remain CANNOT TELL because delegated projection/simulation details or literal label/icon mappings are absent. Positive simulation probabilities and maximum supported draw amounts are not certified.
