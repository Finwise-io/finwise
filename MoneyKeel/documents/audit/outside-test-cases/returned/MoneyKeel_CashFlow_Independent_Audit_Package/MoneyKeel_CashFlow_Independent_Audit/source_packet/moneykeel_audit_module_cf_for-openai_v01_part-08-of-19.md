# Cash flow — part 8 of 19: Bills ahead, what is coming, and the credit line

11 cards, so 11 formula checks and 55 cases, and one `rules_held` line for each of the 9 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 8"` in your reply.

## Notes for this part

- Every bill in a case has a due date and every case has an as-of date: a bill that falls before the as-of date is not ahead.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface CashflowYear {
  months: MonthFlow[];
  shortMonths: string[];      // months where the running balance dips below 0
  lowestBalance: number;
  totalIn: number;
  totalOut: number;
  beyondWindow: number;       // dated items (scholarships/loans) that fall outside the next 12 months
}

export interface CreditLine {
  balance: number;
  limit: number;
  /** The share of the line in use, 0…1 — null when no limit is known. */
  used: number | null;
  /** 'good' under 30%, 'caution' to 50%, 'high' above. Null when there is no ratio. */
  status: 'good' | 'caution' | 'high' | null;
}

export interface UpcomingBill {
  id: string;
  label: string;
  amount: number;
  dueDate: string;          // ISO — when the bill is due
  needByDate: string;       // dueDate − buffer (money must be in the account)
  askByDate: string;        // needByDate − lead (when to request the shortfall)
  availableByNeed: number;  // what is there by the need-by date, read from the month table (balanceByDay)
  shortfall: number;        // how much more you need for this bill
  coverSource: string;      // who/what covers the gap
  daysAway: number;         // days from now until due
}

export interface WhatsComing {
  /** Every dated bill and paycheck in the window ahead, soonest first. */
  bills: UpcomingBill[];
  /** The soonest one, or null when nothing is dated. */
  next: UpcomingBill | null;
}
```

## The cards

```json
[
 {
  "id": "MK-CF-O-008",
  "name": "whatsComing",
  "kind": "orchestrator",
  "what_it_is_for": "Which bills and paychecks are coming over the next twelve months, and which look out of the ordinary?",
  "formula_in_words": "The month table: the one handed in (the table the screen draws), or else the dated grid builder's for the budget, the debts and the starting balance handed in ($0 when none), from today. The upcoming bills (upcomingBills) read from that table, with today and the horizon given (365 days when none), soonest first; and the first of them as the next one — nothing when there are none.",
  "handed": "export function whatsComing(input: {\n  profile: any;\n  startBalance?: number;\n  now?: Date;\n  horizonDays?: number;\n  /** every debt: its payments come out of the table's months, so out of what is there by a bill's day too (DEC-0269) */\n  debts?: any[];\n  /** the month table the screen draws. Handed in, the bills read it, so the COMING UP line and the End column cannot disagree\n   *  (2026-10-24, E2E-81); without one, it is built here by the same function from the budget, the debts and the balance. */\n  grid?: DatedGrid;\n}): WhatsComing",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-012",
    "words_on_screen": "RECEIVED · <month> — each payment",
    "unit": "money-cents",
    "what_it_answers": "Each payment that has actually arrived this month, and when.",
    "when_it_refuses": "Nothing received yet this month.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-016",
    "words_on_screen": "BIG-TICKET RADAR — <bill> · due <month>",
    "unit": "money",
    "what_it_answers": "A bill big enough to plan for, and the month it falls in.",
    "when_it_refuses": "Nothing unusual ahead — the section keeps its heading and says so.",
    "shown_on": [
     "/cashflow",
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-028",
    "words_on_screen": "each bill and the day it falls",
    "unit": "money",
    "what_it_answers": "One line per bill ahead, with its date and what is left after it.",
    "when_it_refuses": "No dated bill ahead — the COMING UP card is not drawn; with nothing behind the table at all, the one line \"Nothing entered yet. Add your bills ›\" sits under it (Q48).",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-060",
    "words_on_screen": "Lowest point",
    "unit": "money",
    "what_it_answers": "The lowest the balance falls to in the twelve months ahead, and which month.",
    "when_it_refuses": "No starting balance — the table starts from $0 and says so.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-061",
    "words_on_screen": "END — where the month leaves you",
    "unit": "money",
    "what_it_answers": "The balance at the end of each month: the month before’s end, plus what came in, less what went out.",
    "when_it_refuses": "No starting balance — the chain starts from $0 and says so.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-062",
    "words_on_screen": "Short — set it aside by <date>",
    "unit": "money",
    "what_it_answers": "How much more is needed for a bill by the day the money has to be there.",
    "when_it_refuses": "Nothing short — the line reads Covered instead.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-063",
    "words_on_screen": "Covered — about $X there by <date>",
    "unit": "money",
    "what_it_answers": "What is projected to be in the account on the day a bill’s money has to be there.",
    "when_it_refuses": "No balance to start from — nothing is projected.",
    "shown_on": [
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-MN-M-030",
    "words_on_screen": "$X left <account> on <date>",
    "unit": "money",
    "what_it_answers": "What would be left after each bill, so a shortfall is visible before it happens.",
    "when_it_refuses": "No balance to start from.",
    "shown_on": [
     "/bill-calendar"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0443",
    "date": "2026-06-30",
    "words": "The display never showcased year. So, user want to see cashflow from July 2026 to June 2027 how would they do that?"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-016",
    "words": "A regular monthly debt is never a radar item: a warning you see every month stops being a warning."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-028",
    "words": "A bill with NO date is not on the calendar — a date nobody gave would be read as one they did. It is still counted in the month’s total."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-063",
    "words": "Read from the month table on the same screen, so this line and the End column cannot disagree."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-063",
    "words": "Pay is never counted before its month ends: the table does not know the day it lands, and no day is invented."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0002",
   "DEC-0078",
   "DEC-0187",
   "DEC-0443",
   "DEC-7936",
   "DEC-8153"
  ],
  "period": [
   "MK-CF-M-012: no period on the figure — one payment",
   "MK-CF-M-016: no period on the figure — one bill",
   "MK-CF-M-028: no period on the figure — one bill",
   "MK-CF-M-060: no period on the figure",
   "MK-CF-M-061: no period on the figure — one month",
   "MK-CF-M-062: no period on the figure — one bill",
   "MK-CF-M-063: no period on the figure — one bill",
   "MK-MN-M-030: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-012: Nothing received yet this month.",
   "MK-CF-M-016: Nothing unusual ahead — the section keeps its heading and says so.",
   "MK-CF-M-028: No dated bill ahead — the COMING UP card is not drawn; with nothing behind the table at all, the one line \"Nothing entered yet. Add your bills ›\" sits under it (Q48).",
   "MK-CF-M-060: No starting balance — the table starts from $0 and says so.",
   "MK-CF-M-061: No starting balance — the chain starts from $0 and says so.",
   "MK-CF-M-062: Nothing short — the line reads Covered instead.",
   "MK-CF-M-063: No balance to start from — nothing is projected.",
   "MK-MN-M-030: No balance to start from."
  ]
 },
 {
  "id": "MK-CF-F-212",
  "name": "receivedInMonth",
  "kind": "function",
  "what_it_is_for": "RECEIVED THIS MONTH (MK-CF-M-012) — the income records dated inside the month, newest first.",
  "formula_in_words": "The income records whose date begins with the year-month asked for, newest first.",
  "handed": "export function receivedInMonth(incomes: { date?: string; amount?: any }[] | null | undefined, ym: string)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-121",
  "name": "zero12",
  "kind": "function",
  "what_it_is_for": "Twelve zeros: an empty year, one slot for each month.",
  "formula_in_words": "Twelve zeros.",
  "handed": "function zero12(): number[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-018",
  "name": "equityByMonth",
  "kind": "function",
  "what_it_is_for": "Level annual equity spread across the months it vests (0 for most students).",
  "formula_in_words": "Each vesting row's value (equityRowValue) goes to the month in its date — December when it has no date. The year's vesting (rsuAnnual) is then split across the twelve months in proportion to those values. All zero when no row has a value.",
  "handed": "export function equityByMonth(op: Record<string, any>): number[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-160",
  "name": "daysBetweenDates",
  "kind": "function",
  "what_it_is_for": "The number of whole days from one date to another.",
  "formula_in_words": "The second date − the first, in days, rounded to the nearest whole day.",
  "handed": "function daysBetweenDates(a: Date, b: Date): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-122",
  "name": "addDays",
  "kind": "function",
  "what_it_is_for": "The date a given number of days after another date.",
  "formula_in_words": "The date moved by that many whole days.",
  "handed": "function addDays(d: Date, n: number): Date",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-124",
  "name": "nextOccurrence",
  "kind": "function",
  "what_it_is_for": "The next time (month, day) occurs on/after `now`, unless an explicit year is given.",
  "formula_in_words": "With a year given: that month and day in that year. Otherwise that month and day (the 1st when no day) this year — or next year, when that month is already past this year. A date earlier this month stays this month (it is passed, so a list of what is coming leaves it out), as the month table counts that month's bill in this month.",
  "handed": "function nextOccurrence(month1to12: number, day: number, now: Date, year?: number): Date",
  "decisions_that_govern_it": [
   "DEC-7940"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-019",
  "name": "upcomingBills",
  "kind": "function",
  "what_it_is_for": "The dated bills coming due over the next year, each with the day the money must be there, what the month table has there by that day and how much short it would be.",
  "formula_in_words": "Bills = each non-monthly budget category, once for every month it names (January when it names none): amount = its yearly amount ÷ the number of months named (a percent one = percent × the take-home the month table carries over its twelve months), on its due day (the 1st when none), at its date this year, or next year when its month is past (nextOccurrence) — a date already passed this month is not returned — in the year it names, when it names one. Only bills due from today to the horizon (365 days when none is given) are returned, soonest first. Need-by date = due date − 2 days; ask-by date = need-by − 10 days. Money available by the need-by date = what the month table handed in has there by that day: the End of the month before the day's month (the starting balance — the first month's End − its In + its Out — when the day is in the first month; that starting balance for a day before the table, the last month's End for a day after it) + every item of the day's month dated on or before the day (an income with a day added; a bill that is not regular money taken away, on its day, the 1st when it has none) + the lower of 0 and that month's regular money (its In − its Out − the dated incomes + the dated bills). Regular money = the everyday expenses and the monthly debt payments, and every income with no day. Less every bill listed before this one that is due after its need-by date and on or before its due date. Shortfall = bill − available, never below 0. Who covers it = your family when family support is one of the income sources, otherwise your savings or a backup.",
  "handed": "export function upcomingBills(\n  op: OnboardingProfile | null,\n  grid: DatedGrid,\n  now: Date = new Date(),\n  opts: { bufferDays?: number; askLeadDays?: number; horizonDays?: number } = {},\n): UpcomingBill[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-040 whether a stream is already being received",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "decisions_that_govern_it": [
   "DEC-7936",
   "DEC-7941"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-232",
  "name": "balanceByDay",
  "kind": "function",
  "what_it_is_for": "What is there by a day, read from the month table — one way, so the Bill calendar's COMING UP line and its End column cannot disagree (2026-10-24, Cash flow journey E2E-81; DEC-3523 tenets 1 and 4, DEC-0269).",
  "formula_in_words": "What is there by a day, read from the month table. Starting balance = the first month's End − its In + its Out. A day before the table's first month: the starting balance. A day after its last month: the last month's End. Otherwise: the End of the month before the day's month (the starting balance when the day is in the first month) + every item of the day's month dated on or before the day (an income with a day added; a bill that is not regular money taken away, on its day, the 1st when it has none) + the lower of 0 and the month's regular money (its In − its Out − the dated incomes + the dated bills). Regular money = the everyday expenses and the monthly debt payments on the bill side, and every income with no day.",
  "handed": "export function balanceByDay(grid: DatedGrid, dayIso: string): number",
  "decisions_that_govern_it": [
   "DEC-7936"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-020",
  "name": "cashflowYear",
  "kind": "function",
  "what_it_is_for": "Build the 12-month cash-flow picture.",
  "formula_in_words": "Twelve months starting with the current one. Taxed income each month = that calendar month's gross salary + tips (only in months with salary) + self-employment + net rent ÷ 12 + interest and dividends ÷ 12 + other income when taxable + that month's stock vesting + retirement income; plus the bonus in its month (December when none is set); a signing bonus in the first month; one-off other income in its month. Untaxed = benefits in their months + support + untaxed other income + scholarships (monthly, or in their months, or ÷ 12 when they name none) + loans in their months (the first month when they name none). Inflow = taxed × (1 − the rate in force) + untaxed. Outflow = the planned expenses for that calendar month (spendByMonth). The balance starts at the starting balance and each month adds inflow − outflow. Short months = those ending below zero. Lowest balance = the smallest month-end. Dated items that fall outside the twelve months are counted, not included.",
  "handed": "export function cashflowYear(op: OnboardingProfile | null, startBalance = 0, now: Date = new Date()): CashflowYear",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-O-006",
  "name": "theCreditLine",
  "kind": "orchestrator",
  "what_it_is_for": "How much of my credit limit am I using?",
  "formula_in_words": "With no limit, or a limit of zero or less: no share used and no status. Otherwise share used = balance ÷ limit, rounded to three decimals; status good at 30% or under, caution above 30% up to 50%, high above 50%.",
  "handed": "export function theCreditLine(input: { balance: number; limit: number }): CreditLine",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-006",
    "words_on_screen": "$X of $Y used — the line marks 30%",
    "unit": "money",
    "what_it_answers": "How much of your available credit you are using.",
    "when_it_refuses": "No limit entered — there is no ratio, and a 0% would read as \"you have used none of it\".",
    "shown_on": [
     "/credit"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-006",
    "words": "Under 30% is the mark the line shows, because that is the level credit scoring treats as unstretched."
   }
  ],
  "decisions_that_govern_it": [],
  "period": [
   "MK-MN-M-006: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-006: No limit entered — there is no ratio, and a 0% would read as \"you have used none of it\"."
  ]
 }
]
```

## Formulas these cards lean on

13 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
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
  "id": "MK-CF-F-062",
  "name": "equityRowValue",
  "what_it_is_for": "Value of one vesting-schedule row.",
  "formula_in_words": "An option: shares × (market price − strike price), never below 0. Any other grant: shares × price."
 },
 {
  "id": "MK-CF-F-066",
  "name": "rsuAnnual",
  "what_it_is_for": "Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).",
  "formula_in_words": "With vesting rows: their total value ÷ the number of different years in which rows with a value vest (at least 1). With none: shares × price, as typed."
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

**Days between two dates** — in this part: MK-CF-F-160

```json
[
 {
  "id": "MK-CF-F-162",
  "name": "daysApart",
  "what_it_is_for": "How many days lie between two dates, whichever comes first.",
  "formula_in_words": "The gap between two dates in days, never negative."
 }
]
```

## The figures these cards feed — as the screen register holds them

The author's record of each figure, with a worked example the app's own door ran (convention 10). Judge the cards; the figures themselves are checked against the tenets in the screen parts.

```json
[
 {
  "id": "MK-CF-M-012",
  "label": "RECEIVED · <month> — each payment",
  "unit": "money-cents",
  "grain": "one payment",
  "screens": [
   "/cashflow",
   "/income-manager"
  ],
  "answers": "Each payment that has actually arrived this month, and when.",
  "formula": "the income records dated inside the month",
  "inputs": [
   "MK-NW-I-004 the activity records"
  ],
  "refusal": "Nothing received yet this month.",
  "worked": {
   "given": "Two $3,600 salary payments landed in September, on the 15th and the 30th; one landed on 31 August.",
   "answer": "$3,600.00"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-09-27",
  "printed_in": [
   "BudgetScreen",
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen › AskedBefore"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-016",
  "label": "BIG-TICKET RADAR — <bill> · due <month>",
  "unit": "money",
  "grain": "one bill",
  "screens": [
   "/cashflow",
   "/bill-calendar"
  ],
  "answers": "A bill big enough to plan for, and the month it falls in.",
  "formula": "the dated bills above the everyday size, in date order",
  "inputs": [
   "MK-CF-I-002 your bills"
  ],
  "decisions": [
   "A regular monthly debt is never a radar item: a warning you see every month stops being a warning."
  ],
  "refusal": "Nothing unusual ahead — the section keeps its heading and says so.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$1,400"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-09-27",
  "printed_in": [
   "BillCalendarScreen",
   "CashFlowScreen › ExpensesTab",
   "CashFlowScreen › MonthBars"
  ],
  "decisions_that_govern_it": [
   "DEC-0002",
   "DEC-0187",
   "DEC-0443",
   "DEC-8153"
  ]
 },
 {
  "id": "MK-CF-M-028",
  "label": "each bill and the day it falls",
  "unit": "money",
  "grain": "one bill",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "One line per bill ahead, with its date and what is left after it.",
  "formula": "each dated bill in the window, in date order, with the running balance after it",
  "inputs": [
   "MK-CF-I-002 your bills",
   "MK-NW-I-001 your accounts"
  ],
  "decisions": [
   "A bill with NO date is not on the calendar — a date nobody gave would be read as one they did. It is still counted in the month’s total."
  ],
  "refusal": "No dated bill ahead — the COMING UP card is not drawn; with nothing behind the table at all, the one line \"Nothing entered yet. Add your bills ›\" sits under it (Q48).",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$4,800"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-09-27",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0078",
   "DEC-0187"
  ]
 },
 {
  "id": "MK-CF-M-060",
  "label": "Lowest point",
  "unit": "money",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "The lowest the balance falls to in the twelve months ahead, and which month.",
  "formula": "the smallest running balance across the twelve month-ends, starting from the balance you gave",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income"
  ],
  "refusal": "No starting balance — the table starts from $0 and says so.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$1,800"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-061",
  "label": "END — where the month leaves you",
  "unit": "money",
  "grain": "one month",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "The balance at the end of each month: the month before’s end, plus what came in, less what went out.",
  "formula": "running balance = last month’s end + inflow − outflow, month by month from the starting balance",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income"
  ],
  "refusal": "No starting balance — the chain starts from $0 and says so.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$6,600"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-062",
  "label": "Short — set it aside by <date>",
  "unit": "money",
  "grain": "one bill",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "How much more is needed for a bill by the day the money has to be there.",
  "formula": "the bill − what is there by its need-by date (MK-CF-M-063, read from the month table), when that is less",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts"
  ],
  "refusal": "Nothing short — the line reads Covered instead.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$0"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7936"
  ]
 },
 {
  "id": "MK-CF-M-063",
  "label": "Covered — about $X there by <date>",
  "unit": "money",
  "grain": "one bill",
  "screens": [
   "/bill-calendar"
  ],
  "answers": "What is projected to be in the account on the day a bill’s money has to be there.",
  "formula": "the month table’s End for the month before the need-by date (the starting balance when that day is in this month), plus what that month brings or takes on a day already passed — aid or a loan on the day it lands, a dated bill on its day (the 1st when it has none) — less the month’s regular money (pay, everyday expenses, debt payments) only when it takes out more than it brings in: the lower of the two month-ends either side of the day; less any bill listed above it that falls due after that day and by this bill’s due date",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-CF-I-002 your bills",
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts"
  ],
  "decisions": [
   "Read from the month table on the same screen, so this line and the End column cannot disagree.",
   "Pay is never counted before its month ends: the table does not know the day it lands, and no day is invented."
  ],
  "refusal": "No balance to start from — nothing is projected.",
  "worked": {
   "given": "On 28 Sep 2026, with $8,000 in the account: car insurance of $1,400 due 15 Oct and property tax of $4,800 due 1 Nov. Nothing else is dated.",
   "answer": "$8,000"
  },
  "door": "MK-CF-O-008 whatsComing",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7936"
  ]
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0002",
  "decided": "2026-07-19",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "cashflow. Approve.",
  "the_log_records": "Cash flow becomes ONE screen with four tabs, replacing the two separate Cash flow and Budget screens. Four decisions:\n1. The Budget screen is RETIRED; its job moves onto the cash-flow surface.\n2. Income is entered through a pop-up that asks whether your pay is steady or varies.\n3. You can move between past and future months.\n4. Big one-off bills get their own list, so a bill that lands once a year is not lost inside a monthly average.\nSTILL IN FORCE: his approval of the combined cash-flow mock (2026-09-28) carries this architecture forward by name — 'the four-tab architecture from v02'. Only the NAME of the third tab changed; see the row beside this one.",
  "governs": "MK-CF-M-048 · MK-CF-M-016 · MK-CF-M-004"
 },
 {
  "id": "DEC-0078",
  "decided": "2026-08-11",
  "type": "DESIGN",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "cut the build",
  "the_log_records": "Build 51 was cut only after his explicit “cut the build” against a presented checklist, with the gates satisfied in order: scope complete at 59 of 59 rows, and the mock-match audits FINISHED rather than running alongside.",
  "governs": "MK-CF-M-037 · MK-CF-M-028"
 },
 {
  "id": "DEC-0187",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Months are keyed by their actual date rather than by position — “2026-07”, not “slot 7 of twelve”. The twelve-slot version wrote January into the wrong year whenever the twelve months crossed a New Year.",
  "governs": "MK-CF-M-037 · MK-CF-M-016 · MK-CF-M-028"
 },
 {
  "id": "DEC-0443",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "The display never showcased year. So, user want to see cashflow from July 2026 to June 2027 how would they do that?",
  "the_log_records": "“The display never showcased year. So, user want to see cashflow from July 2026 to June 2027 how would they do that?” A month shown without its year cannot be read across a year boundary — which is exactly the window most people want.",
  "governs": "MK-CF-M-016"
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
  "id": "DEC-7936",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0269 and DEC-3523 (tenets 1, 2, 4 and 7), made without asking him, as his order of 2026-09-30 says. Money there by a day is the table's End for the month before, plus or less anything dated earlier in that month; that month's own pay, everyday expenses and debt payments count only when the month loses money (tenet 7: never better than it is). Sep 28, $0 on hand, $5,000 take-home, $700 of groceries, $2,650 of debt payments, $1,200 due Dec 15 (need-by Dec 13): the line said about $10,744, the wage spread by day with the debts left out; it now reads November's End, about $4,950 (Sep End 5,000 − 3,350 = $1,650, Oct $3,300, Nov $4,950). With property tax of $4,800 due Dec 1 as well: Covered, about $8,765, became Short $1,500 (October's End $3,300), and the Dec 15 bill Short $1,050. Two bills due the same day both counted the whole balance; the first listed now gets the money first ($4,950, then $3,750). A one-time bill for March 2028 is no longer listed as March 2027. Whole months, because the app never asks the day pay lands. To reverse: in MK-CF-F-232 balanceByDay change Math.min(0, regular) to regular, and drop aheadOfIt in upcomingBills. One word from him reverses it.",
  "governs": "MK-CF-F-019 upcomingBills · MK-CF-F-232 balanceByDay (src/domain/cashflow/index.ts) · MK-CF-O-008 whatsComing (MoneyKeel/functions/cashflow/whats-coming.ts) · MK-CF-M-062 · MK-CF-M-063 · src/screens/BillCalendarScreen.tsx"
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
 },
 {
  "id": "DEC-7941",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-1923, DEC-0283 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. With the home's mortgage in Debts, the Rent / Mortgage budget line is not counted beside it, as This month does not count it: $7,200 in, $700 of groceries and the $2,400 mortgage out, September's End $4,100 (it read $5,400 out and an End of $1,800, the $2,300 line counted too). The In column is the take-home after tax and the 401(k), as Your base pay prints it. A yearly bill whose day passed earlier this month has one place, this month's Out and plan, and is not under COMING UP for next year. To reverse: build the calendar's months from the budget as typed again. One word from him reverses it.",
  "governs": "src/screens/BillCalendarScreen.tsx · MK-XS-F-004 buildDatedGrid · MK-CF-F-019 upcomingBills"
 },
 {
  "id": "DEC-8153",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-1923 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. One rule for a debt in a month, in two new shared functions, MK-CF-F-235 paysInMonth and MK-CF-F-236 paymentInMonth: from its first payment to its payoff, and a balance due in full once, in its month, at its balance. A $7,200 take-home, a $3,400 budget, the $2,400 mortgage, a $250 car loan whose first payment is Oct 28, a $300 loan paid off in August and a $1,000 tax bill due in full Sep 20: September's planned surplus read +$850, the car loan and the paid-off loan counted and the tax bill left out; it reads +$400 = 7,200 − 3,400 − 2,400 − 1,000, what the Bill calendar's September holds. October's card is unchanged, $1,150. ACTUAL no longer lists the car loan as due the 28th at $0; MONTHLY RECURRING EXPENSES reads $2,400 (it read $2,650); the tax bill is on the BIG-TICKET RADAR at $1,000; Home's due-soon reminder no longer fires for a loan not yet started. MK-CF-M-047, 048 and 049 now say they print on a later month's plan card, from the grid ($7,200 / $6,050 / $1,150), and the retired surplus line and the paycheck card's SURPLUS have their own number, MK-CF-M-078 (it printed under MK-CF-M-049). To reverse: count every debt's payment in this month again, whatever its dates. One word from him reverses it.",
  "governs": "MK-CF-F-235 paysInMonth · MK-CF-F-236 paymentInMonth (src/domain/debt/index.ts) · MK-CF-F-156 plannedMonthFlow · MK-CF-F-005 actualMonthFlow · MK-CF-F-149 recurringDebtPayments · MK-CF-F-153 radar · MK-XS-F-004 buildDatedGrid · MK-CF-M-002 · MK-CF-M-016 · MK-CF-M-047 · MK-CF-M-048 · MK-CF-M-049 · MK-CF-M-078 · src/screens/HomeScreen.tsx · src/components/PaycheckCard.tsx"
 }
]
```
