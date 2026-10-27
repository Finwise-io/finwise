# Cash flow — part 6 of 19: The budget, and the Expenses tab

14 cards, so 14 formula checks and 70 cases, and one `rules_held` line for each of the 7 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 6"` in your reply.

## Notes for this part

- MK-CF-O-002 carries an approved drawing. One case must be that household exactly as drawn.
- A debt payment logged as an expense must be counted once. Include, in at least one case, a car loan paid and logged under Debt payment, and a card payment for a card whose purchases are imported.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface BudgetCounted {
  /** The profile to hand to every planned-expenses figure: the person's own, with the Rent /
   *  Mortgage line at nothing when the home's mortgage is counted from Debts. */
  profile: any;
  /** Set when that line is not counted: what was budgeted on it, and the mortgage that stands for it. */
  rentLineInDebts: { budgeted: number; mortgage: string } | null;
  /** The sentence a screen shows when the line is not counted. Empty when it is. */
  sentence: string;
  /** The name of the mortgage on the home lived in, when Debts holds one. Null for a renter, and for
   *  a home with no mortgage. */
  homeMortgage: string | null;
}

export interface BudgetDoc {
  user_id: UserId;
  monthly_spending: number;        // total planned monthly spend
  fixed: number;                   // optional flex buckets
  non_monthly: number;
  flexible: number;
  last_updated?: any;
}

export interface BudgetState {
  user_id: UserId;
  monthly_spending: number;
  net_monthly_income: number;
  projected_to_save: number;       // income − expenses (the monthly surplus)
}

export interface Expenses {
  recurringDebt: { label: string; monthly: number }[];
  recurringDebtTotal: number;
  planned: { label: string; monthly: number }[];
  plannedTotal: number;
  actual: SpentList;
  /** The same expenses, apart: what was entered by hand, and what a card or a file brought. */
  byHand: SpentList;
  imported: SpentList;
  debtCountedAsExpense: { label: string; amount: number }[];
  actualTotal: number;
  radar: RadarItem[];
}

export interface ExpensesInput {
  ym: string;
  debts: Debt[];
  plannedByCategory: { label: string; monthly: number }[];
  expenses: LoggedExpense[];
  bigBills?: { label: string; amount: number; dueLabel: string }[];   // dated non-debt bills
}

export interface RadarItem { label: string; amount: number; reason: RadarReason;
                             countedAsExpense: boolean; note: string; }

export type RadarReason = 'revolving-debt' | 'lump-debt' | 'big-bill';

export interface SpentList { items: LoggedExpense[]; shown: LoggedExpense[]; hidden: number;
                             hiddenTotal: number; total: number; }
```

## The cards

```json
[
 {
  "id": "MK-CF-F-001",
  "name": "buildBudgetState",
  "kind": "function",
  "what_it_is_for": "projected_to_save = net monthly income − monthly expenses.",
  "formula_in_words": "Projected to save = monthly take-home − monthly planned expenses (0 when none is stored).",
  "handed": "export function buildBudgetState(uid: UserId, netMonthlyIncome: number, doc: BudgetDoc): BudgetState",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-002",
  "name": "plannedMonthlySpend",
  "kind": "function",
  "what_it_is_for": "The single canonical \"planned monthly spend\": the itemized buckets OR the stated total, whichever is larger (the stated total can include an uncategorized remainder the buckets don't capture).",
  "formula_in_words": "The year's planned expenses ÷ 12: the twelve months spendByMonth gives, added up, divided by 12. A bill with its own months counts once in the year, on top of the single monthly figure the person typed; with no such bill this equals the larger of the categories added up and that typed monthly figure.",
  "handed": "export function plannedMonthlySpend(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [
   "DEC-7951"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-120",
  "name": "pctBaseMonthly",
  "kind": "function",
  "what_it_is_for": "A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan screen uses (modules.tsx SpendingEditor → takeHomeMonthly).",
  "formula_in_words": "The twelve months of take-home (incomeMonthlyGrid, take-home) added ÷ 12.",
  "handed": "function pctBaseMonthly(op: OnboardingProfile | null): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-003",
  "name": "categoryMonthly",
  "kind": "function",
  "what_it_is_for": "Canonical per-category planned $/month — the ONE conversion the buckets AND the Budget screen share, so a category's on-screen line item ALWAYS reconciles with its bucket total (build-34 #3).",
  "formula_in_words": "0 when the amount is zero or less. A dollar category: the amount, per month — a once-a-year (non-monthly) category is the yearly amount ÷ 12. A percent category: that percent of the average monthly take-home (pctBaseMonthly) — for a non-monthly one the same, worked as a yearly amount and ÷ 12.",
  "handed": "export function categoryMonthly(c: { amount?: any; unit?: string; bucket?: string } | null | undefined, op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-004",
  "name": "spendBuckets",
  "kind": "function",
  "what_it_is_for": "Roll the per-category expenses up into the three monthly-normalized buckets.",
  "formula_in_words": "With categories: each category's monthly amount (categoryMonthly) is added into fixed, non-monthly or flexible — any other bucket counts as flexible; rows of zero are skipped. With no categories: the three typed bucket totals. Monthly total = the three added.",
  "handed": "export function spendBuckets(op: OnboardingProfile | null): { fixed: number; non_monthly: number; flexible: number; monthly_total: number }",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-221",
  "name": "spendByMonthByBucket",
  "kind": "function",
  "what_it_is_for": "THE MONTH'S PLANNED EXPENSES, BY THE BUDGET'S OWN THREE GROUPS — each calendar month, January first (2026-10-23).",
  "formula_in_words": "The month's planned expenses in the budget's three groups (bills and fixed, once in a while, everyday), for each of the 12 calendar months, January first. With categories, each category with an amount above 0 counts; one entered as a percent counts at amount ÷ 100 × the monthly take-home it is a share of (pctBaseMonthly). A once-in-a-while category's yearly amount (its amount, or for a percent that share × 12) falls in the months it names, split equally among them, or spread equally over all 12 when it names none; any other category counts its monthly amount in every month, under bills and fixed when it is a fixed bill and under everyday otherwise. While no category is a monthly one (only once-in-a-while categories), every month also gets the typed bills and fixed total and the typed everyday total, each in its own group. Without categories, every month gets the budget's three monthly totals (spendBuckets). Then every month's everyday expenses gain whatever the monthly spending entered is above what the plan puts in every month: the monthly categories, the typed totals counted above, and a once-in-a-while category that names no month at its twelfth. A once-in-a-while category that names its months is never counted against the monthly spending entered, so it adds to its own months only.",
  "handed": "export function spendByMonthByBucket(op: OnboardingProfile | null): { fixed: number; nonmonthly: number; flexible: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "decisions_that_govern_it": [
   "DEC-7611",
   "DEC-7951"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-008",
  "name": "spendByMonth",
  "kind": "function",
  "what_it_is_for": "Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.",
  "formula_in_words": "Twelve calendar months: each month's figure is the three groups spendByMonthByBucket gives that month added up — bills & fixed, once in a while, everyday — so a screen that shows the groups and one that shows the month read the same amount. Each monthly category adds its monthly amount to every month (a percent category = that percent of the average monthly take-home). Each non-monthly category adds its yearly amount spread evenly over the months it names — over all twelve when it names none (a percent one = percent × average monthly take-home × 12). While only non-monthly categories exist, the typed bills & fixed and everyday totals are added to every month. With no categories: the three typed buckets' total, every month. Then, when the single typed monthly figure is larger than what the plan puts in every month (the monthly categories, the typed totals counted, and a non-monthly category that names no month at its twelfth), the difference is added to every month; a non-monthly category that names its months is on top of the typed figure, in those months only.",
  "handed": "export function spendByMonth(op: OnboardingProfile | null): number[]",
  "decisions_that_govern_it": [
   "DEC-7611",
   "DEC-7951"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-O-002",
  "name": "expenses",
  "kind": "orchestrator",
  "what_it_is_for": "What is being spent this month: the debts that repeat every month, the planned expenses by category, what was actually spent by where it came from, and the big-ticket radar?",
  "formula_in_words": "Recurring debt rows (recurringDebtPayments) and their total. Planned rows by category, as handed in, and their total. Actual expenses for the month — all, entered by hand, and imported (actualSpending). The debt payments that count as expenses (debtPaymentsCountedAsExpenses). Actual total = the actual expenses total + those debt payments. And the radar (radar).",
  "handed": "export function expenses(s: ExpensesInput, purchasesCaptured: Set<string> = new Set()): Expenses",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "approved_drawing": {
   "drawing": "Cash flow v01, frame C (approved 2026-09-28)",
   "household": "Mortgage $2,000 and car loan $250, the same every month. Planned expenses: Gas $200, Grocery $900, Utilities $200, Other $700. Spent so far: $500 entered by hand over 9 items, $1,200 imported from a card over 23 purchases. Paid this month and entered on the Debts tab: HELOC $200, credit card $200.",
   "drawn": {
    "Monthly recurring expenses": 2250,
    "Planned expenses": 2000,
    "Actual expenses, all sources": 2100
   }
  },
  "decisions_that_govern_it": [
   "DEC-0292"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-149",
  "name": "recurringDebtPayments",
  "kind": "function",
  "what_it_is_for": "RECURRING DEBT PAYMENTS — the installment debts, one row each.",
  "formula_in_words": "One row for each debt whose payment is the same every month (an instalment loan): its name and its payment in this month — its required monthly payment from the month of its first payment to the month it is paid off (a date not given sets no bound), nothing outside them. Rows of zero are dropped. Cards, lines of credit and debts due in full are not here.",
  "handed": "export function recurringDebtPayments(s: ExpensesInput): { label: string; monthly: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [
   "DEC-8153"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-150",
  "name": "debtPaymentsCountedAsExpenses",
  "kind": "function",
  "what_it_is_for": "DEBT PAYMENTS THAT ARE COUNTED AS EXPENSES — revolving and due-in-full.",
  "formula_in_words": "For each debt that is NOT an instalment loan, and whose purchases are not already imported from a linked card: the payments logged this month under the category Debt payment whose payee matches the debt's name (capitals and outer spaces ignored), added up. A row only when that is above zero, named after the debt with the word payment.",
  "handed": "export function debtPaymentsCountedAsExpenses(\n  s: ExpensesInput, purchasesCaptured: Set<string> = new Set(),\n): { label: string; amount: number }[]",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-151",
  "name": "actualSpending",
  "kind": "function",
  "what_it_is_for": "What was actually spent in a month, debt payments left out: every expense newest first, the five shown, how many more there are and the totals, for all of them or only those entered by hand or only those imported.",
  "formula_in_words": "The month's logged expenses, leaving out the category Debt payment, newest first — all of them, or only those entered by hand, or only those imported. Shown = the first 5. Hidden = how many more. Total = all of them added. Hidden total = total − the 5 shown.",
  "handed": "export function actualSpending(s: ExpensesInput, origin?: 'by-hand' | 'imported'): SpentList",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-152",
  "name": "isRadarItem",
  "kind": "function",
  "what_it_is_for": "Whether a debt belongs on the big-ticket radar: yes for a card or a credit line and for a debt due in one lump, no for a loan paid the same every month.",
  "formula_in_words": "An instalment loan: not a radar item. A debt due in full: a lump-sum item. Any other debt (a card, a line of credit): a revolving item.",
  "handed": "export function isRadarItem(d: Debt): RadarReason | null",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-153",
  "name": "radar",
  "kind": "function",
  "what_it_is_for": "The big-ticket radar for a month: each card, credit-line or lump-sum debt payment and each large dated bill, with its amount and whether it is already counted as an expense.",
  "formula_in_words": "For each debt that is a radar item (isRadarItem): amount = what was logged as paid against it this month when that is above zero, otherwise what falls due on it this month — its required payment from the month of its first payment to the month it is paid off, and for a debt due in full its whole balance in the month it is due; dropped when the amount is zero or less. It counts as an expense unless its purchases are already imported from a linked card. Then every big bill of $500 or more, with its due date, each counted as an expense. Debts first, bills after.",
  "handed": "export function radar(s: ExpensesInput, purchasesCaptured: Set<string> = new Set()): RadarItem[]",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [
   "DEC-8153"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-O-020",
  "name": "theBudgetCounted",
  "kind": "orchestrator",
  "what_it_is_for": "Which of my planned expenses are counted, now that my debts are taken from Debts?",
  "formula_in_words": "Owner rule, 2026-10-04: \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" The home = the property read as HOME (propertyUses, handed the profile's rent entries — none recorded is read as none, not as unknown). Its mortgage = the mortgage matched to that property (mortgagesByProperty). When the home has a mortgage in Debts AND the budget's Rent / Mortgage line holds an amount: that line is counted as nothing, the one typed monthly total (when there is one) is lowered by the same amount, never below zero, and the sentence says the line is not counted and names the mortgage. Otherwise — a renter, a home with no mortgage, a mortgage on another property, or no amount on the line — the budget is counted exactly as typed. It also names the home's mortgage when there is one. What the person typed is never changed; this is the budget as it is counted.",
  "handed": "export function theBudgetCounted(input: { profile: any; accounts: AssetAccount[]; debts: Debt[] }): BudgetCounted",
  "inputs_it_reads": [
   "MK-XS-I-032 expenses categories the person set up"
  ],
  "decisions_that_govern_it": [
   "DEC-2440",
   "DEC-2484"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

9 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
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
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction."
 },
 {
  "id": "MK-NW-F-106",
  "name": "mortgagesByProperty",
  "what_it_is_for": "Which mortgage is on which property, and which mortgages are on none.",
  "formula_in_words": "Properties = the accounts whose class is real estate. Mortgages = the debts whose type is mortgage. Owner rule, 2026-10-04: \"It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage.\" A mortgage is on the property it names, when that property exists and has no mortgage placed on it yet. A mortgage that names no property is placed only where there is one answer: first, on the one property without a mortgage whose name its own name begins with; then, when exactly one property is still without a mortgage and exactly one mortgage is still without a property, on that property. Every other mortgage is listed as on no property — including a second mortgage that names a property already taken. It gives: the count of properties and of mortgages; for each property its mortgage (or none) and that mortgage's required monthly payment; the mortgages on no property; whether there are none of those; and the sentence to show when there are."
 },
 {
  "id": "MK-NW-F-107",
  "name": "propertyUses",
  "what_it_is_for": "What each property is used for: the home lived in, a rental, or a second or vacation home.",
  "formula_in_words": "For each property: what it is used for, as propertyUseMap reads it, handed the rent entries from the Income screen (none handed in when the person has none on record). Owner rule, 2026-10-04: \"unless rental income is added on the income screen, assume property is second or vacation home.\" RENTAL = a rent entry names it — or, only when no rent entries are handed in at all, it is stored as a rental. HOME = the one marked as the home lived in; with none marked and no use stated on any, the one entered first. SECOND = every other property. A rent entry that names no property is not rent: it makes no property a rental (DEC-4059d, 2026-10-10). A use stated on any property stops the entered-first choice of the home (DEC-4913, 2026-10-13)."
 },
 {
  "id": "MK-NW-F-117",
  "name": "propertyUseMap",
  "what_it_is_for": "What each property is for — the home lived in, a rental, or a second home — by his rule DEC-1926: a rental only when a rent entry on the Income screen names it; the one marked as the home is the home; with none marked and no use stated on any, the one entered first; every other property is a second home.",
  "formula_in_words": "For each real-estate account: rental when a live rent entry names it, or — only when no rent entries were handed in at all (unknown, not none) — when it is stored as a rental. Of the rest: the one marked as the home lived in is home. With none of the rest marked, the one entered first (last in the list) that is not stored as a rental is home — but ONLY when no property at all carries a stated use other than rental (owner, 2026-10-13: a 'primary' mark on a property a rent entry made a rental still counts as a stated use, so it stops this; a stored 'rental' word does not). A property stored as a rental is never made the home this way. Every other property is a second home. A rent entry that names no property makes no property a rental (owner rule DEC-4059d, 2026-10-10 — it used to make the one other property a rental when exactly one remained)."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**Debt payments in a month** — in this part: MK-CF-F-149, MK-CF-F-150

```json
[
 {
  "id": "MK-CF-F-023",
  "name": "requiredPayment",
  "what_it_is_for": "The payment reserved/required each month for a debt (planned payment, else the minimum).",
  "formula_in_words": "0 for a debt due in full. Otherwise the larger of the minimum monthly payment and the payment the person says they make."
 },
 {
  "id": "MK-CF-F-024",
  "name": "totalDebtMonthly",
  "what_it_is_for": "Total monthly debt obligation across all debts (override-aware).",
  "formula_in_words": "requiredPayment added over the debts."
 },
 {
  "id": "MK-CF-F-025",
  "name": "minimumDebtService",
  "what_it_is_for": "The minimum payments every debt requires in a month, added up, leaving out any debt due in one lump on a date.",
  "formula_in_words": "Each debt's minimum monthly payment added; a debt due in full counts 0."
 },
 {
  "id": "MK-CF-F-026",
  "name": "actualDebtPayment",
  "what_it_is_for": "Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account.",
  "formula_in_words": "The same as totalDebtMonthly: requiredPayment added over the debts."
 },
 {
  "id": "MK-CF-F-157",
  "name": "debtPaymentsByDebt",
  "what_it_is_for": "WHICH DEBTS HAVE ACTUALLY BEEN PAID this month, and how much each.",
  "formula_in_words": "For each expense logged this month in the category Debt payment whose payee matches a debt's name (capitals and outer spaces ignored): its amount is added to that debt. Payments that match no debt are left out."
 },
 {
  "id": "MK-CF-F-236",
  "name": "paymentInMonth",
  "what_it_is_for": "WHAT A DEBT ASKS FOR IN ONE CALENDAR MONTH: nothing in a month no payment falls in (paysInMonth); in one that does, the whole balance for a debt due in full, and its payment (requiredPayment) for any other.",
  "formula_in_words": "What a debt asks for in one calendar month: 0 in a month no payment of it falls in (paysInMonth); in a month one does, the whole balance for a debt due in full, and its required payment for any other."
 }
]
```

**Spending logged in a month** — in this part: MK-CF-F-008, MK-CF-F-151

```json
[
 {
  "id": "MK-CF-F-014",
  "name": "budgetVsActual",
  "what_it_is_for": "Month-to-date actual expenses vs the planned budget, bucketed.",
  "formula_in_words": "This calendar month's logged expenses, leaving out the category Debt payment, added into fixed, non-monthly or flexible by each expense's category. For each bucket: planned (spendBuckets), spent, remaining = planned − spent. The totals the same way."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0292",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "This-month screen, Planned: In (take-home) 5,000 · mortgage 2,000 · car 250 · expenses 2,000 · HELOC from the big-ticket radar 200 · credit-card payment entered by hand 200 · surplus 750. Actual: 5,000 · mortgage paid 2,000 · car paid 0 · expenses entered 500 · expenses imported from the card 1,200 · HELOC 200 · card payment 200 · surplus 1,300. Spending: recurring (mortgage 2,000, car 250), planned expenses (gas 200, grocery 900, utilities 200, other 700 = 2,000), radar: card payment 1,200 NOT counted as an expense, HELOC 200 counted, card payment entered by hand 200 counted.",
  "the_log_records": "A worked example of the This-month screen in his own numbers: take-home 5,000, mortgage 2,000, car 250, expenses 2,000, a HELOC payment of 200 from the big-ticket list and a 200 card payment entered by hand, leaving a surplus of 750 — with the actual column beside it. The rows have to add up to the surplus, which is what the example pins.",
  "governs": "MK-CF-M-048 · MK-CF-M-052 · MK-CF-M-015 · MK-CF-M-019 · MK-CF-O-003 · MK-CF-O-002"
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
  "id": "DEC-2440",
  "decided": "2026-10-07",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "NW batch one close.",
  "the_log_records": "The first batch of the outside review of Net worth is closed. Everything corrected in it stands: every return time-weighted, rent counted in the emergency fund, every debt counted from Debts, a mortgage on a named property, and the smaller fixes to bonds, holdings and the account page.",
  "governs": "MK-NW-O-001 · MK-NW-O-002 · MK-NW-O-003 · MK-NW-O-004 · MK-NW-O-005 · MK-NW-O-006 · MK-NW-F-106 · MK-NW-F-107 · MK-CF-O-020 · MK-NW-M-002 · MK-NW-M-013 · MK-NW-M-036 · MK-NW-M-044 · MK-NW-M-064 · MK-PF-M-016"
 },
 {
  "id": "DEC-2484",
  "decided": "2026-10-07",
  "type": "PROCESS",
  "tab": "networth",
  "whose": "his",
  "his_words": "all the code changes, findings and changes - for batch one and two - I approved.",
  "the_log_records": "His approval of batches 1 and 2 of the outside review of Net worth, as a whole. Each rule it approved is its own row beside this one, so it can be found and read alone.",
  "governs": "MK-NW-O-001 theBonds · MK-NW-O-002 theAccount · MK-NW-O-003 theNetWorth · MK-NW-O-004 theEmergencyFund · MK-NW-O-005 theAlternativesOutlook · MK-NW-O-006 theHolding · MK-NW-O-008 thePerformance · MK-NW-F-003 valueFreshness · MK-NW-F-004 portfolioActualReturn · MK-NW-F-005 accountAllowsTicker · MK-NW-F-010 wrapperAccount · MK-NW-F-011 assetClassOf · MK-NW-F-012 taxTreatmentOf · MK-NW-F-016 cashTotal · MK-NW-F-017 equitiesTotal · MK-NW-F-018 fixedIncomeTotal · MK-NW-F-019 alternativesTotal · MK-NW-F-020 realEstateTotal · MK-NW-F-021 investmentsTotal · MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames · MK-NW-F-027 accountClassBreakdown · MK-NW-F-028 classPortionLabel · MK-NW-F-061 bondSummary · MK-NW-F-064 bondRateSensitivity · MK-NW-F-106 mortgagesByProperty · MK-NW-F-107 propertyUses · MK-NW-F-108 taxWordsOf · MK-NW-F-109 holdingClassOf · MK-CF-O-020 theBudgetCounted · MK-CF-F-139 removeShares · MK-PF-F-006 capGains · MK-XS-F-102 ingestSync · Calculation Module code/engines/time-weighted-return.ts · MK-NW-M-002 · MK-NW-M-005 · MK-NW-M-007 · MK-NW-M-008 · MK-NW-M-013 · MK-NW-M-014 · MK-NW-M-036 · MK-NW-M-044 · MK-NW-M-064 · MK-PF-M-001 · MK-PF-M-016"
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
