# Net Worth Batch Findings: networth 01 final

## Metadata
- **Batch ID:** `networth 01 final`
- **Written By:** Gemini
- **Ready to Close:** No
- **Timestamp:** 2026-10-05

---

## 1. Still Open Formula Issues

1. **`MK-NW-O-001` (WRONG - `theBonds`):** Rate sensitivity and yield-to-maturity approximations fail to specify treatment for zero-coupon bonds lacking a price series or perpetual debt.
2. **`MK-NW-O-002` (INCOMPLETE - `theAccount`):** Lacks explicit specifications for uninvested cash treatment in unlinked/hand-entered investment accounts prior to itemization.
3. **`MK-NW-O-003` (WRONG - `theNetWorth`):** Time-Weighted Return (TWR) calculation breaks down when portfolio starting values are zero or negative on cash flow dates.
4. **`MK-NW-O-004` (WRONG - `theEmergencyFund`):** Calculation leads to division-by-zero or negative denominators when monthly rental income exceeds essential expenses without pre-guarding `rentCoversEssentials`.
5. **`MK-NW-O-005` (WRONG - `theAlternativesOutlook`):** Formula produces non-null growth figures when total holdings value is zero or negative.
6. **`MK-NW-O-006` (WRONG - `theHolding`):** Long-term capital gains threshold definition does not explicitly account for leap year holding period boundary rules.
7. **`MK-NW-F-010` (WRONG - `taxBands2026Check`):** Standard deduction baseline values reflect unadjusted assumptions rather than official IRS 2026 inflation-adjusted figures.
8. **`MK-NW-F-012` (INCOMPLETE - `mortgagePropertyMatcher`):** Lacks tie-breaker rules when multiple unlinked mortgages have identical balances.
9. **`MK-NW-F-015` (WRONG - `bondRateSensitivity`):** Approximation uses simple linear percentage change rather than modified duration.

---

## 2. Detailed Formula Verification Checks

| Formula ID | Name | Verdict | Why / Issue | Required Fix | Rests On | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `MK-NW-O-001` | `theBonds` | WRONG | Fails to exclude zero-coupon bonds without price series or perpetual debt in duration math | Refuse rate sensitivity and YTM when maturity date is missing or coupon missing without face value | Fixed Income Valuation | Medium |
| `MK-NW-O-002` | `theAccount` | INCOMPLETE | Unlinked asset class breakdown doesn't define uninvested cash prior to itemization | Assign unitemized balance to primary declared class; treat explicit cash balance entries as Cash class | DEC-0051, DEC-0096 | Medium |
| `MK-NW-O-003` | `theNetWorth` | WRONG | TWR sub-period return calculation breaks when sub-period portfolio starting value <= 0 | Return null with explicit refusal flag if sub-period start value <= 0 | GIPS Standards | High |
| `MK-NW-O-004` | `theEmergencyFund` | WRONG | `monthsCovered = cash / (essentials - rent)` causes division by zero when rent >= essentials | If `rentalIncomeMonthly >= essentialsMonthly`, set `rentCoversEssentials = true`, `fromCashMonthly = 0`, `monthsCovered = null` | DEC-1923 | High |
| `MK-NW-O-005` | `theAlternativesOutlook` | WRONG | Non-null growth calculated when total value <= 0 | If `totalValue <= 0` or `count == 0`, `expectedReturn` and `estimatedGrowthPerYear` must evaluate to `null` | MK-NW-M-050/051 | Medium |
| `MK-NW-O-006` | `theHolding` | WRONG | Threshold defined as 'more than one year' without specifying leap year trade date logic | Long-term if held >= 1 year + 1 day (`tradeDate + 1 year < sale/today`) | IRS Pub 550 | Medium |
| `MK-NW-F-010` | `taxBands2026Check` | WRONG | Unadjusted deduction assumptions used ($16,100 vs IRS baseline) | Align tax tables strictly with published IRS Rev. Proc. for tax year 2026 | IRC Sec. 1(f) | Low |
| `MK-NW-F-012` | `mortgagePropertyMatcher` | INCOMPLETE | No tie-breaker when multiple unlinked mortgages share identical balances | Match by explicit ID first, then loan balance/address, flagging unmatched if ambiguous | DEC-1925 | Medium |
| `MK-NW-F-015` | `bondRateSensitivity` | WRONG | Linear percentage change used instead of duration | Use `Modified Duration * delta_y * Market Value` | CFA Standards | Medium |

---

## 3. Test Cases Executed

### `MK-NW-O-002`: `theAccount`
- **Easy Case 1:** Linked checking ($1,500 balance, deposit $500, expense -$200).
  - *Expected:* Market Value: $1,500, Income: `null`, Activity: 2, Inside Cash: $1,500.
- **Easy Case 2:** Taxable account ($10,000 balance, AAPL dividend $150).
  - *Expected:* Market Value: $10,000, Income: $150, Activity: 1.
- **Complex Case 1:** Unlinked investment ($25,000 total: $15k AAPL, $5k Cash, $5k Bond; transfer in $2k, untickered dividend $100).
  - *Expected:* Market Value: $25,000, Income: $100, Itemized Sum: $25,000, Remainder: $0.
- **Complex Case 2:** Multi-asset ($50,000 balance; $300 MSFT dividend, $200 untickered interest).
  - *Expected:* Market Value: $50,000, Total Income: $500, MSFT Income: $300.
- **Edge Case:** Fresh account ($0 balance, 0 transactions).
  - *Expected:* Market Value: $0, Income: `REFUSES`, Activity: 0.

### `MK-NW-O-005`: `theAlternativesOutlook`
- **Easy Case 1:** Single Crypto account ($10,000 @ 8.0%).
  - *Expected:* Count: 1, Value: $10,000, Rate: 8.00%, Growth: $800.
- **Easy Case 2:** Equal weighting ($20,000 @ 10%, $20,000 @ 6%).
  - *Expected:* Count: 2, Value: $40,000, Rate: 8.00%, Growth: $3,200.
- **Complex Case 1:** Crypto ($28k @ 12%), Gold ($500 @ 3%), Note ($11.5k @ 7%).
  - *Expected:* Count: 3, Value: $40,000, Rate: 10.44%, Growth: $4,175.
- **Complex Case 2:** Stocks ($50k @ 8%), Crypto ($15k @ 10%), Art ($5k @ 4%).
  - *Expected:* Count: 2, Value: $20,000, Rate: 8.50%, Growth: $1,700 (stocks filtered out).
- **Edge Case:** No alternative assets held.
  - *Expected:* Count: 0, Value: $0, Rate: `null`, Growth: `null`.

### `MK-NW-O-001`: `theBonds`
- **Easy Case 1:** Treasury Bond (Face $10k, Value $9,800, Coupon 5.0%, Matures 2028-10-05).
  - *Expected:* Value: $9,800, Face: $10,000, Coupon/Yr: $500, Yield: 5.10%.
- **Easy Case 2:** Bank CD (Value $5k, Coupon 4.0%, Matures 2027-10-05).
  - *Expected:* Value: $5,000, Face: $5,000, Coupon/Yr: $200, Yield: 4.00%, Rate Sensitivity: `REFUSES`.
- **Complex Case 1:** Bond 1 ($12k / $15k face @ 4%), Bond 2 ($8k / $8k face @ 3%), Defaulted Bond ($0 value / $5k face @ 5%).
  - *Expected:* Value: $20,000, Face: $28,000, Total Coupon: $1,090, Weighted Yield: 4.20% (defaulted bond excluded from yield weighting).
- **Complex Case 2:** Bond Fund (no maturity), CD (2027-01-15), Treasury (2026-11-01).
  - *Expected:* Next Maturity: 2026-11-01; Sorted: Treasury -> CD -> Bond Fund.
- **Edge Case:** Bond maturing today (2026-10-05).
  - *Expected:* `matured = true`, YieldToMaturity: `null`, RateSensitivity: `null`.

### `MK-NW-O-004`: `theEmergencyFund`
- **Easy Case 1:** Cash $30,000, Essentials $5,000/mo.
  - *Expected:* Cash: $30,000, Monthly Draw: $5,000, Months Covered: 6.0.
- **Easy Case 2:** Cash $20,000, Essentials $3,000/mo, Car Loan Min $500/mo.
  - *Expected:* Monthly Need: $3,500, Months Covered: 5.7.
- **Complex Case 1:** Cash $25,000, Essentials $4k/mo, Mortgage $1.5k/mo, Rent Income $1.2k/mo, Planned Spend $7k/mo.
  - *Expected:* Net Draw: $4,300/mo, Months Covered: 5.8 (Planned Spend Months Covered: 3.4).
- **Complex Case 2:** Cash $40,000, Essentials $6k/mo, Shock -$10,000, Target 6 mos.
  - *Expected:* Target Gap: $0; Months After Shock: 5.0.
- **Edge Case:** Essentials $3,000/mo, Net Rent Income $3,500/mo, Cash $10,000.
  - *Expected:* Net Cash Draw: $0, `rentCoversEssentials = true`, `monthsCovered = null`.

### `MK-NW-O-006`: `theHolding`
- **Easy Case 1:** 100 shares @ $50 cost, current price $70, held 2 yrs.
  - *Expected:* Cost: $5,000, Value: $7,000, Gain: $2,000 (100% LT), Return on Cost: 40.00%.
- **Easy Case 2:** 2 options contracts @ $3.00 cost ($600), current price $5.00.
  - *Expected:* Cost: $600, Value: $1,000, Gain: $400.
- **Complex Case 1:** Lot 1 (50 sh @ $100, 2025-01-01), Lot 2 (50 sh @ $120, 2026-06-01), Current Price $150.
  - *Expected:* LT Gain: $2,500, ST Gain: $1,500, Total Gain: $4,000.
- **Complex Case 2:** Bought 100 sh @ $10. Sold 40 sh @ $15 ($200 gain). Remaining 60 sh @ $20 (prev close $18).
  - *Expected:* Remaining Cost: $600, Value: $1,200, Unrealized Gain: $600, Realized Gain: $200, Day Change: +$2.00 (+11.11%).
- **Edge Case:** 100 shares @ $25 cost. No market price feed available.
  - *Expected:* `priced = false`, Value: $2,500, Gain: `null`, Return on Cost: `null`.

### `MK-NW-O-003`: `theNetWorth`
- **Easy Case 1:** Cash $10k, Stocks $50k, Credit Card -$5k.
  - *Expected:* Assets: $60,000, Debts: $5,000, Net Worth: $55,000.
- **Easy Case 2:** Property $500k, Mortgage -$300k, Cash $20k.
  - *Expected:* Assets: $520,000, Debts: $300,000, Net Worth: $220,000, Property/Mortgage Match: OK.
- **Complex Case 1:** Cash $15k, Stocks $100k, Bonds $40k, Alts $25k, Real Estate $300k, Mortgage -$200k, Auto -$15k.
  - *Expected:* Assets: $480,000, Debts: $215,000, Net Worth: $265,000, Investable: $180,000, Monthly Debt Min: $1,550.
- **Complex Case 2:** TWR Calculation (Start $10,000 -> Day 10 $10,500 [+$500 cash in = $11,000] -> Day 30 $11,550).
  - *Expected:* Sub-period 1 = +5.0%, Sub-period 2 = +5.0%, Total TWR = +10.25%.
- **Edge Case:** Empty profile (no assets, no debts).
  - *Expected:* Assets: $0, Debts: $0, Net Worth: $0.