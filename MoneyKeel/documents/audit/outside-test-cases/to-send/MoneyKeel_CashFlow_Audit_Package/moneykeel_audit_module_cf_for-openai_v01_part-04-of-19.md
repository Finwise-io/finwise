# Cash flow — part 4 of 19: Benefits, retirement income and other income

10 cards, so 10 formula checks and 50 cases, and one `rules_held` line for each of the 20 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 4"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface GuaranteedStream { kind: 'ss' | 'pension' | 'annuity' | 'other'; monthly: number; inflates: boolean }
```

## The cards

```json
[
 {
  "id": "MK-CF-F-069",
  "name": "benefitActiveMonths",
  "kind": "function",
  "what_it_is_for": "Calendar months (1-12) benefits are received — e.g.",
  "formula_in_words": "The months, 1 to 12, in which the benefit is paid, in order; all twelve when none are named.",
  "handed": "export function benefitActiveMonths(op: OnboardingProfile | null): number[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-070",
  "name": "benefitAnnual",
  "kind": "function",
  "what_it_is_for": "Annual benefits = monthly amount × the months it's actually received.",
  "formula_in_words": "The monthly benefit × the number of months it is paid (benefitActiveMonths).",
  "handed": "export function benefitAnnual(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-071",
  "name": "extraIncome",
  "kind": "function",
  "what_it_is_for": "Extra income sources beyond salary/rental/equity (self-employment, investment, benefits, support, scholarship, other), split into taxable vs non-taxable steady monthly amounts + a one-time Jan amount.",
  "formula_in_words": "Taxed in a month = self-employment (yearly ÷ 12, or the monthly figure) + interest and dividends ÷ 12 + other income when taxable (yearly ÷ 12, or the monthly figure). Untaxed in a month = benefits for the year ÷ 12 + support + scholarships (monthly, or yearly ÷ 12) + other income when marked not taxable. One-off other income goes to one-off taxed or one-off untaxed — only in the year it lands when that year is on record (no year on record: every year, as before); another year's income does not carry it. Reinvested in a month = interest and dividends ÷ 12, unless they are paid to the bank — then 0.",
  "handed": "export function extraIncome(op: OnboardingProfile | null): {\n  taxableMonthly: number; nontaxMonthly: number; onetimeTaxable: number; onetimeNontax: number;\n  reinvestedMonthly: number;\n}",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives"
  ],
  "decisions_that_govern_it": [
   "DEC-7940"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-072",
  "name": "currentRetirementIncomeMonthly",
  "kind": "function",
  "what_it_is_for": "Retirement income (ri_*) counts as CURRENT income only when the user actually receives it now — i.e.",
  "formula_in_words": "0 when the person's chosen income sources are listed and retirement income is not among them; otherwise retirementIncomeMonthly.",
  "handed": "export function currentRetirementIncomeMonthly(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-040 whether a stream is already being received"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-073",
  "name": "otherIncomeMonth",
  "kind": "function",
  "what_it_is_for": "Calendar month (1-12) a one-time \"other income\" lands in (default January).",
  "formula_in_words": "The month typed for the other income, held between 1 and 12; January when none.",
  "handed": "export function otherIncomeMonth(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-074",
  "name": "tipsAnnual",
  "kind": "function",
  "what_it_is_for": "Tips are part of employment income — they only count in the months the job is active, and the annual figure is prorated like salary (a temp job that ends stops the tips too).",
  "formula_in_words": "Monthly tips × the number of months with any salary (salaryActiveMonths).",
  "handed": "export function tipsAnnual(op: OnboardingProfile | null, now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-039 how often each income arrives"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-075",
  "name": "retirementIncomeMonthly",
  "kind": "function",
  "what_it_is_for": "Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.",
  "formula_in_words": "Social Security, pension, withdrawals, required distributions, annuities and other, each turned into a month — monthly as it is, quarterly ÷ 3, yearly ÷ 12 — and added.",
  "handed": "export function retirementIncomeMonthly(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income",
   "MK-XS-I-037 required-withdrawal income stream (ri_rmd)",
   "MK-XS-I-038 withdrawal income stream (ri_withdrawals)",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-076",
  "name": "guaranteedOutsideStreams",
  "kind": "function",
  "what_it_is_for": "The guaranteed income that comes from outside the person's own savings, one row for each source that pays anything: Social Security, a pension, an annuity or another, each as a monthly amount with whether it rises with prices.",
  "formula_in_words": "Social Security, pension, annuity and other, each as a monthly amount (quarterly ÷ 3, yearly ÷ 12), only those above zero. Rises with prices: Social Security yes, the others no — unless the person said otherwise. Withdrawals and required distributions are not here.",
  "handed": "export function guaranteedOutsideStreams(op: OnboardingProfile | null): GuaranteedStream[]",
  "inputs_it_reads": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-022",
    "words_on_screen": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
    "when_it_refuses": "No pot to project from, or retirement age already reached — the card is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-023",
    "words_on_screen": "YOUR FUTURE PAYCHECK — Social Security · pension",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The guaranteed part of that future month: Social Security, pension, annuity, other.",
    "when_it_refuses": "No pot to project from, or retirement age already reached — the card is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0244",
   "DEC-0245",
   "DEC-0247"
  ],
  "period": [
   "MK-CF-M-022: a month",
   "MK-CF-M-023: a month"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-022: No pot to project from, or retirement age already reached — the card is not drawn.",
   "MK-CF-M-023: No pot to project from, or retirement age already reached — the card is not drawn."
  ]
 },
 {
  "id": "MK-CF-F-077",
  "name": "scholarshipByCalendarMonth",
  "kind": "function",
  "what_it_is_for": "Scholarships/grants placed in the calendar months they actually land (Jan→Dec) — NOT averaged.",
  "formula_in_words": "Twelve months. A monthly scholarship adds its amount every month. A yearly one is split evenly over the months it names, or over all twelve when it names none. With no list: the single typed amount — monthly, or ÷ 12.",
  "handed": "export function scholarshipByCalendarMonth(op: OnboardingProfile | null): number[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-092",
  "name": "incomeMonthlyGrid",
  "kind": "function",
  "what_it_is_for": "A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness: salary & net rental are steady every month; the annual bonus lands in December; the signing bonus is one-time (January); equity is the level annual vesting spread across the month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).",
  "formula_in_words": "For each calendar month. Earned before 401(k) = that month's taxed income (taxableByCalendarMonth) + that month's 401(k). Untaxed = support + that month's scholarships + benefits in their months + one-off untaxed income in its month. Gross = earned before 401(k) + untaxed − reinvested interest and dividends. Tax = tax on the wages + tax on the rest. The wages, earner by earner (worked in one place, which the Cash flow months read too): an earner who typed a take-home is taxed at their own share — (their yearly gross − their 401(k) for the year − 12 × the typed take-home) ÷ their yearly gross, held between 0 and 1 — so they land exactly what they typed; any other earner's wage × the rate in force (monthlyTaxRates). The rest (earned before 401(k) − the wages) × the rate in force — except that when the rate is the person's own, the month's rent and interest and dividends are left out, because they are not on a payslip. After-tax = gross − tax. Take-home = gross − tax − 401(k).",
  "handed": "export function incomeMonthlyGrid(op: OnboardingProfile | null, mode: 'gross' | 'net' | 'available' = 'available', now: Date = new Date()): { label: string; amount: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "decisions_that_govern_it": [
   "DEC-7938"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

6 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
 {
  "id": "MK-CF-F-081",
  "name": "salaryActiveMonths",
  "what_it_is_for": "How many months of the year you draw a salary.",
  "formula_in_words": "How many of the twelve months have gross salary above zero."
 },
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12."
 },
 {
  "id": "MK-CF-F-084",
  "name": "taxableAnnual",
  "what_it_is_for": "Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.",
  "formula_in_words": "totalGrossAnnual WITHOUT the untaxed parts: salary + tips + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + one-off taxed + retirement income in a month × 12. The 401(k) is NOT taken off here."
 },
 {
  "id": "MK-CF-F-087",
  "name": "monthlyTaxRates",
  "what_it_is_for": "The tax rate for each of the twelve months, as a share: the one rate in force in every month — the person's own where they gave one, otherwise the calculated rate.",
  "formula_in_words": "Twelve rates, all the same: the rate in force (rateInForce) — the person's own, or the calculated one. A steady income is taxed the same in every month."
 },
 {
  "id": "MK-CF-F-088",
  "name": "taxableByCalendarMonth",
  "what_it_is_for": "The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses, extracted so the rate vector and the grid can never drift apart.",
  "formula_in_words": "For each calendar month: gross salary + tips (only in months with salary) + net rent ÷ 12 + that month's stock vesting + taxed extra in a month + retirement income; + the bonus in its month (December when none); + the signing bonus in January; + one-off taxed other income in its month; − the household's 401(k) that month. Never below 0."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**Guaranteed income in a month** — in this part: MK-CF-F-072, MK-CF-F-075, MK-CF-F-076

```json
[
 {
  "id": "MK-CF-F-105",
  "name": "guaranteedRows",
  "what_it_is_for": "The dated guaranteed-income rows for the next 12 months (the F2 grid seam).",
  "formula_in_words": "Nothing when the person's chosen income sources are listed without retirement income. Otherwise, over the twelve months starting with the current one, for Social Security, pension, annuity and other retirement income with an amount above zero: monthly → the amount in every month; quarterly → the amount in four months, three apart, starting at its named month (the current month when none); yearly → the amount once, in its named month (the current month when none). The amount is the amount of EACH PAYMENT."
 }
]
```

## The figures these cards feed — as the screen register holds them

The author's record of each figure, with a worked example the app's own door ran (convention 10). Judge the cards; the figures themselves are checked against the tenets in the screen parts.

```json
[
 {
  "id": "MK-CF-M-022",
  "label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
  "formula": "guaranteed income a month + the draw the projected pot can support (the paycheck year’s level draw)",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-017 birth year",
   "MK-XS-I-018 retirement age",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-020 Social Security monthly amount"
  ],
  "decisions": [
   "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise.",
   "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
  ],
  "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
  "worked": {
   "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
   "answer": "$4,345/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-0245",
   "DEC-0247"
  ]
 },
 {
  "id": "MK-CF-M-023",
  "label": "YOUR FUTURE PAYCHECK — Social Security · pension",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "The guaranteed part of that future month: Social Security, pension, annuity, other.",
  "formula": "the outside guaranteed streams a month, added up",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
  "worked": {
   "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
   "answer": "$2,000/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-0244"
  ]
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
  "id": "DEC-0244",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "ok — the paycheck's guaranteed line = the four outside sources",
  "the_log_records": "“ok — the paycheck’s guaranteed line = the four outside sources.” The guaranteed part of a retirement paycheck is the income that comes from outside your savings — four named sources — not anything drawn from the pot.",
  "governs": "MK-CF-M-023 · MK-CF-F-076"
 },
 {
  "id": "DEC-0245",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "question answered: yes, the row named the wrong function; the screen was right",
  "the_log_records": "“question answered: yes, the row named the wrong function; the screen was right.” The master file pointed at the wrong calculation; the app was correct. The file was fixed, not the code.",
  "governs": "MK-CF-M-022 · MK-CF-F-107 · MK-CF-F-076 · MK-PL-F-050"
 },
 {
  "id": "DEC-0247",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "1000 everywhere",
  "the_log_records": "“1000 everywhere.” Every projection runs 1,000 possible futures — one number, on every screen and in every calculation, so no two screens run a different many.",
  "governs": "MK-XS-M-002 · MK-CF-M-022 · MK-PL-F-050"
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
 },
 {
  "id": "DEC-7940",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0447 and DEC-0196, made without asking him, as his order of 2026-09-30 says. Add your income offered Bonus / one-time as one choice, which opened the yearly bonus editor, so a one-time $2,000 came back the next September and stayed in the next year's taxed income. Bonus and One-time income are now two choices; one-time income keeps its month with its year and lands once. Your sources lists it: Bonus · one-time · lands in September $2,000 (nothing said why THIS MONTH read $7,195). September reads $7,195 on the Income tab, This month and Home; October $5,396; 2027 is back to $5,416. Under his one-rate rule (DEC-0196, ruled as G46) the bonus raises the rate for every month that year, so October falls by $19.88; that is his rule, left as it is. An unpaid one-time bill dated in a passed month stays in Later; only income that has landed leaves it. To reverse: one choice to the bonus editor, and no row for other income. One word from him reverses it.",
  "governs": "MK-CF-F-071 extraIncome · MK-CF-F-124 nextOccurrence · MK-XS-F-004 buildDatedGrid · MK-CF-M-027 · MK-CF-M-047 · the Income tab (src/screens/IncomeManagerScreen.tsx)"
 }
]
```
