# Cash flow — part 9 of 19: Debts — payments, balances and paying them off

15 cards, so 15 formula checks and 75 cases, and one `rules_held` line for each of the 14 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 9"` in your reply.

## Notes for this part

- MK-CF-O-018 carries an approved drawing. One case must be that household exactly as drawn.
- Where a payoff runs month by month, give the number of months and the total interest, and say in `notes` how you worked them (a table you built by hand or with your own calculator).

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface Debt {
  debt_id: EntityId;
  label: string;                   // account name, e.g. "Chase Sapphire"
  institution?: string;
  debt_type: DebtType;
  remaining_balance: number;
  interest_rate_apr: number;       // decimal
  minimum_monthly_payment: number;
  monthly_payment?: number;        // what you actually pay each month (≥ minimum); defaults to minimum
  due_day?: number;                // day of month the payment is due (1–31)
  first_payment_date?: string;     // 'YYYY-MM-DD' — payments START here (deferred/future-start loans);
                                   // absent = already paying. Interest accrues from now either way (F2).
  // #17 / Term #9 / B47 finding 11 — payment shape (drives DTI bucket + how cash flow shows it):
  payoff_date?: string;            // 'YYYY-MM-DD' final payoff / loan maturity (term loans);
                                   // for due_in_full this IS the due date of the lump sum
  payment_frequency?: 'monthly' | 'annual';     // default monthly
  payment_type?: 'installment' | 'revolving' | 'due_in_full';   // fixed loan payment vs revolving
                                   // minimum (cards) vs one lump sum on a date; defaults by debt_type
  origin?: 'onboarding';           // seeded from onboarding answers; re-seeding replaces ONLY these
                                   // rows (absent = user-created, never touched by seeding/restart)
  property_id?: EntityId;          // a mortgage or HELOC: the property in Net worth it is on (founder,
                                   // 2026-10-04: "no mortgage without property"). Older rows carry none
                                   // and are matched by mortgagesByProperty.
}

export type DebtType = 'MORTGAGE' | 'HELOC' | 'CREDIT_CARD' | 'STUDENT_LOAN' | 'AUTO' | 'PERSONAL' | 'MEDICAL' | 'OTHER';

export interface LoanPlan { monthly: number; totalInterest: number; totalPaid: number; }

export type PayoffMethod = 'avalanche' | 'snowball';

export interface PayoffResult {
  months: number;                 // months to debt-free (0 = already free)
  totalInterest: number;          // interest paid over the plan
  neverPaysOff: boolean;          // payments can't cover interest
  order: { debt_id: EntityId; label: string; payoffMonth: number; interestPaid: number }[];
}

export interface TheDebts {
  /** Every debt still owed, together. */
  totalBalance: number;
  /** The obligation — what the debts require of you in a month (MK-NW-M-012 is what you actually pay). */
  minimumMonthly: number;
  /** What actually leaves each month, across every debt. */
  paymentsMonthly: number;
  /** Interest accruing in a month at today's balances and rates. */
  interestMonthly: number;
  /** What the plan puts to debts each month: every minimum plus anything extra. */
  planMonthly: number;
  /** The plan: months to debt-free, interest paid over it, and whether the payments can ever clear it. */
  plan: PayoffResult;
  /** PROGRESS (cash-flow_v01, frame 6: "$4,100 paid down since January — 24% of where you started").
   *  What the debts stood at on the first month-end we hold this year, less what they stand at now.
   *  Null — and the line is not drawn — where we hold no earlier figure, or the debts have not fallen:
   *  progress is read from two recorded totals, never estimated from the payments. */
  progress: { paidDown: number; share: number } | null;
}
```

## The cards

```json
[
 {
  "id": "MK-CF-O-018",
  "name": "theDebts",
  "kind": "orchestrator",
  "what_it_is_for": "What do I owe, what does it ask of me each month, when would I be clear of it, and how much have I paid down this year?",
  "formula_in_words": "Counts only debts with a balance above zero. Total = their balances added. Minimum in a month = each debt's minimum payment added, a debt due in full counting 0. Payments in a month = each debt's required payment added (requiredPayment). Interest in a month = balance × yearly rate ÷ 12, added over the debts. Plan in a month = the minimums + the extra. Progress: paid down = the debt at the start of the year − the total now; share = paid down ÷ the start-of-year debt; given only when the start-of-year debt and the paid-down amount are both above zero. The payoff plan is payoffPlan, with the extra and the method chosen (highest rate first when none is).",
  "handed": "export function theDebts(input: { debts: Debt[]; extraMonthly?: number; method?: PayoffMethod; now?: Date;\n  /** what every debt together stood at on the earliest month-end recorded this year, if any */\n  startOfYearDebt?: number | null }): TheDebts",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-057",
    "words_on_screen": "/month interest",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What your debts cost in interest in a month, at today’s balances and rates.",
    "when_it_refuses": "No debts — $0.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-058",
    "words_on_screen": "debt-free",
    "unit": "count",
    "what_it_answers": "How many months until the last debt is cleared, paying the minimums plus anything extra, highest rate first.",
    "when_it_refuses": "The payments cannot cover the interest — the screen says never, not a number.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-059",
    "words_on_screen": "total interest",
    "unit": "money",
    "what_it_answers": "All the interest paid over the plan until the last debt is gone.",
    "when_it_refuses": "The payments cannot cover the interest — the screen says never, not a number.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-071",
    "words_on_screen": "/month min",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The least your debts require of you in a month, every minimum added up — the obligation, not what you choose to pay.",
    "when_it_refuses": "No debts — $0.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-072",
    "words_on_screen": "/month total",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the payoff plan puts to debts each month: every minimum plus the extra you set.",
    "when_it_refuses": "No debts — $0.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-073",
    "words_on_screen": "/month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What you pay on one debt each month — the payment you set, or its minimum where you set none.",
    "when_it_refuses": "A debt due in full on a date has no monthly payment — the line says when the whole balance is due.",
    "shown_on": [
     "/cashflow",
     "/bill-calendar"
    ]
   },
   {
    "id": "MK-CF-M-074",
    "words_on_screen": "paid down since <month>",
    "unit": "money",
    "what_it_answers": "How much less you owe than at the first month-end we recorded this year.",
    "when_it_refuses": "No earlier total on record, or the debts have not fallen — the line is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-075",
    "words_on_screen": "% of where you started",
    "unit": "percent",
    "what_it_answers": "That paid-down amount as a share of what you owed at the start.",
    "when_it_refuses": "No earlier total on record, or the debts have not fallen — the line is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-CF-M-074",
    "words": "READ FROM TWO RECORDED TOTALS, never estimated from the payments made — interest and new borrowing are inside it."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-074",
    "words": "NOT DRAWN where there is no earlier total to compare with, or the debts have not fallen."
   }
  ],
  "approved_drawing": {
   "drawing": "Cash flow v01, frame for the Debts tab (approved 2026-09-28)",
   "household": "Visa card $3,200 owed at 22.90%. Car loan $9,800 owed at 6.40%. Together they stood at $17,100 at the first month-end recorded this year.",
   "drawn": {
    "Your debt": 13000,
    "Paid down since January": 4100,
    "Share of where you started": "24%"
   }
  },
  "decisions_that_govern_it": [],
  "period": [
   "MK-CF-M-057: a month",
   "MK-CF-M-058: no period on the figure",
   "MK-CF-M-059: no period on the figure",
   "MK-CF-M-071: a month",
   "MK-CF-M-072: a month",
   "MK-CF-M-073: a month — one debt",
   "MK-CF-M-074: no period on the figure",
   "MK-CF-M-075: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-057: No debts — $0.",
   "MK-CF-M-058: The payments cannot cover the interest — the screen says never, not a number.",
   "MK-CF-M-059: The payments cannot cover the interest — the screen says never, not a number.",
   "MK-CF-M-071: No debts — $0.",
   "MK-CF-M-072: No debts — $0.",
   "MK-CF-M-073: A debt due in full on a date has no monthly payment — the line says when the whole balance is due.",
   "MK-CF-M-074: No earlier total on record, or the debts have not fallen — the line is not drawn.",
   "MK-CF-M-075: No earlier total on record, or the debts have not fallen — the line is not drawn."
  ]
 },
 {
  "id": "MK-CF-F-021",
  "name": "defaultPaymentType",
  "kind": "function",
  "what_it_is_for": "How a kind of debt is normally repaid: a card or a credit line revolves, and every other kind is a loan paid in fixed instalments.",
  "formula_in_words": "A credit card or a home-equity line: revolving. Every other kind of debt: instalment.",
  "handed": "export function defaultPaymentType(t: DebtType): NonNullable<Debt['payment_type']>",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-022",
  "name": "paymentShape",
  "kind": "function",
  "what_it_is_for": "How this debt is repaid: the way the person said, or the normal way for its kind when they did not say.",
  "formula_in_words": "The payment type recorded on the debt; when none is recorded, defaultPaymentType.",
  "handed": "export function paymentShape(d: Debt): NonNullable<Debt['payment_type']>",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-023",
  "name": "requiredPayment",
  "kind": "function",
  "what_it_is_for": "The payment reserved/required each month for a debt (planned payment, else the minimum).",
  "formula_in_words": "0 for a debt due in full. Otherwise the larger of the minimum monthly payment and the payment the person says they make.",
  "handed": "export function requiredPayment(d: Debt): number",
  "inputs_it_reads": [
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-041 the payment the person chose to make on a debt",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-024",
  "name": "totalDebtMonthly",
  "kind": "function",
  "what_it_is_for": "Total monthly debt obligation across all debts (override-aware).",
  "formula_in_words": "requiredPayment added over the debts.",
  "handed": "export function totalDebtMonthly(debts: Debt[]): number",
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-012",
    "words_on_screen": "Monthly debt payments",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What all your debts require of you in a month, together.",
    "when_it_refuses": "No debts entered.",
    "shown_on": [
     "/analytics",
     "/home"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0641",
    "date": "2026-09-30",
    "words": "Q53 - what actually leaves."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0641"
  ],
  "period": [
   "MK-NW-M-012: a month"
  ],
  "when_it_gives_no_number": [
   "MK-NW-M-012: No debts entered."
  ]
 },
 {
  "id": "MK-CF-F-025",
  "name": "minimumDebtService",
  "kind": "function",
  "what_it_is_for": "The minimum payments every debt requires in a month, added up, leaving out any debt due in one lump on a date.",
  "formula_in_words": "Each debt's minimum monthly payment added; a debt due in full counts 0.",
  "handed": "export function minimumDebtService(debts: Debt[]): number",
  "inputs_it_reads": [
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-026",
  "name": "actualDebtPayment",
  "kind": "function",
  "what_it_is_for": "Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account.",
  "formula_in_words": "The same as totalDebtMonthly: requiredPayment added over the debts.",
  "handed": "export function actualDebtPayment(debts: Debt[]): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-027",
  "name": "totalDebtBalance",
  "kind": "function",
  "what_it_is_for": "Σ outstanding debt BALANCE — what you still owe (not a monthly payment).",
  "formula_in_words": "The balances added.",
  "handed": "export function totalDebtBalance(debts: Debt[]): number",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-028",
  "name": "loanPayment",
  "kind": "function",
  "what_it_is_for": "UNIT LANDMINE (P0): `aprPct` is a PERCENT (7 = 7%), unlike Debt.interest_rate_apr which is a DECIMAL (0.07).",
  "formula_in_words": "Months = years × 12, rounded to a whole number; monthly rate = the yearly percent ÷ 100 ÷ 12. All zero when the amount borrowed or the months are zero or less. Payment = amount × monthly rate ÷ (1 − (1 + monthly rate) to the power −months); with no interest, amount ÷ months. Total paid = payment × months. Total interest = total paid − amount.",
  "handed": "export function loanPayment(principal: number, aprPct: number, termYears: number): LoanPlan",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-029",
  "name": "monthsToClear",
  "kind": "function",
  "what_it_is_for": "How many months it takes to clear a balance at a given yearly rate and monthly payment, or never when the payment does not cover the interest.",
  "formula_in_words": "0 when nothing is owed. No answer when the payment is zero or less, or when it does not exceed the first month's interest (balance × yearly rate ÷ 12) — the debt would never clear. With no interest: balance ÷ payment, rounded up. Otherwise log(payment ÷ (payment − balance × monthly rate)) ÷ log(1 + monthly rate), rounded up to a whole month.",
  "handed": "export function monthsToClear(principal: number, aprDecimal: number, payment: number): number | null",
  "decisions_that_govern_it": [
   "DEC-7795"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-030",
  "name": "paymentToClearBy",
  "kind": "function",
  "what_it_is_for": "Monthly payment that clears `principal` in `months` at decimal APR (amortization).",
  "formula_in_words": "0 when nothing is owed or the months are zero or less. Payment = balance × monthly rate ÷ (1 − (1 + monthly rate) to the power −months), monthly rate = yearly rate ÷ 12; with no interest, balance ÷ months. Rounded UP to the cent.",
  "handed": "export function paymentToClearBy(principal: number, aprDecimal: number, months: number): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-034",
  "name": "payoffPlan",
  "kind": "function",
  "what_it_is_for": "Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each cleared debt's freed-up payment into the next per the chosen method.",
  "formula_in_words": "Only debts with a balance above zero. A debt due in full is paid in its due month (never earlier than month 1; month 1 when it has no date), with interest = balance × ((1 + yearly rate ÷ 12) to the power of the months until then − 1). The others are walked month by month, for at most 600 months. Each month: every balance grows by balance × yearly rate ÷ 12; the money to pay = the minimums of every debt whose payments have started — including debts already cleared, whose minimums roll on — plus the extra; each debt first gets its minimum (never more than it owes); what is left goes to one debt at a time, highest rate first (avalanche) or smallest balance first (snowball). A debt is cleared when it owes a cent or less. A debt whose first payment date is in the future is not paid until that month, and grows meanwhile. Months = the month the last debt is cleared (or the last lump-sum month, when later); total interest = all the interest charged; it never pays off when anything is still owed at month 600. Order = each debt with the month it is cleared and the interest it cost, earliest first.",
  "handed": "export function payoffPlan(debts: Debt[], extraMonthly: number, method: PayoffMethod = 'avalanche', now: Date = new Date()): PayoffResult",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump",
   "MK-XS-I-053 the month a debt is first paid",
   "MK-XS-I-054 the date a debt is due to be paid off in full"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-159",
  "name": "isRecurringDebt",
  "kind": "function",
  "what_it_is_for": "Is this debt one that repeats unchanged every month?",
  "formula_in_words": "True for an instalment loan (paymentShape).",
  "handed": "export const isRecurringDebt = (d: Debt): boolean",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-235",
  "name": "paysInMonth",
  "kind": "function",
  "what_it_is_for": "WHETHER A PAYMENT ON A DEBT FALLS IN ONE CALENDAR MONTH ('YYYY-MM') (2026-10-24, CF-FIX; PF-TOOLS, settling MK-CF-M-001 to 004): a debt counts in a month only if a payment falls in that month.",
  "formula_in_words": "Whether a payment on a debt falls in one calendar month, written year-month: no for a month not written that way. A debt due in full: yes only in the month its payoff date falls in, while a balance above 0 is owed. Any other debt: yes from the month of its first payment (from any month when none is recorded) to the month of its payoff (to any month when none is recorded), both included.",
  "handed": "export function paysInMonth(d: Debt, ym: string): boolean",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump",
   "MK-XS-I-053 the month a debt is first paid",
   "MK-XS-I-054 the date a debt is due to be paid off in full"
  ],
  "decisions_that_govern_it": [
   "DEC-8153"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-236",
  "name": "paymentInMonth",
  "kind": "function",
  "what_it_is_for": "WHAT A DEBT ASKS FOR IN ONE CALENDAR MONTH: nothing in a month no payment falls in (paysInMonth); in one that does, the whole balance for a debt due in full, and its payment (requiredPayment) for any other.",
  "formula_in_words": "What a debt asks for in one calendar month: 0 in a month no payment of it falls in (paysInMonth); in a month one does, the whole balance for a debt due in full, and its required payment for any other.",
  "handed": "export function paymentInMonth(d: Debt, ym: string): number",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [
   "DEC-8153"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**Debt payments in a month** — in this part: MK-CF-F-023, MK-CF-F-024, MK-CF-F-025, MK-CF-F-026, MK-CF-F-236

```json
[
 {
  "id": "MK-CF-F-149",
  "name": "recurringDebtPayments",
  "what_it_is_for": "RECURRING DEBT PAYMENTS — the installment debts, one row each.",
  "formula_in_words": "One row for each debt whose payment is the same every month (an instalment loan): its name and its payment in this month — its required monthly payment from the month of its first payment to the month it is paid off (a date not given sets no bound), nothing outside them. Rows of zero are dropped. Cards, lines of credit and debts due in full are not here."
 },
 {
  "id": "MK-CF-F-150",
  "name": "debtPaymentsCountedAsExpenses",
  "what_it_is_for": "DEBT PAYMENTS THAT ARE COUNTED AS EXPENSES — revolving and due-in-full.",
  "formula_in_words": "For each debt that is NOT an instalment loan, and whose purchases are not already imported from a linked card: the payments logged this month under the category Debt payment whose payee matches the debt's name (capitals and outer spaces ignored), added up. A row only when that is above zero, named after the debt with the word payment."
 },
 {
  "id": "MK-CF-F-157",
  "name": "debtPaymentsByDebt",
  "what_it_is_for": "WHICH DEBTS HAVE ACTUALLY BEEN PAID this month, and how much each.",
  "formula_in_words": "For each expense logged this month in the category Debt payment whose payee matches a debt's name (capitals and outer spaces ignored): its amount is added to that debt. Payments that match no debt are left out."
 }
]
```

**A loan's payment, and the months to clear it** — in this part: MK-CF-F-028, MK-CF-F-029, MK-CF-F-030, MK-CF-F-034

```json
[
 {
  "id": "MK-CF-F-125",
  "name": "amortise",
  "what_it_is_for": "Months to clear a balance at a given payment, and the total interest paid getting there.",
  "formula_in_words": "Never clears — infinite months and interest — when the payment does not exceed the first month's interest. Otherwise month by month, for at most 1,200: interest = balance × yearly rate ÷ 12; balance = balance + interest − payment; until the balance is zero or less. Gives the months, and the interest added up."
 }
]
```

## The figures these cards feed — as the screen register holds them

The author's record of each figure, with a worked example the app's own door ran (convention 10). Judge the cards; the figures themselves are checked against the tenets in the screen parts.

```json
[
 {
  "id": "MK-CF-M-057",
  "label": "/month interest",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What your debts cost in interest in a month, at today’s balances and rates.",
  "formula": "Σ balance × yearly rate ÷ 12, over every debt still owed",
  "inputs": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate"
  ],
  "refusal": "No debts — $0.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.",
   "answer": "$261/month"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-058",
  "label": "debt-free",
  "unit": "count",
  "screens": [
   "/cashflow"
  ],
  "answers": "How many months until the last debt is cleared, paying the minimums plus anything extra, highest rate first.",
  "formula": "the payoff plan: each month pay every minimum, put the extra on the costliest debt, roll a cleared debt’s payment onto the next",
  "inputs": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment"
  ],
  "refusal": "The payments cannot cover the interest — the screen says never, not a number.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.",
   "answer": "84"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-059",
  "label": "total interest",
  "unit": "money",
  "screens": [
   "/cashflow"
  ],
  "answers": "All the interest paid over the plan until the last debt is gone.",
  "formula": "the interest paid month by month over the payoff plan, added up",
  "inputs": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment"
  ],
  "refusal": "The payments cannot cover the interest — the screen says never, not a number.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.",
   "answer": "$14,787"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-071",
  "label": "/month min",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "The least your debts require of you in a month, every minimum added up — the obligation, not what you choose to pay.",
  "formula": "Σ the minimum monthly payment of every debt still owed",
  "inputs": [
   "MK-XS-I-016 debt minimum payment"
  ],
  "refusal": "No debts — $0.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.",
   "answer": "$450/month"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-072",
  "label": "/month total",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What the payoff plan puts to debts each month: every minimum plus the extra you set.",
  "formula": "the minimums added up (MK-CF-M-071) + the extra a month you set",
  "inputs": [
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-041 the payment the person chose to make on a debt"
  ],
  "refusal": "No debts — $0.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.",
   "answer": "$450/month"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-073",
  "label": "/month",
  "unit": "money",
  "per": "month",
  "grain": "one debt",
  "screens": [
   "/cashflow",
   "/bill-calendar"
  ],
  "answers": "What you pay on one debt each month — the payment you set, or its minimum where you set none.",
  "formula": "the payment you chose for the debt; its minimum monthly payment where none is chosen",
  "inputs": [
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-041 the payment the person chose to make on a debt"
  ],
  "refusal": "A debt due in full on a date has no monthly payment — the line says when the whole balance is due.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.",
   "answer": "$200/month"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-02",
  "printed_in": [
   "BillCalendarScreen",
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-074",
  "label": "paid down since <month>",
  "unit": "money",
  "screens": [
   "/cashflow"
  ],
  "answers": "How much less you owe than at the first month-end we recorded this year.",
  "formula": "what every debt together stood at then − what they stand at now",
  "inputs": [
   "MK-XS-I-014 debt balance"
  ],
  "decisions": [
   "READ FROM TWO RECORDED TOTALS, never estimated from the payments made — interest and new borrowing are inside it.",
   "NOT DRAWN where there is no earlier total to compare with, or the debts have not fallen."
  ],
  "refusal": "No earlier total on record, or the debts have not fallen — the line is not drawn.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid. They stood at $27,100 at the end of January.",
   "answer": "$4,100"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-03",
  "printed_in": [
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-075",
  "label": "% of where you started",
  "unit": "percent",
  "screens": [
   "/cashflow"
  ],
  "answers": "That paid-down amount as a share of what you owed at the start.",
  "formula": "paid down (MK-CF-M-074) ÷ what every debt together stood at then",
  "inputs": [
   "MK-XS-I-014 debt balance"
  ],
  "refusal": "No earlier total on record, or the debts have not fallen — the line is not drawn.",
  "worked": {
   "given": "A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid. They stood at $27,100 at the end of January.",
   "answer": "15%"
  },
  "door": "MK-CF-O-018 theDebts",
  "ruled": "2026-10-03",
  "printed_in": [
   "BudgetScreen"
  ],
  "decisions_that_govern_it": []
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0393",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Again context is important. Term to represent Net amount person get should be \"take-home\". In context of take home base salary use \"Base salary (take-home)\". In context of total income use \"Income (Take-home)\". Again in context of cashflow it is always inflow and outflow. Describe inflow and outflow same way \"Inflow (income (take-home) + rent)\" where terms in parentheses represent source of inflow or outflow. \"Money In\" should be \"Inflow (xxx)\".",
  "the_log_records": "“Again context is important. Term to represent Net amount person get should be ‘take-home’. In context of take home base salary use ‘Base salary (take-home)’.” One word for the concept, with the context named in brackets — not a different word per screen.",
  "governs": "MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md · MoneyKeel/functions/cashflow/this-month.ts"
 },
 {
  "id": "DEC-0496",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "How you plan to capture the information?",
  "the_log_records": "HIS QUESTION: “How you plan to capture the information?” Asked of the Home screen — what is behind each figure it shows.",
  "governs": "src/screens/HomeScreen.tsx · src/domain/debt/index.ts"
 },
 {
  "id": "DEC-0641",
  "decided": "2026-09-30",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "Q53 - what actually leaves.",
  "the_log_records": "The line reads “Monthly debt payments” and two amounts could go there: the minimum each debt obliges, or the money that actually goes. On a card with a $200 minimum paid at $600, it read $200 and now reads $600. HIS WORDS: “what actually leaves.” The words say payments, and what a person pays is what they pay. The minimum stays on the door for debt-to-income.",
  "governs": "MK-NW-M-012 Monthly debt payments · MoneyKeel/functions/networth-and-performance/net-worth.ts theNetWorth (monthlyDebtPayments, monthlyDebtMinimum)"
 },
 {
  "id": "DEC-1923",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses. Actual expenses - we wait for debt to be paid, and not assume it is paid, similar to mock up.",
  "the_log_records": "A mortgage or any debt is taken from Debts, by the app, wherever a planned figure needs it — surplus, the emergency fund, anywhere. The person does not add it to planned expenses. On the actual side nothing is assumed paid: a debt counts only when its payment is logged.",
  "governs": "MK-NW-M-013 EMERGENCY FUND — X.X months · MK-NW-M-047 debt payments you cannot stop · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · MoneyKeel/functions/cashflow/this-month.ts (plannedMonthFlow, actualMonthFlow)"
 },
 {
  "id": "DEC-1924",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "11 - mortgage should not costs to run. We should ask to add monthly mortgage payment if any mortgage on second property. And automatically add it to debt.",
  "the_log_records": "On Rent from a property, a mortgage is never part of what the property costs to run. The screen asks for the monthly mortgage payment on that property, if there is one, and the app adds that mortgage to Debts by itself.",
  "governs": "src/screens/IncomeManagerScreen.tsx (Rent from a property) · src/onboarding/modules.tsx (Rental property) · MK-CF-M-027 · MK-NW-M-064 rent from your property, which keeps arriving · src/domain/debt/index.ts"
 },
 {
  "id": "DEC-1925",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "Properties, mortgages, and debt we should ask user to name. App should map properties included in networth against mortgages. It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage.",
  "the_log_records": "Every property, mortgage and debt has a name the person gives it. Each mortgage is matched to a property in Net worth. A property can have no mortgage; a mortgage cannot be without a property. So there are never more mortgages than properties: three properties, three mortgages or fewer.",
  "governs": "src/screens/AddAccountScreen.tsx · src/components/DebtEditorSheet.tsx · src/screens/NetWorthScreen.tsx · src/domain/debt/index.ts · src/domain/assets/index.ts · MK-NW-M-010 · MK-NW-M-047 debt payments you cannot stop"
 },
 {
  "id": "DEC-7607",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-0440 and DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. His approved drawing (DEC-0440, 2026-09-28) is newer than the 2026-08-28 words \"nothing is assumed to have arrived\", and the newest approval wins. With $500 recorded as received, Home read $7,700 against Cash flow's $7,200; both read $7,200. The row's formula now says, in plain words, that the inflow is the month's take-home. This settles screen check MK-CF-M-051#1, which was marked as needing a ruling. To reverse: count only recorded payments; both screens move together. One word from him reverses it.",
  "governs": "MK-CF-M-051 (Inflow) · MoneyKeel/functions/cashflow/this-month.ts · MK-CF-F-227 thisMonthInputs · MK-CF-F-228 useThisMonthInputs"
 },
 {
  "id": "DEC-7609",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-0269 and DEC-0345, made without asking him, as his order of 2026-09-30 says. Worked September: Home's box label \"Actual expenses so far\" replaced by \"Outflow (expenses + debt)\". The box read Actual expenses so far $2,998 · Left $4,202; it now prints the Cash flow tab's month, Outflow (expenses + debt) $3,248 with the $250 car loan paid, Left $3,952 on both. Home's month-end sheet offers \"$3,952 of $3,952 left to assign\" (it offered $4,202). To reverse the label: put the old label back; the figures stay the Cash flow tab's. One word from him reverses it.",
  "governs": "MK-CF-M-052 · MK-CF-M-053 · MK-CF-F-220 pastMonthFlow (MoneyKeel/functions/cashflow/this-month.ts) · MK-CF-F-228 useThisMonthInputs · src/screens/HomeScreen.tsx"
 },
 {
  "id": "DEC-7682",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-3523 (tenet 3) and DEC-0345, made without asking him, as his order of 2026-09-30 says. A car loan with no monthly payment entered, with a budget set: the band read \"+No budget set — …\" and the debt's row printed a sentence written for the master file. The row now reads \"payment not entered\" where the amount would be, the band reads —, and under the rows: \"Car loan's payment is not entered, so there is no planned surplus — we won't guess one.\" ACTUAL is unchanged. To reverse: give the debt's row and the surplus their earlier words. One word from him reverses it.",
  "governs": "MK-CF-M-002 (Planned surplus) · src/screens/CashFlowScreen.tsx · MoneyKeel/functions/cashflow/the-debts.ts"
 },
 {
  "id": "DEC-7795",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenet 4) and DEC-0345, made without asking him, as his order of 2026-09-30 says. Single filer, $60,000 of wages, $4,800 into a 401(k), no rate typed: sign-up worked its own rate, 8.37%, tax $5,020 and take-home $50,180 a year, beside ≈ $4,230 a month on the same card. It now reads MK-CF-F-181 rateInForce through MK-CF-O-004 incomeSummary: 7.41%, $4,444 and $50,756 a year ($4,230 a month), as Cash flow's Income summary, and the Taxes step offers the calculated rate at about 7% (it offered about 8%). The months to clear a debt read MK-CF-F-029 monthsToClear ($10,000 at 18%: $300 a month clears in 47 months; $100 a month never clears) and the growth reads MK-CF-F-229 balanceGrownTo ($300,000 and $1,500 a month at 4.6% for 15 years): the same figures as before, through one formula each. None of these is stored in the profile. To reverse: give sign-up back its own incomeTaxRate, debtPayoff and fv. One word from him reverses it.",
  "governs": "src/onboarding/modules.tsx (incomeTaxRate, debtPayoff, fv) · MK-CF-F-181 rateInForce · MK-CF-O-004 incomeSummary (hands out the rate) · MK-CF-F-029 monthsToClear · MK-CF-F-229 balanceGrownTo (src/domain/debt/mortgageVsTreasury.ts) · MK-CF-F-126 futureValue"
 },
 {
  "id": "DEC-7949",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. A $150 grocery purchase dated Sep 25, imported on Oct 3, after September's record was saved: it was listed with nothing said, the card reading $1,510 and the list $1,360. The row now says, under its name, that it was added after September closed and is not in September's figures, and under the total that $150 of it was added after September closed. The card stays $1,510: a past month never changes under the person. To reverse: drop the two lines. One word from him reverses it.",
  "governs": "MK-CF-F-231 addedAfterRecord (MoneyKeel/functions/cashflow/this-month.ts) · MK-CF-M-013 · MK-CF-M-052 · src/screens/CashFlowScreen.tsx"
 },
 {
  "id": "DEC-8085",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-0333, made without asking him, as his order of 2026-09-30 says. His ruling DEC-0333 (G12, 2026-09-12): the month's outflow, expenses and debt paid, comes from one function, MK-CF-F-194 monthOutflow, never from the screen. Only a past month used it: this month's outflow was summed inside MK-CF-F-005 actualMonthFlow, and Home added the rows again. Both now hand the month's expenses so far and debt paid so far to monthOutflow, and Home prints the door's inflow and outflow. The dollars do not move: A $3,248 · C $9,248 · D $3,548 · E $3,398, and a past month $2,998 + $250 = $3,248. DEC-0333 stays TESTED, now on eight checks in the agreement test. To reverse: restore this-month.ts from the scratchpad backup-1024b/ and revert the two lines in HomeScreen.tsx. One word from him reverses it.",
  "governs": "MK-CF-F-194 monthOutflow · MK-CF-F-005 actualMonthFlow · MK-CF-O-003 thisMonth (MoneyKeel/functions/cashflow/this-month.ts) · src/screens/HomeScreen.tsx · MK-CF-M-052"
 },
 {
  "id": "DEC-8152",
  "decided": "2026-09-14",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "count them",
  "the_log_records": "“count them.” His answer to master question Q50, on his own 2026-08-27 worked example: the HELOC payment of 200 and the card payment of 200, which his spending section counts as expenses, come off the surplus too. His household's planned surplus is 350 and its actual 900, not 750 and 1,300.",
  "governs": "MK-CF-M-052 (This month's outflow, counting the HELOC and card payments) · MK-CF-M-002 · MK-CF-M-053 · MK-CF-F-194 monthOutflow · MK-CF-O-003 thisMonth (MoneyKeel/functions/cashflow/this-month.ts)"
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
