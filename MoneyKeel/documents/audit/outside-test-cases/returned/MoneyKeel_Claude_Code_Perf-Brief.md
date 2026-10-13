# MoneyKeel Performance audit — Claude Code handoff

**Status: not ready to close.** Independent review of all four supplied parts found **16 WRONG, 18 INCOMPLETE, 16 RIGHT and 1 CANNOT TELL** across 51 cards. These are judgments of the written specifications and worked arithmetic, not observations of running app behavior.

The package contains **250 cases**: two easy, two complex and one edge for each of 50 testable cards. `MK-NW-F-104 closedWith` has no cases because the packet never says how a single ending total is allocated across multiple accounts. The audit instructions explicitly prohibit invented answers for an unjudgeable card. Its missing contract is recorded in part 1.

Part 1 also contains all **15 settled owner rules**, all **33 outside-review decisions**, and the additional **DEC-2748b** zero-rate decision: 49 rule entries total. It checks every one of the **53 screen-register figures** against all eight tenets. A specification PASS does not prove rendered UI compliance; a FAIL caused by missing evidence is an audit-closure gap, not a claimed app bug. Many rules govern Net worth, Cashflow, onboarding, sync or Plan functions not supplied here, so their implementation is CANNOT TELL.

## Files to load

Unzip `MoneyKeel_Performance_Audit_Package.zip` beside this brief and read:

1. `MoneyKeel_audit_part_1.json` — 13 checks, 60 cases, rule and figure checks.
2. `MoneyKeel_audit_part_2.json` — 13 checks, 65 cases.
3. `MoneyKeel_audit_part_3.json` — 13 checks, 65 cases.
4. `MoneyKeel_audit_part_4.json` — 12 checks, 60 cases.
5. `MoneyKeel_tax_sources_and_acceptance.json` — primary-source checks, cross-card acceptance examples and scope limitations.
6. `MoneyKeel_audit_validation.json` — coverage and verification counts.

The original five input Markdown files are included under `source_packet/`. They remain unchanged. Read the owner's decisions, approved household and tenets before implementing anything.

## Working instructions for Claude Code

Treat this as a repair brief. Locate each registered ID in the repository, read applicable repository instructions, current decision log and approved drawing notes, and compare actual behavior with the independent cases. The outside audit did not read your code, existing tests or outputs. Implementation inspection is your next step; do not report these findings as already observed failures of the app.

Preserve existing IDs, user overrides and approved decisions. Work through the existing calculation doors and shared readers. Screens should display figures and coverage metadata; they should not invent their own financial calculations. Do not introduce Dietz, IRR, a gain/cost ratio or guessed values as a fallback for TWR.

Map the cases' plain input names to the actual types without changing their numerical expected answers. `REFUSES` means no numeric answer with a reason, not zero. `RULE UNCLEAR` contains competing readings: do not silently pick one or turn it into a passing assertion. Resolve it from a later approved decision if one exists. Otherwise retain it as open while completing independent, settled fixes. If a case is inapplicable to a documented input domain, explain that domain with evidence; do not make the case disappear or adjust its answer to agree with code.

The JSON `formula_gives` values describe the supplied prose, not measured app outputs. Entries saying RULE UNCLEAR are missing-contract witnesses. Some static helpers are correct on the valid-input domain even though shared ingestion or presentation is unverified. Distinguish a numerical counterexample from a robustness gap or a scope conflict.

## First fixes and acceptance examples

| Priority | IDs | Problem and required behavior |
|---|---|---|
| 1 | MK-PF-F-014, MK-PF-F-040, MK-ST-F-081 | Use the same owner-approved beginning-of-day movement convention in capped holding returns and daily account returns. |
| 1 | MK-ST-F-082, MK-NW-O-008 | Normalize broker flow signs at a documented boundary; missing amounts stay unknown; walk and TWR use identical external contributions. |
| 1 | MK-PF-F-010, MK-PF-F-038, MK-PF-F-039, MK-PF-F-045 | One price-window reader, with the decided first-price fallback, actual coverage dates and the short-history sentence. |
| 1 | MK-PF-F-007, MK-NW-F-084 | Cost ratio and reconstructed category growth are not general TWR; avoid presenting them as the owner's required return. |
| 1 | MK-NW-F-091, MK-NW-F-127, MK-PF-F-020, MK-PF-F-044 | Synthetic beginnings and benchmark weights fail after share changes, cash payouts or a total loss. Use authentic values or refuse unsupported reconstruction. |
| 1 | MK-NW-F-128, MK-PF-F-006 | Explicit zero is known: do not resurrect a zero-valued holding from an old mark, and do not call a known zero basis missing. |
| 2 | MK-PF-F-042, MK-PF-F-043; account/portfolio/holding return figures | Separate window totals from yearly rates, and settle one calendar/annualization convention across readers. |
| 2 | MK-NW-F-092, MK-NW-O-008, MK-XS-M-003 | Resolve whole-account cash versus Investments-excludes-cash and unclassified-account membership without guessing. |
| 2 | 2026 tax table; cash-flow and bond screen-register examples | Correct externally verified constants and reconcile stale or contradictory figure descriptions. |

**Morning purchase counterexample.** Buy 10 shares at $100 on September 1, whose evening close is $100. Buy another 10 at $110 on September 2, whose evening close is $121. Prior evening value is $1,000; morning money added is $1,100; evening value is $2,420. DEC-4439 gives `2420 / (1000 + 1100) − 1 = 15.2380952380952%`, shown **+15.24%**. The supplied purchase-piece method first values the old shares at September 2's evening close and yields **26.7619047619048%**, shown **+26.76%**. That differs because it places the purchase after the day's growth.

**New-account contribution counterexample.** Prior account value $0, actual deposit $10,000, first evening value $10,050: contribution **$10,000**, wealth generated **$50**, return **+0.50%**. Using $10,050 as the contribution erases the gain. With evening value $9,800, wealth is **−$200** and return **−2.00%**; this is a measurable loss, not a broken-record refusal.

**Signed withdrawal counterexample.** A broker sends a withdrawal of −$3,287.19. It remains **−$3,287.19** of external flow. Applying another minus makes it +$3,287.19 and reverses the direction. Establish a positive-magnitude normalized transaction contract, or reject an ambiguous raw record; never silently reverse it.

**Share-change reconstruction counterexample.** Start with 10 shares at $100; add 10 at $110; end with 20 at $121. Actual beginning is **$1,000**, contribution **$1,100**, ending **$2,420**, wealth **$320**. A 21% market return applied backward to today's 20 shares produces a false beginning of **$2,000** and false gain of **$420**. Current quantity divided by a price-growth factor cannot recover a past quantity.

**Short history.** A 1Y window opens October 10, 2025, but prices begin May 4, 2026 at $83.17 and end October 10, 2026 at $91.43. Per DEC-4641, the holding gets the shortened total `91.43 / 83.17 − 1`, with the exact approved **5 months — not a year** sentence. Both the displayed return and its stored window total must use that same move. The current shared-parts prose instead refuses because no close exists before the window; fix that conflict rather than dropping the total.

**Legacy 2Y row.** A row states +10%/year and no stored total, with known two-year duration. Window total is `1.10² − 1 = 21%`, not 10%. Where duration/basis is absent, refuse rather than treat the yearly rate as a total. An explicitly null stored total remains null.

**Total loss and shorts.** A $1,000 holding ending at zero lost $1,000. With a second $1,000 holding ending at $1,200, total return is **−40%**, not +20% from the surviving holding alone. Negative net account value also must not be silently clamped to zero and shown as −100%. Short concentration needs a documented gross/net exposure definition; current cards do not settle it.

## Decisions or contracts that remain unresolved

1. **Cash scope.** The owner excludes cash from Investments; the Performance orchestrator measures whole investment accounts including idle cash. Both may be useful concepts, but they need explicit, consistent scope and labels. Do not change either owner decision by inference. Reconcile Home, Net worth, account and Performance totals and document the flow treatment when cash moves into a security.
2. **Dividend reconstruction.** DEC-4644 correctly forbids subtracting the same dividend twice, but its concrete example is inconsistent. With 1,000 shares, raw price $100→$105 and $1,200 paid to cash, ending holdings are $105,000 and earned wealth is $6,200. `105000 / 1.0628 ≈ 98795.6341738803`, not $100,000. A hypothetical reinvested 6.28% path ends at $106,280; holdings plus the stated cash dividend end at $106,200. Determine the feed adjustment, payout/reinvestment path and value basis. Keep the owner rule intact and record the corrected example; do not merely tune a test to $100,000.
3. **Recorded versus estimated beginnings.** DEC-3656 permits working back a beginning under conditions; several figure definitions still say READ, NEVER BACK-SOLVED. A reconstruction must be labelled as an estimate, with a source/method, and never satisfy recorded coverage or unlock a TWR percentage without the actual necessary record.
4. **Annualization.** An exact calendar 1Y is never annualized, even when it spans 366 days. Full 2Y holding cards use exponent 1/2; the orchestrator uses days/365. Two calendar years spanning 731 days therefore disagree. Since remains the owner's whole-record total. Use a single approved presentation contract, retaining both total and yearly pace plus actual measured dates. Do not choose a new convention silently.
5. **Missing dates, duplicate points and input domain.** No undated real purchase can be placed on the first known date as if confirmed. Exclude future values from an as-of return. Define valid finite point ingestion, duplicate-date source precedence, invalid multipliers, nonpositive/fractional month arguments and stable tie handling. Keep raw broker normalization separate from financial calculations.
6. **`closedWith`.** One aggregate ending total does not identify per-account endings. Specify the allocation contract or require actual per-account values. Then obtain independent cases; do not invent a pro rata allocation and call it the audited requirement.
7. **Approved Home gap.** Approved text says +3.69%, market +2.83%, ahead by 0.85%. Visible subtraction is 0.86 percentage points; unrounded values can legitimately give 0.85 after rounding. Preserve the approved wording and require the unrounded witness, or add a dated correction in the drawing's READ THIS FIRST note under DEC-4529. Do not “fix” it blindly to 0.86.

## Tax and screen-register corrections

The 2026 IRS Revenue Procedure 2025-32 confirms **head-of-household** upper bracket cutoffs of **$201,750** and **$256,200**. The packet prints $201,775 and $256,225. The other three printed filing-status tables, printed standard deductions and capital-gains thresholds match the source. At $300,000 HOH taxable income the incorrect table understates the bracket-method tax by **$2.75**. Source links and boundary witnesses are in the appendix.

The **$200,000 Additional Medicare** threshold describes employer withholding regardless of filing status. Actual household tax thresholds are **$250,000 MFJ**, **$125,000 MFS** and **$200,000 other statuses**. Two spouses earning $150,000 each owe **$450** additional Medicare tax although neither employer must withhold it at that salary. Do not replace the correct payroll-withholding rule with the household rule; keep them distinct.

401(k)/IRA amounts in the packet match the IRS 2026 notice; HSA base limits match Revenue Procedure 2025-19; Social Security's $184,500 wage base matches SSA. Senior-deduction prose needs MAGI and explicit eligibility/phase-out mechanics before treating it as a complete formula.

Cash-flow examples require correction or a clarified contract: logged nondebt expenses are $2,300+$512+$186 = **$2,998**; committed debt is $2,400+$250 = **$2,650**; the defined expenses-plus-due-debt outflow is **$5,648**, not $3,248. With confirmed received income $7,200 the matching remainder is **$1,552**, not $3,952. If the UI instead means paid outflow, it must not include unpaid obligations under an “actually gone out” label. The $250 paid loan is counted once, not both logged expense and required debt.

The planned-surplus example gives $1,150 from `$7200 − $2650 − $3400`; its separate $300/month emergency-fund promise would reduce that to **$850** if outside the budget. Settle whether it is already included or omitted. The emergency-fund register says logged-month essentials but its worked household has nothing logged and uses budget essentials. Contribution room uses an assumed annual $14,400 paid, rather than a verified YTD amount. Those dependencies need their own supplied cards or current approved evidence.

The bond maturity-yield register is stale: it omits the new accrued-interest treatment and bank-versus-broker CD decision. Its displayed 5.69% cannot be recovered from its own printed approximation with the actual 1,098 days remaining and years = days/365 (about 5.654220% before accrued interest). Do not invent an accrued-interest value or a coupon schedule to force that answer. A closing-price label must also not say LIVE unless the feed supplies a live quote and timestamp.

## Implementation and close-out sequence

1. Map all 51 IDs to live registry entries and dependencies. Report missing/retired IDs; keep identities stable.
2. Run the independent cases against the current app through adapters. Use appropriate exact arithmetic tolerances for stored values and exact comparisons for display strings/refusal states. Do not turn expected numeric strings into binary-equality traps.
3. Report each actual discrepancy as input, expected, actual, relevant owner decision and proposed fix. Tag contract questions separately; no code change is justified merely because this specification audit says INCOMPLETE.
4. Fix settled arithmetic and shared-reader defects with the smallest coherent changes. Keep price basis, flows, membership, coverage, total/yearly basis and source dates explicit. Preserve user-entered classifications, quantities and cost basis through sync.
5. Add meaningful regression cases for the demonstrated defects. Check single-account and portfolio paths, Home equality, cash sleeves, mini options, partial FIFO sales, unknown amounts/dates, leap/calendar boundaries and same-span benchmarks. Verify exact and displayed reconciliation; do not hide rounding differences inside an unexplained gain row.
6. For approved drawings with incorrect figures, follow DEC-4529: retain the drawing and put the named arithmetic correction in READ THIS FIRST. Record any newly approved owner decision and all affected IDs. Do not silently redraw or change approved copy.
7. Return changed files, actual before/after case results, completed checks and every unresolved item. Keep `ready_to_close: false` until financial inconsistencies and required evidence gaps have been resolved. A passing implementation test alone does not settle an unanswered owner rule.

## Complete card verdict index

| Part | Card ID | Function | Verdict | Severity |
|---|---|---|---|---|
| 1 | MK-NW-F-084 | categoryEarnings | WRONG | high |
| 1 | MK-NW-F-090 | windowStartKey | INCOMPLETE | medium |
| 1 | MK-NW-F-091 | pricedGainOf | WRONG | high |
| 1 | MK-NW-F-092 | investmentAccountIdsOf | INCOMPLETE | medium |
| 1 | MK-NW-F-103 | investmentRecordDates | INCOMPLETE | medium |
| 1 | MK-NW-F-104 | closedWith | CANNOT TELL | high |
| 1 | MK-NW-F-105 | whyNoReturn | RIGHT | — |
| 1 | MK-NW-F-127 | gainOfRow | WRONG | high |
| 1 | MK-NW-F-128 | heldValueOf | WRONG | high |
| 1 | MK-NW-F-129 | gainRowName | RIGHT | — |
| 1 | MK-NW-F-130 | cannotWorkBackSentence | RIGHT | — |
| 1 | MK-NW-O-007 | theLookBack | RIGHT | — |
| 1 | MK-NW-O-008 | thePerformance | WRONG | high |
| 2 | MK-PF-F-001 | totalShares | RIGHT | — |
| 2 | MK-PF-F-002 | costBasis | RIGHT | — |
| 2 | MK-PF-F-004 | marketValue | RIGHT | — |
| 2 | MK-PF-F-005 | unrealizedGain | RIGHT | — |
| 2 | MK-PF-F-006 | capGains | WRONG | high |
| 2 | MK-PF-F-007 | totalROI | WRONG | high |
| 2 | MK-PF-F-008 | startDateFor | INCOMPLETE | medium |
| 2 | MK-PF-F-009 | latestClose | INCOMPLETE | medium |
| 2 | MK-PF-F-010 | periodReturn | INCOMPLETE | high |
| 2 | MK-PF-F-011 | periodReturnSince | INCOMPLETE | medium |
| 2 | MK-PF-F-012 | earliestPurchaseDate | INCOMPLETE | medium |
| 2 | MK-PF-F-013 | benchmarkTicker | INCOMPLETE | medium |
| 2 | MK-PF-F-014 | buildPerformance | WRONG | high |
| 3 | MK-PF-F-015 | topHoldingConcentration | INCOMPLETE | medium |
| 3 | MK-PF-F-020 | portfolioBenchReturn | WRONG | high |
| 3 | MK-PF-F-022 | factorOverMonths | INCOMPLETE | medium |
| 3 | MK-PF-F-023 | lookBack | INCOMPLETE | high |
| 3 | MK-PF-F-028 | realizedFromLedger | INCOMPLETE | high |
| 3 | MK-PF-F-029 | closeAsOf | RIGHT | — |
| 3 | MK-PF-F-031 | contractMultiplier | INCOMPLETE | medium |
| 3 | MK-PF-F-032 | quantityUnit | RIGHT | — |
| 3 | MK-PF-F-033 | quantityWithUnit | INCOMPLETE | low |
| 3 | MK-PF-F-034 | closeOnOrBefore | INCOMPLETE | medium |
| 3 | MK-PF-F-035 | unknownFigure | RIGHT | — |
| 3 | MK-PF-F-036 | monthsBefore | INCOMPLETE | medium |
| 3 | MK-PF-F-037 | dayBefore | RIGHT | — |
| 4 | MK-PF-F-038 | periodTotalReturn | WRONG | high |
| 4 | MK-PF-F-039 | periodReturnParts | WRONG | high |
| 4 | MK-PF-F-040 | returnSincePurchases | WRONG | high |
| 4 | MK-PF-F-041 | isoDay | RIGHT | — |
| 4 | MK-PF-F-042 | windowTotal | INCOMPLETE | medium |
| 4 | MK-PF-F-043 | windowTotalOfRow | WRONG | high |
| 4 | MK-PF-F-044 | startValues | WRONG | high |
| 4 | MK-PF-F-045 | priceHistoryShortSentence | RIGHT | — |
| 4 | MK-PF-F-046 | saleShortOfPurchasesSentence | RIGHT | — |
| 4 | MK-ST-F-080 | isDay | RIGHT | — |
| 4 | MK-ST-F-081 | timeWeightedReturn | WRONG | high |
| 4 | MK-ST-F-082 | movementsOf | WRONG | high |

## Evidence limits and validation

The four JSON files parse; all 51 card IDs occur exactly once in formula checks. Every testable card has the required five case kinds, and every WRONG/INCOMPLETE card has a disagreement or explicit missing-contract witness. Monetary and percentage expectations retain precision and display values; the approved household and selected multiaccount/lot/FIFO arithmetic were checked independently with decimal arithmetic. No app code, existing tests, live screens or app result was inspected. This package makes the next implementation review reproducible; it does not certify the app.
