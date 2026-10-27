# Cash flow — part 17 of 19: Tax on the household — what is taxed, the filing status, the rates, and the tax organizer

10 cards, so 10 formula checks and 50 cases, and one `rules_held` line for each of the 19 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 17"` in your reply.

## Notes for this part

- Where a case needs the filing status and nobody chose one, MK-CF-F-085 says which the app assumes. Judge that assumption as well.
- This part also checks published amounts. Fill `source_checks` from `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json` for: Standard deduction and the amount added at 65, 2026 — one entry for each, with the source you checked it against.

## The cards

```json
[
 {
  "id": "MK-CF-O-007",
  "name": "theTaxOrganizer",
  "kind": "orchestrator",
  "what_it_is_for": "What will my taxes look like: each taxable line, the deduction and the tax?",
  "formula_in_words": "Interest, dividends and coupons the accounts paid out over the last year (incomeFromAccounts), rounded to whole dollars, are handed with the profile, the accounts, the debts and the year (this year when none is given) to the tax organiser, whose answer is returned unchanged.",
  "handed": "export function theTaxOrganizer(input: {\n  profile: any;\n  accounts: any[];\n  debts: any[];\n  transactions: any[];\n  year?: number;\n}): TaxOrganizer",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-030 tax filing status and age",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-043 their own retirement contribution",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-027",
    "words_on_screen": "each taxable line and its amount",
    "unit": "money",
    "what_it_answers": "One line per kind of income the year is taxed on, and what it came to.",
    "when_it_refuses": "A line with nothing behind it does not appear at all.",
    "shown_on": [
     "/tax-organizer"
    ]
   },
   {
    "id": "MK-MN-M-028",
    "words_on_screen": "Gross income · 401(k) contribution · Standard deduction · Taxable income · Non-taxable",
    "unit": "money",
    "what_it_answers": "The walk from what you earned to what you are taxed on, in the order the form takes it.",
    "when_it_refuses": "No income entered yet.",
    "shown_on": [
     "/tax-organizer"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-027",
    "words": "Interest and dividends come from the RECORDS where they exist, not from an estimate — an estimate on a tax page reads as a figure to file."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-028",
    "words": "ONE tax function across the app (rule 2) — the same one that sets the band on your pay."
   }
  ],
  "decisions_that_govern_it": [],
  "period": [
   "MK-MN-M-027: no period on the figure",
   "MK-MN-M-028: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-027: A line with nothing behind it does not appear at all.",
   "MK-MN-M-028: No income entered yet."
  ]
 },
 {
  "id": "MK-CF-F-084",
  "name": "taxableAnnual",
  "kind": "function",
  "what_it_is_for": "Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.",
  "formula_in_words": "totalGrossAnnual WITHOUT the untaxed parts: salary + tips + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + one-off taxed + retirement income in a month × 12. The 401(k) is NOT taken off here.",
  "handed": "export function taxableAnnual(op: OnboardingProfile | null, now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-230",
  "name": "taxedAfterPreTax",
  "kind": "function",
  "what_it_is_for": "WHAT THE YEAR IS TAXED ON ONCE THE 401(k)s ARE OUT — everything taxable (taxableAnnual) less each earner's own 401(k) for the months they are paid, never below $0.",
  "formula_in_words": "What the year is taxed on once the 401(k)s are out: everything taxable over the year less the household's 401(k) contributions — each earner's own, for the months they are paid — added up; never below 0.",
  "handed": "export function taxedAfterPreTax(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [
   "DEC-7797"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-085",
  "name": "filingStatusOf",
  "kind": "function",
  "what_it_is_for": "Effective tax rate in use: the user's manual rate, else the IRS-schedule estimate on taxable income.",
  "formula_in_words": "The filing status the person chose: married, married filing separately or head of household; anything else, single. When none is chosen: married when there is a spouse or the spouse earns; single otherwise.",
  "handed": "export function filingStatusOf(op: OnboardingProfile | null): import('./tax').FilingStatus",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-086",
  "name": "stateRateOf",
  "kind": "function",
  "what_it_is_for": "The state income tax rate the person entered, as a share, held between 0% and 15%.",
  "formula_in_words": "The state rate typed, as a percent ÷ 100, held between 0 and 15%.",
  "handed": "export function stateRateOf(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-087",
  "name": "monthlyTaxRates",
  "kind": "function",
  "what_it_is_for": "The tax rate for each of the twelve months, as a share: the one rate in force in every month — the person's own where they gave one, otherwise the calculated rate.",
  "formula_in_words": "Twelve rates, all the same: the rate in force (rateInForce) — the person's own, or the calculated one. A steady income is taxed the same in every month.",
  "handed": "export function monthlyTaxRates(op: OnboardingProfile | null, now: Date = new Date()): number[]",
  "decisions_that_govern_it": [
   "DEC-0263"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-088",
  "name": "taxableByCalendarMonth",
  "kind": "function",
  "what_it_is_for": "The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses, extracted so the rate vector and the grid can never drift apart.",
  "formula_in_words": "For each calendar month: gross salary + tips (only in months with salary) + net rent ÷ 12 + that month's stock vesting + taxed extra in a month + retirement income; + the bonus in its month (December when none); + the signing bonus in January; + one-off taxed other income in its month; − the household's 401(k) that month. Never below 0.",
  "handed": "export function taxableByCalendarMonth(op: OnboardingProfile | null, now: Date = new Date()): number[]",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-089",
  "name": "over65CountOf",
  "kind": "function",
  "what_it_is_for": "How many people on the tax return are 65 or older: none, one or two.",
  "formula_in_words": "Married filing jointly with the question answered: both → 2, neither → 0, one → 1. Otherwise from the person's own birth year: 1 when this year − birth year is 65 or more, else 0; 0 with no birth year.",
  "handed": "export function over65CountOf(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year",
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-090",
  "name": "effectiveRate",
  "kind": "function",
  "what_it_is_for": "The one tax rate in force for the household, as a share of gross: their own figure where they gave one, otherwise the calculated rate.",
  "formula_in_words": "The rate in force (rateInForce).",
  "handed": "export function effectiveRate(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-048",
  "name": "effectiveTaxRate",
  "kind": "function",
  "what_it_is_for": "The share of gross income that goes to tax: the person's own rate where they gave one, otherwise the calculated federal rate for the way they file.",
  "formula_in_words": "With the person's own rate switched on: that rate, held between 0 and 1. Otherwise federal income tax on the yearly gross ÷ the yearly gross, by filing status (single when none), with no state tax (effectiveRateOnGrossFor).",
  "handed": "export function effectiveTaxRate(grossAnnual: number, tax: TaxProfile): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

12 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12."
 },
 {
  "id": "MK-CF-F-099",
  "name": "deductionFor",
  "what_it_is_for": "The amount of income that is free of tax before the brackets start: the standard deduction for the way the person files, plus the extra amounts for anyone 65 or older.",
  "formula_in_words": "The standard deduction for the filing status + the age-65 addition × the number of people 65 or over (2 at most) + the senior deduction (seniorDeductionFor). The amounts are in the 2026 table above the cards."
 },
 {
  "id": "MK-CF-F-100",
  "name": "taxableIncomeFor",
  "what_it_is_for": "What income is taxed, given how this person files?",
  "formula_in_words": "Gross − the deduction (deductionFor, with the gross itself used as the income for the senior deduction's phase-out); never below 0."
 },
 {
  "id": "MK-CF-F-101",
  "name": "taxOwedFor",
  "what_it_is_for": "Federal tax owed under a filing status, plus an optional user-set FLAT state rate applied to TAXABLE income (E10) — states differ wildly, so one honest user-entered percent beats fifty guessed tables, and it never taxes the deduction.",
  "formula_in_words": "Taxable income (taxableIncomeFor) taxed band by band on the filing status's 2026 table — each slice at its own rate — plus taxable income × the state rate (held between 0 and 15%)."
 },
 {
  "id": "MK-CF-F-102",
  "name": "effectiveRateOnGrossFor",
  "what_it_is_for": "What share of my income actually goes in tax?",
  "formula_in_words": "taxOwedFor ÷ gross; 0 when the gross is zero or less."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction."
 },
 {
  "id": "MK-CF-F-183",
  "name": "paidOutByAccount",
  "what_it_is_for": "What each account actually PAID OUT in the last year, by account.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date last year), not reinvested, and naming an account, added by account — each counted as the money it moved into the account: when the record says which way the money went, its size, minus when it left (a reversed payment takes away what it had added); otherwise its amount with the sign it was stored with; a record whose amount is not on record (missing, blank or not a number) adds nothing. A record that names no account is not counted."
 },
 {
  "id": "MK-CF-F-184",
  "name": "incomeFromAccounts",
  "what_it_is_for": "One line per account that pays something, and the total.",
  "formula_in_words": "For each account, the first that applies. (1) It paid out more than zero over the trailing twelve months (paidOutByAccount): that amount, said as paid out over the trailing twelve months. (2) A bond or CD, by the one rule for its year of interest (yearlyInterestNow): no rate entered → $0, said so (owner A46), marked as assumed; a rate but no year's interest — a bond with a maturity date and no face value — → $0, said to be the face value not entered, marked as assumed; past its maturity date → $0, said to be matured on that date; a face value entered → the rate × the face value; otherwise (a CD bought from the bank typed by its balance, or a bond fund) → the rate × the balance. (3) Cash with a rate above zero: rate × balance. (4) Any other account with a balance above zero is named as not counted; foreign currency is skipped. Yearly income = the rows added."
 },
 {
  "id": "MK-CF-F-187",
  "name": "seniorDeductionFor",
  "what_it_is_for": "How much of the $6,000-per-person senior deduction does this return get?",
  "formula_in_words": "0 outside tax years 2025 to 2028; when filing separately; when nobody is 65 or over; or when the income is not known. Otherwise each person 65 or over (2 at most) gets $6,000 less 6% of the income above $75,000 (single, head of household) or $150,000 (married), never below 0 — the 6% comes off each person's $6,000, not off the two together; the answer is that amount × the number of those people."
 },
 {
  "id": "MK-NW-F-112",
  "name": "yearlyInterest",
  "what_it_is_for": "A year's interest from one bond or CD, by the one rule every interest figure uses: face × rate; with no face entered, a bond or a CD bought through a broker that has a maturity date has none — its coupon is paid on the face, which is not entered — while a CD bought from the bank or a bond fund (no maturity date) pays its rate on its value; with no rate, nothing (owner A46: counted as $0, said so).",
  "formula_in_words": "A year's interest from one bond or CD. Nothing when no rate was entered. Face value × rate when a face value was entered. With no face value entered: nothing for a bond, or a CD bought through a broker (pricedLikeBond), that has a maturity date — its coupon is paid on the face, so the rate on the market value would be a guess (the lead's decision of 2026-10-24 under owner decision DEC-3523, tenet 3); otherwise — a CD bought from the bank, typed by its balance, or a bond fund, which has no maturity date — the value shown × rate: the market value, else what was paid, else the face value, and 0 when no value was entered (owner decision DEC-0281 for the value shown; owner ruling DEC-2748c, 2026-10-07, for face × rate and, with no face, value × rate)."
 },
 {
  "id": "MK-NW-F-126",
  "name": "yearlyInterestNow",
  "what_it_is_for": "A year's interest from one bond or CD as it pays today: its yearly interest, and $0 once it is past its maturity date.",
  "formula_in_words": "A year's interest from one bond or CD as it pays today: $0 once it is past its maturity date; otherwise its yearly interest (yearlyInterest: face × rate; with no face, nothing for a bond with a maturity date, and the value × rate for a CD bought from the bank or a bond fund), and nothing when no rate was entered."
 },
 {
  "id": "MK-NW-F-131",
  "name": "pricedLikeBond",
  "what_it_is_for": "(DEC-3837, 2026-10-10) THE ONE TEST of whether a holding is priced like a bond: every bond is, and a CD only when it was bought through a broker.",
  "formula_in_words": "Yes for every bond that is not a CD. For a CD: yes only when it was bought through a broker; a CD bought from the bank, or one whose answer was never given, is no (DEC-3837, 2026-10-10). This is the one test every bond figure reads to decide whether a CD is priced like a bond."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A rate of tax** — in this part: MK-CF-F-048, MK-CF-F-090

```json
[
 {
  "id": "MK-CF-F-102",
  "name": "effectiveRateOnGrossFor",
  "what_it_is_for": "What share of my income actually goes in tax?",
  "formula_in_words": "taxOwedFor ÷ gross; 0 when the gross is zero or less."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction."
 }
]
```

**What the year is taxed on** — in this part: MK-CF-F-084, MK-CF-F-230, MK-CF-F-088

```json
[
 {
  "id": "MK-CF-F-100",
  "name": "taxableIncomeFor",
  "what_it_is_for": "What income is taxed, given how this person files?",
  "formula_in_words": "Gross − the deduction (deductionFor, with the gross itself used as the income for the senior deduction's phase-out); never below 0."
 }
]
```

**The age a person is in the tax year** — in this part: MK-CF-F-089

```json
[
 {
  "id": "MK-CF-F-197",
  "name": "ageAttainedInYear",
  "what_it_is_for": "THE AGE THE LIMITS USE — the age a person attains at any time in the calendar year, which is this year minus the birth year.",
  "formula_in_words": "This calendar year − the birth year. Nothing when the birth year is missing or before 1900."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0003",
  "decided": "2026-07-19",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Which 12 months are you entering?",
  "the_log_records": "When you enter a year of income, the app asks which twelve months you mean — the calendar year, or the next twelve months from now. Three decisions:\n1. Every month you enter carries its own month AND year, so entering across a New Year does not overwrite the wrong month.\n2. Both ways of asking write to the same twelve calendar slots underneath, so the answer means the same thing however it was entered.\n3. When a receipt is scanned, the total is read from the total — never from a line about how it was paid, which is not what you spent.",
  "governs": "src/domain/income/onboarding.ts · src/screens/CashFlowScreen.tsx"
 },
 {
  "id": "DEC-0151",
  "decided": "2026-08-14",
  "type": "DESIGN",
  "tab": "plan",
  "whose": "his",
  "his_words": "yes, I like the text.",
  "the_log_records": "“yes, I like the text.” The Social Security card is approved in two versions: at 60 and 61 it says the decision is coming up, that you can first claim at 62, and that every year you wait after that raises the amount — so the card is honest about what you cannot do yet.",
  "governs": "src/screens/HomeScreen.tsx · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-0176",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "s against two people",
  "the_log_records": "The whole income surface redesigned. Six decisions:\n1. Base pay becomes a full screen with one expandable section per earner — gross, 401(k), employer match, and what actually lands.\n2. A 14-month dated table when pay varies, rather than one typical figure.\n3. BOTH earners are captured, not one: a household on $84,000 plus $54,000 was being read as $84,000 — one person’s income against two people’s spending.\n4. A filing-status question, which had never been asked, so every couple was taxed as a single filer.\n5. Bonus and company shares follow the same who-earns pattern.\n6. Interest and dividends are worked out from your holdings rather than asked for, and treated as TAXABLE BUT NOT SPENDABLE.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/base-pay.ts"
 },
 {
  "id": "DEC-0198",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "by default = reinvested). The onboarding dividends screen now asks",
  "the_log_records": "Dividends and interest come OUT of your spendable take-home, because in most accounts they are reinvested where they are earned and never reach your bank. The onboarding screen asks “Does this reach your bank?” and says what the answer means.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/income-summary.ts"
 },
 {
  "id": "DEC-0200",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "takehome",
  "the_log_records": "When you type your take-home instead of your gross, it is converted ONCE on the way in and stored. The old code re-ran the tax schedule backwards on EVERY read to find a gross that would produce your figure — a guess laid on top of an estimate.",
  "governs": "src/domain/income/take-home-mode-migration.ts · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-0263",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "explained and fixed in the file: the four mis-rendered functions written by hand; caps declared",
  "the_log_records": "“explained and fixed in the file: the four mis-rendered functions written by hand; caps declared.” Four calculations the automatic reader could not render faithfully were written out by hand rather than left as a bad approximation.",
  "governs": "MK-CF-F-057 · MK-CF-F-097 · MK-CF-F-087 · MK-CF-F-101"
 },
 {
  "id": "DEC-0270",
  "decided": "2026-09-03",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "a figure the person gave us → 'you entered'",
  "the_log_records": "“a figure the person gave us → ‘you entered’.” One phrase for a number you typed, so it is never confused with one the app worked out.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/domain/income/tax-rate.ts"
 },
 {
  "id": "DEC-0291",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "spouse",
  "the_log_records": "“spouse.” The word is spouse, not partner, in everything a person reads.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/base-pay.ts"
 },
 {
  "id": "DEC-0296",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "an unknown input produces no number and a reason — never a default",
  "the_log_records": "“an unknown input produces no number and a reason — never a default.” Where something is not known, the app says what is missing instead of filling in a plausible figure. A default looks like an answer.",
  "governs": "src/domain/income/onboarding.ts · src/screens/AccountPortfolioScreen.tsx"
 },
 {
  "id": "DEC-0303",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "flat pensions are being inflated — a fixed-versus-inflating flag per stream; Social Security inflates, pensions and annuities flat",
  "the_log_records": "“flat pensions are being inflated — a fixed-versus-inflating flag per stream; Social Security inflates, pensions and annuities flat.” Each income stream says whether it rises with inflation. Inflating a fixed pension overstates a retirement by more every year.",
  "governs": "src/domain/retirement/index.ts · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-0307",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "withdrawals and RMDs are not guaranteed income — paycheck lists each line; the plan input is outside money only",
  "the_log_records": "“withdrawals and RMDs are not guaranteed income — paycheck lists each line; the plan input is outside money only.” Money you draw from your own savings is not guaranteed income; only money arriving from outside is. Counting your own pot as guaranteed makes a plan look safe because it is spending itself.",
  "governs": "src/domain/income/onboarding.ts · src/screens/RetirementCockpit.tsx"
 },
 {
  "id": "DEC-0327",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "state tax applies to taxable income, never gross",
  "the_log_records": "“state tax applies to taxable income, never gross.” Applying a state rate to gross income overstates the tax by the whole deduction.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-0364",
  "decided": "2026-09-26",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "Q5 — the mortgage odds placeholder → build the second simulation first; until then the row states today’s odds and stops",
  "the_log_records": "“Q5 — the mortgage odds placeholder → build the second simulation first; until then the row states today’s odds and stops.” Rather than showing a placeholder figure, the row says what is true today and says nothing more until the calculation exists.",
  "governs": "src/domain/income/onboarding.ts · src/domain/debt/mortgageOdds.ts"
 },
 {
  "id": "DEC-0447",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "how about one time income?",
  "the_log_records": "“how about one time income?” Income that arrives once is captured as such and lands in its own month, rather than being spread across twelve.",
  "governs": "src/domain/income/onboarding.ts · src/domain/cashflow/index.ts"
 },
 {
  "id": "DEC-0487",
  "decided": "2026-07-01",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "How is the amount calculated by age? Is this a formula used by social security administration?",
  "the_log_records": "HIS QUESTION: “How is the amount calculated by age? Is this a formula used by the Social Security Administration?” Asking whether a figure follows the actual rules or our approximation of them.",
  "governs": "src/domain/decumulation/index.ts · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-0491",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "How all this information will be captured and at what frequency?",
  "the_log_records": "HIS QUESTION: “How all this information will be captured and at what frequency?” Including the parts no connection can reach — cash, and cards that are not linked.",
  "governs": "src/domain/income/onboarding.ts · src/domain/assets/index.ts"
 },
 {
  "id": "DEC-7797",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283, DEC-4529 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. His ruling DEC-0283 (2026-09-10): income before tax is gross less the 401(k) and other deductions. The tax was already worked that way while the bracket named the band of the gross. 5 of 5 places now read the income after the 401(k). The Income summary bracket, single, $70,000 of wages and $10,000 into a 401(k): 22% on $53,900 → 12% on $43,900, tax about $5,020 unchanged. Sign-up's Taxes step shows the same 12%. Your base pay, the drawing's own household, $138,000 of wages and $14,400 into 401(k)s, taxed on $91,400: 22% → 12%. The filing-status comparison works its tax after the 401(k), its line naming what was entered less the 401(k). The draw-order sheet's rates are worked after the 401(k). Base pay's 12% is A FIGURE ON HIS APPROVED DRAWING (income-end-to-end v07, phone 2, which draws 22%), applied under tenet 1, which ranks above tenet 6, with the correction line his DEC-4529 asks for on the drawing. For that household the drawn sentence that begins Filing jointly, the band comes from what you earn together no longer prints (both bands are 12%), and the sentence about the 24% stands on its own. What it is taxed on was left as drawn, each gross line, then Gross a year. CORRECTED 2026-10-24: that no longer holds — two rows were added under the gross, Your 401(k)s and What it is taxed on, drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07 under his DEC-0283 (DEC-7887). To reverse: read the bracket off the gross again. One word from him reverses it.",
  "governs": "MK-CF-F-230 taxedAfterPreTax (src/domain/income/tax-rate.ts) · MK-CF-F-181 rateInForce · MK-CF-M-043 (the Income summary bracket) · MK-CF-M-032 (the Base pay bracket) · MK-CF-O-001 · MK-CF-O-004 · the filing-status comparison · the draw-order sheet"
 },
 {
  "id": "DEC-7935",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-0321, made without asking him, as his order of 2026-09-30 says. His ruling DEC-0321 (2026-08-20): one tab said state tax was missing from the capital-gains figure and one said included; settled in one place. The app applies no state tax to capital gains, and now the two declarations say \"federal only\" in plain words. The Holding page prints the two gains and no tax figure ($8,000 long-term and $1,000 short-term are the gain itself), so no screen words change. userCapGainsRates was the other tab's half: it added the state rate, no app code called it, and its two tests now check the federal rates and that it is gone. Its number stays on the register's retired list with this reason. To reverse: restore the function and drop the two sentences. One word from him reverses it.",
  "governs": "MoneyKeel/functions/networth-and-performance/holding.ts (MK-NW-M-036, MK-NW-M-037) · MK-CF-F-091 userCapGainsRates (retired) · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-7938",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. $9,000 a month with $1,000 into a 401(k), single: the months read $7,976 while Your base pay read $6,976; all read $6,976 (22%), then $7,403 filing jointly (12%) and $6,963 with $1,500 into the 401(k). A take-home typed as $6,200 reads $6,200 (it read $7,200). A rate the person gave is not laid on rent, and reinvested interest and dividends are not counted as arriving. Checked in 10 of 10 households against the Income summary. The drawing's own words already said after tax and 401(k). To reverse: take the tax off the wage and leave the 401(k) in. One word from him reverses it.",
  "governs": "MK-XS-F-004 buildDatedGrid (no rule entry) · MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-226 datedGridOf · MK-CF-F-233 earnerWageShares, MK-CF-F-234 wagesLandingByMonth (src/domain/income/onboarding.ts) · MK-CF-M-047 · MK-CF-M-051"
 }
]
```
