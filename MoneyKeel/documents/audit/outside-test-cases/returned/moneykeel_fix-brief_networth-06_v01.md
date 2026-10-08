# Fix brief — Net worth batch 06 (bonds, groups, sums)

MoneyKeel · calculation audit · from the outside review of batch "networth 06" · 2026-10-07

## What to do, in one paragraph

Fix eight functions. The outside review judged them WRONG or INCOMPLETE. One is high severity: bond pricing rounds years to maturity to a whole number, so every bond with a fractional term shows a wrong yield to maturity. Fix that first. Then make CDs land in one group, stop counting missing values as zero, and close five smaller gaps. Each fix comes with acceptance tests whose expected values were worked by hand outside the code. **Do not change any expected value to match the code.** If you believe a test is wrong, stop and report it with your reasoning. Do not edit it.

## Ground rules (standing owner decisions — apply throughout)

1. **Decimal arithmetic end to end (Q56).** Full precision until display; round once, at display only. Totals and balances show whole dollars; prices show cents. A result within half a cent of zero shows as $0, never −$0.
2. **No invented defaults.** A missing input is not zero. Where the honest answer is "unknown", return no number and say why. Gaps show in the amber box on the Net worth screen (Q15).
3. **Don't bring the owner a choice between a right and a wrong number (Q52).** Fix what is wrong. Escalate only genuine choices; there is one below.
4. **Scope.** Fix only what is listed. No refactors, no new features, no renamed types beyond what a fix needs.
5. **Tests come from outside.** Add the acceptance tests below as written. Keep existing tests, but where an existing test asserts the old wrong behaviour, replace it and list it in your report.

## Decision needed from the owner — 1 item

**Where does a CD sit: Cash or Investments?**
- Today, `isCashKind` (MK-NW-F-006) puts kind `cd` under **Cash**.
- `uberGroupOf` (MK-NW-F-047) puts asset class "Bonds & CDs" under **Investments**.
- So the same CD appears in both groups, and the group subtotals cannot both be right.

**Recommendation: Investments.** It matches the "Bonds & CDs" class. Q7 already handles near-term access through the separate liquidity tag: CDs maturing within about 3 weeks are LIQUID, and CDs before maturity are LOCKED. Q7 also says class and liquidity never derive from each other.

**Until the owner confirms, implement the recommendation** (remove `cd` from `isCashKind`) in its own commit so it can be reverted alone.

## Fixes, by severity

### 1. `priceAtYield` — MK-NW-F-069 · HIGH

**Problem.** The function rounds years to maturity to a whole number (minimum 1) before discounting.
- A bond with 0.38 years left is priced as if a full year remained.
- A bond with 2.52 years left is priced as 3 years.
- A matured bond is floored to 1 year and priced as if it still pays.
- With no maturity date, it returns the current value, so a yield search on it returns a meaningless number.

**Fix.**
- **Years left.** t = exact years to maturity: whole anniversaries counted back from the maturity date, plus the leftover days ÷ days in that year. 2026-10-07 → 2028-10-07 is exactly 2.0. Do not round t.
- **Cash-flow timing.** Coupons are yearly on the maturity anniversary. They fall at t, t−1, t−2, … down to the last one above 0, which makes ceil(t) coupons.
- **Price.** Price = Σ (face × coupon rate) ÷ (1 + y)^(time of that coupon) + face ÷ (1 + y)^t.
- **Refusal.** If t ≤ 0 (matured) or there is no maturity date, return no price. The caller must not run a yield search.
- **Check.** At whole-number t this gives exactly the old answer. Only fractional terms change.

### 2. `rowOf` — MK-NW-F-072 · MEDIUM (inherits #1)

**Fix.**
- **Years left.** Exact t from #1, floored at 0. Never negative.
- **Yield to maturity.** The y at which the corrected `priceAtYield` equals the row's price. Use bisection or Newton, to a tolerance well below 0.0001. Return null when the bond has matured, has no maturity date, or the price is ≤ 0.
- **Current yield.** (face × coupon rate) ÷ price. Return null when the price is ≤ 0, never Infinity.
- **Which price.** The type comment cites **A47 (founder, 2026-08-26)**: accrued interest is subtracted before the yield. Find A47 in the decisions log. If it is there, price = value − accrued interest when entered, else value. **If you cannot find A47, stop and report**; do not choose.
- **Institution heading.** Use the institution if it is non-blank after trimming; otherwise the account name.

### 3. CD grouping — MK-NW-F-006 `isCashKind` · MEDIUM

Implement the recommendation above: remove `cd` from the cash kinds. Leave `uberGroupOf` (MK-NW-F-047) unchanged. Then check that every screen showing a Cash subtotal and the Net worth groups puts a CD in the same place, and that the group subtotals sum to net worth.

### 4. Missing values counted as zero — MK-NW-F-066 `sumWhere`, MK-NW-F-049 `itemizedTotal`, MK-NW-F-050 `itemizeRemainder` · MEDIUM

**Problem.** A linked account that failed to sync (no balance), or a holding listed without a value, is silently added as 0. The total then looks complete when it is not.

**Fix.**
- Add up only the values that exist, and also return how many were missing.
- Callers that show the total must show the gap ("1 account has no balance") in the amber box, not present the figure as complete.
- Keep the change minimal: return `{ total, missingCount }` or add a companion function, whichever touches fewer call sites.
- An empty list (nothing passes the test, nothing listed) is a true 0 and is not flagged.
- Keep negative values (an overdrawn account, a short option). They are real and must reduce the total.
- `itemizeRemainder`: when any listed holding has no value, label the remainder "not final" rather than "unexplained".

### 5. `wrapperWord` — MK-NW-F-023 · MEDIUM

**Problem.** Kinds that describe contents, not a wrapper, are labelled "Brokerage". That claims a wrapper the account may not have.

**Fix.**
- Return nothing for `other`, `crypto`, `private equity` and `hedge funds`, unless `wrapper_confirmed` is true and the user chose Brokerage.
- Keep "Brokerage" for brokerage, stocks, fixed income, options and commodities.
- Add a word for every cash kind in `isCashKind`, including foreign currency ("Foreign currency").

### 6. `isCertificateOfDeposit` — MK-NW-F-071 · MEDIUM

**Problem.** The whole-word match misses common real account names.

**Fix.** Return true when the label or institution (ignoring capitals, with spaces trimmed) contains any of:
- the whole word `CD` or `CDs`
- `certificate of deposit` or `certificates of deposit`
- `share certificate` or `share certificates`

Keep the whole-word rule, so "ABCD Growth Fund" stays false. Where the account's kind is available at the call site, kind `cd` also counts, so this agrees with `isCashKind`'s kind list.

### 7. `accruedInterestCaveat` — MK-NW-F-070 · LOW

**Fix.**
- Show the note only when the coupon rate is > 0 **and** accrued interest is absent (null or undefined).
- An entered 0 counts as entered. Watch for a falsy check that treats 0 as missing.
- A zero-coupon bond never gets the note.

### 8. `prettyDay` — MK-NW-F-068 · LOW

**Fix.**
- Parse YYYY-MM-DD as a calendar date with no time-zone shift. A UTC-midnight parse shown in Pacific time turns Jan 1, 2027 into Dec 31, 2026.
- An empty or invalid string returns nothing (the screen shows a dash), never "Invalid Date".
- Month names are Jan … Dec, with "Sep" not "Sept".

## Acceptance tests — add these exactly

Each was worked by hand. "Was" is what the current code should produce; use it to confirm the bug before fixing. Dates assume today = 2026-10-07.

| # | Function | Input | Expected | Was |
|---|---|---|---|---|
| 1 | priceAtYield | Face 50,000; coupon 4.125%; yield 4.75%; maturity 2029-04-15 | **50,250.6939** ($50,250.69) | 49,144.9828 |
| 2 | priceAtYield | Face 25,000; coupon 3.25%; yield 4.6%; maturity 2029-10-07 (whole years) | **24,073.9714** | same — must not change |
| 3 | priceAtYield | Face 1,000; coupon 5%; yield 5%; maturity 2028-10-07 | **1,000.0000** | same |
| 4 | priceAtYield | Face 10,000; coupon 5%; yield 6%; maturity 2026-09-30 (matured) | **no price** | 9,905.6604 |
| 5 | rowOf | Face 10,000; coupon 4%; maturity 2027-02-24; value 10,180.00; accrued not entered | years left **0.3836**; current yield **3.93%** (0.0392927); YTM **5.73%** (0.0573258); caveat shown | YTM 2.16% |
| 6 | rowOf | Face 10,000; coupon 5%; maturity 2026-09-30; value 10,000; accrued 0 | years left **0**; YTM **null**; caveat null | years −0.0192; YTM 5.00% |
| 7 | rowOf | Label "Marcus 12-Month CD"; no institution; face 25,000; coupon 4.1%; maturity 2027-10-07; value 25,000 | heading **"Marcus 12-Month CD"**; coupon/yr **1,025**; YTM **4.10%**; isCD **true** | — |
| 8 | isCashKind | kind `cd` | **false** (pending owner confirmation) | true |
| 9 | sumWhere | Checking 2,500.00 + linked savings with no balance; test = cash kind | total **2,500** with **missingCount 1** (flagged, not complete) | 2,500, unflagged |
| 10 | itemizedTotal | AAPL 18,402.66; VTI 42,913.08; cash sweep 3,250.40; bond 10,180.00 | **74,746.14** | same |
| 11 | itemizedTotal | Bitcoin 7,812.33; MSFT 25,004.17; short call −1,245.50 | **31,571.00** | same |
| 12 | itemizeRemainder | Entered 30,000.30; items 10,000.10 and 20,000.20 | **exactly 0** (shows $0) | check for float crumb |
| 13 | itemizeRemainder | Entered 61,250.00; VTI 30,118.42; BND 18,906.73; REIT no value | **12,224.85**, flagged "not final" | 12,224.85 unflagged |
| 14 | wrapperWord | kind `other` | **""** | "Brokerage" |
| 15 | wrapperWord | kind `annuities` | **"Annuity"** | same |
| 16 | isCertificateOfDeposit | Label "No-Penalty CDs", institution "Ally Bank" | **true** | false |
| 17 | isCertificateOfDeposit | Label "  jumbo cd - 18mo " | **true** | same |
| 18 | isCertificateOfDeposit | Label "ABCD Growth Fund" | **false** | same |
| 19 | accruedInterestCaveat | Coupon 0; accrued absent | **null** | note shown |
| 20 | accruedInterestCaveat | Coupon 5%; accrued **0** | **null** | check falsy bug |
| 21 | prettyDay | "2027-01-01" in America/Los_Angeles | **"Jan 1, 2027"** | check time-zone slip |
| 22 | prettyDay | "" | **nothing** (dash) | check "Invalid Date" |
| 23 | prettyDay | "2028-02-29" | **"Feb 29, 2028"** | same |

**Working for test 1, so you can check it:**
- t = 2 + 190/365 = 2.520548. The coupon of 2,062.50 is paid at t = 0.520548, 1.520548 and 2.520548.
- The old code prices at 3 whole years, giving 49,144.9828.
- Each cash flow actually arrives 0.479452 years sooner, so each is worth 1.0475^0.479452 = 1.0224990 times more.
- 49,144.9828 × 1.0224990 = 50,250.6939.

The full set of 60 hand-worked cases for this batch is in the outside review's JSON (`batch: networth 06`, `written_by: claude`). The script that runs them compares them against the app and a second reviewer. This brief covers only what must change.

## Leave alone

- `uberGroupOf` (MK-NW-F-047) mapping — judged right.
- `plural` (MK-NW-F-067) — judged right.
- The heading word "Personal property" for the group that holds real estate. Real estate is legally not personal property, but that is a copy question for the owner. Flag it in your report; do not change it.

## Report back

1. For each fix: what changed (file and function), and the tests that now pass.
2. Any acceptance test you believe is wrong, with your arithmetic. Leave the test failing.
3. Whether A47 was found in the decisions log, and where.
4. Every call site touched by the missing-value change (#4), and how each now shows the gap.
5. Existing tests you replaced because they asserted the old behaviour.
