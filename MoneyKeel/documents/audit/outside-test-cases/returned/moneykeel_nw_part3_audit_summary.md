# MoneyKeel Net Worth — Part 3 independent formula audit

**Scope:** 30 cards, 150 hand-worked test cases (60 Easy, 60 Complex, 30 Edge). This is a formula/specification audit of the supplied cards and main brief. The implementation source was not supplied, so no application-code execution is claimed.

## Executive findings

| Severity | Area | Cards |
|---|---|---|
| HIGH | Unknown-value propagation | MK-NW-F-066, MK-NW-F-091, MK-NW-F-094, MK-NW-F-112 |
| HIGH | Bond/CD calculations | MK-NW-F-063, MK-NW-F-064, MK-NW-F-069, MK-NW-F-070, MK-NW-F-072 |
| HIGH | Classification precedence | MK-NW-F-071, MK-NW-F-109, MK-NW-F-113 |
| HIGH | Performance window and returns | MK-NW-F-084, MK-NW-F-090, MK-NW-F-091, MK-NW-F-103, MK-NW-F-104, MK-NW-F-105 |
| MEDIUM | Property/debt relationship | MK-NW-F-106, MK-NW-F-107, MK-NW-F-110, MK-NW-F-115, MK-NW-F-116 |
| MEDIUM | Strict display/input helpers | MK-NW-F-067, MK-NW-F-068, MK-NW-F-108, MK-NW-F-111, MK-NW-F-114 |

### HIGH: Unknown-value propagation
Missing balance/rate/return must remain distinguishable from numeric zero. pricedGainOf returns null for the whole total if any positive holding has no knowable gain. The card says yearlyInterest returns null for missing rate, while the main brief says annual interest is counted as $0 and disclosed; verify this helper-vs-display distinction rather than flattening unknown into a known 0% yield.

### HIGH: Bond/CD calculations
Maturity, missing face/rate, bank-versus-broker CD treatment, priceAtYield, accrued interest and summary reconciliation interact. Exact pricing/sensitivity outputs require real helper execution; do not replace source conventions with a generic bond calculator.

### HIGH: Classification precedence
CD detection must ignore institution; money-market funds are Stocks / Funds, not cash; unclassified alternatives remainder is not “other” and must not receive a rate.

### HIGH: Performance window and returns
Window start, transaction category mapping, known-gain coverage, recorded investment dates, synthetic closing snapshot and no-return reasons need integrated regression tests. DEC-2440 says every return is time-weighted; this part covers adjacent support functions, not the full return engine.

### MEDIUM: Property/debt relationship
Mortgage/property mapping must not guess when ambiguous. Rent entries without a property identifier are excluded; primary-home fallback is conditional, not universal.

### MEDIUM: Strict display/input helpers
Plural word allow-list, timezone-independent date formatting, tax wording overrides, empty state null semantics, and strict rent parsing have explicit boundary conditions.

## Card-by-card review

### MK-NW-F-063 — `interestIncomeAnnual`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Check that missing rate remains unknown per yearlyInterest (null is distinct from explicit zero); no-date/impossible maturity is not considered matured. Confirm cash rate field shape. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Bond face × coupon rate** Inputs: `{"accounts":[{"kind":"bond","face_value":10000,"coupon_rate":0.04,"maturity_date":"2030-01-01"}],"now":"2026-10-13"}`. Expected: `400`. Hand check: $10,000 × 4% = $400.
- **2. Easy — Rate-paying cash account plus bond** Inputs: `{"accounts":[{"kind":"bond","face_value":20000,"coupon_rate":0.05,"maturity_date":"2030-01-01"},{"kind":"cash","balance":5000,"rate":0.02}],"now":"2026-10-13"}`. Expected: `1100`. Hand check: Bond $1,000 + cash $100 = $1,100.
- **3. Complex — Missing face falls back to balance** Inputs: `{"accounts":[{"kind":"bond","face_value":null,"balance":8000,"coupon_rate":0.03,"maturity_date":"2030-01-01"}],"now":"2026-10-13"}`. Expected: `240`. Hand check: No face, so $8,000 × 3% = $240.
- **4. Complex — Matured bond excluded; no date is not matured** Inputs: `{"accounts":[{"kind":"bond","face_value":10000,"coupon_rate":0.05,"maturity_date":"2026-01-01"},{"kind":"bond","face_value":5000,"coupon_rate":0.04,"maturity_date":null}],"now":"2026-10-13"}`. Expected: `200`. Hand check: Matured bond contributes $0; undated bond is not past maturity and contributes $5,000 × 4% = $200.
- **5. Edge — Unknown rates and non-bond non-cash assets add nothing** Inputs: `{"accounts":[{"kind":"bond","face_value":10000,"coupon_rate":null,"maturity_date":"2030-01-01"},{"kind":"stocks","balance":90000},{"kind":"cash","balance":2000,"rate":null}],"now":"2026-10-13"}`. Expected: `0`. Hand check: No known rate-paying eligible account; total $0.

### MK-NW-F-064 — `bondRateSensitivity`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** High-risk: rounding scale wording is ambiguous at thresholds; clarify whether “nearest $1,000 from $100,000” applies to range endpoints and delta separately. Broker-CD eligibility and bank-CD refusal must match DEC-3837. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Ordinary bond has a sensitivity estimate** Inputs: `{"bond":{"kind":"bond","face_value":10000,"coupon_rate":0.04,"maturity_date":"2030-10-13","market_value":10000,"ytm":0.04},"now":"2026-10-13"}`. Expected: `"Non-null sensitivity object; prices and rounded deltas from priceAtYield at 3.01%, 4%, 5%."`. Hand check: At least the face/rate/date/YTM prerequisites exist; calculate each scenario from priceAtYield, then apply scale-based rounding.
- **2. Easy — Bank CD refused with explicit reason** Inputs: `{"bond":{"kind":"cd","purchase_channel":"bank","face_value":10000,"coupon_rate":0.04,"maturity_date":"2028-10-13","market_value":10000,"ytm":0.04},"now":"2026-10-13"}`. Expected: `null`. Hand check: Bank-purchased CD is not priced like a bond; sensitivity returns null.
- **3. Complex — Broker CD eligible like bond** Inputs: `{"bond":{"kind":"cd","purchase_channel":"broker","face_value":10000,"coupon_rate":0.04,"maturity_date":"2028-10-13","market_value":9850,"ytm":0.05},"now":"2026-10-13"}`. Expected: `"Non-null sensitivity object"`. Hand check: Broker CD is priced like a bond; prerequisites are present. Exact outputs must use actual priceAtYield convention and helper implementation.
- **4. Complex — Missing or nonpositive face/rate refuses** Inputs: `{"bond":{"kind":"bond","face_value":null,"coupon_rate":0,"maturity_date":"2030-01-01","market_value":10000,"ytm":0.04},"now":"2026-10-13"}`. Expected: `null`. Hand check: Face is missing and coupon rate is not positive, either of which independently refuses sensitivity.
- **5. Edge — Matured or undated bond refuses** Inputs: `{"bond":{"kind":"bond","face_value":10000,"coupon_rate":0.04,"maturity_date":null,"market_value":10000,"ytm":0.04},"now":"2026-10-13"}`. Expected: `null`. Hand check: No maturity date means it cannot be priced; return null.

### MK-NW-F-065 — `buildNetWorth`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Formula is simple. Verify state field names and preserve negative net worth; no clamping. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Assets exceed debt** Inputs: `{"uid":"u1","grossAssets":125000,"grossDebt":25000}`. Expected: `{"totalAssets":125000,"totalDebt":25000,"netWorth":100000}`. Hand check: $125,000 − $25,000 = $100,000.
- **2. Easy — Debt exceeds assets** Inputs: `{"uid":"u1","grossAssets":20000,"grossDebt":45000}`. Expected: `{"totalAssets":20000,"totalDebt":45000,"netWorth":-25000}`. Hand check: $20,000 − $45,000 = −$25,000.
- **3. Complex — Zero totals** Inputs: `{"uid":"u1","grossAssets":0,"grossDebt":0}`. Expected: `{"totalAssets":0,"totalDebt":0,"netWorth":0}`. Hand check: 0 − 0 = 0.
- **4. Complex — Fractional cents preserve arithmetic per implementation precision** Inputs: `{"uid":"u1","grossAssets":100.25,"grossDebt":30.1}`. Expected: `{"totalAssets":100.25,"totalDebt":30.1,"netWorth":70.15}`. Hand check: $100.25 − $30.10 = $70.15; check rounding/storage behavior.
- **5. Edge — Negative debt input is not silently normalized** Inputs: `{"uid":"u1","grossAssets":1000,"grossDebt":-50}`. Expected: `{"totalAssets":1000,"totalDebt":-50,"netWorth":1050}`. Hand check: Formula is literal subtraction; this test detects hidden clamping/normalization.

### MK-NW-F-066 — `sumWhere`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Unknown-is-not-zero contract is explicit. Verify predicate is applied before counting missing values; negative and explicit zero balances must remain included. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Sum matching positive balances** Inputs: `{"accounts":[{"balance":100},{"balance":200},{"balance":50}],"predicate":"all"}`. Expected: `{"total":350,"missingCount":0}`. Hand check: $100 + $200 + $50 = $350.
- **2. Easy — No matching accounts** Inputs: `{"accounts":[{"balance":100}],"predicate":"none"}`. Expected: `{"total":0,"missingCount":0}`. Hand check: No account passes: total 0, no missing values.
- **3. Complex — Missing balance counted separately, not as zero** Inputs: `{"accounts":[{"balance":100},{"balance":null},{"balance":50}],"predicate":"all"}`. Expected: `{"total":150,"missingCount":1}`. Hand check: Known sum is $150; one selected account has no balance.
- **4. Complex — Negative balance is included** Inputs: `{"accounts":[{"balance":500},{"balance":-100}],"predicate":"all"}`. Expected: `{"total":400,"missingCount":0}`. Hand check: $500 + (−$100) = $400.
- **5. Edge — Missing and negative balances together** Inputs: `{"accounts":[{"balance":-25},{"balance":null},{"balance":0}],"predicate":"all"}`. Expected: `{"total":-25,"missingCount":1}`. Hand check: Known balances sum to −$25; missing count 1; explicit zero remains known zero.

### MK-NW-F-067 — `plural`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Plural list and unknown-word behavior are explicit. Release fallback differs from test/development; test environments/build mode matter. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Singular one** Inputs: `{"n":1,"word":"CD","shown":1}`. Expected: `"1 CD"`. Hand check: Exactly one takes singular noun.
- **2. Easy — Plural count** Inputs: `{"n":3,"word":"CD","shown":3}`. Expected: `"3 CDs"`. Hand check: Three takes plural form.
- **3. Complex — Special plural Treasury** Inputs: `{"n":2,"word":"Treasury","shown":"2"}`. Expected: `"2 Treasuries"`. Hand check: Treasury uses the declared special plural.
- **4. Complex — Zero plural and formatted shown value** Inputs: `{"n":0,"word":"property","shown":"0"}`. Expected: `"0 properties"`. Hand check: Zero is not exactly one; property → properties.
- **5. Edge — Unknown word is refused in test/development** Inputs: `{"n":2,"word":"widget","shown":2}`. Expected: `"throws in test/development; release returns \"2 widget\""`. Hand check: The word is outside PLURAL_WORDS; no guessed plural in tests/development.

### MK-NW-F-068 — `prettyDay`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Calendar parsing must not use timezone conversion; malformed ISO strings must return empty string. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — ISO date formats short month** Inputs: `{"iso":"2026-08-04"}`. Expected: `"Aug 4, 2026"`. Hand check: Calendar date formats as abbreviated month, day without leading zero, comma, year.
- **2. Easy — September is Sep, not Sept** Inputs: `{"iso":"2026-09-09"}`. Expected: `"Sep 9, 2026"`. Hand check: Explicit month abbreviation rule.
- **3. Complex — Leap day** Inputs: `{"iso":"2024-02-29"}`. Expected: `"Feb 29, 2024"`. Hand check: Valid leap day; preserve calendar date.
- **4. Complex — Impossible date gives empty string** Inputs: `{"iso":"2026-02-30"}`. Expected: `""`. Hand check: February 30 is invalid.
- **5. Edge — Empty date gives empty string** Inputs: `{"iso":""}`. Expected: `""`. Hand check: No date supplied.

### MK-NW-F-069 — `priceAtYield`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Independent calculation matches the stated annual approximation. Confirm exact fractional-year coupon schedule and anniversary/day-count convention, especially non-anniversary “now”. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Zero-coupon bond price** Inputs: `{"bond":{"face_value":1000,"coupon_rate":0,"maturity_date":"2027-10-13"},"yield":0.05,"now":"2026-10-13"}`. Expected: `952.38`. Hand check: t = 1 year; $1,000 / 1.05 = $952.38.
- **2. Easy — Annual coupon plus principal** Inputs: `{"bond":{"face_value":1000,"coupon_rate":0.05,"maturity_date":"2027-10-13"},"yield":0.05,"now":"2026-10-13"}`. Expected: `1000`. Hand check: t=1; coupon $50/1.05 plus principal $1,000/1.05 = $1,000.
- **3. Complex — Two years with coupon payments at anniversaries** Inputs: `{"bond":{"face_value":1000,"coupon_rate":0.04,"maturity_date":"2028-10-13"},"yield":0.05,"now":"2026-10-13"}`. Expected: `981.41`. Hand check: t=2; $40/1.05 + $1,040/1.05² = about $981.41.
- **4. Complex — Matured or undated returns null** Inputs: `{"bond":{"face_value":1000,"coupon_rate":0.05,"maturity_date":"2026-10-12"},"yield":0.05,"now":"2026-10-13"}`. Expected: `null`. Hand check: Past maturity; cannot price.
- **5. Edge — Invalid discount base returns null** Inputs: `{"bond":{"face_value":1000,"coupon_rate":0.05,"maturity_date":"2027-10-13"},"yield":-1,"now":"2026-10-13"}`. Expected: `null`. Hand check: 1 + yield = 0, so invalid discount base.

### MK-NW-F-070 — `accruedInterestCaveat`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** Exact caveat depends on estimatedAccrued and coupon-day logic. Need actual helper output for amount/days; bank CDs and actual accrued interest must suppress caveat. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — No caveat when actual accrued interest entered** Inputs: `{"bond":{"coupon_rate":0.04,"market_value":9900,"accrued_interest":120,"maturity_date":"2028-10-13","kind":"bond"},"now":"2026-10-13"}`. Expected: `null`. Hand check: Actual accrued interest is entered; no estimate caveat.
- **2. Easy — Estimated accrued interest yields explanatory caveat** Inputs: `{"bond":{"coupon_rate":0.04,"market_value":9900,"accrued_interest":null,"maturity_date":"2028-10-13","kind":"bond","estimated_accrued":40,"days_since_coupon":90},"now":"2026-10-13"}`. Expected: `"Added estimated $40 in accrued interest to bond value at 4% coupon for 90 days to calculate YTM. If this is not accurate, enter actual accrued interest."`. Hand check: Use supplied estimate, whole-dollar amount, rate and day count; exact punctuation/casing must match card text.
- **3. Complex — Bank CD excluded from estimate caveat** Inputs: `{"bond":{"kind":"cd","purchase_channel":"bank","coupon_rate":0.04,"market_value":10000,"accrued_interest":null,"maturity_date":"2028-10-13"},"now":"2026-10-13"}`. Expected: `null`. Hand check: Bank-purchased CD is excluded.
- **4. Complex — Coupon day excluded** Inputs: `{"bond":{"kind":"bond","coupon_rate":0.04,"market_value":9900,"accrued_interest":null,"maturity_date":"2028-10-13","is_coupon_day":true,"estimated_accrued":0},"now":"2026-10-13"}`. Expected: `null`. Hand check: Coupon day is an explicit exclusion.
- **5. Edge — Matured or no rate yields no estimate caveat** Inputs: `{"bond":{"kind":"bond","coupon_rate":null,"market_value":9900,"accrued_interest":null,"maturity_date":"2026-01-01"},"now":"2026-10-13"}`. Expected: `null`. Hand check: No usable coupon estimate and bond is matured.

### MK-NW-F-071 — `isCertificateOfDeposit`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Card says whole word “CD” and phrase matching; verify word-boundary behavior and whether kind field is normalized. Institution must not influence classification. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Kind explicitly CD** Inputs: `{"label":"Brokered deposit","kind":"cd","institution":"Example Bank"}`. Expected: `true`. Hand check: CD kind alone is sufficient.
- **2. Easy — Whole word CD in own label, case-insensitive** Inputs: `{"label":"My cd ladder","kind":"other","institution":"Bank"}`. Expected: `true`. Hand check: Own label contains whole word cd.
- **3. Complex — Certificate of deposit phrase in own label** Inputs: `{"label":"Certificate of Deposit 2028","kind":"other"}`. Expected: `true`. Hand check: Phrase matches without regard to capitalization.
- **4. Complex — Institution name alone must not trigger CD** Inputs: `{"label":"Taxable brokerage","kind":"investment","institution":"CD Capital"}`. Expected: `false`. Hand check: Institution is explicitly ignored.
- **5. Edge — Substring inside a larger word is not whole word** Inputs: `{"label":"CDsavings?","kind":"investment","institution":"Bank"}`. Expected: `false`. Hand check: The card requires whole word CD or certificate of deposit; confirm plural token boundary behavior against implementation.

### MK-NW-F-072 — `rowOf`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** Composition contract needs helper integration tests. Important: missing face/rate must remain not-entered, while past-maturity annual interest is $0 for summary reconciliation. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Bond row exposes face, rate, interest, maturity and value** Inputs: `{"account":{"label":"Treasury note","institution":"Treasury Direct","bond_info":{"face_value":10000,"coupon_rate":0.04,"maturity_date":"2028-10-13","market_value":9800}},"now":"2026-10-13"}`. Expected: `"Row with face 10000, rate 4%, yearly interest 400, maturity 2028-10-13, years left 2, value 9800."`. Hand check: Face × rate = $400; two calendar years remain; remaining fields depend on helper functions.
- **2. Easy — Missing face/rate remain not entered** Inputs: `{"account":{"label":"Bond X","bond_info":{"face_value":null,"coupon_rate":null,"maturity_date":"2030-01-01","market_value":5000}},"now":"2026-10-13"}`. Expected: `"Face and rate are not-entered states; annual interest not entered; no invented zero rate."`. Hand check: Missing metadata must remain distinguishable from explicit zero.
- **3. Complex — Past maturity row interest is zero and YTM absent** Inputs: `{"account":{"label":"Old bond","bond_info":{"face_value":10000,"coupon_rate":0.04,"maturity_date":"2026-01-01","market_value":10000}},"now":"2026-10-13"}`. Expected: `"yearly interest $0; years left 0; YTM absent"`. Hand check: Maturity passed; row-level interest is zero for reconciliation and YTM is unavailable.
- **4. Complex — Blank institution falls back to account name** Inputs: `{"account":{"label":"  My Bond  ","institution":"  ","bond_info":{"face_value":1000,"coupon_rate":0.03,"maturity_date":"2028-01-01","market_value":1000}},"now":"2026-10-13"}`. Expected: `"heading uses trimmed account name \"My Bond\""`. Hand check: Blank-after-trim institution falls back to account label.
- **5. Edge — Broker CD gets bond pricing and caveat only when applicable** Inputs: `{"account":{"label":"Broker CD","institution":"Broker","bond_info":{"kind":"cd","purchase_channel":"broker","face_value":10000,"coupon_rate":0.04,"maturity_date":"2028-10-13","market_value":9850,"accrued_interest":null}},"now":"2026-10-13"}`. Expected: `"isCD=true; pricedLikeBond=true; YTM calculated like bond; accrued-interest caveat evaluated"`. Hand check: Broker CD should not inherit bank-CD exemption. Exact YTM/caveat output needs helper integration.

### MK-NW-F-073 — `itemising`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Remainder is provisional if any item lacks value. Verify negative remainder behavior and do not label provisional remainder “unexplained”. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — All holdings priced; remainder final** Inputs: `{"lumpBalance":10000,"items":[{"value":4000},{"value":2500}]}`. Expected: `{"keepTotalAt":10000,"itemised":6500,"remainder":3500,"remainderFinal":true}`. Hand check: $4,000 + $2,500 = $6,500; $10,000 − $6,500 = $3,500.
- **2. Easy — One unpriced holding makes remainder non-final** Inputs: `{"lumpBalance":10000,"items":[{"value":4000},{"value":null}]}`. Expected: `{"keepTotalAt":10000,"itemised":4000,"remainder":6000,"remainderFinal":false}`. Hand check: Known item sum $4,000; remainder arithmetic $6,000 is provisional and must not be called unexplained.
- **3. Complex — Items exceed lump total creates negative remainder** Inputs: `{"lumpBalance":10000,"items":[{"value":7000},{"value":4000}]}`. Expected: `{"keepTotalAt":10000,"itemised":11000,"remainder":-1000,"remainderFinal":true}`. Hand check: $10,000 − $11,000 = −$1,000; do not silently clamp without a rule.
- **4. Complex — Empty items leaves full balance remainder** Inputs: `{"lumpBalance":7500,"items":[]}`. Expected: `{"keepTotalAt":7500,"itemised":0,"remainder":7500,"remainderFinal":true}`. Hand check: No item values; sum is zero and no holding is missing.
- **5. Edge — Explicit zero item is valued, missing item is not** Inputs: `{"lumpBalance":5000,"items":[{"value":0},{"value":null}]}`. Expected: `{"keepTotalAt":5000,"itemised":0,"remainder":5000,"remainderFinal":false}`. Hand check: Known zero adds zero; second item makes remainder non-final.

### MK-NW-F-084 — `categoryEarnings`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** Complex branching across transaction ticker, transaction type, category, holding returns, dayOne, and bond-rate fallback. Verify amounts normalized positive and date boundary inclusive. Source alone does not define exact CategoryEarned schema. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Ticker dividend maps to holding class and positive income** Inputs: `{"transactions":[{"type":"dividend","ticker":"ABC","amount":25,"date":"2026-01-15"}],"windowStart":"2026-01-01","rows":[{"position":{"ticker":"ABC","asset_class":"Stocks / Funds"},"marketValue":1000,"periodReturn":0.1,"periodTotal":100}],"dayOne":false}`. Expected: `"Stocks / Funds income $25; return calculated from qualifying rows (about 10% for this row)"`. Hand check: Dividend with ticker maps to matching holding category; positive amount included.
- **2. Easy — Ticker with no holding: dividend stocks, interest bonds** Inputs: `{"transactions":[{"type":"dividend","ticker":"MISS","amount":10,"date":"2026-01-15"},{"type":"interest","ticker":"MISS","amount":20,"date":"2026-01-16"}],"windowStart":"2026-01-01","rows":[],"dayOne":false}`. Expected: `"Stocks / Funds earnings $10; Bonds & CDs earnings $20"`. Hand check: Missing holding uses transaction-type-specific fallback.
- **3. Complex — Undated/out-of-window records excluded; amounts taken positive** Inputs: `{"transactions":[{"type":"dividend","ticker":"ABC","amount":-10,"date":"2025-12-31"},{"type":"dividend","ticker":"ABC","amount":5,"date":"2026-01-01"}],"windowStart":"2026-01-01","rows":[],"dayOne":false}`. Expected: `"Stocks / Funds income $5 only"`. Hand check: First day is included; earlier record excluded; use positive amount per card.
- **4. Complex — Day one returns all three categories with zero** Inputs: `{"transactions":[],"windowStart":"2026-01-01","rows":[],"dayOne":true}`. Expected: `"Three categories returned, each with $0 and no return"`. Hand check: Day-one structural rule overrides omission of empty categories.
- **5. Edge — No eligible positive return rows yields no category return; yearly bond rate fallback** Inputs: `{"transactions":[{"type":"interest","amount":100,"date":"2026-02-01","account_id":"b1"}],"windowStart":"2026-01-01","rows":[{"position":{"kind":"bond","asset_class":"Bonds & CDs"},"marketValue":0,"periodReturn":null}],"bonds":[{"asset_id":"b1","balance":10000,"coupon_rate":0.04}],"dayOne":false}`. Expected: `"Bonds & CDs shows stated yearly rate 4% when all qualifying bond accounts with balances have rates and no bond is held as a holding"`. Hand check: Fallback is a balance-weighted stated annual rate, not an invented period return.

### MK-NW-F-090 — `windowStartKey`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Date arithmetic has known end-of-month clamp. Validate leap-year/month-end and Since future cap. Unknown labels deliberately default to 12 months. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — This year starts January 1** Inputs: `{"period":"This year","recordDates":["2026-01-03"],"today":"2026-10-13"}`. Expected: `"2026-01-01"`. Hand check: This year is Jan 1 of today year.
- **2. Easy — One month back from month end clamps to prior month end** Inputs: `{"period":"1M","recordDates":[],"today":"2026-03-31"}`. Expected: `"2026-02-28"`. Hand check: No rollover to March 3; clamp to Feb 28.
- **3. Complex — Since starts after earliest record but not after today** Inputs: `{"period":"Since","recordDates":["2025-04-02","2025-06-15"],"today":"2026-10-13"}`. Expected: `"2025-04-03"`. Hand check: Earliest date + one day.
- **4. Complex — Since with future earliest date caps at today** Inputs: `{"period":"Since","recordDates":["2027-01-01"],"today":"2026-10-13"}`. Expected: `"2026-10-13"`. Hand check: The day after earliest would be future; cap at today.
- **5. Edge — Unknown label defaults to 12 months back** Inputs: `{"period":"weird","recordDates":[],"today":"2024-02-29"}`. Expected: `"2023-02-28"`. Hand check: Fallback is 12 months with day clamped to month end.

### MK-NW-F-091 — `pricedGainOf`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** DEC-3656 critical unknown propagation: one positive-value holding without return/rate makes whole gain null, not partial sum. Check bought-within-period takes precedence. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Bought within period uses whole gain** Inputs: `{"rows":[{"boughtWithinPeriod":true,"marketValue":1200,"cost":1000,"periodReturn":null}],"years":1}`. Expected: `200`. Hand check: $1,200 − $1,000 = $200.
- **2. Easy — Known period return uses today value less reconstructed start value** Inputs: `{"rows":[{"marketValue":1100,"periodReturn":0.1,"boughtWithinPeriod":false}],"years":1}`. Expected: `100`. Hand check: $1,100 × (1 − 1/1.1) = $100.
- **3. Complex — Rate-only CD uses compound annual rate over years** Inputs: `{"rows":[{"marketValue":1040,"periodReturn":null,"annualRate":0.04,"isCD":true}],"years":1}`. Expected: `40`. Hand check: $1,040 × (1 − 1/1.04) = $40 exactly.
- **4. Complex — Unknown gain on any positive holding makes whole total unknown** Inputs: `{"rows":[{"marketValue":1100,"periodReturn":0.1},{"marketValue":500,"periodReturn":null,"annualRate":null,"isCD":false}],"years":1}`. Expected: `null`. Hand check: Second holding has positive value but no return or eligible rate; whole total is null, not $100.
- **5. Edge — Empty holdings gain nothing** Inputs: `{"rows":[],"years":1}`. Expected: `0`. Hand check: No holdings exist to contribute; total is known zero.

### MK-NW-F-092 — `investmentAccountIdsOf`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Confirm ID stringification and missing-ID handling; included classes exactly Stocks / Funds, Bonds & CDs, Alternatives, Unclassified. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Investment classes included** Inputs: `{"accounts":[{"asset_id":"a"},{"asset_id":"b"},{"asset_id":"c"},{"asset_id":"d"}],"classes":{"a":"Stocks / Funds","b":"Bonds & CDs","c":"Alternatives","d":"Unclassified"}}`. Expected: `["a","b","c","d"]`. Hand check: All four classes are included.
- **2. Easy — Cash and real estate excluded** Inputs: `{"accounts":[{"asset_id":"cash"},{"asset_id":"home"},{"asset_id":"fund"}],"classes":{"cash":"Cash","home":"Real estate","fund":"Stocks / Funds"}}`. Expected: `["fund"]`. Hand check: Only Stocks / Funds is an investment class.
- **3. Complex — Mixed ids are string-normalized** Inputs: `{"accounts":[{"asset_id":123},{"asset_id":"x"}],"classes":{"123":"Unclassified","x":"Cash"}}`. Expected: `["123"]`. Hand check: Set<string> means numeric ID should be stringified; verify actual conversion.
- **4. Complex — Missing id does not create accidental undefined entry** Inputs: `{"accounts":[{"asset_id":null},{"asset_id":"ok"}],"classes":{"ok":"Alternatives"}}`. Expected: `["ok"]`. Hand check: Only a qualifying account with a usable id belongs in the set.
- **5. Edge — Unknown class is not implicitly investment class** Inputs: `{"accounts":[{"asset_id":"x"}],"classes":{"x":"Other unknown"}}`. Expected: `[]`. Hand check: Only the four listed class labels are included.

### MK-NW-F-094 — `ledgerGroups`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** Group totals must reconcile both views and class splits. Main concern: how unknown account balances are represented; never quietly turn missing into $0 or break total reconciliation. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Class grouping totals rows** Inputs: `{"accounts":[{"asset_id":"a","label":"A","balance":100,"class":"Cash"},{"asset_id":"b","label":"B","balance":200,"class":"Stocks / Funds"}],"by":"class"}`. Expected: `[{"group":"Cash","total":100},{"group":"Stocks / Funds","total":200}]`. Hand check: Each account appears in its class; group totals equal row sums.
- **2. Easy — Class split appears in each class at split amount** Inputs: `{"accounts":[{"asset_id":"a","label":"A","balance":1000,"classSplit":{"Stocks / Funds":600,"Bonds & CDs":400}}],"by":"class"}`. Expected: `[{"group":"Stocks / Funds","total":600},{"group":"Bonds & CDs","total":400}]`. Hand check: Split parts add to $1,000 and appear in both class groups.
- **3. Complex — Institution grouping trims and ignores case** Inputs: `{"accounts":[{"asset_id":"a","institution":" Vanguard ","balance":100,"class":"Cash"},{"asset_id":"b","institution":"vanguard","balance":200,"class":"Stocks / Funds"}],"by":"institution"}`. Expected: `[{"group":"Vanguard","total":300,"classes":{"Cash":100,"Stocks / Funds":200}}]`. Hand check: Normalized same institution group; preserve first spelling seen.
- **4. Complex — Missing institution gets No institution set** Inputs: `{"accounts":[{"asset_id":"a","institution":" ","balance":50,"class":"Unclassified"}],"by":"institution"}`. Expected: `[{"group":"No institution set","total":50,"classes":{"Unclassified":50}}]`. Hand check: Blank trimmed institution uses fallback group.
- **5. Edge — Unknown balance cannot be fabricated into row or total** Inputs: `{"accounts":[{"asset_id":"a","institution":"Bank","balance":null,"class":"Cash"},{"asset_id":"b","institution":"Bank","balance":100,"class":"Cash"}],"by":"institution"}`. Expected: `"Known total 100 plus missing-value state retained; no silent $0 row"`. Hand check: Check against unknown-is-not-zero invariant; card does not spell out exact missing-value shape.

### MK-NW-F-103 — `investmentRecordDates`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Deduplicate dates and sort chronologically; account membership must be by ID intersection and only days with values for named accounts. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Returns unique dates with values for named accounts** Inputs: `{"snapshotDays":[{"date":"2026-01-01","values":{"a":100}},{"date":"2026-01-02","values":{"a":110}},{"date":"2026-01-02","values":{"b":50}}],"investmentAccountIds":["a"]}`. Expected: `["2026-01-01","2026-01-02"]`. Hand check: Both recorded days hold value for account a; output oldest first.
- **2. Easy — Exclude days only for unrelated accounts** Inputs: `{"snapshotDays":[{"date":"2026-01-01","values":{"x":100}},{"date":"2026-01-02","values":{"a":50}}],"investmentAccountIds":["a"]}`. Expected: `["2026-01-02"]`. Hand check: Only second day includes named account a.
- **3. Complex — Sort chronological not input order** Inputs: `{"snapshotDays":[{"date":"2026-03-01","values":{"a":3}},{"date":"2026-01-01","values":{"a":1}},{"date":"2026-02-01","values":{"a":2}}],"investmentAccountIds":["a"]}`. Expected: `["2026-01-01","2026-02-01","2026-03-01"]`. Hand check: Sort oldest to newest.
- **4. Complex — No named accounts returns empty** Inputs: `{"snapshotDays":[{"date":"2026-01-01","values":{"a":1}}],"investmentAccountIds":[]}`. Expected: `[]`. Hand check: No account IDs means no day qualifies.
- **5. Edge — Named account but no snapshot value returns empty** Inputs: `{"snapshotDays":[{"date":"2026-01-01","values":{"x":1}}],"investmentAccountIds":["a"]}`. Expected: `[]`. Hand check: No recorded day holds a value for account a.

### MK-NW-F-104 — `closedWith`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** The card’s “carrying between them the ending value” is under-specified for multiple accounts: exact allocation/schema is not described. Claude must inspect caller and actual shape before asserting exact output. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Adds today row from latest earlier day** Inputs: `{"days":[{"date":"2026-10-10","values":{"a":100,"b":50}}],"ids":["a","b"],"today":"2026-10-13","ending":180}`. Expected: `"Original rows plus today row for a and b with total ending value 180"`. Hand check: Caller-provided ending value is attached across latest earlier day accounts; exact distribution/schema must be verified.
- **2. Easy — No earlier day returns unchanged** Inputs: `{"days":[],"ids":["a"],"today":"2026-10-13","ending":100}`. Expected: `[]`. Hand check: No prior day; unchanged empty record.
- **3. Complex — Earlier day contains none of named accounts returns unchanged** Inputs: `{"days":[{"date":"2026-10-10","values":{"x":100}}],"ids":["a"],"today":"2026-10-13","ending":100}`. Expected: `"Input days unchanged"`. Hand check: No eligible prior account in latest earlier day.
- **4. Complex — Only latest earlier accounts carried forward** Inputs: `{"days":[{"date":"2026-10-09","values":{"a":80}},{"date":"2026-10-12","values":{"b":90}}],"ids":["a","b"],"today":"2026-10-13","ending":110}`. Expected: `"Today row covers b, not stale a"`. Hand check: Use the latest earlier recorded day, not union of historical accounts.
- **5. Edge — No arithmetic applied to ending value** Inputs: `{"days":[{"date":"2026-10-12","values":{"a":100}}],"ids":["a"],"today":"2026-10-13","ending":75}`. Expected: `"Today ending total 75; no clamp/refusal even below previous 100"`. Hand check: This helper only constructs the record; losses are allowed.

### MK-NW-F-105 — `whyNoReturn`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Text mappings need exact enum values and localization/punctuation confirmation. DEC-4439 makes below-deposit ending value a measured loss, not a refusal. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — No verdict gives empty explanation** Inputs: `{"verdict":null}`. Expected: `""`. Hand check: Null verdict means no explanation text.
- **2. Easy — Movement on day without value identifies day** Inputs: `{"verdict":{"reason":"movement_without_value","date":"2026-05-04"}}`. Expected: `"Sentence says return cannot be measured across May 4, 2026"`. Hand check: A dated movement without recorded value requires a dated refusal sentence.
- **3. Complex — Undated movement names missing date** Inputs: `{"verdict":{"reason":"movement_without_date"}}`. Expected: `"Sentence says movement has no date and return cannot be measured"`. Hand check: Movement with no date is distinct from movement on a specific day.
- **4. Complex — Value below deposit is measured loss, no sentence** Inputs: `{"verdict":{"reason":"value_below_money_added","date":"2026-05-04","measured":true}}`. Expected: `""`. Hand check: DEC-4439 says a value below money added is a measured loss, not refusal.
- **5. Edge — Uncovered beginning is not handled here** Inputs: `{"verdict":{"reason":"beginning_not_covered"}}`. Expected: `""`. Hand check: Card says beginning not readable has no sentence here; period is shown as not covered.

### MK-NW-F-106 — `mortgagesByProperty`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** Mortgage matching is intentionally conservative. Verify precedence of explicit property_id vs prefix inference, uniqueness checks, and deterministic unmatched list ordering. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Single mortgage matched to named property** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","label":"Home"},{"asset_id":"p2","class":"Real estate","label":"Cabin"}],"debts":[{"debt_id":"m1","type":"mortgage","property_id":"p1","label":"Home mortgage","minimum_payment":1500}]}`. Expected: `{"propertyCount":2,"mortgageCount":1,"unmatched":[],"p1":"m1","p2":null}`. Hand check: Named existing property p1 receives mortgage; p2 remains mortgage-free.
- **2. Easy — Named property already assigned: second mortgage stays unmatched** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","label":"Home"}],"debts":[{"debt_id":"m1","type":"mortgage","property_id":"p1","label":"First"},{"debt_id":"m2","type":"mortgage","property_id":"p1","label":"Second"}]}`. Expected: `{"propertyCount":1,"mortgageCount":2,"unmatched":["m2"]}`. Hand check: First eligible mortgage takes p1; second cannot double-assign property.
- **3. Complex — One unassigned mortgage and one free property gets unique match** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","label":"Cabin"}],"debts":[{"debt_id":"m1","type":"mortgage","property_id":null,"label":"Cabin mortgage"}]}`. Expected: `{"p1":"m1","unmatched":[]}`. Hand check: Exactly one property and one unassigned mortgage remain; assign unique match.
- **4. Complex — Multiple possible free properties leaves mortgage unmatched** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","label":"Home"},{"asset_id":"p2","class":"Real estate","label":"Cabin"}],"debts":[{"debt_id":"m1","type":"mortgage","property_id":null,"label":"Loan"}]}`. Expected: `{"unmatched":["m1"],"p1":null,"p2":null}`. Hand check: No unique answer; do not guess.
- **5. Edge — Non-mortgage debts excluded; no property means mortgage unmatched** Inputs: `{"accounts":[],"debts":[{"debt_id":"d1","type":"credit_card"},{"debt_id":"m1","type":"mortgage","property_id":null}]}`. Expected: `{"propertyCount":0,"mortgageCount":1,"unmatched":["m1"]}`. Hand check: Only mortgage debts counted; a mortgage cannot be attached without property.

### MK-NW-F-107 — `propertyUses`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** Potential ambiguity: rent entry naming no property can only promote a remaining property when exactly one; exact precedence between stored use, HOME, and rent map needs source-level validation. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Rent entry makes named property rental** Inputs: `{"accounts":[{"asset_id":"p1","kind":"property","use":null}],"rentals":[{"property_id":"p1","income":1500,"expenses":0}]}`. Expected: `{"p1":"RENTAL"}`. Hand check: Live rent entry names p1; property is rental.
- **2. Easy — No rent and no use: first property is home** Inputs: `{"accounts":[{"asset_id":"p1","kind":"property","use":null},{"asset_id":"p2","kind":"property","use":null}],"rentals":[]}`. Expected: `{"p1":"HOME","p2":"SECOND"}`. Hand check: When none marked and no use stated, first entered is home; remaining property second.
- **3. Complex — Stored rental fallback only when no rent entries supplied** Inputs: `{"accounts":[{"asset_id":"p1","kind":"property","use":"rental"}],"rentals":null}`. Expected: `{"p1":"RENTAL"}`. Hand check: No rent entries handed in at all allows stored rental state.
- **4. Complex — Rent entry naming no property only promotes unique remaining property** Inputs: `{"accounts":[{"asset_id":"p1","kind":"property","use":"HOME"},{"asset_id":"p2","kind":"property","use":"SECOND"}],"rentals":[{"property_id":null,"income":1000}]}`. Expected: `{"p1":"HOME","p2":"SECOND"}`. Hand check: No property identifier is not directly attached; ambiguity/remaining-property condition must be evaluated carefully.
- **5. Edge — No properties returns empty map** Inputs: `{"accounts":[{"asset_id":"cash","kind":"cash"}],"rentals":[]}`. Expected: `{}`. Hand check: No real-estate accounts means no property-use entries.

### MK-NW-F-108 — `taxWordsOf`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** 529 and HSA override conflicting tax-treatment data. Missing treatment stays “tax type not stated”; do not infer tax status from wrapper. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — 529 always tax-free for education** Inputs: `{"account":{"kind":"529","tax_treatment":"taxable","tax_bucket":"taxable"}}`. Expected: `"tax-free for education"`. Hand check: 529 type overrides conflicting treatment.
- **2. Easy — HSA always pre-tax, tax-free for medical costs** Inputs: `{"account":{"kind":"HSA","tax_treatment":"taxable","tax_bucket":"Roth"}}`. Expected: `"pre-tax — tax-free for medical costs"`. Hand check: HSA type overrides conflicting treatment.
- **3. Complex — Unstated treatment stays unstated** Inputs: `{"account":{"kind":"IRA","tax_treatment":null,"tax_bucket":"pre-tax"}}`. Expected: `"tax type not stated"`. Hand check: No treatment is not guessed from wrapper.
- **4. Complex — Tax-deferred account words** Inputs: `{"account":{"kind":"401k","tax_treatment":"tax-deferred","tax_bucket":"pre-tax"}}`. Expected: `"pre-tax — taxed when it comes out"`. Hand check: Tax-deferred mapping.
- **5. Edge — Tax-free wording depends on Roth bucket** Inputs: `{"account":{"kind":"brokerage","tax_treatment":"tax-free","tax_bucket":"Roth"}}`. Expected: `"tax-free (Roth)"`. Hand check: Roth bucket adds parenthetical; other buckets say tax-free.

### MK-NW-F-109 — `holdingClassOf`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** High-risk precedence ordering: user answer > asked-but-unanswered > ticker/name evidence (except cash) > stored class/fallback. Money market is never cash; no guessed Stocks / Funds. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Stored person answer wins** Inputs: `{"holding":{"user_asset_class":"Bonds & CDs","classification_asked":false,"stored_class":"Stocks / Funds","ticker":"ABC","name":"ABC fund"}}`. Expected: `"Bonds & CDs"`. Hand check: User-provided answer takes precedence.
- **2. Easy — Asked-but-unanswered is Unclassified** Inputs: `{"holding":{"user_asset_class":null,"classification_asked":true,"stored_class":"Stocks / Funds","ticker":"ABC","name":"ABC fund"}}`. Expected: `"Unclassified"`. Hand check: Marked as asked forces Unclassified when no answer stored.
- **3. Complex — Ticker/name evidence makes money market Stocks / Funds, not cash** Inputs: `{"holding":{"user_asset_class":null,"classification_asked":false,"stored_class":"Cash","ticker":"VMFXX","name":"Money Market Fund"}}`. Expected: `"Stocks / Funds"`. Hand check: Money-market fund is explicitly investment, regardless of cash tag.
- **4. Complex — CD or T-bill evidence means Bonds & CDs** Inputs: `{"holding":{"user_asset_class":null,"classification_asked":false,"stored_class":"Stocks / Funds","ticker":null,"name":"Treasury bill"}}`. Expected: `"Bonds & CDs"`. Hand check: T-bill evidence overrides generic stored class.
- **5. Edge — No stored class and no cash name stays Unclassified** Inputs: `{"holding":{"user_asset_class":null,"classification_asked":false,"stored_class":null,"ticker":null,"name":"Mystery holding"}}`. Expected: `"Unclassified"`. Hand check: Never guess Stocks / Funds from absence of metadata.

### MK-NW-F-110 — `primaryHomeIdOf`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Uses propertyUseMap and rental entries. Fallback to first property applies only when none marked and no use stated on any; otherwise null if no HOME. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Explicit home is selected** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","use":"SECOND"},{"asset_id":"p2","class":"Real estate","use":"HOME"}],"rentals":[]}`. Expected: `"p2"`. Hand check: The property marked HOME is primary.
- **2. Easy — No use stated anywhere: first entered property is home** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","use":null},{"asset_id":"p2","class":"Real estate","use":null}]}`. Expected: `"p1"`. Hand check: Fallback to first property only when none marked and no use stated.
- **3. Complex — No home and some other use stated: return null** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","use":"SECOND"}]}`. Expected: `null`. Hand check: No explicit home and not all use fields blank; no fallback home.
- **4. Complex — Rent entries are passed through property-use rule** Inputs: `{"accounts":[{"asset_id":"p1","class":"Real estate","use":null},{"asset_id":"p2","class":"Real estate","use":null}],"rentals":[{"property_id":"p2","income":1000}]}`. Expected: `null`. Hand check: p2 is rental, so absent a HOME mark and not all uses blank, do not infer home; primaryHomeIdOf returns null.
- **5. Edge — No properties returns null** Inputs: `{"accounts":[{"asset_id":"cash","class":"Cash"}]}`. Expected: `null`. Hand check: Household has no real estate account.

### MK-NW-F-111 — `assetsStateFrom`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Empty or all-deleted accounts must yield null, not zero-valued AssetsState or blended return. Confirm deleted-account filtering and record schema. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Null document returns null** Inputs: `{"uid":"u1","d":null}`. Expected: `null`. Hand check: No saved record.
- **2. Easy — Undefined document returns null** Inputs: `{"uid":"u1"}`. Expected: `null`. Hand check: No saved record.
- **3. Complex — Saved record with empty accounts returns null** Inputs: `{"uid":"u1","d":{"accounts":[]}}`. Expected: `null`. Hand check: An empty list is not a $0 state.
- **4. Complex — Saved record with accounts returns built state** Inputs: `{"uid":"u1","d":{"accounts":[{"asset_id":"a","balance":100}]}}`. Expected: `"buildAssetsState(uid, accounts)"`. Hand check: Nonempty saved account list delegates to buildAssetsState.
- **5. Edge — Every account deleted returns null** Inputs: `{"uid":"u1","d":{"accounts":[],"deleted_accounts":["a"]}}`. Expected: `null`. Hand check: Saved record holds no active accounts.

### MK-NW-F-112 — `yearlyInterest`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Function-level contract returns null for a missing rate, while the main brief says the displayed annual interest is counted as $0 and the app says so (A46). Treat this as a layer distinction to verify: null at helper level must not become a fabricated yield, and the row/screen must explicitly explain the zero contribution. Explicit zero rate returns numeric 0. Face fallback to market value is intentional. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Face times coupon rate** Inputs: `{"bond":{"face_value":10000,"coupon_rate":0.04,"market_value":9800}}`. Expected: `400`. Hand check: $10,000 × 4% = $400.
- **2. Easy — Missing face falls back to current value** Inputs: `{"bond":{"face_value":null,"coupon_rate":0.03,"market_value":8000}}`. Expected: `240`. Hand check: No face entered: $8,000 × 3% = $240.
- **3. Complex — Missing rate returns null, not zero** Inputs: `{"bond":{"face_value":10000,"coupon_rate":null,"market_value":10000}}`. Expected: `null`. Hand check: Rate unknown means yearly interest unknown.
- **4. Complex — Explicit zero rate is known zero** Inputs: `{"bond":{"face_value":10000,"coupon_rate":0,"market_value":10000}}`. Expected: `0`. Hand check: Rate is entered as zero, so yearly interest is zero.
- **5. Edge — Negative rate is literal if accepted by schema** Inputs: `{"bond":{"face_value":10000,"coupon_rate":-0.01,"market_value":10000}}`. Expected: `-100`. Hand check: Formula states face × rate; check whether schema permits negative coupon rates.

### MK-NW-F-113 — `altPartsOf`
**Formula verdict:** INCOMPLETE_SPECIFICATION_OR_INTEGRATION_RISK
**Review:** Alternatives remainder > half cent either way is unclassified and must receive no assumed rate. Verify value reconciliation, option market value field, and name-based inference order. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Alternative account uses own kind and split part** Inputs: `{"account":{"asset_id":"a","kind":"crypto","balance":1000,"classSplit":{"Alternatives":800}}}`. Expected: `[{"value":800,"kind":"crypto"}]`. Hand check: Alternatives account contributes its alternatives split at its own kind.
- **2. Easy — Option positions use synced values and options kind** Inputs: `{"account":{"asset_id":"a","kind":"brokerage","balance":1000,"options":[{"market_value":250}],"holdings":[]}}`. Expected: `[{"value":250,"kind":"options"}]`. Hand check: Option contributes its synced value and kind options.
- **3. Complex — Crypto/commodity holding kind inferred from name** Inputs: `{"account":{"kind":"brokerage","holdings":[{"name":"Bitcoin","quantity":2,"price":100},{"name":"Gold bullion","quantity":3,"price":50}]}}`. Expected: `[{"value":200,"kind":"crypto"},{"value":150,"kind":"commodities"}]`. Hand check: Bitcoin 2×100=$200 crypto; Gold 3×50=$150 commodities.
- **4. Complex — Remainder above half cent is unclassified, no rate** Inputs: `{"account":{"kind":"brokerage","balance":1000,"classSplit":{"Alternatives":400},"holdings":[],"options":[]}}`. Expected: `[{"value":400,"kind":null,"classification":"asset type not classified"}]`. Hand check: Any alternatives portion not accounted for by named holdings/options remains unclassified, not other.
- **5. Edge — No alternatives returns empty list** Inputs: `{"account":{"kind":"brokerage","balance":1000,"classSplit":{"Stocks / Funds":1000},"holdings":[],"options":[]}}`. Expected: `[]`. Hand check: No alternatives part exists.

### MK-NW-F-114 — `rentAmount`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Strict parser must reject text such as “about 2k”, “n/a”, and minus sign rather than extracting digits; accepted formatting permits one decimal and currency separators. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Plain integer string accepted** Inputs: `{"v":"2000"}`. Expected: `2000`. Hand check: Digits only string converts to number.
- **2. Easy — Dollar sign, comma and spaces accepted** Inputs: `{"v":" $2,500.50 "}`. Expected: `2500.5`. Hand check: Allowed currency formatting is stripped; numeric value 2500.50.
- **3. Complex — Text with digits is rejected** Inputs: `{"v":"about 2k"}`. Expected: `0`. Hand check: Letters make the entire figure unreadable; never extract 2.
- **4. Complex — Minus sign and n/a rejected** Inputs: `{"v":"-100"}`. Expected: `0`. Hand check: Minus sign is prohibited by the stated rule; not entered → 0.
- **5. Edge — Multiple decimals rejected** Inputs: `{"v":"1.2.3"}`. Expected: `0`. Hand check: Not a plain number with at most one decimal point.

### MK-NW-F-115 — `liveRent`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Only named property and positive income OR expenses qualifies. Null/missing property id is excluded even if figures are positive. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Named property with positive income is live** Inputs: `{"rentals":[{"property_id":"p1","income":1500,"expenses":0}]}`. Expected: `[{"property_id":"p1","income":1500,"expenses":0}]`. Hand check: Property id is nonblank and income > 0.
- **2. Easy — Named property with positive costs is live** Inputs: `{"rentals":[{"property_id":"p2","income":0,"expenses":300}]}`. Expected: `[{"property_id":"p2","income":0,"expenses":300}]`. Hand check: Positive expenses qualify even with zero income.
- **3. Complex — No property identifier is excluded despite figures** Inputs: `{"rentals":[{"property_id":null,"income":1500,"expenses":300}]}`. Expected: `[]`. Hand check: Unattached rent entry is not rent.
- **4. Complex — Zero and negative values do not qualify** Inputs: `{"rentals":[{"property_id":"p1","income":0,"expenses":0},{"property_id":"p2","income":-1,"expenses":-2}]}`. Expected: `[]`. Hand check: Neither income nor expenses is above zero.
- **5. Edge — Null rentals returns empty list** Inputs: `{"rentals":null}`. Expected: `[]`. Hand check: No rent entries.

### MK-NW-F-116 — `rentedIdsOf`
**Formula verdict:** CONSISTENT_WITH_CARD_AND_RULES
**Review:** Depends entirely on liveRent. Confirm output uniqueness/order contract for property IDs; card says identifiers but not whether array or Set. The supplied card is a specification, not implementation evidence; run against source before calling this a reproduced bug.
**Cases:**
- **1. Easy — Returns ids from live rent entries** Inputs: `{"rentals":[{"property_id":"p1","income":100},{"property_id":"p2","expenses":50}]}`. Expected: `["p1","p2"]`. Hand check: Each live entry contributes its named property identifier.
- **2. Easy — Duplicate property ids collapse** Inputs: `{"rentals":[{"property_id":"p1","income":100},{"property_id":"p1","expenses":50}]}`. Expected: `["p1"]`. Hand check: Output is identifiers; expected unique set/list normalization should be confirmed.
- **3. Complex — Unattached rent excluded via liveRent** Inputs: `{"rentals":[{"property_id":null,"income":1000},{"property_id":"p1","income":100}]}`. Expected: `["p1"]`. Hand check: Entry without property id is not live rent.
- **4. Complex — Zero income and zero expense excluded** Inputs: `{"rentals":[{"property_id":"p1","income":0,"expenses":0}]}`. Expected: `[]`. Hand check: No positive income/cost, so liveRent excludes it.
- **5. Edge — Missing rentals returns empty** Inputs: `{"rentals":null}`. Expected: `[]`. Hand check: No live entries to extract ids.

## Limits and required next step

The cards describe intended behavior but are not the application source. Several test cases necessarily use conceptual inputs or schematic expected shapes because the TypeScript interfaces/helper contracts are not included in the cards. Claude Code must map these to actual signatures, preserve intent, and report any ambiguity as BLOCKED rather than silently changing an expected result. Bond pricing/sensitivity and category earnings should be checked by executing the real helper chain.

See the companion Claude Code brief for the required execution protocol.