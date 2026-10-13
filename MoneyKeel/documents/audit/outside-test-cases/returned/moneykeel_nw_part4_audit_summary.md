# MoneyKeel Net Worth — Part 4 independent audit summary

**Batch:** `nw module final — part 4`  
**Coverage:** 29 cards (21 functions + 8 orchestrators), 145 hand-worked test cases.  
**Case mix:** 58 Easy, 58 Complex, 29 Edge.

## Executive conclusion

Part 4 is materially integration-heavy. The highest-risk issues are time-weighted performance return refusal paths, emergency-fund treatment of debt and rent, bond/CD price-basis distinctions, and property-use fallback semantics. The cards describe intended behavior; they do not prove that the code implements it. The implementation repository was not supplied, so no application test was executed.

## Findings by priority

### CRITICAL — Property use and rent semantics
**Cards:** MK-NW-F-117, MK-NW-O-004
Stored rental fallback is allowed only when rent entries were not handed in (unknown), while DEC-1926 states rental requires a rent entry naming the property. Confirm null/unavailable versus empty list semantics explicitly; do not silently equate missing data with no rent.

### CRITICAL — Time-weighted return / unknown gain
**Cards:** MK-NW-O-003, MK-NW-O-008, MK-NW-F-127, MK-NW-F-128, MK-NW-F-130
All returns must be time-weighted. If a positive holding has unknown gain, a worked-back beginning must refuse and name the holding; do not substitute zero gain or a Dietz return.

### CRITICAL — Emergency-fund debt/rent reconciliation
**Cards:** MK-NW-O-004
Debt minimums are added once, logged debt payments and mortgage budget duplicates are removed, rent offsets monthly draw only when validly mapped, and unknown rent produces qualified months rather than silent assumptions.

### HIGH — Bond/CD math and summary
**Cards:** MK-NW-F-119, MK-NW-F-126, MK-NW-F-131, MK-NW-O-001
Separate face value from current market value; coupon income is face×rate when face exists; current yield and YTM use their respective price bases; bank CDs have no rate-move estimate, broker CDs follow bond pricing; accrued-interest day count and averaging exclusions need helper-backed tests.

### HIGH — Account and net worth reconciliation
**Cards:** MK-NW-O-002, MK-NW-O-003, MK-NW-O-005
Verify account activity sign conventions, no income figure with no transactions, account class totals, cash/investments/property totals, alternatives classified/unclassified split, and component rows summing exactly to totals.

### HIGH — Holding cost/gain accounting
**Cards:** MK-NW-O-006
FIFO sale allocation, options multiplier, unknown price vs cost-only value, long-term strictly more than one year, ticker-matched dividends/interest, and realised gain all need integrated tests.

## Card-by-card formula review

### MK-NW-F-117 — `propertyUseMap` (function)
**Verdict:** SPECIFICATION_CONFLICT · **Severity:** High
**Assessment:** DEC-1926 says rental only when an Income-screen rent entry names the property; card allows stored rental when no rent entries were handed in. The card distinguishes unavailable list (null) from empty list, but the owner rule wording should explicitly confirm that stored rental fallback is only for unavailable data, not a true empty list. Also “entered first (last in list)” is ambiguous without a list-order contract.
**Cases:**
- **Easy — Explicit rent entry makes named property a rental** Expected: `{"home": "home", "rental": "rental"}`. Named rental is rental; explicitly marked home remains home.
- **Easy — One marked home, other property with no rent** Expected: `{"p1": "home", "p2": "second"}`. Marked home wins; unmatched property is second home.
- **Complex — No rent list supplied: stored rental may be used as fallback** Expected: `{"p1": "rental", "p2": "home"}`. With no rent data handed in, stored rental is preserved and first eligible non-rental becomes home; this is conditional fallback, not evidence of a live rent entry.
- **Complex — Orphan rent entry does not make the only property a rental** Expected: `{"p1": "home"}`. Rent entry names no property, so no property becomes rental; sole eligible property defaults home.
- **Edge — No marked home; stored rental should not become default home** Expected: `{"p1": "rental", "p2": "home"}`. A stored rental is never selected as home by the fallback.

### MK-NW-F-118 — `itemizeMissingCount` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** Medium
**Assessment:** Keep zero and negative numeric values as entered; missing or nonnumeric values count as missing. Confirm whether numeric strings are intentionally rejected.
**Cases:**
- **Easy — All holdings valued** Expected: `0`. Zero is a real numeric value; all entries are numeric.
- **Easy — Two missing values** Expected: `3`. Missing, absent, and nonnumeric values each count as missing.
- **Complex — Numeric strings are not numbers unless source parser converts them** Expected: `1`. Per card, value must be a number; string "12.50" is not numeric.
- **Complex — Negative numeric value is entered, not missing** Expected: `1`. Negative and zero are real numbers; only null/missing counts.
- **Edge — Empty list** Expected: `0`. No listed holdings means zero missing values.

### MK-NW-F-119 — `estimatedAccrued` (function)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** The day-count denominator and leap-year coupon-year convention need exact source/helper definition; card says coupon schedule and days in that coupon year but does not define how invalid/missing schedule dates are normalized. Broker CD follows bond path; bank CD is null.
**Cases:**
- **Easy — Annual coupon anniversary date has no accrual** Expected: `null`. Coupon anniversary day has zero accrued interest; helper returns null by card wording.
- **Easy — Accrued interest for 91 days in a 365-day coupon year** Expected: `{"amount": 498.6301369863, "days": 91}`. $50,000 × 4% × 91 ÷ 365 = $498.6301369863.
- **Complex — Broker CD follows bond accrued-interest path** Expected: `null`. Do not lock a numeric expected amount until the implementation establishes the coupon-year day-count denominator and anniversary behavior. This case is deliberately blocked rather than assigning a guessed amount. **BLOCKED**
- **Complex — Bank CD is not accrued like a bond** Expected: `null`. Bank CD is explicitly excluded.
- **Edge — Missing face, zero rate, impossible date all refuse** Expected: `null`. Any listed refusal condition makes estimate unavailable.

### MK-NW-F-120 — `classEvidenceOf` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** High
**Assessment:** Valid maturity date overrides names/wrapper; property names never classify. Invalid date must be treated as absent using maturityParts contract.
**Cases:**
- **Easy — Real maturity date outranks account name evidence** Expected: `"Bonds & CDs"`. A valid maturity date is first-priority class evidence.
- **Easy — Property name is not class evidence** Expected: `null`. Property-group names are expressly ignored.
- **Complex — Impossible maturity date treated as absent; name can provide evidence** Expected: `"Bonds & CDs"`. Invalid date is no date; valid bond-name evidence may still identify class.
- **Complex — Name with no class evidence returns null** Expected: `null`. No date and no class-indicating name.
- **Edge — Wrapper/tax type must not override maturity-first evidence** Expected: `"Bonds & CDs"`. Maturity date takes precedence over wrapper/tax wording.

### MK-NW-F-121 — `holdingTagClass` (function)
**Verdict:** INCOMPLETE · **Severity:** Medium
**Assessment:** Any other non-empty tag maps to Stocks / Funds; null maps null. Empty string behavior is not explicit.
**Cases:**
- **Easy — bond tag** Expected: `"Bonds & CDs"`. Direct tag mapping.
- **Easy — other tag** Expected: `"Alternatives"`. Direct tag mapping.
- **Complex — cash tag and stock_etf tag** Expected: `["Cash", "Stocks / Funds"]`. cash→Cash; any non-null other tag→Stocks / Funds.
- **Complex — Unknown non-empty tag defaults to stocks/funds** Expected: `"Stocks / Funds"`. Card says any other tag maps to Stocks / Funds.
- **Edge — Null/empty tag means no stored class** Expected: `[null, null]`. No tag is null; confirm whether empty string is normalized to absent by implementation.

### MK-NW-F-122 — `holdingTagFor` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** Low
**Assessment:** Unclassified and unsupported classes return null; ensure round-trip behavior is only expected for the four mapped classes.
**Cases:**
- **Easy — Cash class returns cash tag** Expected: `"cash"`. Reverse mapping.
- **Easy — Alternatives class returns other tag** Expected: `"other"`. Reverse mapping.
- **Complex — All four supported classes** Expected: `["bond", "other", "cash", "stock_etf"]`. Specified four-way mapping.
- **Complex — Unrecognized class has no tag** Expected: `null`. Card says any other class has no tag.
- **Edge — Class value is null/invalid** Expected: `null`. Function type expects AssetClass; null/invalid runtime behavior needs source-level test.

### MK-NW-F-123 — `holdingNameEvidence` (function)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** Card states ticker and description together but does not repeat the complete keyword precedence list. Must validate against the master classification rule: money-market funds Stocks / Funds; CD/T-bill Bonds & CDs; no institution-name inference.
**Cases:**
- **Easy — Ticker and description clearly identify Treasury** Expected: `"Bonds & CDs"`. Class evidence from combined ticker/description.
- **Easy — Money-market fund is Stocks / Funds, not cash** Expected: `"Stocks / Funds"`. Owner decision explicitly excludes money-market funds from Cash.
- **Complex — Ticker and description jointly supply evidence** Expected: `"Stocks / Funds"`. Equity name evidence maps to Stocks / Funds.
- **Complex — Ambiguous words return null** Expected: `null`. No class-specific evidence.
- **Edge — CD/t-bill wording maps Bonds & CDs, even when ticker generic** Expected: `"Bonds & CDs"`. CD evidence should classify fixed income; institution must not be used as evidence.

### MK-NW-F-124 — `maturityParts` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** High
**Assessment:** Reject impossible dates and non-YYYY-MM-DD forms. Whitespace acceptance should match maturityClass/maturityParts shared parser, not be assumed.
**Cases:**
- **Easy — Valid leap day** Expected: `[2028, 2, 29]`. Leap day exists in 2028.
- **Easy — Valid ISO date** Expected: `[2030, 12, 31]`. Calendar components returned.
- **Complex — Impossible non-leap February day** Expected: `null`. February 29 does not exist in 2027.
- **Complex — Month 13 / alternate format refused** Expected: `[null, null]`. Only valid YYYY-MM-DD calendar day accepted.
- **Edge — Zero-padded requirement and whitespace** Expected: `[null, null]`. Card says written year-month-day; exact whitespace normalization needs source confirmation.

### MK-NW-F-125 — `isPastMaturity` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** High
**Assessment:** Strictly before local calendar day is past; today is not past. Compare calendar parts and avoid UTC date rollover.
**Cases:**
- **Easy — Day before maturity is not past** Expected: `false`. Maturity is future.
- **Easy — Day after maturity is past** Expected: `true`. Maturity is earlier by calendar date.
- **Complex — Maturity today is not past** Expected: `false`. Strictly earlier only.
- **Complex — Invalid and missing dates are not past** Expected: `[false, false]`. Unknown dates are never treated as matured.
- **Edge — Timezone edge: compare calendar dates, not UTC instant** Expected: `false`. Device-local calendar day is still maturity date; no UTC rollover.

### MK-NW-F-126 — `yearlyInterestNow` (function)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** Missing coupon rate is null; explicit zero rate may yield zero. Past maturity returns numeric zero. Validate bond face fallback and bank/broker CD handling via shared helper.
**Cases:**
- **Easy — Face times rate for live bond** Expected: `400`. $10,000 × 4% = $400.
- **Easy — Missing face falls back to value times rate** Expected: `240`. $8,000 × 3% = $240.
- **Complex — Past maturity returns numeric zero** Expected: `0`. Past maturity explicitly yields $0.
- **Complex — Missing rate remains unknown, not zero** Expected: `null`. Missing coupon rate yields null.
- **Edge — Maturity today is still paying; impossible date is not past** Expected: `[100, 100]`. Both not past under isPastMaturity; each face × rate = $100.

### MK-NW-F-127 — `gainOfRow` (function)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** Return-row precedence and window-return vs annual-rate compounding are stated, but exact meaning of “return for period” fields and precedence when multiple branches coexist must be tested against GainRow type. Positive unknown holdings must propagate null.
**Cases:**
- **Easy — Bought during window: value less cost** Expected: `200`. $1,200 − $1,000 = $200.
- **Easy — CD rate 5% for one year** Expected: `500`. $10,500 × (1 − 1/1.05) = $500.
- **Complex — Whole-window return row uses window total, not annual rate** Expected: `100`. $1,100 × (1 − 1/1.1) = $100.
- **Complex — Unknown price history for positive holding propagates null** Expected: `null`. Positive holding with neither price history nor rate has unknowable gain.
- **Edge — Empty holding gain is zero** Expected: `0`. No holding value means $0 gain.

### MK-NW-F-128 — `heldValueOf` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** High
**Assessment:** Precedence: positive market value, else shares×last price×multiplier, else hand-built value, else zero only if no shares, else null. Never flatten unknown shares/price into zero.
**Cases:**
- **Easy — Market value above zero wins** Expected: `1250`. Use market value when positive.
- **Easy — Shares × last price × option multiplier** Expected: `3000`. 2 × $15 × 100 = $3,000.
- **Complex — Use hand-built value if no market mark** Expected: `450`. Falls through to value built at hand.
- **Complex — Known zero shares means zero value** Expected: `0`. No shares means $0 after earlier value sources are absent.
- **Edge — Shares but no price and no built value is unknown** Expected: `null`. Shares with no price are unknown, not zero.

### MK-NW-F-129 — `gainRowName` (function)
**Verdict:** INCOMPLETE · **Severity:** Low
**Assessment:** CUSIP-like ticker rule is specific; trim/empty-string semantics for name/ticker are not stated.
**Cases:**
- **Easy — Use supplied holding name** Expected: `"Apple Inc"`. Name takes precedence.
- **Easy — Ticker used when no name** Expected: `"AAPL"`. Ticker fallback.
- **Complex — CUSIP-shaped ticker gives way to security name** Expected: `"US Treasury 2030"`. Nine alphanumeric chars with digit plus name uses name.
- **Complex — Non-CUSIP ticker remains fallback** Expected: `"91282CJL6"`. Without a name, ticker is used.
- **Edge — No name and no ticker** Expected: `"a holding"`. Final fallback.

### MK-NW-F-130 — `cannotWorkBackSentence` (function)
**Verdict:** INCOMPLETE · **Severity:** Medium
**Assessment:** Deduplicate and join names with “and”; empty strings and punctuation normalization need exact behavior. Confirm grammar for two names and duplicate names.
**Cases:**
- **Easy — Single name uses has** Expected: `"The beginning can't be worked back: Treasury 2030 has no price history."`. Exact owner wording.
- **Easy — No names uses generic holding** Expected: `"The beginning can't be worked back: a holding has no price history."`. Generic singular fallback.
- **Complex — Deduplicate names and join three with Oxford-style and** Expected: `"The beginning can't be worked back: Apple, Treasury and Gold have no price history."`. Unique names only; plural have for multiple.
- **Complex — Duplicate only yields singular grammar** Expected: `"The beginning can't be worked back: ETF has no price history."`. Deduplication happens before grammar.
- **Edge — Whitespace/name handling must not produce duplicate blanks** Expected: `"The beginning can't be worked back: Treasury has no price history."`. Blank name treatment is not fully specified; expected normalization should be verified in source.

### MK-NW-F-131 — `pricedLikeBond` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** High
**Assessment:** Bank or unanswered CD defaults to non-bond pricing; broker CD is bond-priced. Must be based on explicit purchase-channel field, not institution name.
**Cases:**
- **Easy — Non-CD bond is priced like bond** Expected: `true`. All bonds other than CDs qualify.
- **Easy — Broker CD is priced like bond** Expected: `true`. Broker CDs follow bond pricing.
- **Complex — Bank CD is not priced like bond** Expected: `false`. Bank CD excluded.
- **Complex — Unanswered CD source defaults to bank treatment** Expected: `false`. Missing answer defaults to not priced like a bond.
- **Edge — Institution name cannot decide CD purchase channel** Expected: `false`. Source answer, not institution text, determines treatment.

### MK-NW-F-132 — `notClassifiedWords` (function)
**Verdict:** INCOMPLETE · **Severity:** Medium
**Assessment:** Phrase is clear but locale, rounding, negative sign and amount precision need match app-wide money formatter; do not use guessed formatting as authoritative.
**Cases:**
- **Easy — Whole-dollar unclassified amount** Expected: `"$1,250 asset type not classified"`. Currency amount plus exact phrase.
- **Easy — Zero amount formatting** Expected: `"$0 asset type not classified"`. Formatter must format numeric zero as money.
- **Complex — Negative amount formatting** Expected: `"-$12.50 asset type not classified"`. Negative money formatting; verify currency locale.
- **Complex — Cent precision** Expected: `"$12.35 asset type not classified"`. Standard currency display rounding to cents.
- **Edge — Large amount grouping** Expected: `"$1,234,567.89 asset type not classified"`. Thousands separators and cents.

### MK-NW-F-133 — `valueEntered` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** High
**Assessment:** Any real numeric balance including zero or negative is entered; absent/non-numeric is not.
**Cases:**
- **Easy — Explicit zero is entered** Expected: `true`. A real numeric zero is entered.
- **Easy — Positive numeric value entered** Expected: `true`. Number present.
- **Complex — Missing balance not entered** Expected: `false`. Absent is not entered.
- **Complex — Nonnumeric string not entered** Expected: `false`. Non-number is not entered.
- **Edge — Negative numeric balance still entered** Expected: `true`. Numeric validity, not positivity, determines entry.

### MK-NW-F-134 — `carValueNotEnteredNotes` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** Medium
**Assessment:** Include each unpicked vehicle with unknown value, not the selected car; name fallback must be stable and deterministic.
**Cases:**
- **Easy — Unpicked vehicle missing value gets note** Expected: `["Car A's value not entered — it may be the car you drive."]`. Exact owner wording.
- **Easy — No missing value means no note** Expected: `[]`. Entered value suppresses note.
- **Complex — Picked vehicle excluded, another missing vehicle included** Expected: `["Car B's value not entered — it may be the car you drive."]`. Only unpicked missing-value vehicles appear.
- **Complex — Name fallback chain label then institution** Expected: `["Vehicle 1's value not entered — it may be the car you drive.", "Dealer's value not entered — it may be the car you drive."]`. Shown name else label else institution.
- **Edge — No usable names falls back to A vehicle** Expected: `["A vehicle's value not entered — it may be the car you drive."]`. Final fallback literal.

### MK-NW-F-135 — `earmarkLeavesOut` (function)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** A missing balance is left out only for a positive saved/default retirement share. Need source to confirm whether invalid/non-numeric share uses default or zero.
**Cases:**
- **Easy — Missing value and positive retirement share is left out** Expected: `["401(k)"]`. Account has positive saved share and unknown balance.
- **Easy — Entered zero is not left out** Expected: `[]`. Value is entered even if zero.
- **Complex — Default positive share applies when no saved share** Expected: `["Plan A"]`. Default share above zero means it would count.
- **Complex — Zero or negative share excluded** Expected: `[]`. Only share above zero is included.
- **Edge — Fallback name chain and multiple accounts** Expected: `["Account A", "Bank B", "An account"]`. label, institution, then generic fallback.

### MK-NW-F-136 — `earmarkLeavesOutWords` (function)
**Verdict:** INCOMPLETE · **Severity:** Medium
**Assessment:** Card says comma-joined names; DEC-3657 example is singular. Confirm exact leading phrase and list punctuation for multiple accounts.
**Cases:**
- **Easy — One excluded account** Expected: `"leaves out Linked 401(k) — Value not entered"`. Exact phrase for one account.
- **Easy — No excluded accounts returns null** Expected: `null`. No leaves-out note when no eligible unknown account.
- **Complex — Multiple excluded accounts comma-separated** Expected: `"leaves out 401(k), IRA — Value not entered"`. Names joined by commas.
- **Complex — Name fallback uses label/institution** Expected: `"leaves out Plan A, Bank B — Value not entered"`. Uses shown-name fallback chain.
- **Edge — Zero share does not trigger note** Expected: `null`. No positive retirement share, so no omission wording.

### MK-NW-F-137 — `asksCashOrInvestments` (function)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** High
**Assessment:** Question appears only when both signup flag and Unclassified state remain true.
**Cases:**
- **Easy — Flagged and Unclassified asks question** Expected: `true`. Both conditions true.
- **Easy — Flagged but classified does not ask** Expected: `false`. No longer Unclassified.
- **Complex — Unclassified but not flagged does not ask** Expected: `false`. Sign-up flag required.
- **Complex — Different class values** Expected: `[true, false]`. Boolean conjunction per account.
- **Edge — Missing flag/class is false, not inferred** Expected: `false`. Both fields must explicitly satisfy condition.

### MK-NW-O-001 — `theBonds` (orchestrator)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** Need helper-level tests for YTM, current yield, accrued-interest price basis, average yield exclusions, maturity sorting and bank/broker CD behavior. Detail view uses matured=today-or-earlier, distinct from isPastMaturity strict-before behavior.
**Cases:**
- **Easy — Sort maturity ascending and put undated last** Expected: `{"row_order": ["soon", "late", "undated"]}`. Calendar order, undated last.
- **Easy — Totals and coupon use face value, not market value** Expected: `{"count": 1, "total_value": 24200, "total_face_value": 25000, "annual_interest": 1125}`. Value $24,200; face $25,000; coupon $25,000×4.5%=$1,125.
- **Complex — Bank CD and broker CD take different YTM/sensitivity paths** Expected: `{"bankcd": {"ytm": 0.04, "sensitivity": null, "bank_cd_explanation": true}, "brokercd": {"ytm": "solved_from_face_coupon_price_maturity", "sensitivity": "non-null-if-pricing-valid", "bank_cd_explanation": false}}`. Bank CD uses stated rate/no rate move estimate; broker CD follows bond helper chain. Numeric broker YTM requires actual helper convention.
- **Complex — Average yield excludes unpriced bond and separately names missing rate** Expected: `{"average_yield_weighted_by_value": "only priced bonds with usable yield", "unpriced_names": ["b"], "missing_rate_names": ["c"]}`. Do not treat unknown value as zero or blend a missing yield into the average.
- **Edge — Maturity today counts as matured in detail view** Expected: `{"matured": true, "ytm": null, "sensitivity": null}`. Orchestrator says detail maturity is today or earlier, unlike isPastMaturity which is strictly earlier; ensure the distinction is intentional.

### MK-NW-O-002 — `theAccount` (orchestrator)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** No records means no income figure; transaction sign conventions and inbound transfer display differ. Ensure linked-account class rows reconcile and ticker income matching is case-insensitive.
**Cases:**
- **Easy — Account market value is balance; income totals records** Expected: `{"market_value": 5000, "income": 30}`. Dividend $25 + interest $5 = $30.
- **Easy — No records means no income figure, not zero** Expected: `{"income": null, "income_empty_state": true}`. Explicit no-figure state.
- **Complex — Inbound transfer shows transferred amount, cash effect otherwise** Expected: `{"activity_amounts": [500, -20]}`. Inbound transfer displays amount moved; ordinary activity displays effect on cash.
- **Complex — Holding income ticker match ignores case; no ticker belongs to no holding** Expected: `{"holding_AAPL_income": 6, "untagged_income_assigned_to_holding": false}`. Case-insensitive ticker match; untagged records not assigned to holding.
- **Edge — Non-linked account has no inside breakdown** Expected: `{"inside": null, "income": 1}`. Only linked accounts have class breakdown.

### MK-NW-O-003 — `theNetWorth` (orchestrator)
**Verdict:** INCOMPLETE · **Severity:** Critical
**Assessment:** Broad integration: assets/debts/net-worth reconciliation, cash+investments+property, debt payment maximum, mortgage mapping, unknown values and strict time-weighted return refusal cases. No return when required daily record/movement data is absent.
**Cases:**
- **Easy — Assets minus debts equals net worth** Expected: `{"assets": 15000, "debts": 3000, "net_worth": 12000, "monthly_debt_minimum": 100, "monthly_debt_payments": 150}`. Net worth = $15,000 − $3,000 = $12,000; payment uses max(minimum, chosen).
- **Easy — Debt payment lower than minimum uses minimum** Expected: `{"monthly_debt_minimum": 125, "monthly_debt_payments": 125}`. Actual monthly debt payment is max(125,80).
- **Complex — Return is time-weighted and movement counts for whole day** Expected: `{"return": 0.0}`. Ending $11,000 ÷ (prior $10,000 + deposit $1,000) − 1 = 0%; not Dietz/current-value weighting.
- **Complex — Missing daily value on movement date refuses return** Expected: `{"return": null, "reason": "money moved on a day with no recorded value"}`. Required movement-date value absent; no return should be fabricated.
- **Edge — Unknown-price holding excluded from every day of return window** Expected: `{"return": "computed_without_unpriced_holding", "unknown_holding_excluded_all_days": true}`. Owner-approved fix says holding without price today is excluded from all days, including start day; actual totals depend on fixtures.

### MK-NW-O-004 — `theEmergencyFund` (orchestrator)
**Verdict:** INCOMPLETE · **Severity:** Critical
**Assessment:** High risk of double-counting debt payments and mortgage budget, mishandling rent, and returning months when rent covers costs. Unknown rent must produce explicitly qualified months when relevant.
**Cases:**
- **Easy — Cash divided by essentials plus debt minimums** Expected: `{"months": 5}`. $10,000 ÷ ($1,800+$200) = 5 months.
- **Easy — Rent offsets monthly draw, but not below zero** Expected: `{"monthly_draw_from_cash": 1500, "months": 8}`. $12,000 ÷ ($2,000−$500) = 8 months.
- **Complex — Debt-linked payments and mortgage budget are not double-counted** Expected: `{"counted_essential_expenses_after_exclusions": 2500, "total_essentials_with_debt_minimums": 2800, "debt_payment_counted_once": true, "rent_mortgage_budget_counted_when_mortgage_in_debts": false}`. Logged total $4,000 − debt-payment line $300 − rent/mortgage line $1,200 = $2,500 essential expenses; add debt minimum $300 once = $2,800.
- **Complex — Unknown rent reports months without rent, not blank months** Expected: `{"months": 5, "rent_unknown": true, "message": "rent not included. Enter rent to include."}`. $10,000 ÷ $2,000 = 5 months when rent cannot be established.
- **Edge — Rent covers all essentials means no months figure** Expected: `{"monthly_draw_from_cash": 0, "months": null, "rent_covers_month": true}`. Draw is floored at zero; no runway number when cash is not drawn on.

### MK-NW-O-005 — `theAlternativesOutlook` (orchestrator)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** Growth only from classified alternative dollars; unclassified remainder disclosed and excluded from rate/growth. Verify rows sum to total alternatives and brokerage subparts are used.
**Cases:**
- **Easy — One classified alternative at 6%** Expected: `{"count": 1, "total_value": 10000, "blended_rate": 0.06, "annual_growth": 600}`. $10,000 × 6% = $600.
- **Easy — Weighted rate across classified parts** Expected: `{"classified_value": 15000, "blended_rate": 0.0666666667, "annual_growth": 1000}`. Growth = $500 + $500 = $1,000; weighted rate $1,000/$15,000 = 6.6667%.
- **Complex — Unclassified remainder is excluded from rate/growth and disclosed** Expected: `{"total_value": 10000, "annual_growth": 350, "unclassified": 3000, "message": "Expected return and growth leave out $3,000 asset type not classified"}`. Only classified $7,000 × 5% contributes growth.
- **Complex — Brokerage containing crypto/option uses alternative portion row** Expected: `{"row_alternative_value": 4000, "row_rate": 0.08, "row_unclassified": 1000, "portion_label": "Alternatives"}`. Alternative part only, not whole brokerage balance.
- **Edge — No classified value means no blended rate or growth** Expected: `{"blended_rate": null, "annual_growth": null, "unclassified": 1000}`. No classified holding means no expected rate or growth figure.

### MK-NW-O-006 — `theHolding` (orchestrator)
**Verdict:** INCOMPLETE · **Severity:** High
**Assessment:** Test FIFO lot accounting, multiplier, cost/price unknown propagation, one-year tax-term boundary, ticker-specific income and realised gains.
**Cases:**
- **Easy — Long/short gain from value less cost** Expected: `{"total_paid": 200, "value": 250, "gain": 50, "return_on_cost": 0.25}`. 10×$20=$200; 10×$25=$250; gain $50; $50/$200=25%.
- **Easy — Option multiplier applied to value and cost** Expected: `{"total_paid": 1000, "value": 1600, "gain": 600, "average_paid_per_share": 5}`. Cost 2×$5×100=$1,000; value 2×$8×100=$1,600; per quoted unit average paid=$5.
- **Complex — No price: show total paid as value, suppress gain and tax estimate** Expected: `{"total_paid": 200, "value": 200, "gain": null, "return_on_cost": null, "tax_estimate": null}`. No price fallback is cost basis only; not a zero gain claim.
- **Complex — FIFO sale consumes oldest lot; exact one-year holding is short-term** Expected: `{"remaining_lots": [{"shares": 4, "cost_per_share": 20}], "first_lot_sale_shares": 5, "second_lot_sale_shares": 1, "first_lot_holding_period": "short-term"}`. Oldest purchase first; exactly one year is short-term, not long-term.
- **Edge — Closed holding when shares zero; day change requires two closes** Expected: `{"closed": true, "day_change": null, "day_change_pct": null}`. Zero shares means closed; one close cannot support day change.

### MK-NW-O-007 — `theLookBack` (orchestrator)
**Verdict:** CONSISTENT_WITH_CARD_AND_RULES · **Severity:** Medium
**Assessment:** Orchestrator should pass arguments and return helper result unchanged. Numeric outputs require the actual lookBack helper and its history conventions.
**Cases:**
- **Easy — Pass through baseline lookback result unchanged** Expected: `{"delegate": "lookBack", "amount": 1000, "months": 12}`. Orchestrator delegates arguments and returns helper answer unchanged; numeric answer depends on helper conventions.
- **Easy — No holding price history is passed through as supplied** Expected: `{"delegate": "lookBack", "holding_prices": []}`. No local transformation allowed.
- **Complex — Both histories and requested month count preserved** Expected: `{"delegate": "lookBack", "amount": 2500, "holding_prices": [20, 19, 22], "benchmark_prices": [40, 42, 44], "months": 3}`. Check exact forwarding of all inputs and output identity.
- **Complex — Invalid/insufficient history does not fabricate a result** Expected: `{"delegate": "lookBack", "benchmark_prices": []}`. Result should be helper-defined; orchestrator must not synthesize a return.
- **Edge — Zero amount passed through unchanged** Expected: `{"delegate": "lookBack", "amount": 0}`. Zero is an explicit amount and must not trigger a default.

### MK-NW-O-008 — `thePerformance` (orchestrator)
**Verdict:** INCOMPLETE · **Severity:** Critical
**Assessment:** DEC-2440 requires time-weighted returns. Verify day-before opening value, same-day cash-flow treatment, transfers, first-appearance accounts, unknown-gain refusal, synthetic beginning only when allowed, and every explicit no-return refusal.
**Cases:**
- **Easy — Known beginning, no flows, value grows 10%** Expected: `{"beginning": 10000, "ending": 11000, "wealth_generated": 1000, "return": 0.1}`. No flows; 11,000/10,000−1=10%.
- **Easy — Same-day contribution is included for the whole day** Expected: `{"beginning": 10000, "ending": 11000, "contributions": 1000, "return": 0.0}`. Daily link $11,000/($10,000+$1,000)−1=0%.
- **Complex — Unknown gain for unpriced holding refuses worked-back beginning** Expected: `{"beginning": null, "wealth_generated": null, "return": null, "cannot_work_back": "The beginning can't be worked back: XYZ has no price history."}`. DEC-3656 requires refusal, named holding, and no percentage.
- **Complex — Missing beginning but no account history can be reconstructed from priced gains** Expected: `{"ending": 10500, "priced_gain": 500, "beginning": 10000, "wealth_generated": 500, "return": "time_weighted_if_other_conditions_allow"}`. CD gain over one year is $500; beginning = ending − gain − contributions + withdrawals. Exact return depends on daily record conditions.
- **Edge — Shares movement with no direction/value refuses return** Expected: `{"return": null, "reason": "shares moved without direction or value"}`. Explicit refusal condition; never substitute Dietz or another method.

## Cross-card invariants Claude Code must assert

1. **Unknown is not zero:** missing balance, rate, price history, face value, or return must preserve the specified null/absence semantics.
2. **Net worth:** assets − debts = net worth; Cash + Investments + Property = known assets; all allocation rows reconcile with known class values.
3. **Bonds/CDs:** annual coupon income uses face value when present; current yield uses today’s value; YTM uses price, face, coupon, maturity and the specified accrued-interest convention; bank CD vs broker CD behavior must differ as stated.
4. **Emergency fund:** debt minimums counted once; entered debt payments and mortgage budget duplicates removed; valid net rent offsets monthly draw; unknown rent is disclosed; no months figure when draw is zero or essentials are zero.
5. **Alternatives:** growth and blended rate use classified portions only; unclassified remainder is separately named; account rows sum to total.
6. **Holding detail:** FIFO lots; option multiplier; no invented gain when price is absent; exact one-year boundary is short-term; dividend/interest matching is ticker-specific.
7. **Performance:** returns are time-weighted; same-day flows count for the whole day; missing required beginning/movement/gain information refuses return instead of substituting Dietz or zero.

## Important ambiguities / conditional cases

- `MK-NW-F-119` has one deliberately blocked numeric accrued-interest case: the card does not fully define the coupon-year denominator across calendar/leap-year boundaries. Claude Code must inspect the helper and lock the expected amount to the actual stated convention, not guess.
- `MK-NW-F-117` has a potential owner-rule tension: DEC-1926 says a rental requires a named live rent entry, while the card permits stored `rental` when rent entries were not handed in. Distinguish unavailable data (`null`/omitted) from an actual empty list and confirm the intended contract.
- Several orchestrator expected values are contract/invariant assertions rather than full object snapshots where exact output depends on external helper functions or domain interfaces. Claude Code must adapt schemas but must not weaken the assertion.
- The bank-CD/broker-CD branch, accrued-interest price basis, bond average-yield exclusions, and time-weighted performance return all require tests against the actual helper chain.

## Scope boundary

This is an independent audit of supplied formula descriptions and a test oracle. It is **not** evidence that the application passed or failed. The current TypeScript implementation and test runner are needed for runtime PASS/FAIL.