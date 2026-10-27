# Cash flow — part 14 of 19: This month — the plan and what has happened

15 cards, so 15 formula checks and 75 cases, and one `rules_held` line for each of the 24 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 14"` in your reply.

## Notes for this part

- MK-CF-O-010 and MK-CF-O-003 each carry an approved drawing (the same month, asked of the door and of the function underneath). One case for each must be that household exactly as drawn.
- The planned block and the actual block never share a row. Work each one separately, and give its rows and its surplus as separate expected values, so that the rows can be seen to add up to the surplus.
- The approved drawing does not name the month or today's date. It does say the car loan is not yet paid and falls due later in the month, on the day its household gives, so use an `as_of` day before that day, and say which day you chose.
- Home shows a box for this month's cash flow. Where your case is one a person would also see on Home, say so in `notes`, so the two can be compared (tenet 4: the same figure on two screens is the same figure).

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface CashflowModel {
  lens: Lens;
  year: PaycheckYear;    // F5: the retiree paycheck (12 dated cells + hero + this-year)
  grid: DatedGrid;       // F2: the dated in/out grid (working bars; regular bills for both lenses)
}

export interface LoggedExpense { amount: any; category: string; store?: string; date: string;
                                 /** absent = the person typed it; 'imported' = it came from a card
                                  *  or a file. The approved mock draws the two apart. */
                                 origin?: 'imported'; }

export interface MonthBlock { lines: Line[]; surplus: number;
  /** False on the PLANNED side when no budget is set: there is no planned surplus, and the screen
   *  prints an em-dash rather than a figure built on a guess. Always true on the actual side. */
  planSet: boolean;
  /** WHAT CAME IN AND WHAT WENT OUT, added up from the rows above (2026-10-23): inflow = the rows that come in; outflow =
   *  every other row, as an amount going out; surplus = inflow − outflow. A screen that shows the month in three figures —
   *  Home's box — prints these and calculates nothing, so it can never leave a row out (Home left out a $250 car loan
   *  already paid: Left $4,202 against Cash flow's +$3,952, outside re-run of Performance, gap list item 38). */
  inflow: number; outflow: number;
  /** WHY THERE IS NO SURPLUS, when one cannot be calculated: a debt whose payment was never entered (2026-10-23). The
   *  surplus is then not a number, so nothing can print a figure built on a missing payment. Null when it is given. */
  refusal: string | null; }

export interface MonthInput {
  ym: string;                    // 'YYYY-MM' — the month being shown
  takeHomeMonthly: number;       // from basePay — the take-home
  inflowSources?: string[];      // the sources inside takeHomeMonthly, by name — the inflow line prints them (cluster #5 ruling, 2026-09-10)
  debts: Debt[];
  plannedExpenses: number;       // this month's planned expenses (the month's cell — a once-a-year bill only in its month)
  /** A BUDGET IS SET, even when nothing in it falls this month (2026-10-23): a budget whose only line is a once-a-year bill
   *  plans $0 for the other eleven months and is still set. Not given → set when this month plans more than $0, as before. */
  budgetSet?: boolean;
  expenses: LoggedExpense[];     // everything logged, debt payments included
  /** WHAT THE PLAN HAS ALREADY PROMISED to goals, per month. The hero figure on This month is the
   *  surplus LESS these, because money already committed to a goal is not free (F11). */
  commitments?: { label: string; monthlyAmount: number }[];
}

export interface TheMonth {
  /** The flow, spelled out — planned and actual, each ending in its surplus. */
  planned: ThisMonth['planned'];
  actual: ThisMonth['actual'];
  /** The detail behind the Expenses row of that flow. */
  expenses: Expenses;
  /** MK-CF-M-021 — what the Plan has already promised to goals this month, added up. */
  committed: number;
  /** MK-CF-M-020 — the hero figure: the planned surplus, less anything already promised to a goal. */
  free: number;
}

export interface ThisMonth { planned: MonthBlock; actual: MonthBlock; }
```

## The cards

```json
[
 {
  "id": "MK-CF-O-010",
  "name": "theMonth",
  "kind": "orchestrator",
  "what_it_is_for": "How is this month going: the plan, what has actually happened, the detail behind the expenses, and what is free after anything already promised to a goal?",
  "formula_in_words": "The planned and actual blocks (thisMonth); the Expenses tab (expenses); committed = the monthly amounts of the goals added up; free = planned surplus − committed.",
  "handed": "export function theMonth(input: MonthInput & ExpensesInput): TheMonth",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-001",
    "words_on_screen": "Expenses",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What you plan to spend in this month, as one line on the flow — and the total of the Expenses tab's planned rows.",
    "when_it_refuses": "No budget set — on This month the row reads \"— not set\", and under the rows a sentence says there is no planned surplus until a budget is set (\"… we won’t guess one.\") with the door \"Set your budget\"; on Expenses the band reads — with \"You haven’t set your budget yet. …\" and the same door. Income not entered — the month is not drawn: its two set-up steps stand in its place.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-002",
    "words_on_screen": "= Planned surplus",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The surplus in the month if everything goes to plan.",
    "when_it_refuses": "No planned surplus is shown, and the band reads —: when no budget is set (the sentence under the rows says so and offers \"Set your budget\"), or when a debt’s payment was never entered (\"Car loan’s payment is not entered, so there is no planned surplus — we won’t guess one.\", 2026-10-23). Income not entered — the month is not drawn: its two set-up steps stand in its place.",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-003",
    "words_on_screen": "= Actual surplus so far",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What is actually left, on what has really happened so far this month.",
    "when_it_refuses": "Nothing logged and no card linked — it says so and offers the door.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-004",
    "words_on_screen": "each row of the month — what it is and what it costs",
    "unit": "money",
    "what_it_answers": "One line per thing in or out this month, so the surplus can be checked by reading down the column — and, on Expenses, each line of its lists.",
    "when_it_refuses": "A row whose amount is not known says so where the amount would be: \"— not set\" for a budget not set, \"payment not entered\" for a debt whose payment was never entered (2026-10-23). A debt not paid yet shows $0 with its due day (\"not paid yet\" when no due day is recorded). Nothing logged: \"Expenses entered by hand\" stays at a real $0, with \"Nothing logged yet, and no card connected. …\" under the rows. On Expenses every section keeps its heading when empty, at a real $0.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-013",
    "words_on_screen": "Actual expenses",
    "unit": "money",
    "what_it_answers": "What has actually gone out so far this month, from the expenses logged.",
    "when_it_refuses": "Nothing logged in the month — a real $0 on the ACTUAL EXPENSES band, with \"Nothing logged this month. Connect a card and purchases arrive on their own, or add a receipt by hand.\" and the door \"Log an expense\".",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-014",
    "words_on_screen": "each expense and its amount",
    "unit": "money-cents",
    "what_it_answers": "One logged expense — where, when, how much.",
    "when_it_refuses": "Nothing logged in the month — the list is not drawn; \"Nothing logged this month. …\" and the door \"Log an expense\" stand in its place.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-015",
    "words_on_screen": "Planned expenses — each category",
    "unit": "money",
    "what_it_answers": "For each of the budget's groups — bills & fixed, once in a while, everyday expenses: what is planned for it in this month.",
    "when_it_refuses": "No budget set — the categories are not drawn: the band reads —, with \"You haven’t set your budget yet. This is what every “of $X planned” on any screen is measured against.\" and the door \"Set your budget\".",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-020",
    "words_on_screen": "THIS MONTH — free to use",
    "unit": "money",
    "what_it_answers": "The planned surplus, less what the Plan has already promised to goals this month — what is genuinely free.",
    "when_it_refuses": "No budget set, or a debt’s payment never entered (2026-10-23) — no line: nothing is called free until there is a plan to be free of.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-021",
    "words_on_screen": "<goal> · from your Plan",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the Plan sends to one goal each month, shown on This month as a line already spoken for.",
    "when_it_refuses": "No goal with a monthly amount — no line.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-056",
    "words_on_screen": "left of your budget",
    "unit": "money",
    "what_it_answers": "What is left of this month’s budget after what has been spent so far.",
    "when_it_refuses": "No budget set — nothing to be left of.",
    "shown_on": [
     "/cashflow"
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
    "about": "MK-CF-M-001",
    "words": "One line on This month, and the Expenses tab is its detail — not a second answer to the same question (his correction, 2026-09-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-001",
    "words": "A bill that lands once a year is planned in the month it lands, never spread (his DEC-0002 and DEC-0447; MK-CF-M-048). A budget whose only line falls in another month reads $0 this month, not \"not set\" (2026-10-23)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-002",
    "words": "EVERY ROW SHOWN IS A ROW DEDUCTED (his rule under the approved design): nothing appears on This month without being in the sum."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-003",
    "words": "An unpaid debt shows $0 with its due date — never silently dropped, or the surplus would flatter the month."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-003",
    "words": "A card payment is counted ONCE: connected card → the imported purchases are the expense and the payment is a radar note; not connected → the payment IS the expense."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-004",
    "words": "Drawn from the approved design (cash-flow_v01): the flow is SPELLED OUT, not summarised into three numbers."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-020",
    "words": "A PROMISE TO A GOAL IS MONEY ALREADY SPOKEN FOR — it never reads as free."
   }
  ],
  "approved_drawing": {
   "drawing": "Cash flow v01, frame A (approved 2026-09-28)",
   "household": "Take-home $5,000. Mortgage $2,000 and car loan $250 (the same every month). Budget for expenses $2,000. HELOC payment $200 and credit card payment $200. So far this month: the mortgage is paid, the car loan is not (due the 28th), $500 of expenses entered by hand, $1,200 imported from a card, and the HELOC and card payments are made.",
   "drawn": {
    "Planned surplus": 350,
    "Actual surplus so far": 900
   }
  },
  "decisions_that_govern_it": [
   "DEC-0002",
   "DEC-0260",
   "DEC-0292",
   "DEC-0333",
   "DEC-7611",
   "DEC-7682",
   "DEC-7937",
   "DEC-7939",
   "DEC-7949",
   "DEC-8084",
   "DEC-8152",
   "DEC-8153"
  ],
  "period": [
   "MK-CF-M-001: a month",
   "MK-CF-M-002: a month",
   "MK-CF-M-003: a month",
   "MK-CF-M-004: no period on the figure — one row",
   "MK-CF-M-013: no period on the figure",
   "MK-CF-M-014: no period on the figure — one expense",
   "MK-CF-M-015: no period on the figure — one category",
   "MK-CF-M-020: no period on the figure",
   "MK-CF-M-021: a month — one goal",
   "MK-CF-M-056: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-001: No budget set — on This month the row reads \"— not set\", and under the rows a sentence says there is no planned surplus until a budget is set (\"… we won’t guess one.\") with the door \"Set your budget\"; on Expenses the band reads — with \"You haven’t set your budget yet. …\" and the same door. Income not entered — the month is not drawn: its two set-up steps stand in its place.",
   "MK-CF-M-002: No planned surplus is shown, and the band reads —: when no budget is set (the sentence under the rows says so and offers \"Set your budget\"), or when a debt’s payment was never entered (\"Car loan’s payment is not entered, so there is no planned surplus — we won’t guess one.\", 2026-10-23). Income not entered — the month is not drawn: its two set-up steps stand in its place.",
   "MK-CF-M-003: Nothing logged and no card linked — it says so and offers the door.",
   "MK-CF-M-004: A row whose amount is not known says so where the amount would be: \"— not set\" for a budget not set, \"payment not entered\" for a debt whose payment was never entered (2026-10-23). A debt not paid yet shows $0 with its due day (\"not paid yet\" when no due day is recorded). Nothing logged: \"Expenses entered by hand\" stays at a real $0, with \"Nothing logged yet, and no card connected. …\" under the rows. On Expenses every section keeps its heading when empty, at a real $0.",
   "MK-CF-M-013: Nothing logged in the month — a real $0 on the ACTUAL EXPENSES band, with \"Nothing logged this month. Connect a card and purchases arrive on their own, or add a receipt by hand.\" and the door \"Log an expense\".",
   "MK-CF-M-014: Nothing logged in the month — the list is not drawn; \"Nothing logged this month. …\" and the door \"Log an expense\" stand in its place.",
   "MK-CF-M-015: No budget set — the categories are not drawn: the band reads —, with \"You haven’t set your budget yet. This is what every “of $X planned” on any screen is measured against.\" and the door \"Set your budget\".",
   "MK-CF-M-020: No budget set, or a debt’s payment never entered (2026-10-23) — no line: nothing is called free until there is a plan to be free of.",
   "MK-CF-M-021: No goal with a monthly amount — no line.",
   "MK-CF-M-056: No budget set — nothing to be left of."
  ]
 },
 {
  "id": "MK-CF-O-003",
  "name": "thisMonth",
  "kind": "orchestrator",
  "what_it_is_for": "How is the month going: what the plan says it holds and what has actually happened so far, each row by row and each ending in its surplus?",
  "formula_in_words": "The planned block (plannedMonthFlow) and the actual block (actualMonthFlow), side by side.",
  "handed": "export function thisMonth(m: MonthInput): ThisMonth",
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-047",
    "words_on_screen": "Planned inflow",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the plan says comes in during a month after this one — printed on that month’s plan card, and as the Income tab’s expected take-home for the month shown.",
    "when_it_refuses": "Shows $0 until income is entered, with the door to enter it.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-048",
    "words_on_screen": "Planned outflow (expenses + debt)",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the plan says goes out during a month after this one — printed on that month’s plan card: the budget, the debt payments that fall in that month, and any big bill that falls in it.",
    "when_it_refuses": "Shows $0 until expenses or debts are entered.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-049",
    "words_on_screen": "= Planned surplus",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the plan leaves over in a month after this one — printed on that month’s plan card.",
    "when_it_refuses": "Shows $0 until both sides are entered.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-050",
    "words_on_screen": "each planned line",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Each thing the plan says comes in or goes out this month, named, so the two totals can be checked by hand.",
    "when_it_refuses": "The list is replaced by the door to enter income or expenses when nothing is entered.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-051",
    "words_on_screen": "Inflow",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What has come in this month on the actual side: the month’s take-home, as the approved drawing draws it — before any paycheck is recorded as received.",
    "when_it_refuses": "Income not entered: $0, and under it the one line \"Nothing entered yet. Add your income ›\" on Home (Q48); Cash flow draws no month until income is entered — its two set-up steps stand in its place.",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-052",
    "words_on_screen": "Outflow (expenses + debt)",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What has actually gone out so far this month: the expenses logged and the debt payments made.",
    "when_it_refuses": "A real $0 when nothing is logged and no debt is paid. Cash flow draws no month until income is entered (its two set-up steps); a past month with no record reads \"Nothing recorded for this month — it predates your tracking.\"",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-053",
    "words_on_screen": "= Surplus",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What is actually left this month so far — not what the plan said, what has happened.",
    "when_it_refuses": "Income not entered: no surplus — Cash flow shows its two set-up steps, and Home's box reads — beside Left, with \"Nothing entered yet. Add your income ›\" under Income and no pace word. A past month with no record: $0 and \"Nothing recorded for this month — it predates your tracking.\"",
    "shown_on": [
     "/cashflow",
     "/home"
    ]
   },
   {
    "id": "MK-CF-M-054",
    "words_on_screen": "each received line",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Each line of the actual side of the month, named — the inflow, each debt paid or still due, the expenses — so the actual surplus can be checked by hand.",
    "when_it_refuses": "A real $0 on a line with nothing in it — a debt not paid yet reads $0 with its due day, and \"Expenses entered by hand\" stays at $0; Cash flow draws no month until income is entered.",
    "shown_on": [
     "/cashflow"
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
    "said_by": "owner",
    "decision": "DEC-0512",
    "date": "2026-06-30",
    "words": "Are the month bars cash flows -- inflow / outflow?"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-047",
    "words": "A month is a real calendar month, never a twelfth of a year (founder, 2026-08-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-048",
    "words": "A debt payment is counted as an outflow, not as saving (founder, 2026-06-21)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-048",
    "words": "A bill that falls once a year is shown in its own month, never spread."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-048",
    "words": "A debt counts in a month only if a payment falls in that month — the rule This month’s planned surplus (MK-CF-M-002) reads too (2026-10-24)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-051",
    "words": "THE APPROVED DRAWING WINS (2026-10-23, under his rules DEC-3523 tenet 6 and \"the newest approval wins\", 2026-09-27): cash-flow_v01, approved 2026-09-28 (DEC-0440), draws the month’s take-home as Actual inflow with nothing recorded. The words this row carried — \"nothing is assumed to have arrived; a source counts only once it is recorded\" (2026-08-28) — are older and stand down. To reverse: count only recorded payments here, and Cash flow and Home move together."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-051",
    "words": "Home prints this same figure, from the same rows (2026-10-23): it added any income recorded as received on top of the take-home, which Cash flow does not."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-052",
    "words": "A debt payment counts once it is made — logged as a debt payment — and an unpaid debt shows $0 with its due day, never left off (the approved drawing, DEC-0440)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-052",
    "words": "Home prints this same figure, from the same rows (2026-10-23): it used to count the expenses only, without the debt paid."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-053",
    "words": "ONE FIGURE ON TWO SCREENS (2026-10-23, DEC-0345 and tenet 4): Home's \"Left\" is the Cash flow tab's \"= Actual surplus so far\", read from the same rows — Home showed $4,202 against Cash flow's $3,952 for one month because it left out the $250 car loan paid."
   }
  ],
  "approved_drawing": {
   "drawing": "Cash flow v01, frame A (approved 2026-09-28)",
   "household": "Take-home $5,000. Mortgage $2,000 and car loan $250 (the same every month). Budget for expenses $2,000. HELOC payment $200 and credit card payment $200. So far this month: the mortgage is paid, the car loan is not (due the 28th), $500 of expenses entered by hand, $1,200 imported from a card, and the HELOC and card payments are made.",
   "drawn": {
    "Planned surplus": 350,
    "Actual surplus so far": 900
   }
  },
  "decisions_that_govern_it": [
   "DEC-0002",
   "DEC-0199",
   "DEC-0260",
   "DEC-0292",
   "DEC-0333",
   "DEC-0512",
   "DEC-7606",
   "DEC-7607",
   "DEC-7609",
   "DEC-7937",
   "DEC-7938",
   "DEC-7940",
   "DEC-7946",
   "DEC-7949",
   "DEC-8084",
   "DEC-8085",
   "DEC-8152",
   "DEC-8153"
  ],
  "period": [
   "MK-CF-M-047: a month — one figure per household per month",
   "MK-CF-M-048: a month — one figure per household per month",
   "MK-CF-M-049: a month — one figure per household per month",
   "MK-CF-M-050: a month — one figure per line per month",
   "MK-CF-M-051: a month — one figure per household per month",
   "MK-CF-M-052: a month — one figure per household per month",
   "MK-CF-M-053: a month — one figure per household per month",
   "MK-CF-M-054: a month — one figure per line"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-047: Shows $0 until income is entered, with the door to enter it.",
   "MK-CF-M-048: Shows $0 until expenses or debts are entered.",
   "MK-CF-M-049: Shows $0 until both sides are entered.",
   "MK-CF-M-050: The list is replaced by the door to enter income or expenses when nothing is entered.",
   "MK-CF-M-051: Income not entered: $0, and under it the one line \"Nothing entered yet. Add your income ›\" on Home (Q48); Cash flow draws no month until income is entered — its two set-up steps stand in its place.",
   "MK-CF-M-052: A real $0 when nothing is logged and no debt is paid. Cash flow draws no month until income is entered (its two set-up steps); a past month with no record reads \"Nothing recorded for this month — it predates your tracking.\"",
   "MK-CF-M-053: Income not entered: no surplus — Cash flow shows its two set-up steps, and Home's box reads — beside Left, with \"Nothing entered yet. Add your income ›\" under Income and no pace word. A past month with no record: $0 and \"Nothing recorded for this month — it predates your tracking.\"",
   "MK-CF-M-054: A real $0 on a line with nothing in it — a debt not paid yet reads $0 with its due day, and \"Expenses entered by hand\" stays at $0; Cash flow draws no month until income is entered."
  ]
 },
 {
  "id": "MK-CF-F-227",
  "name": "thisMonthInputs",
  "kind": "function",
  "what_it_is_for": "This month's inputs, assembled once, for the month's orchestrator: the take-home and its sources, the debts, the planned bills, the budget by group, the expenses logged and what the Plan promises to goals.",
  "formula_in_words": "This month's inputs, assembled once for the month's orchestrator (theMonth). The month = the one handed in, else today's on the person's own calendar. Take-home = the dated grid's first cell's money in (0 when missing), with the sources inside it; every debt; planned expenses = that cell's bill items that are bills, added up (each 0 when missing); whether a budget is set = the plan holds any expenses (plannedMonthlySpend above 0), said only when the person's answers are handed in; the planned expenses by group for that month (spendByMonthByBucket), each group in its words (Bills & fixed, Once in a while, Everyday expenses), a group of 0 left out; every expense logged; and what the Plan promises to goals.",
  "handed": "export function thisMonthInputs(s: { grid: DatedGrid; bva: any; profile?: any; liabilities: any[]; expenses: any[]; commitments?: any[]; ym?: string }): MonthInput & ExpensesInput",
  "decisions_that_govern_it": [
   "DEC-7607",
   "DEC-7611"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-226",
  "name": "datedGridOf",
  "kind": "function",
  "what_it_is_for": "The dated grid every Cash flow surface reads, built in one place, so the month Home shows, the month the Cash flow tab shows and the Bill calendar's months come from the same cells.",
  "formula_in_words": "The dated grid every Cash flow surface reads: the dated grid builder's, for the budget and the debts handed in, from the starting balance when one is handed in, with one bill more when an adopted Roth conversion's tax is above 0 — that tax, as a one-off bill in April of next year, labelled as from the Plan. With a starting balance handed in (the Bill calendar's cash on hand), each month's running balance starts from it; without one, from $0.",
  "handed": "export function datedGridOf(op: any, liabilities: any[], rothConversionTax: unknown, startBalance?: number): DatedGrid",
  "decisions_that_govern_it": [
   "DEC-7938"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-225",
  "name": "useCashflowModel",
  "kind": "function",
  "what_it_is_for": "The Cash flow model every paycheck surface reads — the paycheck year and the dated grid, from the store as it stands, with the same simulation convention as the Retirement cockpit.",
  "formula_in_words": "The Cash flow model, from the store as it stands. The budget is the budget as counted (theBudgetCounted: a mortgage in Debts stands the budget's rent or mortgage line down), when the person's answers are entered; the lens, working or retired, is read from it and from the one the person picked. The paycheck year (buildPaycheckYear) is built from that budget, the accounts and the debts, with the Retirement cockpit's simulation: the person's age (68 when not known), to the age the plan runs to (else the age + 5, and at least 92); a mean return of the return assumed (0.055 when not set); a spread of 1.7 × that mean, kept between 0.05 and 0.2; inflation as set (0.025 when not set); a fixed seed of 42 and 1000 paths. The dated grid is datedGridOf for the same budget, the debts and an adopted Roth conversion's tax.",
  "handed": "export function useCashflowModel(): CashflowModel",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-156",
  "name": "plannedMonthFlow",
  "kind": "function",
  "what_it_is_for": "THE PLAN for this month: the take-home, less each debt, less planned expenses.",
  "formula_in_words": "Rows, in this order. Inflow = the monthly take-home handed in. A debt has a row only in a month a payment on it falls in: from the month of its first payment to the month it is paid off (a date not given sets no bound), and for a debt due in full only the month it is due, while a balance is owed. One row for each instalment debt with such a payment above zero: minus that payment. Expenses = minus this month's planned expenses when a budget is set — set when handed in as set (the plan holds any expenses, even if none falls in this month, which then reads 0), otherwise when this month plans more than zero — marked your budget; when no budget is set, 0, marked not set. Then one row for each radar debt (a card, a line of credit, a debt due in full) with such a payment above zero: minus that payment — for a debt due in full its whole balance, named \"<debt> — due in full\". A debt whose payment was never entered (paymentNotEntered), in a month a payment on it falls in, keeps its place as a row at 0, marked payment not entered. Inflow total = the inflow row; outflow = minus the other rows, added up; surplus = every row added up. When any debt's payment was never entered, the surplus and the outflow are not given (no number) and the refusal names the debt: \"<debt>'s payment is not entered, so there is no planned surplus — we won't guess one.\"",
  "handed": "export function plannedMonthFlow(m: MonthInput): MonthBlock",
  "inputs_it_reads": [
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "decisions_that_govern_it": [
   "DEC-7611",
   "DEC-8153"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-005",
  "name": "actualMonthFlow",
  "kind": "function",
  "what_it_is_for": "WHAT HAS ACTUALLY HAPPENED: what landed, less only the debts confirmed paid, less what was really spent.",
  "formula_in_words": "Rows, in this order. Actual inflow = the monthly take-home handed in. One row for each debt with a payment logged against it this month, or with a payment that falls in this month (from the month of its first payment to the month it is paid off; for a debt due in full, its whole balance in the month it is due, named \"<debt> — due in full\") and is not zero: minus what was logged as paid against it this month (0 when nothing was), marked paid or not. Other debt payments = debt payments logged this month that match no debt on record, when above zero. Expenses entered by hand = minus the month's logged expenses that were not imported, debt payments left out. Expenses imported from your card = minus the imported ones, shown only when there are any. Debts on the big-ticket radar (cards, lines of credit, debts due in full) are moved to the end. Surplus = every row added up. Inflow total = the inflow row. Outflow = monthOutflow of the month's expenses so far (minus the expense rows, added up) and its debt paid so far (minus the debt rows, added up) — their sum — so the surplus is the inflow total less the outflow.",
  "handed": "export function actualMonthFlow(m: MonthInput): MonthBlock",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump",
   "MK-XS-I-052 the day of the month a debt payment is due",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "decisions_that_govern_it": [
   "DEC-8085",
   "DEC-8153"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-220",
  "name": "pastMonthFlow",
  "kind": "function",
  "what_it_is_for": "A PAST MONTH — what came in, what went out and the surplus — as the Cash flow tab shows it (2026-10-23).",
  "formula_in_words": "A past month as the Cash flow tab shows it. The income recorded = the amounts of the income records dated in that month, added up (an amount that is not a number counts 0); the expenses logged = the amounts of the expenses logged in that month (inMonth), added up. What came in = the take-home the month's frozen record states, when there is a frozen record and it states one, else the income recorded. What went out = monthOutflow: with a frozen record, its expenses + its debt paid (each 0 when missing), else the expenses logged. Surplus = what came in − what went out.",
  "handed": "export function pastMonthFlow(\n  snap: { income_net?: number | null; spending?: number | null; debt_paid?: number | null } | null | undefined,\n  incomes: { amount?: unknown; date?: unknown }[] | null | undefined, expenses: LoggedExpense[] | null | undefined, ym: string,\n): { inflow: number; outflow: number; surplus: number }",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [
   "DEC-7609"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-231",
  "name": "addedAfterRecord",
  "kind": "function",
  "what_it_is_for": "WHAT A PAST MONTH'S RECORD LEAVES OUT (2026-10-24, the lead's ruling on the Cash flow journey E2E-76): the expenses dated in that month but entered after its record was last saved — a statement imported later, say.",
  "formula_in_words": "What a past month's record leaves out: the expenses logged in that month (inMonth) that were entered after the record was last saved; none when the record has no time it was saved. Their ids, and their amounts added up.",
  "handed": "export function addedAfterRecord(\n  snap: { captured_at?: string | null } | null | undefined,\n  expenses: (LoggedExpense & { id?: string; createdAt?: string })[] | null | undefined, ym: string,\n): { ids: Set<string>; total: number }",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [
   "DEC-7949"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-157",
  "name": "debtPaymentsByDebt",
  "kind": "function",
  "what_it_is_for": "WHICH DEBTS HAVE ACTUALLY BEEN PAID this month, and how much each.",
  "formula_in_words": "For each expense logged this month in the category Debt payment whose payee matches a debt's name (capitals and outer spaces ignored): its amount is added to that debt. Payments that match no debt are left out.",
  "handed": "export function debtPaymentsByDebt(m: MonthInput): Map<string, number>",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-042 how a stream is paid — monthly, yearly or one lump"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-155",
  "name": "cash",
  "kind": "function",
  "what_it_is_for": "Negating zero in JavaScript gives NEGATIVE zero, which formats as \"−$0\" — and a person looking at \"−$0\" beside an unpaid car loan reasonably wonders what it means.",
  "formula_in_words": "The number unchanged, except that negative zero becomes zero.",
  "handed": "export const cash = (n: number): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-192",
  "name": "inflowLabel",
  "kind": "function",
  "what_it_is_for": "The inflow line names what is inside it — founder's cluster #5 ruling (2026-09-10): the words in the brackets are the sources, \"Inflow (income (take-home) + rent)\".",
  "formula_in_words": "The prefix, then the source words in brackets joined by a plus sign — each word once, in the order given. With no sources: income (take-home).",
  "handed": "export function inflowLabel(prefix: 'Inflow' | 'Actual inflow' | 'Planned inflow', sources?: string[]): string",
  "decisions_that_govern_it": [
   "DEC-0271"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-193",
  "name": "inflowSourceWord",
  "kind": "function",
  "what_it_is_for": "One source of money arriving, as the bracket says it: pay is \"income (take-home)\", a rental is \"rent\", Social Security keeps its name, anything else is its own name in lower case.",
  "formula_in_words": "The source lower-cased and trimmed. Starting with salary, base salary or paycheck → income (take-home). Starting with rental, or exactly rent → rent. Starting with social security → Social Security. Anything else → itself, with a trailing bracketed part removed.",
  "handed": "export function inflowSourceWord(source: string): string",
  "decisions_that_govern_it": [
   "DEC-0271"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-194",
  "name": "monthOutflow",
  "kind": "function",
  "what_it_is_for": "THE MONTH'S OUTFLOW — expenses plus the debt actually paid — from one place.",
  "formula_in_words": "With a stored record for the month: its expenses + its debt paid. With none: what has been logged so far.",
  "handed": "export function monthOutflow(snap: { spending?: number | null; debt_paid?: number | null } | null | undefined, loggedSoFar: number): number",
  "decisions_that_govern_it": [
   "DEC-0333",
   "DEC-8085",
   "DEC-8152"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-148",
  "name": "inMonth",
  "kind": "function",
  "what_it_is_for": "Does this logged expense fall in the month `ym` (\"2026-08\")?",
  "formula_in_words": "True when the expense's date begins with the year-month asked for.",
  "handed": "export const inMonth = (e: LoggedExpense, ym: string): boolean",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

31 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

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
  "id": "MK-CF-F-105",
  "name": "guaranteedRows",
  "what_it_is_for": "The dated guaranteed-income rows for the next 12 months (the F2 grid seam).",
  "formula_in_words": "Nothing when the person's chosen income sources are listed without retirement income. Otherwise, over the twelve months starting with the current one, for Social Security, pension, annuity and other retirement income with an amount above zero: monthly → the amount in every month; quarterly → the amount in four months, three apart, starting at its named month (the current month when none); yearly → the amount once, in its named month (the current month when none). The amount is the amount of EACH PAYMENT."
 },
 {
  "id": "MK-CF-F-106",
  "name": "solveSafeDraw",
  "what_it_is_for": "Largest level monthly draw that keeps chance-of-success ≥ the floor.",
  "formula_in_words": "0 when the savings are zero or less. Otherwise the largest monthly draw from the savings, on top of the guaranteed income, at which the retirement simulation (1,000 futures, fixed seed 42) still lasts to the horizon in at least 80 of 100. It is tried first at twice (savings ÷ years ÷ 12), $100 at least; then narrowed by halving 12 times; then rounded DOWN to the nearest $5."
 },
 {
  "id": "MK-CF-F-107",
  "name": "buildPaycheckYear",
  "what_it_is_for": "Build the month-by-month paycheck.",
  "formula_in_words": "Guaranteed rows from guaranteedRows; savings = the figure given, otherwise the accounts set aside for retirement (retirementEarmarkedValue, handed the profile's rent entries, DEC-4913). Safe draw = solveSafeDraw, with average guaranteed income in a month = the rows' total ÷ 12. Draw flag: high when safe draw × 12 ÷ savings is above 4.5%; ok otherwise; none with no savings or no draw. For each of twelve months from the current one: guaranteed total = that month's rows; bills = that month's big bills, everyday expenses left out; safe to spend = guaranteed total + safe draw − bills. This year = the twelve added."
 },
 {
  "id": "MK-CF-F-120",
  "name": "pctBaseMonthly",
  "what_it_is_for": "A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan screen uses (modules.tsx SpendingEditor → takeHomeMonthly).",
  "formula_in_words": "The twelve months of take-home (incomeMonthlyGrid, take-home) added ÷ 12."
 },
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
  "id": "MK-CF-F-151",
  "name": "actualSpending",
  "what_it_is_for": "What was actually spent in a month, debt payments left out: every expense newest first, the five shown, how many more there are and the totals, for all of them or only those entered by hand or only those imported.",
  "formula_in_words": "The month's logged expenses, leaving out the category Debt payment, newest first — all of them, or only those entered by hand, or only those imported. Shown = the first 5. Hidden = how many more. Total = all of them added. Hidden total = total − the 5 shown."
 },
 {
  "id": "MK-CF-F-152",
  "name": "isRadarItem",
  "what_it_is_for": "Whether a debt belongs on the big-ticket radar: yes for a card or a credit line and for a debt due in one lump, no for a loan paid the same every month.",
  "formula_in_words": "An instalment loan: not a radar item. A debt due in full: a lump-sum item. Any other debt (a card, a line of credit): a revolving item."
 },
 {
  "id": "MK-CF-F-153",
  "name": "radar",
  "what_it_is_for": "The big-ticket radar for a month: each card, credit-line or lump-sum debt payment and each large dated bill, with its amount and whether it is already counted as an expense.",
  "formula_in_words": "For each debt that is a radar item (isRadarItem): amount = what was logged as paid against it this month when that is above zero, otherwise what falls due on it this month — its required payment from the month of its first payment to the month it is paid off, and for a debt due in full its whole balance in the month it is due; dropped when the amount is zero or less. It counts as an expense unless its purchases are already imported from a linked card. Then every big bill of $500 or more, with its due date, each counted as an expense. Debts first, bills after."
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
 },
 {
  "id": "MK-CF-O-002",
  "name": "expenses",
  "what_it_is_for": "What is being spent this month: the debts that repeat every month, the planned expenses by category, what was actually spent by where it came from, and the big-ticket radar?",
  "formula_in_words": "Recurring debt rows (recurringDebtPayments) and their total. Planned rows by category, as handed in, and their total. Actual expenses for the month — all, entered by hand, and imported (actualSpending). The debt payments that count as expenses (debtPaymentsCountedAsExpenses). Actual total = the actual expenses total + those debt payments. And the radar (radar)."
 },
 {
  "id": "MK-CF-O-020",
  "name": "theBudgetCounted",
  "what_it_is_for": "Which of my planned expenses are counted, now that my debts are taken from Debts?",
  "formula_in_words": "Owner rule, 2026-10-04: \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" The home = the property read as HOME (propertyUses, handed the profile's rent entries — none recorded is read as none, not as unknown). Its mortgage = the mortgage matched to that property (mortgagesByProperty). When the home has a mortgage in Debts AND the budget's Rent / Mortgage line holds an amount: that line is counted as nothing, the one typed monthly total (when there is one) is lowered by the same amount, never below zero, and the sentence says the line is not counted and names the mortgage. Otherwise — a renter, a home with no mortgage, a mortgage on another property, or no amount on the line — the budget is counted exactly as typed. It also names the home's mortgage when there is one. What the person typed is never changed; this is the budget as it is counted."
 },
 {
  "id": "MK-NW-F-030",
  "name": "earmarkDefault",
  "what_it_is_for": "Default % of an account that's earmarked for retirement (rest funds other goals).",
  "formula_in_words": "The share of an account counted towards retirement by default (owner, 2026-08-11, DEC-0100: all assets minus the home lived in and the car driven): 0% for a 529, for the car driven (primaryCarIdOf), and for the home lived in. Told the household's home (its identifier, from primaryHomeIdOf), only that property is 0%; told the household has no home (null), no property is; told nothing, a property stated as the home lived in, or with no use stated, is 0%. 100% for everything else — a rental, a second home, a second car, valuables included."
 },
 {
  "id": "MK-NW-F-031",
  "name": "primaryCarIdOf",
  "what_it_is_for": "The vehicle treated as \"the car you drive\" — the most valuable one, so a second car stays a real asset.",
  "formula_in_words": "Among the accounts whose kind is vehicle, and no other: the vehicles whose value is entered are the candidates — a vehicle with no value is not ranked as $0 (DEC-4036j, 2026-10-10); when none has a value, every vehicle is. Of the candidates, the one with the largest balance; a tie goes to the lower id read as text (the one made first). Nothing when there is no vehicle. Valuables and other personal property are never the car."
 },
 {
  "id": "MK-NW-F-032",
  "name": "earmarkedAmount",
  "what_it_is_for": "The retirement-earmarked $ for one account (uses the saved % or the smart default).",
  "formula_in_words": "Balance × the share earmarked for retirement. The share is the one stated on the account, held between 0% and 100%, or the default (earmarkDefault, told which car is driven and which property is lived in, or that there is none) when none is stated."
 },
 {
  "id": "MK-NW-F-033",
  "name": "retirementEarmarkedValue",
  "what_it_is_for": "Total nest egg = sum of each account's retirement-earmarked portion.",
  "formula_in_words": "Every account's earmarked amount (earmarkedAmount) added up, with the car driven found by primaryCarIdOf and the home lived in by primaryHomeIdOf, handed the Income screen's rent entries when the caller has them (DEC-4913, 2026-10-13). Example: A $400,000 with no use stated, B $300,000 marked the home with rent entered for B → $700,000 (B a rental, A a second home, no home). Not handed the rent entries, the stored home mark decides: $400,000."
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
  "id": "MK-NW-F-110",
  "name": "primaryHomeIdOf",
  "what_it_is_for": "Which property is the home lived in: the one marked so; with none marked and no use stated on any, the one entered first; otherwise none.",
  "formula_in_words": "The property propertyUseMap reads as the home lived in, handed the rent entries when the caller has them. Nothing (null) when the household has no home — which is not the same as not being asked. Example (owner, 2026-10-13): B marked the home with a rent entry naming B, A with no use stated → null (B is a rental, A a second home)."
 },
 {
  "id": "MK-NW-F-117",
  "name": "propertyUseMap",
  "what_it_is_for": "What each property is for — the home lived in, a rental, or a second home — by his rule DEC-1926: a rental only when a rent entry on the Income screen names it; the one marked as the home is the home; with none marked and no use stated on any, the one entered first; every other property is a second home.",
  "formula_in_words": "For each real-estate account: rental when a live rent entry names it, or — only when no rent entries were handed in at all (unknown, not none) — when it is stored as a rental. Of the rest: the one marked as the home lived in is home. With none of the rest marked, the one entered first (last in the list) that is not stored as a rental is home — but ONLY when no property at all carries a stated use other than rental (owner, 2026-10-13: a 'primary' mark on a property a rent entry made a rental still counts as a stated use, so it stops this; a stored 'rental' word does not). A property stored as a rental is never made the home this way. Every other property is a second home. A rent entry that names no property makes no property a rental (owner rule DEC-4059d, 2026-10-10 — it used to make the one other property a rental when exactly one remained)."
 },
 {
  "id": "MK-NW-F-147",
  "name": "paymentNotEntered",
  "what_it_is_for": "A DEBT WHOSE MONTHLY PAYMENT WAS NEVER ENTERED (2026-10-21, DEC-3523 tenet 3: unknown is not zero): neither a minimum nor a payment is on record as a number.",
  "formula_in_words": "Whether a debt's monthly payment was never entered: neither its minimum payment nor its payment is on record as a number. A typed 0 is entered; a debt due in one lump has no monthly payment and is never named. The emergency fund (MK-NW-O-004) and the Net worth door (MK-NW-O-003) name such a debt beside their debt payments instead of counting it as $0 (owner decision DEC-3523, tenet 3: unknown is not zero)."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**Debt payments in a month** — in this part: MK-CF-F-157

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
  "id": "MK-CF-F-236",
  "name": "paymentInMonth",
  "what_it_is_for": "WHAT A DEBT ASKS FOR IN ONE CALENDAR MONTH: nothing in a month no payment falls in (paysInMonth); in one that does, the whole balance for a debt due in full, and its payment (requiredPayment) for any other.",
  "formula_in_words": "What a debt asks for in one calendar month: 0 in a month no payment of it falls in (paysInMonth); in a month one does, the whole balance for a debt due in full, and its required payment for any other."
 }
]
```

**What is left in a month** — in this part: MK-CF-F-156, MK-CF-F-005, MK-CF-F-220

```json
[
 {
  "id": "MK-CF-F-011",
  "name": "savingsByMonth",
  "what_it_is_for": "Discretionary amount free to save each month = take-home that month (after tax & 401k) minus the expenses due that month.",
  "formula_in_words": "For each calendar month: the take-home that month (incomeMonthlyGrid, take-home) − the planned expenses that month (spendByMonth)."
 },
 {
  "id": "MK-CF-F-012",
  "name": "annualCashflow",
  "what_it_is_for": "ONE annual cash-flow roll-up, derived entirely from the per-month income grid + spendByMonth — the SAME bases the savings-plan and budget already use.",
  "formula_in_words": "Gross for the year, after-tax for the year and take-home for the year = the twelve months of incomeMonthlyGrid in each of its three modes, added. Expenses for the year = spendByMonth added. Tax = gross − after-tax. 401(k) = after-tax − take-home. Saved = take-home − expenses."
 },
 {
  "id": "MK-CF-F-017",
  "name": "publishSurplus",
  "what_it_is_for": "Publish the authoritative surplus for Goals/Retirement to consume.",
  "formula_in_words": "Announces the projected-to-save figure to the rest of the app, unchanged."
 }
]
```

## The figures these cards feed — as the screen register holds them

The author's record of each figure, with a worked example the app's own door ran (convention 10). Judge the cards; the figures themselves are checked against the tenets in the screen parts.

```json
[
 {
  "id": "MK-CF-M-001",
  "label": "Expenses",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What you plan to spend in this month, as one line on the flow — and the total of the Expenses tab's planned rows.",
  "formula": "this month's planned expenses = bills & fixed + once-in-a-while bills that fall in this month + everyday expenses (spendByMonthByBucket, the budget as counted) — a once-a-year bill counts in its own month, never a twelfth; a once-in-a-while bill with no month set is a twelfth a month",
  "inputs": [
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": [
   "One line on This month, and the Expenses tab is its detail — not a second answer to the same question (his correction, 2026-09-28).",
   "A bill that lands once a year is planned in the month it lands, never spread (his DEC-0002 and DEC-0447; MK-CF-M-048). A budget whose only line falls in another month reads $0 this month, not \"not set\" (2026-10-23)."
  ],
  "refusal": "No budget set — on This month the row reads \"— not set\", and under the rows a sentence says there is no planned surplus until a budget is set (\"… we won’t guess one.\") with the door \"Set your budget\"; on Expenses the band reads — with \"You haven’t set your budget yet. …\" and the same door. Income not entered — the month is not drawn: its two set-up steps stand in its place.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "−$3,400/month"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-09-27",
  "printed_in": [
   "BudgetScreen",
   "CashFlowScreen › ExpensesTab",
   "CashFlowScreen › OtherMonthCard"
  ],
  "decisions_that_govern_it": [
   "DEC-7611",
   "DEC-7939",
   "DEC-8084"
  ]
 },
 {
  "id": "MK-CF-M-002",
  "label": "= Planned surplus",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "The surplus in the month if everything goes to plan.",
  "formula": "the inflow, less every debt payment due, less the budget, less each big-ticket item",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": [
   "EVERY ROW SHOWN IS A ROW DEDUCTED (his rule under the approved design): nothing appears on This month without being in the sum."
  ],
  "refusal": "No planned surplus is shown, and the band reads —: when no budget is set (the sentence under the rows says so and offers \"Set your budget\"), or when a debt’s payment was never entered (\"Car loan’s payment is not entered, so there is no planned surplus — we won’t guess one.\", 2026-10-23). Income not entered — the month is not drawn: its two set-up steps stand in its place.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$1,150/month"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-09-27",
  "printed_in": [
   "BudgetScreen",
   "CashFlowScreen › OtherMonthCard",
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-0260",
   "DEC-0292",
   "DEC-7682",
   "DEC-7937",
   "DEC-7939",
   "DEC-8084",
   "DEC-8152",
   "DEC-8153"
  ]
 },
 {
  "id": "MK-CF-M-003",
  "label": "= Actual surplus so far",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What is actually left, on what has really happened so far this month.",
  "formula": "the inflow received, less each debt actually paid, less everything logged by hand and imported",
  "inputs": [
   "MK-NW-I-004 the activity records",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": [
   "An unpaid debt shows $0 with its due date — never silently dropped, or the surplus would flatter the month.",
   "A card payment is counted ONCE: connected card → the imported purchases are the expense and the payment is a radar note; not connected → the payment IS the expense."
  ],
  "refusal": "Nothing logged and no card linked — it says so and offers the door.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$3,952/month"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-09-27",
  "printed_in": [
   "BudgetScreen",
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-7937",
   "DEC-8084"
  ]
 },
 {
  "id": "MK-CF-M-004",
  "label": "each row of the month — what it is and what it costs",
  "unit": "money",
  "grain": "one row",
  "screens": [
   "/cashflow"
  ],
  "answers": "One line per thing in or out this month, so the surplus can be checked by reading down the column — and, on Expenses, each line of its lists.",
  "formula": "one row per line of the month, each at its own amount. This month, planned: the inflow, each debt's payment due, the month's planned expenses, each big-ticket item. This month, actual: the inflow, each debt's payment made so far ($0 with its due day when nothing was), other debt payments, the expenses entered by hand and imported. Expenses: each debt that repeats every month at its payment, the total of the repeating debts, and each list's total of what was logged",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts",
   "MK-CF-I-001 your logged expenses"
  ],
  "decisions": [
   "Drawn from the approved design (cash-flow_v01): the flow is SPELLED OUT, not summarised into three numbers."
  ],
  "refusal": "A row whose amount is not known says so where the amount would be: \"— not set\" for a budget not set, \"payment not entered\" for a debt whose payment was never entered (2026-10-23). A debt not paid yet shows $0 with its due day (\"not paid yet\" when no due day is recorded). Nothing logged: \"Expenses entered by hand\" stays at a real $0, with \"Nothing logged yet, and no card connected. …\" under the rows. On Expenses every section keeps its heading when empty, at a real $0.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "−$250"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-09-27",
  "printed_in": [
   "CashFlowScreen › ExpensesTab",
   "CashFlowScreen › MonthRow"
  ],
  "decisions_that_govern_it": [
   "DEC-0002",
   "DEC-0292",
   "DEC-0333",
   "DEC-7611",
   "DEC-7937",
   "DEC-8084"
  ]
 },
 {
  "id": "MK-CF-M-013",
  "label": "Actual expenses",
  "unit": "money",
  "screens": [
   "/cashflow"
  ],
  "answers": "What has actually gone out so far this month, from the expenses logged.",
  "formula": "every expense logged inside the month, added up — a debt payment logged as an expense is counted with the debts, not here",
  "inputs": [
   "MK-CF-I-001 your logged expenses"
  ],
  "refusal": "Nothing logged in the month — a real $0 on the ACTUAL EXPENSES band, with \"Nothing logged this month. Connect a card and purchases arrive on their own, or add a receipt by hand.\" and the door \"Log an expense\".",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$2,998"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen",
   "CashFlowScreen › ExpensesTab",
   "CashFlowScreen › RetiredMain"
  ],
  "decisions_that_govern_it": [
   "DEC-7949"
  ]
 },
 {
  "id": "MK-CF-M-014",
  "label": "each expense and its amount",
  "unit": "money-cents",
  "grain": "one expense",
  "screens": [
   "/cashflow"
  ],
  "answers": "One logged expense — where, when, how much.",
  "formula": "the amount as logged",
  "inputs": [
   "MK-CF-I-016 logged expense"
  ],
  "refusal": "Nothing logged in the month — the list is not drawn; \"Nothing logged this month. …\" and the door \"Log an expense\" stand in its place.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$186.00"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen",
   "CashFlowScreen › ExpensesTab"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-015",
  "label": "Planned expenses — each category",
  "unit": "money",
  "grain": "one category",
  "screens": [
   "/cashflow"
  ],
  "answers": "For each of the budget's groups — bills & fixed, once in a while, everyday expenses: what is planned for it in this month.",
  "formula": "planned = the group's planned expenses for this month (spendByMonthByBucket, the budget as counted): bills & fixed and everyday expenses every month, a once-in-a-while bill only in the months it falls; a group with nothing planned this month is not drawn; the rows add up to MK-CF-M-001",
  "inputs": [
   "MK-CF-I-012 planned expenses",
   "MK-CF-I-001 your logged expenses"
  ],
  "refusal": "No budget set — the categories are not drawn: the band reads —, with \"You haven’t set your budget yet. This is what every “of $X planned” on any screen is measured against.\" and the door \"Set your budget\".",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$2,300"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-10-02",
  "printed_in": [
   "BudgetScreen",
   "CashFlowScreen › ExpensesTab"
  ],
  "decisions_that_govern_it": [
   "DEC-0292",
   "DEC-7611"
  ]
 },
 {
  "id": "MK-CF-M-020",
  "label": "THIS MONTH — free to use",
  "unit": "money",
  "screens": [
   "/cashflow"
  ],
  "answers": "The planned surplus, less what the Plan has already promised to goals this month — what is genuinely free.",
  "formula": "= Planned surplus (MK-CF-M-002) − the goals’ commitments (MK-CF-M-021)",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-NW-I-002 your debts",
   "MK-CF-I-012 planned expenses",
   "MK-XS-I-027 goals (target, saved, date)"
  ],
  "decisions": [
   "A PROMISE TO A GOAL IS MONEY ALREADY SPOKEN FOR — it never reads as free."
  ],
  "refusal": "No budget set, or a debt’s payment never entered (2026-10-23) — no line: nothing is called free until there is a plan to be free of.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$850"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-021",
  "label": "<goal> · from your Plan",
  "unit": "money",
  "per": "month",
  "grain": "one goal",
  "screens": [
   "/cashflow"
  ],
  "answers": "What the Plan sends to one goal each month, shown on This month as a line already spoken for.",
  "formula": "the goal’s monthly amount, as the Plan set it",
  "inputs": [
   "MK-XS-I-027 goals (target, saved, date)"
  ],
  "refusal": "No goal with a monthly amount — no line.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$300/month"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-047",
  "label": "Planned inflow",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What the plan says comes in during a month after this one — printed on that month’s plan card, and as the Income tab’s expected take-home for the month shown.",
  "formula": "planned inflow = the dated grid’s inflow for that month: Σ of every income source that lands in that month, at its take-home amount (after tax and 401(k)); a source that lands once a year counts only in the month it lands",
  "inputs": [
   "MK-CF-M-037 take-home each month",
   "MK-CF-I-006 other income",
   "MK-CF-I-007 rental income",
   "MK-CF-I-008 retirement income"
  ],
  "decisions": [
   "A month is a real calendar month, never a twelfth of a year (founder, 2026-08-28)."
  ],
  "refusal": "Shows $0 until income is entered, with the door to enter it.",
  "note": "Printed by the plan card of a later month (“Planned inflow”) and by the Income tab (“expected take-home”, this month or the month picked), both from the dated grid’s cell for that month.",
  "worked": {
   "given": "On 15 Sep 2026, October’s plan card: $7,200/month take-home; a $3,400/month budget; a $2,400 mortgage and a $250 car loan.",
   "answer": "$7,200/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "CashFlowScreen › OtherMonthCard"
  ],
  "decisions_that_govern_it": [
   "DEC-7938",
   "DEC-7940",
   "DEC-8084",
   "DEC-8153"
  ]
 },
 {
  "id": "MK-CF-M-048",
  "label": "Planned outflow (expenses + debt)",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What the plan says goes out during a month after this one — printed on that month’s plan card: the budget, the debt payments that fall in that month, and any big bill that falls in it.",
  "formula": "planned outflow = the dated grid’s outflow for that month: the month’s planned expenses (a bill with its own month in that month only) + each debt payment that falls in that month (from its first payment to its payoff; a balance due in full once, in its month)",
  "inputs": [
   "MK-CF-I-012 planned expenses",
   "MK-CF-I-013 debt payment",
   "MK-CF-I-014 big bill"
  ],
  "decisions": [
   "A debt payment is counted as an outflow, not as saving (founder, 2026-06-21).",
   "A bill that falls once a year is shown in its own month, never spread.",
   "A debt counts in a month only if a payment falls in that month — the rule This month’s planned surplus (MK-CF-M-002) reads too (2026-10-24)."
  ],
  "refusal": "Shows $0 until expenses or debts are entered.",
  "note": "Printed by the plan card of a later month only, from the dated grid’s cell for that month.",
  "worked": {
   "given": "On 15 Sep 2026, October’s plan card: $7,200/month take-home; a $3,400/month budget; a $2,400 mortgage and a $250 car loan.",
   "answer": "$6,050/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [
   "CashFlowScreen › OtherMonthCard"
  ],
  "decisions_that_govern_it": [
   "DEC-0002",
   "DEC-0292",
   "DEC-7946",
   "DEC-8084",
   "DEC-8153"
  ]
 },
 {
  "id": "MK-CF-M-049",
  "label": "= Planned surplus",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What the plan leaves over in a month after this one — printed on that month’s plan card.",
  "formula": "planned surplus = planned inflow − planned outflow, as the card prints them (the dated grid’s cell for that month)",
  "inputs": [
   "MK-CF-M-047 planned inflow",
   "MK-CF-M-048 planned outflow"
  ],
  "refusal": "Shows $0 until both sides are entered.",
  "note": "Printed by the plan card of a later month only. This month’s planned surplus is MK-CF-M-002; the retired view’s “Spent $X of $Y surplus” line prints MK-CF-M-078 (until 2026-10-24 it was printed under this number).",
  "worked": {
   "given": "On 15 Sep 2026, October’s plan card: $7,200/month take-home; a $3,400/month budget; a $2,400 mortgage and a $250 car loan.",
   "answer": "$1,150/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [
   "CashFlowScreen › OtherMonthCard",
   "CashFlowScreen › RetiredMain"
  ],
  "decisions_that_govern_it": [
   "DEC-0512",
   "DEC-8084",
   "DEC-8153"
  ]
 },
 {
  "id": "MK-CF-M-050",
  "label": "each planned line",
  "unit": "money",
  "per": "month",
  "grain": "one figure per line per month",
  "screens": [
   "/cashflow"
  ],
  "answers": "Each thing the plan says comes in or goes out this month, named, so the two totals can be checked by hand.",
  "formula": "one line per source or commitment that falls in this month, at its amount for this month",
  "inputs": [
   "MK-CF-M-047 expected inflow",
   "MK-CF-M-048 planned outflow"
  ],
  "refusal": "The list is replaced by the door to enter income or expenses when nothing is entered.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "−$2,400/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-051",
  "label": "Inflow",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "What has come in this month on the actual side: the month’s take-home, as the approved drawing draws it — before any paycheck is recorded as received.",
  "formula": "inflow = the month’s take-home — this month’s cell of the dated grid: every source that lands in this month, after tax and 401(k); a payment recorded as received is listed under RECEIVED on the Income tab (MK-CF-M-012) and is not added to it",
  "inputs": [
   "MK-CF-M-037 take-home each month"
  ],
  "decisions": [
   "THE APPROVED DRAWING WINS (2026-10-23, under his rules DEC-3523 tenet 6 and \"the newest approval wins\", 2026-09-27): cash-flow_v01, approved 2026-09-28 (DEC-0440), draws the month’s take-home as Actual inflow with nothing recorded. The words this row carried — \"nothing is assumed to have arrived; a source counts only once it is recorded\" (2026-08-28) — are older and stand down. To reverse: count only recorded payments here, and Cash flow and Home move together.",
   "Home prints this same figure, from the same rows (2026-10-23): it added any income recorded as received on top of the take-home, which Cash flow does not."
  ],
  "refusal": "Income not entered: $0, and under it the one line \"Nothing entered yet. Add your income ›\" on Home (Q48); Cash flow draws no month until income is entered — its two set-up steps stand in its place.",
  "note": "The words beside it name what is inside it — \"Inflow (income (take-home) + rent)\" — his cluster 5 ruling of 2026-09-10.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "$7,200/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [
   "BillCalendarScreen",
   "BudgetScreen",
   "CashFlowScreen › OtherMonthCard",
   "HomeScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0199",
   "DEC-7607",
   "DEC-7937",
   "DEC-7938"
  ]
 },
 {
  "id": "MK-CF-M-052",
  "label": "Outflow (expenses + debt)",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "What has actually gone out so far this month: the expenses logged and the debt payments made.",
  "formula": "Outflow (expenses + debt) so far = MK-CF-F-194 monthOutflow of the expenses logged so far this month and the debt payments made so far; an unpaid debt shows $0 with its due day",
  "inputs": [
   "MK-CF-I-016 logged expense",
   "MK-CF-I-013 debt payment"
  ],
  "decisions": [
   "A debt payment counts once it is made — logged as a debt payment — and an unpaid debt shows $0 with its due day, never left off (the approved drawing, DEC-0440).",
   "Home prints this same figure, from the same rows (2026-10-23): it used to count the expenses only, without the debt paid."
  ],
  "refusal": "A real $0 when nothing is logged and no debt is paid. Cash flow draws no month until income is entered (its two set-up steps); a past month with no record reads \"Nothing recorded for this month — it predates your tracking.\"",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "−$3,248/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [
   "BillCalendarScreen",
   "CashFlowScreen › OtherMonthCard",
   "HomeScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0260",
   "DEC-0292",
   "DEC-0333",
   "DEC-7609",
   "DEC-7937",
   "DEC-7949",
   "DEC-8084",
   "DEC-8085",
   "DEC-8152"
  ]
 },
 {
  "id": "MK-CF-M-053",
  "label": "= Surplus",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow",
   "/home"
  ],
  "answers": "What is actually left this month so far — not what the plan said, what has happened.",
  "formula": "surplus so far = inflow so far − outflow so far",
  "inputs": [
   "MK-CF-M-051 inflow so far",
   "MK-CF-M-052 outflow so far"
  ],
  "decisions": [
   "ONE FIGURE ON TWO SCREENS (2026-10-23, DEC-0345 and tenet 4): Home's \"Left\" is the Cash flow tab's \"= Actual surplus so far\", read from the same rows — Home showed $4,202 against Cash flow's $3,952 for one month because it left out the $250 car loan paid."
  ],
  "refusal": "Income not entered: no surplus — Cash flow shows its two set-up steps, and Home's box reads — beside Left, with \"Nothing entered yet. Add your income ›\" under Income and no pace word. A past month with no record: $0 and \"Nothing recorded for this month — it predates your tracking.\"",
  "note": "The Cash flow screen used to subtract this itself (rule 5). It is the door’s figure now.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "$3,952/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [
   "CashFlowScreen › OtherMonthCard",
   "HomeScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0512",
   "DEC-7606",
   "DEC-7609",
   "DEC-7937",
   "DEC-7946",
   "DEC-8152"
  ]
 },
 {
  "id": "MK-CF-M-054",
  "label": "each received line",
  "unit": "money",
  "per": "month",
  "grain": "one figure per line",
  "screens": [
   "/cashflow"
  ],
  "answers": "Each line of the actual side of the month, named — the inflow, each debt paid or still due, the expenses — so the actual surplus can be checked by hand.",
  "formula": "one line per row of the actual block, at its amount so far: the inflow; each debt, minus what was paid against it this month ($0 with its due day when nothing was); other debt payments; the expenses entered by hand and imported",
  "inputs": [
   "MK-CF-M-037 take-home each month",
   "MK-CF-I-013 debt payment",
   "MK-CF-I-016 logged expense"
  ],
  "refusal": "A real $0 on a line with nothing in it — a debt not paid yet reads $0 with its due day, and \"Expenses entered by hand\" stays at $0; Cash flow draws no month until income is entered.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget. Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid.",
   "answer": "−$250/month"
  },
  "door": "MK-CF-O-003 thisMonth",
  "printed_in": [],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-056",
  "label": "left of your budget",
  "unit": "money",
  "screens": [
   "/cashflow"
  ],
  "answers": "What is left of this month’s budget after what has been spent so far.",
  "formula": "the budget (MK-CF-M-001) − spent so far (MK-CF-M-013); below zero it reads as over",
  "inputs": [
   "MK-CF-I-012 planned expenses",
   "MK-CF-I-001 your logged expenses"
  ],
  "refusal": "No budget set — nothing to be left of.",
  "worked": {
   "given": "September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget ($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, $186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.",
   "answer": "$402"
  },
  "door": "MK-CF-O-010 theMonth",
  "ruled": "2026-10-02",
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
  "id": "DEC-0199",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "for a brokerage, an IRA and a 401(k) — so a check for",
  "the_log_records": "What each account pays you is worked out once, per account, with the working shown line by line — so the coupons you received are no longer ADDED to the coupons you were expecting.",
  "governs": "MK-CF-M-051"
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
  "id": "DEC-0271",
  "decided": "2026-09-03",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "money arriving in a month → take-home; 'Base salary (take-home)', 'Income (take-home)'; cash flow always 'Inflow (income (take-home) + rent)' / Outflow",
  "the_log_records": "“money arriving in a month → take-home; ‘Base salary (take-home)’, ‘Income (take-home)’; cash flow always ‘Inflow (income (take-home) + rent)’.” One word for money arriving, and the inflow line names what is inside it.",
  "governs": "MK-CF-F-192 · MK-CF-F-193"
 },
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
  "id": "DEC-0333",
  "decided": "2026-09-12",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "agree; ensure compliance with the synonym ruling",
  "the_log_records": "“agree; ensure compliance with the synonym ruling.” Agreed, with the condition that the change also obeys the one-word-per-concept rule.",
  "governs": "MK-CF-M-052 · MK-CF-M-019 · MK-XS-M-007 · MK-CF-F-194"
 },
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
  "id": "DEC-0512",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Are the month bars cash flows -- inflow / outflow?",
  "the_log_records": "HIS QUESTION: “Are the month bars cash flows — inflow / outflow?”",
  "governs": "MK-CF-M-049 · MK-CF-M-053"
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
  "id": "DEC-7606",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his ruling DEC-3523 (tenet 3), made without asking him, as his order of 2026-09-30 says. A household with no income entered: Home's box read a red \"Over\" and Left $0; it now reads Income $0 · Nothing entered yet. Add your income › · Outflow (expenses + debt) $0 · Left —, with no pace word and no share spent, because the Cash flow tab draws no surplus then. With $500 logged and still no income, Left still reads —. To reverse: print $0 again. One word from him reverses it.",
  "governs": "MK-CF-M-053 (Home's Left) · src/screens/HomeScreen.tsx"
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
  "id": "DEC-7937",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0264 and DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. Frame A's household with a $6.50 coffee: the rows made $893 but the surplus read +$894, and Home's Left $894; both read +$893. The rows share the rounded total, each rounded down, the dollars still missing going to the rows with the most cents left over; a whole-dollar row never moves. It is the method the Performance walk already uses. The Bill calendar's rows do the same: each End is the balance rounded to the dollar, and In and Out share the change between two Ends — from $3,000, $5,415.83 in and $1,198.77 out read Sep +$5,416 · −$1,199 · $7,217. To reverse: round every row and every total on its own again. One word from him reverses it.",
  "governs": "MK-XS-F-195 monthShown, MK-XS-F-196 flowShown, MK-XS-F-194 partsShown, MK-XS-F-197 chainShown (MoneyKeel/functions/_figure-spec.ts) · MK-CF-M-002 · MK-CF-M-003 · MK-CF-M-004 · MK-CF-M-051 · MK-CF-M-052 · MK-CF-M-053 · src/screens/CashFlowScreen.tsx · src/screens/HomeScreen.tsx · src/screens/BillCalendarScreen.tsx"
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
  "id": "DEC-7939",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0002, DEC-0447, DEC-1923 and DEC-3523 (tenets 3 and 4), made without asking him, as his order of 2026-09-30 says. With nothing set the card read Expenses (plan) $0 and Planned surplus $2,350 beside This month's not set; it now reads — not set and no planned surplus. With a $1,200 bill in December, September's card reads without it (it read $100 a month of it), and a Rent / Mortgage line is not counted when the home's mortgage is in Debts. In the founder's fresh account: $1,200 set reads +$1,550, and Dining out $300 → $450 reads +$1,400, on the card, This month and Expenses alike. A screen reader names each limit box by its category (it heard No limit fifteen times). It amends DEC-7610, which kept the editor on the typical month. To reverse: give the card its own typical month again. One word from him reverses it.",
  "governs": "src/screens/BudgetScreen.tsx (the plan card) · MK-CF-O-010 theMonth · MK-CF-F-228 useThisMonthInputs · MK-CF-M-001 · MK-CF-M-002"
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
  "id": "DEC-7946",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0269 and DEC-3523 (tenets 1 and 3), made without asking him, as his order of 2026-09-30 says. September's band read SEPTEMBER 2026 — FINAL — WHAT ACTUALLY HAPPENED under a switcher already saying final; it reads \"SEPTEMBER 2026 — WHAT ACTUALLY HAPPENED\". November's card named the wrong bill, incl. Everyday expenses, and said Nothing entered yet with a budget entered; it reads \"Planned outflow (expenses + debt) $800\", names a dated bill only, and says nothing is entered only when the month plans $0. The words are those of the last drawing of that card, the archived this-month-and-spending v02. To reverse: give the band, the outflow line and the note their earlier words. One word from him reverses it.",
  "governs": "src/screens/CashFlowScreen.tsx (bandMonth, the month cards) · MK-CF-M-048 · MK-CF-M-053"
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
  "id": "DEC-8084",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0192 and DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. Each of the four numbers had two register keys. On 2026-10-02, when the hand-typed rows became declarations, each was handed to another figure: MK-CF-M-001 now Expenses, MK-CF-M-002 = Planned surplus (this month), MK-CF-M-003 = Actual surplus so far, MK-CF-M-004 each row of the month. The four original keys are retired, each with its reason and where its figure lives now: Expected in is MK-CF-M-047, Planned out is MK-CF-M-048, the grid month's = Planned surplus is MK-CF-M-049, and Out (spent + debt) is MK-CF-M-052. Renumbering back would touch about 17 code files, 7 test files and some 60 documents, approved drawings among them. The old anchors follow their figures: G12 (DEC-0333) and the 2026-08-27 worked example (DEC-0292) now name MK-CF-M-052 and MK-CF-M-048, and DEC-0260's $0 rule MK-CF-M-052. DEC-0002, his approval of the whole Cash flow surface, is kept as it is. MK-CF-M-002 and MK-CF-M-049 stay two figures: this month's planned surplus counts every debt's payment this month, the grid's later months count a debt from its first payment (a $250 car loan whose first payment is next month). His words are untouched. To reverse: restore moneykeel_metric_register.json, moneykeel_rulings.json and moneykeel_decisions_anchors.json from the scratchpad backup-1024b/. One word from him reverses it.",
  "governs": "Calculation Module code/scripts/moneykeel_metric_register.json (retired keys) · moneykeel_rulings.json (G12, the worked example) · moneykeel_decisions_anchors.json (DEC-0260) · MK-CF-M-001 · MK-CF-M-002 · MK-CF-M-003 · MK-CF-M-004 · MK-CF-M-047 · MK-CF-M-048 · MK-CF-M-049 · MK-CF-M-052"
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
