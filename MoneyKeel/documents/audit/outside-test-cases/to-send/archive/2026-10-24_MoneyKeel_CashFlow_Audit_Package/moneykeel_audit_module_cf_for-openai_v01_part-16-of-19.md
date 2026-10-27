# Cash flow — part 16 of 19: Federal tax — the 2026 tables, the deductions and the bands

11 cards, so 11 formula checks and 55 cases, and one `rules_held` line for each of the 7 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 16"` in your reply.

## Notes for this part

- For each band table give witnesses at every band top the app uses and one dollar above it.
- This part also checks published amounts. Fill `source_checks` from `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json` for: Federal income tax 2026 — bands by filing status; Standard deduction and the amount added at 65, 2026; Senior deduction, tax years 2025 to 2028; Long-term capital gains, 2026 — the 0% and 15% tops — one entry for each, with the source you checked it against.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export type FilingStatus = 'single' | 'married' | 'mfs' | 'hoh';
```

## The cards

```json
[
 {
  "id": "MK-CF-F-097",
  "name": "grossFromNet",
  "kind": "function",
  "what_it_is_for": "Invert the schedule: the gross income whose take-home equals `net` (bisection).",
  "formula_in_words": "0 when the take-home is zero or less. Otherwise it searches between the take-home and three times it, halving the range 50 times, for the gross at which gross − federal tax (taxOwedFor, no state tax) equals the take-home.",
  "handed": "export function grossFromNet(net: number, status: FilingStatus = 'single', over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [
   "DEC-0184",
   "DEC-0263"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-098",
  "name": "progressiveMonthlyTax",
  "kind": "function",
  "what_it_is_for": "The tax taken in each of the twelve months when the brackets fill as the year's income builds up, so a month with a bonus is taxed higher and the twelve add up to the year's tax exactly.",
  "formula_in_words": "For each month in order: the federal tax on the year's running total up to and including that month − the federal tax on the running total before it; plus state tax = the rise in taxable income over the same step × the state rate (held between 0 and 15%). A negative month counts 0.",
  "handed": "export function progressiveMonthlyTax(taxableByMonth: number[], status: FilingStatus = 'single', stateRate = 0, over65 = 0): number[]",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-187",
  "name": "seniorDeductionFor",
  "kind": "function",
  "what_it_is_for": "How much of the $6,000-per-person senior deduction does this return get?",
  "formula_in_words": "0 outside tax years 2025 to 2028; when filing separately; when nobody is 65 or over; or when the income is not known. Otherwise each person 65 or over (2 at most) gets $6,000 less 6% of the income above $75,000 (single, head of household) or $150,000 (married), never below 0 — the 6% comes off each person's $6,000, not off the two together; the answer is that amount × the number of those people.",
  "handed": "export function seniorDeductionFor(status: FilingStatus = 'single', over65 = 0, magi: number | null = null): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [
   "DEC-0240",
   "DEC-0325"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-099",
  "name": "deductionFor",
  "kind": "function",
  "what_it_is_for": "The amount of income that is free of tax before the brackets start: the standard deduction for the way the person files, plus the extra amounts for anyone 65 or older.",
  "formula_in_words": "The standard deduction for the filing status + the age-65 addition × the number of people 65 or over (2 at most) + the senior deduction (seniorDeductionFor). The amounts are in the 2026 table above the cards.",
  "handed": "export function deductionFor(status: FilingStatus = 'single', over65 = 0, magi: number | null = null): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [
   "DEC-0240"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-100",
  "name": "taxableIncomeFor",
  "kind": "function",
  "what_it_is_for": "What income is taxed, given how this person files?",
  "formula_in_words": "Gross − the deduction (deductionFor, with the gross itself used as the income for the senior deduction's phase-out); never below 0.",
  "handed": "export function taxableIncomeFor(gross: number, status: FilingStatus = 'single', over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [
   "DEC-0184",
   "DEC-0240"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-101",
  "name": "taxOwedFor",
  "kind": "function",
  "what_it_is_for": "Federal tax owed under a filing status, plus an optional user-set FLAT state rate applied to TAXABLE income (E10) — states differ wildly, so one honest user-entered percent beats fifty guessed tables, and it never taxes the deduction.",
  "formula_in_words": "Taxable income (taxableIncomeFor) taxed band by band on the filing status's 2026 table — each slice at its own rate — plus taxable income × the state rate (held between 0 and 15%).",
  "handed": "export function taxOwedFor(gross: number, status: FilingStatus = 'single', stateRate = 0, over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [
   "DEC-0184",
   "DEC-0253",
   "DEC-0263"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-102",
  "name": "effectiveRateOnGrossFor",
  "kind": "function",
  "what_it_is_for": "What share of my income actually goes in tax?",
  "formula_in_words": "taxOwedFor ÷ gross; 0 when the gross is zero or less.",
  "handed": "export function effectiveRateOnGrossFor(gross: number, status: FilingStatus = 'single', stateRate = 0, over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [
   "DEC-0184"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-103",
  "name": "marginalBracketFor",
  "kind": "function",
  "what_it_is_for": "Which federal band does this person's last dollar fall in?",
  "formula_in_words": "The rate of the band the taxable income falls in; income exactly on a band's top belongs to that band.",
  "handed": "export function marginalBracketFor(gross: number, status: FilingStatus = 'single', over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [
   "DEC-0184",
   "DEC-0253"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-104",
  "name": "ltcgRateFor",
  "kind": "function",
  "what_it_is_for": "The user's own long-term capital-gains rate, from their income + filing status (federal).",
  "formula_in_words": "On taxable income (taxableIncomeFor): 0% up to the first threshold, 15% up to the second, 20% above. 2026 thresholds — single $49,450 and $545,500; married $98,900 and $613,700; married filing separately $49,450 and $306,850; head of household $66,200 and $579,600. Income exactly on a threshold takes the lower rate.",
  "handed": "export function ltcgRateFor(gross: number, status: FilingStatus = 'single', over65 = 0): number",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-185",
  "name": "needsTakeHomeConversion",
  "kind": "function",
  "what_it_is_for": "True when this profile still holds a pre-2026-08-28 take-home entry.",
  "formula_in_words": "True when the pay was stored the old way — as take-home — and is above zero.",
  "handed": "export function needsTakeHomeConversion(op: OnboardingProfile | null): boolean",
  "inputs_it_reads": [
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-186",
  "name": "convertTakeHomeMode",
  "kind": "function",
  "what_it_is_for": "Convert it. What they typed becomes what LANDS; the gross is worked back once and stored.",
  "formula_in_words": "Unchanged unless it needs converting (needsTakeHomeConversion). Otherwise: yearly take-home = the stored figure × the periods in a year (weekly 52, every two weeks 26, monthly 12, hourly counted as 12); yearly gross = when the person typed their own rate (a rate of 0% up to, not including, 100%): (the yearly take-home + 12 × their monthly 401(k)) ÷ (1 − that rate), so their rate and their take-home both hold; otherwise the gross whose federal tax leaves exactly that take-home (grossFromNet); the stored base pay becomes yearly gross ÷ periods; the typed take-home becomes the yearly take-home ÷ 12 — the month every screen now asks for; the mode becomes gross; and the profile is marked as having its gross worked back, which Your base pay says until a gross is typed.",
  "handed": "export function convertTakeHomeMode<T extends Record<string, any>>(op: T): T",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-043 their own retirement contribution",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "decisions_that_govern_it": [
   "DEC-7942"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A rate of tax** — in this part: MK-CF-F-102

```json
[
 {
  "id": "MK-CF-F-048",
  "name": "effectiveTaxRate",
  "what_it_is_for": "The share of gross income that goes to tax: the person's own rate where they gave one, otherwise the calculated federal rate for the way they file.",
  "formula_in_words": "With the person's own rate switched on: that rate, held between 0 and 1. Otherwise federal income tax on the yearly gross ÷ the yearly gross, by filing status (single when none), with no state tax (effectiveRateOnGrossFor)."
 },
 {
  "id": "MK-CF-F-090",
  "name": "effectiveRate",
  "what_it_is_for": "The one tax rate in force for the household, as a share of gross: their own figure where they gave one, otherwise the calculated rate.",
  "formula_in_words": "The rate in force (rateInForce)."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction."
 }
]
```

**What the year is taxed on** — in this part: MK-CF-F-100

```json
[
 {
  "id": "MK-CF-F-084",
  "name": "taxableAnnual",
  "what_it_is_for": "Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.",
  "formula_in_words": "totalGrossAnnual WITHOUT the untaxed parts: salary + tips + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + one-off taxed + retirement income in a month × 12. The 401(k) is NOT taken off here."
 },
 {
  "id": "MK-CF-F-230",
  "name": "taxedAfterPreTax",
  "what_it_is_for": "WHAT THE YEAR IS TAXED ON ONCE THE 401(k)s ARE OUT — everything taxable (taxableAnnual) less each earner's own 401(k) for the months they are paid, never below $0.",
  "formula_in_words": "What the year is taxed on once the 401(k)s are out: everything taxable over the year less the household's 401(k) contributions — each earner's own, for the months they are paid — added up; never below 0."
 },
 {
  "id": "MK-CF-F-088",
  "name": "taxableByCalendarMonth",
  "what_it_is_for": "The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses, extracted so the rate vector and the grid can never drift apart.",
  "formula_in_words": "For each calendar month: gross salary + tips (only in months with salary) + net rent ÷ 12 + that month's stock vesting + taxed extra in a month + retirement income; + the bonus in its month (December when none); + the signing bonus in January; + one-off taxed other income in its month; − the household's 401(k) that month. Never below 0."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0184",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "",
  "the_log_records": "The app carried TWO complete tax engines, both live from the same profile on the same day, and one of them could not read a filing status at all. One is deleted. ZERO numbers moved for a single filer — the two were identical arithmetic there — and it becomes correct for couples the moment the filing-status question lands.",
  "governs": "MK-CF-F-100 taxableIncomeFor · MK-CF-F-101 taxOwedFor · MK-CF-F-102 effectiveRateOnGrossFor · MK-CF-F-103 marginalBracketFor · MK-CF-F-097 grossFromNet (src/domain/income/tax.ts) · MK-CF-M-032 · MK-CF-M-043 · MK-MN-M-028"
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
  "id": "DEC-0240",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "agree — add the $6,000 senior deduction (65+, 2025–2028)",
  "the_log_records": "“agree — add the $6,000 senior deduction (65+, 2025–2028).” An extra deduction for people 65 and over, which exists for those tax years and was missing from every tax figure.",
  "governs": "MK-MN-M-027 · MK-MN-M-028 · MK-CF-F-099 · MK-CF-F-187 · MK-CF-F-099 · MK-CF-F-100"
 },
 {
  "id": "DEC-0253",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "ok — the bracket loops written by hand; the statutory tables in the file",
  "the_log_records": "“ok — the bracket loops written by hand; the statutory tables in the file.” The tax tables are typed in from the law and kept in the file; only the arithmetic over them is code.",
  "governs": "MK-CF-F-101 · MK-CF-F-103"
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
  "id": "DEC-0325",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "over-65 additional standard deduction",
  "the_log_records": "“over-65 additional standard deduction.” People 65 and over get an extra amount on top of the standard deduction, and it was missing.",
  "governs": "MK-CF-F-187"
 },
 {
  "id": "DEC-7942",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenets 3 and 5), made without asking him, as his order of 2026-09-30 says. A $5,000 take-home with the person's own 0% rate: the gross box showed 5475.378787878787, worked back from the federal tables, the card read Everything else taken out $475/month · 0%, and its last line said nothing there was calculated. The gross is now worked back with their own rate, $5,000.00, under the line \"≈ Worked back from the take-home you entered. Type the gross from a payslip to replace it.\", and the card's last line says the take-home is what was entered and the gross was worked back from it. The typed take-home is unchanged ($5,000 on This month). Typing a gross brings back the drawing's words. The drawing's rule 9: every estimate is prefixed ≈ and says what it cannot see. To reverse: work the gross back from the federal schedule and print the drawn words. One word from him reverses it.",
  "governs": "MK-CF-F-186 convertTakeHomeMode · MK-CF-O-001 basePay · MK-CF-M-030 · src/screens/BasePayScreen.tsx"
 }
]
```
