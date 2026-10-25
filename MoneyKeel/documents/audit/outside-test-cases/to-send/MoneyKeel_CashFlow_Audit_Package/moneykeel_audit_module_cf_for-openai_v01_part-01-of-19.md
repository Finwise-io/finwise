# Cash flow — part 1 of 19: Wages — what is paid, in which months, and the year it makes

15 cards, so 15 formula checks and 75 cases, and one `rules_held` line for each of the 17 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 1"` in your reply.

## The cards

```json
[
 {
  "id": "MK-CF-F-059",
  "name": "annualizedEnteredSalary",
  "kind": "function",
  "what_it_is_for": "Annual amount of what the user ENTERED (not grossed up) — for display.",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52. Otherwise base pay × the periods in a year: weekly 52, every two weeks 26, monthly 12, yearly 1 — monthly when no frequency is given.",
  "handed": "export function annualizedEnteredSalary(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-130",
  "name": "enteredMonthlyRaw",
  "kind": "function",
  "what_it_is_for": "A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52 ÷ 12. Otherwise base pay × the periods in a year ÷ 12 (weekly 52, every two weeks 26, monthly 12, yearly 1).",
  "handed": "function enteredMonthlyRaw(a: Record<string, any>): number",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-060",
  "name": "salaryGrossByMonth",
  "kind": "function",
  "what_it_is_for": "Per-month GROSS base salary, Jan→Dec.",
  "formula_in_words": "Each earner's twelve months of gross pay (wageGrossByMonth), added month by month.",
  "handed": "export function salaryGrossByMonth(op: OnboardingProfile | null): number[]",
  "decisions_that_govern_it": [
   "DEC-0376"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-177",
  "name": "wageGrossByMonth",
  "kind": "function",
  "what_it_is_for": "ONE person's wage, month by month, January first.",
  "formula_in_words": "With a month table: this calendar year's twelve months from the table, any month not in it taking the typical monthly figure. With none: the typical monthly figure (enteredMonthlyRaw) in every month.",
  "handed": "export function wageGrossByMonth(w: Record<string, any> | null): number[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-061",
  "name": "grossSalaryMonthly",
  "kind": "function",
  "what_it_is_for": "A representative full-month GROSS salary (the highest month — undiluted by $0 gap months).",
  "formula_in_words": "The LARGEST of the twelve monthly gross salary figures (salaryGrossByMonth).",
  "handed": "export function grossSalaryMonthly(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-080",
  "name": "jobActiveMonth",
  "kind": "function",
  "what_it_is_for": "Is base salary present in calendar month i (0-11)?",
  "formula_in_words": "True when that calendar month's gross salary is above zero.",
  "handed": "export function jobActiveMonth(op: OnboardingProfile | null, i: number, _now: Date = new Date()): boolean",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-081",
  "name": "salaryActiveMonths",
  "kind": "function",
  "what_it_is_for": "How many months of the year you draw a salary.",
  "formula_in_words": "How many of the twelve months have gross salary above zero.",
  "handed": "export function salaryActiveMonths(op: OnboardingProfile | null, _now: Date = new Date()): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-082",
  "name": "salaryAnnual",
  "kind": "function",
  "what_it_is_for": "Salary income for the year = sum of the per-month gross salary.",
  "formula_in_words": "The twelve months of gross salary (salaryGrossByMonth) added.",
  "handed": "export function salaryAnnual(op: OnboardingProfile | null, _now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "kind": "function",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12.",
  "handed": "export function totalGrossAnnual(op: OnboardingProfile | null, now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-206",
  "name": "householdK401ByMonth",
  "kind": "function",
  "what_it_is_for": "THE HOUSEHOLD'S 401(k) CONTRIBUTIONS, MONTH BY MONTH — every earner's, in the months that earner is actually paid.",
  "formula_in_words": "For each earner: their monthly 401(k) in every month they have gross pay, and 0 in months they do not. Added over the earners, month by month.",
  "handed": "export function householdK401ByMonth(op: OnboardingProfile | null): number[]",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution"
  ],
  "decisions_that_govern_it": [
   "DEC-0376"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-233",
  "name": "earnerWageShares",
  "kind": "function",
  "what_it_is_for": "What it is for: each earner's wage by calendar month, with the share of it that earner's own typed take-home says comes out (null when they typed none, so the household rate in force applies).",
  "formula_in_words": "Each earner's wage by calendar month, with the share of it that earner's own typed take-home says comes out. That share = (the year's wages − their 401(k) a month × the months they are paid − their typed take-home a month × 12) ÷ the year's wages, kept between 0 and 1; nothing when they typed no take-home above 0 or have no wages, so the household's rate in force applies to them.",
  "handed": "export function earnerWageShares(op: OnboardingProfile | null): { gross: number[]; own: number | null }[]",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution"
  ],
  "decisions_that_govern_it": [
   "DEC-7938"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-234",
  "name": "wagesLandingByMonth",
  "kind": "function",
  "what_it_is_for": "What it is for: THE WAGES THAT LAND, month by month, January first — every earner's pay after its tax and after the 401(k)s, the take-home Your base pay and the Income summary print.",
  "formula_in_words": "The wages that land, month by month, January first: for each month, every earner's wage that month × (1 − the share their own take-home says comes out, else that month's household rate in force), added up (earnerWageShares), less the household's 401(k)s that month.",
  "handed": "export function wagesLandingByMonth(op: OnboardingProfile | null, now: Date = new Date()): number[]",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)"
  ],
  "decisions_that_govern_it": [
   "DEC-7938"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-078",
  "name": "employerMatchMonthly",
  "kind": "function",
  "what_it_is_for": "Employer match resolved to $/month.",
  "formula_in_words": "Each earner's match in a month (wageMatchMonthly), added.",
  "handed": "export function employerMatchMonthly(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-178",
  "name": "wageMatchMonthly",
  "kind": "function",
  "what_it_is_for": "ONE person's employer match: a share of their own contribution, or a flat amount.",
  "formula_in_words": "A match typed as a percent: monthly 401(k) × that percent ÷ 100. Typed as dollars: that amount.",
  "handed": "export function wageMatchMonthly(w: Record<string, any> | null): number",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution",
   "MK-XS-I-046 how the employer match is expressed — percent or dollars"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-079",
  "name": "incomeFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Turns the income answers given during setup into the list of income sources the app stores.",
  "formula_in_words": "Builds the stored income list from the sign-up answers, one source for each amount above zero: base salary = yearly salary ÷ 12, monthly, with the employer match; the bonus, yearly, in its month (December when none); stock vesting, yearly, split by vesting month; a signing bonus, once, in January; each rental, monthly, with its running costs; tips = yearly tips ÷ 12, monthly; retirement income, monthly; self-employment, monthly or yearly; interest and dividends, yearly; benefits = the year ÷ 12, monthly; support, monthly; each scholarship; other income with its frequency and month. Tax: the person's own rate (percent ÷ 100, held between 0 and 1) when they chose to type one; otherwise calculated.",
  "handed": "export function incomeFromOnboarding(uid: UserId, op: OnboardingProfile | null): IncomeDoc",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A wage turned into a month or a year** — in this part: MK-CF-F-059, MK-CF-F-130, MK-CF-F-082

```json
[
 {
  "id": "MK-CF-F-140",
  "name": "periodsAYear",
  "what_it_is_for": "How many pay periods a year a pay frequency has, taken as 12 when it is monthly or not stated.",
  "formula_in_words": "Pay periods in a year: hourly 2,080, weekly 52, every two weeks 26, monthly 12, yearly 1. Any other frequency: 12."
 },
 {
  "id": "MK-CF-F-141",
  "name": "perMonth",
  "what_it_is_for": "One period of pay expressed as a month.",
  "formula_in_words": "Hourly: amount × hours a week (40 when none is entered) × 52 ÷ 12. Any other frequency: amount × pay periods in a year ÷ 12."
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "formula_in_words": "The average of the monthly gross rows (grossByMonth) × 12. 0 when there are no rows."
 },
 {
  "id": "MK-CF-F-045",
  "name": "grossAnnualBaseline",
  "what_it_is_for": "Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized.",
  "formula_in_words": "annualNet added over every source."
 }
]
```

**Gross income for the year** — in this part: MK-CF-F-083, MK-CF-F-082

```json
[
 {
  "id": "MK-CF-F-045",
  "name": "grossAnnualBaseline",
  "what_it_is_for": "Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized.",
  "formula_in_words": "annualNet added over every source."
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "formula_in_words": "The average of the monthly gross rows (grossByMonth) × 12. 0 when there are no rows."
 }
]
```

**The household's 401(k) contributions** — in this part: MK-CF-F-206

```json
[
 {
  "id": "MK-CF-F-188",
  "name": "householdPreTaxContributionsAnnual",
  "what_it_is_for": "The household's pre-tax 401(k) contributions for the year — every earner's, added up.",
  "formula_in_words": "Each earner's monthly 401(k) added, × 12."
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
  "id": "DEC-0376",
  "decided": "2026-09-12",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "one card disagreeing with itself: the household take-home row read ~$10,442/month over a take-home line of ~$9,242; corrected to ~$9,242. A total agrees with the lines printed above it, and it is the LINES that are right.",
  "the_log_records": "A total must equal the lines printed above it, and where they disagree it is the LINES that are right. The income card showed a household take-home of about $10,442 a month over a take-home line of about $9,242 — the total was corrected down to the lines.",
  "governs": "MK-CF-M-037 · MK-CF-M-038 · MK-CF-O-004 · MK-CF-O-001 · MK-CF-M-037 · MK-CF-F-060 · MK-CF-F-206"
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
 }
]
```
