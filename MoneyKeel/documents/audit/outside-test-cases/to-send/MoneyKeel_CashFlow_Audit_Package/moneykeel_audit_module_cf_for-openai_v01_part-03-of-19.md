# Cash flow — part 3 of 19: Stock that vests, and rent from a property

11 cards, so 11 formula checks and 55 cases, and one `rules_held` line for each of the 18 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 3"` in your reply.

## The cards

```json
[
 {
  "id": "MK-CF-F-062",
  "name": "equityRowValue",
  "kind": "function",
  "what_it_is_for": "Value of one vesting-schedule row.",
  "formula_in_words": "An option: shares × (market price − strike price), never below 0. Any other grant: shares × price.",
  "handed": "export function equityRowValue(row: any, type: string, strike?: any, market?: any): number",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-063",
  "name": "rowVestYear",
  "kind": "function",
  "what_it_is_for": "Calendar year a row vests (first 4 digits of its date; this year if blank).",
  "formula_in_words": "The first four-digit year in the row's date; this year when it has none.",
  "handed": "export function rowVestYear(row: any): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-064",
  "name": "equityCashFlow",
  "kind": "function",
  "what_it_is_for": "Per-calendar-year vesting cash flow across all schedule rows — drives the chart & table.",
  "formula_in_words": "The value of each vesting row (equityRowValue) added by vesting year; rows of zero or less are left out; earliest year first.",
  "handed": "export function equityCashFlow(op: OnboardingProfile | null): { year: number; amount: number }[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-065",
  "name": "equityVestWeights",
  "kind": "function",
  "what_it_is_for": "Vest-month weights (Jan→Dec, summing to 1) from the equity grant rows — THE one placement rule.",
  "formula_in_words": "Each row's value goes to the month in its date (December when it has none); each month's share = its value ÷ the total. Nothing when no row has a value.",
  "handed": "export function equityVestWeights(op: OnboardingProfile | null): number[] | null",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-066",
  "name": "rsuAnnual",
  "kind": "function",
  "what_it_is_for": "Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).",
  "formula_in_words": "With vesting rows: their total value ÷ the number of different years in which rows with a value vest (at least 1). With none: shares × price, as typed.",
  "handed": "export function rsuAnnual(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-219",
  "name": "rentEntryMonthly",
  "kind": "function",
  "what_it_is_for": "What one rent entry comes to a month, as typed — read by the one strict reader (DEC-3768c, 2026-10-10), the reader rentalList counts with: \"about 2k\" is not a number, so it reads as not entered (0), never as $2.",
  "formula_in_words": "What one rent entry comes to a month, as typed: its rent and its running costs, each read only when it is a plain number (digits with at most one decimal point, allowing a leading dollar sign, thousands commas and spaces) — a figure with letters or other text in it is not entered and counts as 0, never as the digits inside it, and a figure not entered counts as 0; and its net = rent − running costs, which can be below zero. No entry: all three 0. The sign-up rent step shows these figures and rentalList counts with the same reading (owner rule DEC-3768c, 2026-10-10).",
  "handed": "export function rentEntryMonthly(r: { income?: any; expenses?: any } | null | undefined): { income: number; expenses: number; net: number }",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-067",
  "name": "rentalList",
  "kind": "function",
  "what_it_is_for": "Normalized list of rental properties, read from the `rentals` array.",
  "formula_in_words": "Each rent entry that names its property (a property identifier that is not blank) with rent or running costs above zero: long-term unless marked short-term, its monthly rent and its monthly running costs. An entry that names no property is not counted (owner rule DEC-4059d, 2026-10-10). With no list of rent entries: nothing — the old single typed rent figure names no property, so it is not counted either. Owner rule, 2026-10-10: each rent and running-cost figure is read only when it is a plain number (digits with at most one decimal point, allowing a leading dollar sign, thousands commas and spaces); a figure with letters or other text in it is not entered and counts as 0, never as the digits inside it.",
  "handed": "export function rentalList(op: OnboardingProfile | null): { type: 'long' | 'short'; income: number; expenses: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [
   "DEC-3768",
   "DEC-3768c"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-068",
  "name": "rentalNetAnnual",
  "kind": "function",
  "what_it_is_for": "Total net rental income per year, across all properties (income − operating expenses).",
  "formula_in_words": "(Monthly rent − monthly running costs) added over the rentals, × 12. A rental that loses money pulls the total down.",
  "handed": "export function rentalNetAnnual(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-216",
  "name": "typed",
  "kind": "function",
  "what_it_is_for": "THE OLD SINGLE RENT FIGURE, MOVED ONCE INTO THE RENT LIST.",
  "formula_in_words": "True when a figure was typed: it is present and is not blank once spaces are taken off. A typed 0 counts as typed.",
  "handed": "const typed = (v: unknown)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-217",
  "name": "hasOldRentFigure",
  "kind": "function",
  "what_it_is_for": "True when this profile still holds the old single rent figure.",
  "formula_in_words": "True when the profile still holds any of the old single rent fields (rent coming in, costs going out, or the kind of let); false for no profile.",
  "handed": "export function hasOldRentFigure(op: Record<string, any> | null | undefined): boolean",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-218",
  "name": "moveOldRentFigure",
  "kind": "function",
  "what_it_is_for": "The profile with its old single rent figure moved into the rent list as an entry with no property.",
  "formula_in_words": "Moves the old single rent figure into the rent list once, then removes the old fields. Unchanged when there is no old figure, or when the rent list is there but cannot be read. When the rent list already has entries, the list stands and the old fields are just removed. When neither old figure was typed, the old fields are just removed. Otherwise the list becomes one entry with no property — short let or long let as stored (long when not stated), the rent and the costs as typed, blank when not — which is not rent until its property is picked (DEC-4059d).",
  "handed": "export function moveOldRentFigure<T extends Record<string, any>>(op: T): T",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**Rent from a property** — in this part: MK-CF-F-067, MK-CF-F-068, MK-CF-F-219

```json
[
 {
  "id": "MK-CF-F-127",
  "name": "isRental",
  "what_it_is_for": "Whether an income source is rent from a property, long-term or short-term.",
  "formula_in_words": "True for a long-term rental or a short-term rental."
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
  "id": "DEC-3768",
  "decided": "2026-10-10",
  "type": "PROCESS",
  "tab": "networth-and-performance",
  "whose": "his",
  "his_words": "#2,3 - approved.",
  "the_log_records": "His approval of items 2 and 3 of the open points from OpenAI's final audit, as a whole. Each rule is its own row beside this one.",
  "governs": "MK-NW-F-090 windowStartKey · MK-PF-F-008 startDateFor · MK-NW-F-114 rentAmount · MK-CF-F-067 rentalList · MK-NW-F-115 liveRent"
 },
 {
  "id": "DEC-3768c",
  "decided": "2026-10-10",
  "type": "CALCULATION",
  "tab": "networth-and-performance",
  "whose": "his",
  "his_words": "#2,3 - approved.",
  "the_log_records": "A rent or running-cost figure is a number. One with words in it — \"about 2k\" — is not read: it counts as not entered, and the rent field on the Income screen takes digits only. Before: \"about 2k\" was read as $2, and the property counted as a rental.",
  "governs": "MK-NW-F-114 rentAmount · MK-CF-F-067 rentalList · MK-NW-F-115 liveRent"
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
