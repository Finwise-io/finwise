# MoneyKeel Net Worth — Part 2 independent formula audit

**Batch:** `nw module final — part 2`  
**Scope:** 30 cards, F-031–F-041 and F-044–F-062; 150 hand-worked cases.

## Scope limitation

The supplied files contain formula descriptions and types, not implementation source code. This deliverable cannot assert that the running implementation passes or fails; Claude Code must map and execute cases against actual functions. Some cases are conditional on exact enums/helpers noted in each card.

## Executive findings

- **High — MK-NW-F-060 approxYTM:** Numerical solver and bank-CD/broker-CD branching are high-risk; the card alone does not define priceAtYield coupon timing and bracket details. Validate against DEC-3837 and independent known-value cases.
- **High — MK-NW-F-052 buildItemizedAccounts:** Mutation/creation path must refuse the entire operation when any item value is unknown; must preserve metadata and never invent face value from market value.
- **High — MK-NW-F-046 historyCoverage:** Invalid/future user-entered history start must produce unreadable refusal without fabricated duration; date arithmetic and wording have many boundaries.
- **Medium — MK-NW-F-039 buildAssetsState:** Signed negative balances make percentages exceed 100% or negative; exact-zero total has a separate zero-share/null-return branch. Test explicitly.
- **Medium — MK-NW-F-034 benchmarkReturn / MK-NW-F-036 benchmarkInfo:** Zero-valued overrides must count as present; exact case-sensitive kind matching and provenance override rules are important.
- **Medium — MK-NW-F-045 sourceWording:** The card’s inputs list mentions a fetched-price field, while its rule says last successful sync; verify implementation reads the intended timestamp field and uses an exact 4-day threshold.
- **Medium — MK-NW-F-047 uberGroupOf:** Card taxonomy uses “Unclassified” but brief AssetClass type uses “mixed”; verify mapping and tests against actual runtime enum.
- **Medium — MK-NW-F-061 bondSummary:** Missing face is aggregated as zero but must be disclosed separately; missing coupon-rate handling and average-yield eligibility need helper-level checks.

## Per-card review

| Card | Function | Formula/specification assessment | Principal check |
|---|---|---|---|
| MK-NW-F-031 | `primaryCarIdOf` | CONSISTENT_WITH_CARD_AND_RULES | Implementation source is absent, so tie-break and missing-value behavior need execution confirmation; Do not treat a missing balance as zero when any vehicle has a value. |
| MK-NW-F-032 | `earmarkedAmount` | CONSISTENT_WITH_RULES; DEFAULT BRANCH NEEDS CODE TEST | The supplied formula does not state how invalid persisted percentages outside 0–100 are normalized; Test clamping vs validation; do not silently assume |
| MK-NW-F-033 | `retirementEarmarkedValue` | CONSISTENT_WITH_DEPENDENCIES; AGGREGATION EDGE TESTS REQUIRED | Confirm missing/non-numeric balances cannot silently become zero before earmark calculation; account balance type in interface is number but import paths may violate it. |
| MK-NW-F-034 | `benchmarkReturn` | CARD IS SPECIFIC; CHECK IMPLEMENTATION TABLE AND EXACT MATCH | Audit code must verify exact values for all listed kinds, exact case-sensitive matching, and whether an override of 0 is preserved rather than treated as falsy. |
| MK-NW-F-035 | `blendedVolatility` | FORMULA CONSISTENT; MODEL LIMITATION EXPLICIT | This is not covariance-aware portfolio volatility; the card explicitly says correlations are not modeled; Confirm same earmark weights and null behavior as blendedReturn. |
| MK-NW-F-036 | `benchmarkInfo` | PROVENANCE RULES CLEAR; SOURCE TABLE MUST BE VERIFIED | A return override and a provenance record can disagree; override must dominate provenance; Ensure no stored period leaks into custom override result. |
| MK-NW-F-037 | `blendedReturn` | FORMULA CONSISTENT; VERIFY KIND MAPPING AND WEIGHTING | The weighted result depends on benchmarkReturn and earmark defaults; A zero-amount or zero-earmark account must not affect the average; do not substitute the Plan’s separate 6% fallback inside this function. |
| MK-NW-F-038 | `earmarkedKinds` | CONSISTENT; OUTPUT ORDER NOT SPECIFIED | Card says distinct kinds but does not state output ordering; Claude should check whether order is stable and whether tests should assert set equality or a documented order. |
| MK-NW-F-039 | `buildAssetsState` | FORMULA SPECIFICATION HAS A SIGNED-DENOMINATOR RISK | The claim that shares still add to 100 with negative balances is only true for a nonzero signed total; When total is zero due to offsetting balances, all shares are stated as 0 and do not sum to 100; this is consistent with the explicit zero-total branch but should be tested |
| MK-NW-F-040 | `assetsFromOnboarding` | RULES EXPLICIT; INPUT FIELD MAPPING NEEDS CODE VERIFICATION | Potential gap: typed zero is kept, but account creation identity/labels and re-seeding behavior should be tested; Savings/portfolio must not be silently classified as stocks/funds. |
| MK-NW-F-041 | `monthlyContributionsFromOnboarding` | FORMULA SPECIFICATION CLEAR; FIELD SEMANTICS AND CAPS NEED CODE TEST | 2026 age-band boundaries and match ordering are material; Employer percentage is applied after 401(k) cap |
| MK-NW-F-044 | `getAssetsState` | BEHAVIOR CLEAR; STORAGE FAILURE MODES NEED INTEGRATION TEST | Unit cases cannot prove database access, uid isolation, or distinction between absent document and read failure; Test these against repository/storage layer. |
| MK-NW-F-045 | `sourceWording` | THRESHOLD RULE CLEAR; TIMESTAMP SEMANTICS NEED TEST | Boundary is 4 days (not >4); verify age uses last_synced and the supplied now, timezone/date rounding and future timestamps; Card inputs list price-fetched field but formula says last successful sync, a field mapping mismatch to resolve. |
| MK-NW-F-046 | `historyCoverage` | DETAILED SPEC; CALENDAR/ROUNDING WORDING NEEDS CAREFUL TESTS | Potential ambiguity: month coverage formula says whole months from start to today plus days/days-in-that-month, but month/day boundaries need one deterministic convention; The “history starts on/before period first day” branch should be tested before partial-month wording. |
| MK-NW-F-047 | `uberGroupOf` | CARD AND ASSETCLASS TAXONOMY NEED ALIGNMENT | Card names Unclassified while current AssetClass union shown in brief has mixed, not an explicit unclassified member; Confirm runtime enum/string mapping and behavior for unsupported class values. |
| MK-NW-F-048 | `uberGroupRows` | INVARIANT IS CLEAR; INPUT ORDER AND UNKNOWN CLASS NEED TEST | The card says groups add to What you own; negative totals should be retained; Verify no row is dropped or duplicated and group order is stable. |
| MK-NW-F-049 | `itemizedTotal` | SPEC CONSISTENT WITH UNKNOWN-IS-NOT-ZERO | Money should not be summed in binary floating-point if exact decimal reconciliation is required; Ensure null holdings are counted separately by itemizeMissingCount, not included as zero in semantic output. |
| MK-NW-F-050 | `itemizeRemainder` | SPEC CLEAR; LUMP BALANCE MUST BE ENTERED | The signature requires number, so it cannot represent unknown lump balance; caller must not invoke it until balance is known; Decimal rounding/tolerance must not create residual cents. |
| MK-NW-F-051 | `itemizedResultTotal` | FORMULA EQUIVALENCE HOLDS IF INPUTS ARE COMPLETE; MISSING-VALUE UI SEMANTICS CRITICAL | For incomplete itemization, the screen can preview a number, but must not imply the remainder is final; If any holding value is null, test whether preview still reflects known holdings and whether the UI marks it provisional. |
| MK-NW-F-052 | `buildItemizedAccounts` | HIGH-CONSEQUENCE MAPPING; METADATA PRESERVATION MUST BE VERIFIED IN CODE | Test no partial creation when one value missing, exact metadata carry-through, wrapper preservation, never invent face value from market value, and positive remainder only; Confirm tax bucket and wrapper field names. |
| MK-NW-F-053 | `correctClassOf` | ORDER OF RULES MATERIAL; USER CHOICE MUST WIN | Potential ambiguity: invalid maturity dates vs merely present maturity_date; Rule elsewhere says invalid dates treated absent; ensure class correction validates calendar date before using maturity presence |
| MK-NW-F-054 | `reclassifyAccounts` | COMPLEX MUTATION LOGIC; COUNTING AND NO-OP IDEMPOTENCE NEED TEST | Test that confirmed accounts and user-classed/pending holdings are untouched; tax type is not silently made taxable; running twice should not keep incrementing changed count. |
| MK-NW-F-055 | `isBond` | SIMPLE DELEGATION; TEST DERIVED AND EXPLICIT CLASS | Ensure uses normalized/derived assetClassOf rather than only raw asset_class, and does not classify all accounts held at a CD-named institution as bonds. |
| MK-NW-F-056 | `bondInfo` | RULES EXPLICIT; INVALID DATES AND ZERO SEMANTICS CRITICAL | Face missing/zero/negative should be null; coupon zero must remain 0; institution must never determine CD status; default venue bank is material to YTM behavior. |
| MK-NW-F-057 | `annualCoupon` | FORMULA CLEAR; MISSING VS ZERO DISTINCTION REQUIRED | Face and rate missing should produce null; a typed zero coupon produces 0 if face is known; Matured-bond handling belongs in yearlyInterestNow/summary, not necessarily this primitive. |
| MK-NW-F-058 | `yearsToMaturity` | FORMULA SPECIFIED; ANNIVERSARY AND LEAP-DAY LOGIC NEED EXECUTION TESTS | Do not use hours/time-of-day; a non-existent anniversary date must not roll forward; Exact date arithmetic around leap days and maturity today needs validation. |
| MK-NW-F-059 | `currentYield` | FORMULA CLEAR; RATE MISSING AND ZERO VALUE NEED TESTS | Card says yearlyInterest ÷ value; yearlyInterest must remain unknown if coupon rate is missing, not turn missing into zero; Ensure accrued interest does not enter denominator. |
| MK-NW-F-060 | `approxYTM` | HIGH-RISK NUMERICAL/BRANCHING FORMULA; PRICE CONVENTION NEEDS TESTS | Need test bank vs broker CD branch, no maturity/matured, missing face/rate, zero value, accrued-interest fallback, convergence bracket and monotonicity; Expected numeric YTM should be independently computed using the same coupon schedule convention in the code; card alone does not provide priceAtYield details. |
| MK-NW-F-061 | `bondSummary` | AGGREGATION RULES CLEAR; UNKNOWN-VS-ZERO DISPLAY MUST REMAIN SEPARATE | Potential tension: totalFace sums missing face as zero but separately names bonds without face; this is allowed only if UI labels omissions; Average yield inclusion needs positive value and rate; ensure typed zero rate qualifies and yields 0% rather than being treated missing. |
| MK-NW-F-062 | `couponIncomeAnnual` | AGGREGATE RULE CLEAR; MISSING RATE MUST BE NAMED ELSEWHERE | The function returns a number, so unknown rate is counted as zero in total by rule, but UI must separately disclose missing rates (DEC-2748b); Ensure account classification uses isBond/assetClassOf. |

## Test coverage

- 60 easy cases, 60 complex cases, 30 edge cases.
- Every card has five cases with inputs, expected result, and hand calculation in the JSON file.
- Several integration/numerical cases are explicitly marked conditional where the card text does not fully define implementation details. Claude Code must resolve these from source rather than guess.

## Deliverables

- `moneykeel_nw_part2_audit_and_claude_brief.json` — full 30-card formula review and all 150 cases.
- `moneykeel_nw_part2_claude_code_brief.md` — instructions to map and run cases against repository functions.

## What this audit does not claim

No repository implementation was supplied with the cards, so no test has yet been executed against production code and no implementation bug is described as confirmed. The output is an independent specification/formula audit and an execution-ready test plan, with flagged conditional cases requiring source-level mapping.
