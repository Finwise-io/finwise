# Cash flow — part 7 of 19: Essentials, savings by month, and the budget against what was spent

12 cards, so 12 formula checks and 60 cases, and one `rules_held` line for each of the 6 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 7"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface BudgetDoc {
  user_id: UserId;
  monthly_spending: number;        // total planned monthly spend
  fixed: number;                   // optional flex buckets
  non_monthly: number;
  flexible: number;
  last_updated?: any;
}

export interface BudgetVsActual {
  month: string;            // 'YYYY-MM'
  planned_total: number;    // planned monthly budget (from onboarding)
  spent_total: number;      // month-to-date actual
  remaining: number;        // planned − spent
  buckets: BucketActual[];
}

export interface EssentialsAverage {
  monthly: number;          // the average over the months counted
  monthsCounted: number;    // calendar months with at least one logged entry, inside the window
  label: string;            // "7 month average" — the words the screen prints beside the figure
  from: string;             // first month counted, 'YYYY-MM'
  to: string;               // last month counted, 'YYYY-MM'
}

export interface EssentialsMonthly { monthly: number; basis: 'logged' | 'entered'; label: string; logged: EssentialsAverage | null }

export interface LoggedSpend { amount: any; date: string; category?: string }

export interface ShockResult {
  shock: number;
  cashAfter: number;          // cash left right after the hit
  monthlyEssentials: number;  // what you must keep paying each month
  runwayAfter: number;        // months your remaining cash covers essentials after the hit
  jobLossRunway: number;      // months your cash lasts with NO income (no shock)
  coversIt: boolean;          // cash absorbs the shock without going negative
  recommendedFund: number;    // low end of a 3–6 month emergency fund (3× essentials)
  gapToFund: number;          // how far your cash is from that
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-006",
  "name": "allocatableThisMonth",
  "kind": "function",
  "what_it_is_for": "What's LEFT of this month's surplus to put to work = surplus − already-allocated this month (never < 0).",
  "formula_in_words": "Surplus − what has already been set aside this month; never below 0.",
  "handed": "export function allocatableThisMonth(surplus: number, allocatedThisMonth: number | undefined): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-007",
  "name": "nonMonthlyBasis",
  "kind": "function",
  "what_it_is_for": "Label basis for the non-monthly bucket (e.g.",
  "formula_in_words": "True, with the percents added and rounded to a whole number, only when there is at least one non-monthly category above zero and every one of them is entered as a percent. Otherwise false and 0.",
  "handed": "export function nonMonthlyBasis(op: OnboardingProfile | null): { allPct: boolean; pct: number }",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-009",
  "name": "monthlyEssentials",
  "kind": "function",
  "what_it_is_for": "Monthly money you MUST keep paying — the recurring (non-monthly excluded) Critical + Important bills.",
  "formula_in_words": "With no categories: the planned monthly expenses (plannedMonthlySpend). With categories: the monthly categories marked as needs — every one except those marked flexible, a category with no mark counting as flexible, and non-monthly ones left out — added up (a percent one = percent of the average monthly take-home), plus the amount by which the typed monthly figure exceeds what the categories put in every month: their total less the twelfth of each non-monthly category that names its months, since such a bill is on top of the typed figure, in its own months.",
  "handed": "export function monthlyEssentials(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-025 typical monthly essentials",
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "decisions_that_govern_it": [
   "DEC-7951"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-010",
  "name": "emergencyTest",
  "kind": "function",
  "what_it_is_for": "\"What if a $X emergency hit right now?\" — can your cash absorb it, and how long would you last.",
  "formula_in_words": "Essentials = the figure handed in when above zero, otherwise monthlyEssentials. Cash after = cash − the shock. Months of cover after the shock = cash after (never below 0) ÷ essentials. Months of cover with no shock = cash ÷ essentials. Both are 0 when essentials are 0. Covers it when cash after is zero or more. Recommended fund = essentials × 3. Gap = recommended fund − cash, never below 0.",
  "handed": "export function emergencyTest(op: OnboardingProfile | null, cash: number, shock: number, essentialsOverride?: number): ShockResult",
  "inputs_it_reads": [
   "MK-XS-I-025 typical monthly essentials"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-024",
    "words_on_screen": "You could cover a $X hit",
    "unit": "money",
    "what_it_answers": "Whether your cash would absorb a sudden cost.",
    "when_it_refuses": "No cash entered.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-025",
    "words_on_screen": "You'd have $X left — about N months of essentials",
    "unit": "words",
    "what_it_answers": "What would be left after the hit, and how long that would last.",
    "when_it_refuses": "No essentials figure — the months are not stated rather than guessed.",
    "shown_on": [
     "/stress-test"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0251",
   "DEC-0260"
  ],
  "period": [
   "MK-MN-M-024: no period on the figure",
   "MK-MN-M-025: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-024: No cash entered.",
   "MK-MN-M-025: No essentials figure — the months are not stated rather than guessed."
  ]
 },
 {
  "id": "MK-CF-F-011",
  "name": "savingsByMonth",
  "kind": "function",
  "what_it_is_for": "Discretionary amount free to save each month = take-home that month (after tax & 401k) minus the expenses due that month.",
  "formula_in_words": "For each calendar month: the take-home that month (incomeMonthlyGrid, take-home) − the planned expenses that month (spendByMonth).",
  "handed": "export function savingsByMonth(op: OnboardingProfile | null): { label: string; amount: number }[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-012",
  "name": "annualCashflow",
  "kind": "function",
  "what_it_is_for": "ONE annual cash-flow roll-up, derived entirely from the per-month income grid + spendByMonth — the SAME bases the savings-plan and budget already use.",
  "formula_in_words": "Gross for the year, after-tax for the year and take-home for the year = the twelve months of incomeMonthlyGrid in each of its three modes, added. Expenses for the year = spendByMonth added. Tax = gross − after-tax. 401(k) = after-tax − take-home. Saved = take-home − expenses.",
  "handed": "export function annualCashflow(op: OnboardingProfile | null): {\n  grossYr: number; taxYr: number; netYr: number; k401Yr: number; availableYr: number; spendYr: number; saveYr: number;\n}",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-013",
  "name": "budgetFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Turns the answers about expenses given during setup into the stored budget: the monthly total and its three parts, which are fixed bills, once-in-a-while costs and everyday expenses.",
  "formula_in_words": "The stored budget: monthly expenses = plannedMonthlySpend; fixed, non-monthly and flexible from spendBuckets.",
  "handed": "export function budgetFromOnboarding(uid: UserId, op: OnboardingProfile | null): BudgetDoc",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-014",
  "name": "budgetVsActual",
  "kind": "function",
  "what_it_is_for": "Month-to-date actual expenses vs the planned budget, bucketed.",
  "formula_in_words": "This calendar month's logged expenses, leaving out the category Debt payment, added into fixed, non-monthly or flexible by each expense's category. For each bucket: planned (spendBuckets), spent, remaining = planned − spent. The totals the same way.",
  "handed": "export function budgetVsActual(expenses: any[], op: OnboardingProfile | null, now: Date = new Date()): BudgetVsActual",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-032 expenses categories the person set up"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-017",
  "name": "publishSurplus",
  "kind": "function",
  "what_it_is_for": "Publish the authoritative surplus for Goals/Retirement to consume.",
  "formula_in_words": "Announces the projected-to-save figure to the rest of the app, unchanged.",
  "handed": "export function publishSurplus(uid: UserId, projectedToSave: number)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-191",
  "name": "ym",
  "kind": "function",
  "what_it_is_for": "Writes a date as its year and month: 2026-08.",
  "formula_in_words": "A date written as year-month, for example 2026-08.",
  "handed": "const ym = (d: Date)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-189",
  "name": "essentialsFromLoggedSpending",
  "kind": "function",
  "what_it_is_for": "What does a month actually cost, from what has been logged?",
  "formula_in_words": "Adds the logged expenses by calendar month. Looks at the 12 months BEFORE the current month. When at least one of those months holds any expense: average = their total ÷ the number of months that hold any — empty months are not counted as zero — labelled N month average. When none does: if the current month holds any, that month's total so far, labelled as one month; otherwise nothing.",
  "handed": "export function essentialsFromLoggedSpending(expenses: LoggedSpend[], now: Date = new Date()): EssentialsAverage | null",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-020",
    "words_on_screen": "N months of essentials is $X ($Y/month)",
    "unit": "words",
    "what_it_answers": "What the emergency fund you are aiming for actually costs.",
    "when_it_refuses": "No essentials figure yet.",
    "shown_on": [
     "/jobsafety"
    ]
   },
   {
    "id": "MK-MN-M-021",
    "words_on_screen": "Using $X/month from your logged expenses",
    "unit": "words",
    "what_it_answers": "Where the essentials figure came from, and how many months it stands on.",
    "when_it_refuses": "Nothing logged — it says the plan you entered is being used instead.",
    "shown_on": [
     "/jobsafety"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-021",
    "words": "The label names the basis so nobody has to guess whether it is one month or a year (his ruling G21)."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0251"
  ],
  "period": [
   "MK-MN-M-020: no period on the figure",
   "MK-MN-M-021: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-020: No essentials figure yet.",
   "MK-MN-M-021: Nothing logged — it says the plan you entered is being used instead."
  ]
 },
 {
  "id": "MK-CF-F-190",
  "name": "essentialsMonthly",
  "kind": "function",
  "what_it_is_for": "The one essentials-a-month figure a screen divides by, and where it came from.",
  "formula_in_words": "The logged average (essentialsFromLoggedSpending) when there is one; otherwise the typed figure when it is above zero, labelled you entered; otherwise nothing.",
  "handed": "export function essentialsMonthly(expenses: LoggedSpend[], typed: number, now: Date = new Date()): EssentialsMonthly | null",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-024",
    "words_on_screen": "You could cover a $X hit",
    "unit": "money",
    "what_it_answers": "Whether your cash would absorb a sudden cost.",
    "when_it_refuses": "No cash entered.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-025",
    "words_on_screen": "You'd have $X left — about N months of essentials",
    "unit": "words",
    "what_it_answers": "What would be left after the hit, and how long that would last.",
    "when_it_refuses": "No essentials figure — the months are not stated rather than guessed.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-026",
    "words_on_screen": "your $X/month of essentials",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What one month of the things you cannot skip costs.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-NW-M-013",
    "words_on_screen": "EMERGENCY FUND — X.X months",
    "unit": "months",
    "what_it_answers": "How many months your cash would cover, if your income stopped tomorrow.",
    "when_it_refuses": "No essentials figure yet — it says so rather than dividing by nothing. And no count of months where the rent pays for the whole month: the cash is then not drawn on.",
    "shown_on": [
     "/analytics",
     "/jobsafety",
     "/stress-test",
     "/insights",
     "/home"
    ]
   },
   {
    "id": "MK-NW-M-014",
    "words_on_screen": "of essentials covered by your cash — $X cash ÷ $Y/month essentials",
    "unit": "words",
    "what_it_answers": "The sum written out, so the months figure can be checked by eye.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/analytics"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-013",
    "words": "ONE essentials figure across all three screens (his ruling G21, 2026-09-08): the average of what has been logged, over the months logged."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-013",
    "words": "NOTHING LOGGED YET (DEC-0251, 2026-09-08): \"The typed plan is the fallback for someone who has logged nothing — never the other way round.\" The essentials typed in the plan stand in, and the line says so: \"$18,000 cash ÷ $3,470/month essentials — you entered\". (Row words corrected 2026-10-21, outside re-run OpenAI part 1; no figure moves.)"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-013",
    "words": "FOUNDER 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\" Rent arrives every month, so it is added to the cash every month — which is the cash ÷ (the month − the rent)."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0007",
   "DEC-0251",
   "DEC-0260"
  ],
  "period": [
   "MK-MN-M-024: no period on the figure",
   "MK-MN-M-025: no period on the figure",
   "MK-MN-M-026: a month",
   "MK-NW-M-013: no period on the figure",
   "MK-NW-M-014: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-024: No cash entered.",
   "MK-MN-M-025: No essentials figure — the months are not stated rather than guessed.",
   "MK-MN-M-026: Nothing logged and no plan set.",
   "MK-NW-M-013: No essentials figure yet — it says so rather than dividing by nothing. And no count of months where the rent pays for the whole month: the cash is then not drawn on.",
   "MK-NW-M-014: Nothing logged and no plan set."
  ]
 }
]
```

## Formulas these cards lean on

12 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
 {
  "id": "MK-CF-F-002",
  "name": "plannedMonthlySpend",
  "what_it_is_for": "The single canonical \"planned monthly spend\": the itemized buckets OR the stated total, whichever is larger (the stated total can include an uncategorized remainder the buckets don't capture).",
  "formula_in_words": "The year's planned expenses ÷ 12: the twelve months spendByMonth gives, added up, divided by 12. A bill with its own months counts once in the year, on top of the single monthly figure the person typed; with no such bill this equals the larger of the categories added up and that typed monthly figure."
 },
 {
  "id": "MK-CF-F-003",
  "name": "categoryMonthly",
  "what_it_is_for": "Canonical per-category planned $/month — the ONE conversion the buckets AND the Budget screen share, so a category's on-screen line item ALWAYS reconciles with its bucket total (build-34 #3).",
  "formula_in_words": "0 when the amount is zero or less. A dollar category: the amount, per month — a once-a-year (non-monthly) category is the yearly amount ÷ 12. A percent category: that percent of the average monthly take-home (pctBaseMonthly) — for a non-monthly one the same, worked as a yearly amount and ÷ 12."
 },
 {
  "id": "MK-CF-F-004",
  "name": "spendBuckets",
  "what_it_is_for": "Roll the per-category expenses up into the three monthly-normalized buckets.",
  "formula_in_words": "With categories: each category's monthly amount (categoryMonthly) is added into fixed, non-monthly or flexible — any other bucket counts as flexible; rows of zero are skipped. With no categories: the three typed bucket totals. Monthly total = the three added."
 },
 {
  "id": "MK-CF-F-008",
  "name": "spendByMonth",
  "what_it_is_for": "Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.",
  "formula_in_words": "Twelve calendar months: each month's figure is the three groups spendByMonthByBucket gives that month added up — bills & fixed, once in a while, everyday — so a screen that shows the groups and one that shows the month read the same amount. Each monthly category adds its monthly amount to every month (a percent category = that percent of the average monthly take-home). Each non-monthly category adds its yearly amount spread evenly over the months it names — over all twelve when it names none (a percent one = percent × average monthly take-home × 12). While only non-monthly categories exist, the typed bills & fixed and everyday totals are added to every month. With no categories: the three typed buckets' total, every month. Then, when the single typed monthly figure is larger than what the plan puts in every month (the monthly categories, the typed totals counted, and a non-monthly category that names no month at its twelfth), the difference is added to every month; a non-monthly category that names its months is on top of the typed figure, in those months only."
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
  "id": "MK-CF-F-092",
  "name": "incomeMonthlyGrid",
  "what_it_is_for": "A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness: salary & net rental are steady every month; the annual bonus lands in December; the signing bonus is one-time (January); equity is the level annual vesting spread across the month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).",
  "formula_in_words": "For each calendar month. Earned before 401(k) = that month's taxed income (taxableByCalendarMonth) + that month's 401(k). Untaxed = support + that month's scholarships + benefits in their months + one-off untaxed income in its month. Gross = earned before 401(k) + untaxed − reinvested interest and dividends. Tax = tax on the wages + tax on the rest. The wages, earner by earner (worked in one place, which the Cash flow months read too): an earner who typed a take-home is taxed at their own share — (their yearly gross − their 401(k) for the year − 12 × the typed take-home) ÷ their yearly gross, held between 0 and 1 — so they land exactly what they typed; any other earner's wage × the rate in force (monthlyTaxRates). The rest (earned before 401(k) − the wages) × the rate in force — except that when the rate is the person's own, the month's rent and interest and dividends are left out, because they are not on a payslip. After-tax = gross − tax. Take-home = gross − tax − 401(k)."
 },
 {
  "id": "MK-CF-F-120",
  "name": "pctBaseMonthly",
  "what_it_is_for": "A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan screen uses (modules.tsx SpendingEditor → takeHomeMonthly).",
  "formula_in_words": "The twelve months of take-home (incomeMonthlyGrid, take-home) added ÷ 12."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction."
 },
 {
  "id": "MK-CF-F-221",
  "name": "spendByMonthByBucket",
  "what_it_is_for": "THE MONTH'S PLANNED EXPENSES, BY THE BUDGET'S OWN THREE GROUPS — each calendar month, January first (2026-10-23).",
  "formula_in_words": "The month's planned expenses in the budget's three groups (bills and fixed, once in a while, everyday), for each of the 12 calendar months, January first. With categories, each category with an amount above 0 counts; one entered as a percent counts at amount ÷ 100 × the monthly take-home it is a share of (pctBaseMonthly). A once-in-a-while category's yearly amount (its amount, or for a percent that share × 12) falls in the months it names, split equally among them, or spread equally over all 12 when it names none; any other category counts its monthly amount in every month, under bills and fixed when it is a fixed bill and under everyday otherwise. While no category is a monthly one (only once-in-a-while categories), every month also gets the typed bills and fixed total and the typed everyday total, each in its own group. Without categories, every month gets the budget's three monthly totals (spendBuckets). Then every month's everyday expenses gain whatever the monthly spending entered is above what the plan puts in every month: the monthly categories, the typed totals counted above, and a once-in-a-while category that names no month at its twelfth. A once-in-a-while category that names its months is never counted against the monthly spending entered, so it adds to its own months only."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A date written as a year-month** — in this part: MK-CF-F-191

```json
[
 {
  "id": "MK-CF-F-163",
  "name": "monthKey",
  "what_it_is_for": "'YYYY-MM' for a date, read from the local clock — never toISOString, which is UTC.",
  "formula_in_words": "A date written as year-month, for example 2026-08."
 }
]
```

**Spending logged in a month** — in this part: MK-CF-F-014

```json
[
 {
  "id": "MK-CF-F-008",
  "name": "spendByMonth",
  "what_it_is_for": "Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.",
  "formula_in_words": "Twelve calendar months: each month's figure is the three groups spendByMonthByBucket gives that month added up — bills & fixed, once in a while, everyday — so a screen that shows the groups and one that shows the month read the same amount. Each monthly category adds its monthly amount to every month (a percent category = that percent of the average monthly take-home). Each non-monthly category adds its yearly amount spread evenly over the months it names — over all twelve when it names none (a percent one = percent × average monthly take-home × 12). While only non-monthly categories exist, the typed bills & fixed and everyday totals are added to every month. With no categories: the three typed buckets' total, every month. Then, when the single typed monthly figure is larger than what the plan puts in every month (the monthly categories, the typed totals counted, and a non-monthly category that names no month at its twelfth), the difference is added to every month; a non-monthly category that names its months is on top of the typed figure, in those months only."
 },
 {
  "id": "MK-CF-F-151",
  "name": "actualSpending",
  "what_it_is_for": "What was actually spent in a month, debt payments left out: every expense newest first, the five shown, how many more there are and the totals, for all of them or only those entered by hand or only those imported.",
  "formula_in_words": "The month's logged expenses, leaving out the category Debt payment, newest first — all of them, or only those entered by hand, or only those imported. Shown = the first 5. Hidden = how many more. Total = all of them added. Hidden total = total − the 5 shown."
 }
]
```

**What is left in a month** — in this part: MK-CF-F-011, MK-CF-F-012, MK-CF-F-017

```json
[
 {
  "id": "MK-CF-F-156",
  "name": "plannedMonthFlow",
  "what_it_is_for": "THE PLAN for this month: the take-home, less each debt, less planned expenses.",
  "formula_in_words": "Rows, in this order. Inflow = the monthly take-home handed in. A debt has a row only in a month a payment on it falls in: from the month of its first payment to the month it is paid off (a date not given sets no bound), and for a debt due in full only the month it is due, while a balance is owed. One row for each instalment debt with such a payment above zero: minus that payment. Expenses = minus this month's planned expenses when a budget is set — set when handed in as set (the plan holds any expenses, even if none falls in this month, which then reads 0), otherwise when this month plans more than zero — marked your budget; when no budget is set, 0, marked not set. Then one row for each radar debt (a card, a line of credit, a debt due in full) with such a payment above zero: minus that payment — for a debt due in full its whole balance, named \"<debt> — due in full\". A debt whose payment was never entered (paymentNotEntered), in a month a payment on it falls in, keeps its place as a row at 0, marked payment not entered. Inflow total = the inflow row; outflow = minus the other rows, added up; surplus = every row added up. When any debt's payment was never entered, the surplus and the outflow are not given (no number) and the refusal names the debt: \"<debt>'s payment is not entered, so there is no planned surplus — we won't guess one.\""
 },
 {
  "id": "MK-CF-F-005",
  "name": "actualMonthFlow",
  "what_it_is_for": "WHAT HAS ACTUALLY HAPPENED: what landed, less only the debts confirmed paid, less what was really spent.",
  "formula_in_words": "Rows, in this order. Actual inflow = the monthly take-home handed in. One row for each debt with a payment logged against it this month, or with a payment that falls in this month (from the month of its first payment to the month it is paid off; for a debt due in full, its whole balance in the month it is due, named \"<debt> — due in full\") and is not zero: minus what was logged as paid against it this month (0 when nothing was), marked paid or not. Other debt payments = debt payments logged this month that match no debt on record, when above zero. Expenses entered by hand = minus the month's logged expenses that were not imported, debt payments left out. Expenses imported from your card = minus the imported ones, shown only when there are any. Debts on the big-ticket radar (cards, lines of credit, debts due in full) are moved to the end. Surplus = every row added up. Inflow total = the inflow row. Outflow = monthOutflow of the month's expenses so far (minus the expense rows, added up) and its debt paid so far (minus the debt rows, added up) — their sum — so the surplus is the inflow total less the outflow."
 },
 {
  "id": "MK-CF-F-220",
  "name": "pastMonthFlow",
  "what_it_is_for": "A PAST MONTH — what came in, what went out and the surplus — as the Cash flow tab shows it (2026-10-23).",
  "formula_in_words": "A past month as the Cash flow tab shows it. The income recorded = the amounts of the income records dated in that month, added up (an amount that is not a number counts 0); the expenses logged = the amounts of the expenses logged in that month (inMonth), added up. What came in = the take-home the month's frozen record states, when there is a frozen record and it states one, else the income recorded. What went out = monthOutflow: with a frozen record, its expenses + its debt paid (each 0 when missing), else the expenses logged. Surplus = what came in − what went out."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0007",
  "decided": "2026-07-28",
  "type": "DESIGN",
  "tab": "networth",
  "whose": "his",
  "his_words": "X months of essentials",
  "the_log_records": "The emergency fund card — “X months of essentials” — comes back into scope on the Net worth screen, below the main figures. It is drawn as a mock and approved before any code is written.",
  "governs": "MK-NW-M-013"
 },
 {
  "id": "DEC-0251",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "ok — one producer for essentials per brief Q-21 (2026-08-20); fewer than 12 months logged → the average for the logged months, labelled 'N month average'",
  "the_log_records": "“ok — one producer for essentials per brief Q-21; fewer than 12 months logged → the average for the logged months, labelled ‘N month average’.” ONE essentials figure across every screen, taken from what you have actually logged, with the label saying how many months it stands on. The typed plan is the fallback for someone who has logged nothing — never the other way round.",
  "governs": "MK-NW-M-013 · MK-NW-M-014 · MK-MN-M-020 · MK-MN-M-021 · MK-MN-M-024 · MK-MN-M-025 · MK-MN-M-026 · MK-CF-F-189 · MK-CF-F-190 · MK-CF-F-010"
 },
 {
  "id": "DEC-0260",
  "decided": "2026-09-09",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen",
  "the_log_records": "“the screen shows $0 with a sentence explaining nothing is entered, and the door.” On a fresh account a screen keeps its shape, shows $0, says plainly that nothing is entered, and offers the way to enter it — rather than a blank space or a dash.",
  "governs": "MK-NW-M-048 · MK-MN-M-025 · MK-CF-M-002 · MK-CF-M-052"
 },
 {
  "id": "DEC-0493",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Why retirement number resides in spend tab? What's the logical reason?",
  "the_log_records": "HIS QUESTION: “Why retirement number resides in spend tab? What’s the logical reason?” A figure placed where it does not belong makes the tab about something other than its name.",
  "governs": "MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md · src/domain/budget/index.ts"
 },
 {
  "id": "DEC-7611",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-0002, DEC-0447 and DEC-0345, made without asking him, as his order of 2026-09-30 says. September with $700 of groceries and a $1,200 bill in December: This month −$700, the Expenses tab $700 (it read $800, with Once in a while $100), Home's September record $700. December: $1,900 on all three (Once in a while $1,200). A budget whose only line is the December bill reads $0 planned in September on both tabs — set, never \"You haven't set your budget yet\". A once-in-a-while bill with no month set is still a twelfth a month, as before. To reverse: build the Expenses tab's rows from the monthly average again. One word from him reverses it.",
  "governs": "MK-CF-F-221 spendByMonthByBucket (src/domain/budget/index.ts) · MK-CF-F-008 spendByMonth (the sum of the three groups) · MK-CF-F-227 thisMonthInputs (src/hooks/useCashflowModel.ts) · MK-CF-F-156 plannedMonthFlow (budgetSet) · MK-CF-M-001 · MK-CF-M-004 · MK-CF-M-015"
 },
 {
  "id": "DEC-7951",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0002, DEC-0447, DEC-4529 and DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. His $2,000 a month typed ($1,100 bills & fixed, $900 everyday) with $1,200 of car insurance in December: every month read $1,900, the typed $2,000 taken to hold $100 a month of the bill, and the $1,100 / $900 split was dropped. Now eleven months read $2,000 and December $3,200. Where a figure is a whole year shown by the month it counts the bill once: MK-CF-F-002, the planned monthly figure, 2,000 + 1,200 ÷ 12 = $2,100 (it read $2,000); MK-CF-F-009, the must-pay figure, $2,000 (it read $1,900). The Net worth emergency fund in the family-inputs household: (2,900 × 12 + 3,600) ÷ 12 + 4,670 = $7,870 (it read $7,570), $31,489 ÷ 6,070 = 5.2 months (it read 5.5). On his approved Net worth v08 drawing's household, $4,500 a month typed and a $3,600 April premium: the months of essentials read 2.1 ($8,838 ÷ $4,150; the drawing shows 2.3, from $3,850), and at the planned spend 1.8 ($5,050; the drawing shows 1.9, from $4,750). The drawing is left as drawn, with the correction line his DEC-4529 asks for in its READ THIS FIRST and the matching allowed difference in its test. Sign-up's recap reads MK-CF-F-002. No ruling of his says a typed budget already holds such a bill. To reverse: read the typed total as holding a twelfth of each dated bill again. One word from him reverses it.",
  "governs": "MK-CF-F-008 spendByMonth · MK-CF-F-221 spendByMonthByBucket · MK-CF-F-002 · MK-CF-F-009 · src/domain/budget/index.ts · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-M-046) · MK-NW-M-014 · MK-NW-M-048 · src/onboarding/modules.tsx (the recap)"
 }
]
```
