# Cash flow — part 18 of 19: The screens — the Cash flow tab, its four tabs, and Home's box for this month

41 figures to check against the tenets, 99 decisions to check, and the cross-card checks named below. No cards in this part. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 18"` in your reply, with `screen_checks`, `rules_held` and `cross_card_checks`.

## The figures — as the screen register holds them

Each figure: the words beside it on screen, its unit and period, the screens and the parts of them it is printed in, what it answers, how it is worked, what it says when it cannot be worked, the author's notes, the worked example the app's own door ran, and the decisions that govern it.

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
  "id": "MK-CF-M-006",
  "label": "YOUR SOURCES — Base salary",
  "unit": "money",
  "grain": "one earner",
  "screens": [
   "/cashflow"
  ],
  "answers": "Each earner’s base pay, as it was entered, with whether it was entered before tax or as take-home.",
  "formula": "the base salary of each earner, in the period it was entered",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "decisions": [
   "NEVER CONVERTED SILENTLY: the amount is shown in the period it was entered, and the period is said beside it."
  ],
  "refusal": "No salary entered — the row does not appear; the door to enter it does.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$4,200"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-007",
  "label": "YOUR SOURCES — Self-employment",
  "unit": "money",
  "screens": [
   "/cashflow"
  ],
  "answers": "Self-employment income, net, in the period it was entered.",
  "formula": "the self-employment amount as entered, monthly or yearly",
  "inputs": [
   "MK-XS-I-023 salary and other income"
  ],
  "refusal": "None entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$24,000"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-008",
  "label": "YOUR SOURCES — Bonus",
  "unit": "money",
  "per": "year",
  "screens": [
   "/cashflow",
   "/income-manager"
  ],
  "answers": "The bonus for the year and the month it lands.",
  "formula": "the bonus as entered, a year; shown in the month it lands, never spread",
  "inputs": [
   "MK-CF-I-009 bonus",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "decisions": [
   "A LUMP THAT LANDS ONCE IS NEVER AVERAGED across the year (founder, 2026-08-28)."
  ],
  "refusal": "None entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$12,000/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "CashFlowScreen › MonthBars",
   "IncomeManagerScreen › BonusAndStock"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-009",
  "label": "YOUR SOURCES — Stock vesting (equity)",
  "unit": "money",
  "per": "year",
  "screens": [
   "/cashflow",
   "/income-manager"
  ],
  "answers": "What vests in a year, valued at the price entered.",
  "formula": "shares vesting × price per share; with a grant schedule, the total ÷ the years it vests over",
  "inputs": [
   "MK-CF-I-010 equity vesting",
   "MK-XS-I-005 holding price"
  ],
  "refusal": "No equity entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$20,000/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen › BonusAndStock"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-010",
  "label": "YOUR SOURCES — Rental property",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow",
   "/income-manager"
  ],
  "answers": "What the rental brings in each month after its running costs.",
  "formula": "(rent − running costs) for each rental, added up",
  "inputs": [
   "MK-CF-I-007 rental income"
  ],
  "refusal": "No rental entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$1,200/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen › Rent"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-011",
  "label": "YOUR SOURCES — Social Security · pension",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "Guaranteed income being received now — Social Security, pension, annuity and other — in a month.",
  "formula": "Social Security + pension + annuity + other, each brought to a monthly amount",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "None being received — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$2,100/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab"
  ],
  "decisions_that_govern_it": []
 },
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
 },
 {
  "id": "MK-CF-M-027",
  "label": "each income source and its amount",
  "unit": "money",
  "grain": "one source",
  "screens": [
   "/income-manager",
   "/cashflow"
  ],
  "answers": "Every source of income that has been entered, one line each, in the period it is counted in — a month or a year, said beside it.",
  "formula": "each source as it was entered: rent after its running costs, in a month; interest and dividends, a bonus, scholarships and loans, in a year; the rest in a month",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-CF-I-009 bonus",
   "MK-CF-I-010 equity vesting",
   "MK-CF-I-007 rental income"
  ],
  "refusal": "Nothing entered — the list is replaced by the one line \"Nothing entered yet. Add your income ›\" (Q48), which opens Base pay.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security. The line shown is the rental’s: what it brings in a month after its costs.",
   "answer": "$1,200"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen",
   "IncomeManagerScreen › Rent"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-1859",
   "DEC-1924",
   "DEC-7940"
  ]
 },
 {
  "id": "MK-CF-M-031",
  "label": "Take-home",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay",
   "/cashflow",
   "/income-manager"
  ],
  "answers": "What actually reaches the bank each month, after federal tax and 401(k) — for one earner, and for the household.",
  "formula": "for one earner: what they entered, or their gross less federal tax less their own 401(k). For the household: the sum of the earners’ figures, never a second calculation.",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-CF-I-003 take-home as entered",
   "MK-CF-I-004 401(k) contribution",
   "MK-CF-I-005 tax rate as entered"
  ],
  "decisions": [
   "Federal income tax when it is calculated, plus the state rate when one was entered (the Tax organizer’s \"State income tax %\", applied to taxable income) — no Social Security or Medicare, and no state tax when none was entered (MK-CF-D-001, DEC-0384)."
  ],
  "refusal": "Shows $0 until a wage is entered.",
  "note": "ONE figure over two sets: one earner, and the household — so a total and its parts cannot disagree (rule 2). It wears ≈ whenever the figure was calculated rather than entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "$9,398/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen",
   "BasePayScreen › EarnerSection",
   "BudgetScreen",
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0188",
   "DEC-0194",
   "DEC-0208",
   "DEC-0209",
   "DEC-0375",
   "DEC-0380",
   "DEC-0389",
   "DEC-0503",
   "DEC-7608"
  ]
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
  "id": "MK-CF-M-055",
  "label": "Draw from savings",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "The level amount a month the pot can support, so the paycheck does not fall when a bill lands.",
  "formula": "the paycheck year’s level draw from the pot, at the assumed return and horizon",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-018 retirement age"
  ],
  "decisions": [
   "IN TODAY’S DOLLARS (decided 2026-10-03, the master’s old Q30): the draw keeps its buying power — the figure shown is what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way."
  ],
  "refusal": "No pot — no draw; the paycheck is the guaranteed income alone.",
  "worked": {
   "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
   "answer": "$2,345/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-2164"
  ]
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
 },
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
  "id": "MK-CF-M-070",
  "label": "each step of the withdrawal order",
  "unit": "money",
  "grain": "one step",
  "screens": [
   "/cashflow"
  ],
  "answers": "Which pot the retired paycheck draws from first, second and so on, and how much sits in each.",
  "formula": "cash first, then taxable, then pre-tax, then Roth — each with what is earmarked for retirement in it",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-050 the share of an account earmarked for retirement"
  ],
  "refusal": "No retirement money in any pot — no order to explain.",
  "worked": {
   "given": "A $50,000 taxable brokerage account and a $120,000 pre-tax 401(k), both for retirement, at 68.",
   "answer": "$50,000"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › DrawOrderWhy"
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
 },
 {
  "id": "MK-CF-M-078",
  "label": "SURPLUS — <MONTH> (retired)",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What a retired person can spend this month: the guaranteed income that lands this month, plus the level draw from savings, less the big dated bills that fall in it.",
  "formula": "this month’s surplus = guaranteed income landing this month + the level draw the savings can support − the big dated bills in this month (everyday expenses and monthly debt payments are what it is for, so they are not taken off)",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-NW-I-001 your accounts",
   "MK-CF-I-014 big bill"
  ],
  "decisions": [
   "A short month shows the minus with the word “short” and the bill named — never smoothed, never clipped to zero."
  ],
  "refusal": "No guaranteed income entered: the card asks for Social Security and pension; with nothing to spend, the pace line is not drawn.",
  "note": "Printed in the retired view of This month: the paycheck card’s hero, and the $Y of the pace line (drawn only when it is above $0).",
  "worked": {
   "given": "Retired, on 15 Oct 2026: $2,400/month of Social Security, no savings to draw on, and $1,200 of car insurance due in October.",
   "answer": "$1,200/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "printed_in": [
   "CashFlowScreen › RetiredMain"
  ],
  "decisions_that_govern_it": [
   "DEC-8153"
  ]
 }
]
```

## The cross-card checks for this part

From `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json`. For each, build one household of your own, work the figures named, and say whether they agree.

```json
[
 {
  "id": "X1",
  "check": "Home's box for this month and the Cash flow tab's This month give the same take-home, the same spent so far and the same left, for one household.",
  "figures": [
   "MK-CF-M-002",
   "MK-CF-M-051",
   "MK-CF-M-052",
   "MK-CF-M-053"
  ],
  "tenet": 4,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 },
 {
  "id": "X2",
  "check": "The rows of This month add up to its surplus, in the planned block and in the actual block, each on its own.",
  "figures": [
   "MK-CF-M-004",
   "MK-CF-M-002",
   "MK-CF-M-003",
   "MK-CF-M-049",
   "MK-CF-M-053"
  ],
  "tenet": 2,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 },
 {
  "id": "X3",
  "check": "For a household whose only income is wages, the take-home on Base pay equals the take-home each month on the Income summary.",
  "figures": [
   "MK-CF-M-031",
   "MK-CF-M-037"
  ],
  "tenet": 4,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 },
 {
  "id": "X4",
  "check": "A car loan payment logged under Debt payment is counted once: with the debts, not again with the expenses.",
  "figures": [
   "MK-CF-M-013",
   "MK-CF-M-003",
   "MK-CF-M-052"
  ],
  "tenet": 1,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
 },
 {
  "id": "X7",
  "check": "A bill that falls once a year is in its own month on the bill calendar and in that month's planned outflow, and in no other month.",
  "figures": [
   "MK-CF-M-016",
   "MK-CF-M-028",
   "MK-CF-M-048"
  ],
  "tenet": 4,
  "reply": {
   "verdict": "HOLDS | DOES NOT HOLD | CANNOT TELL",
   "case": {},
   "why": ""
  }
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
  "id": "DEC-0018",
  "decided": "2026-07-31",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "saves as you type",
  "the_log_records": "Two findings from his walk of build 47:\n1. The company-share editor gains a field for the ticker symbol, which fetches the live price to start you off and stays editable.\n2. It gains a real Done button at the bottom. The link at the top of the screen was invisible from the end of a long form, and the form says it saves as you type.",
  "governs": "src/screens/IncomeManagerScreen.tsx"
 },
 {
  "id": "DEC-0039",
  "decided": "2026-08-02",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0039, confirmed as written: +Expense floating button removed from Home — logging lives on Cash flow only (founder UX review 7/16; predates this chan",
  "the_log_records": "The floating “+Expense” button comes off the Home screen. Logging an expense lives on Cash flow only, so there is one place to do it.",
  "governs": "src/screens/HomeScreen.tsx · src/screens/CashFlowScreen.tsx"
 },
 {
  "id": "DEC-0109",
  "decided": "2026-08-11",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "s make sure we are using same language everywhere to convey same message — xx% odds of lasting to age abc",
  "the_log_records": "Home, Net worth and the Plan screen all said “[word] — xx% odds of lasting to age nn”, but the answers screen — the very screen you land on to FIX your odds — said “0 in 100”. Found by walking the whole journey end to end rather than testing each screen alone.",
  "governs": "src/domain/planning/hub.ts oddsLine + oddsTail · src/screens/HomeScreen.tsx · src/screens/NetWorthScreen.tsx · src/screens/PlanHubScreen.tsx · src/screens/CashFlowScreen.tsx · src/components/PlanOutcome.tsx · src/domain/glossary.ts"
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
  "id": "DEC-0177",
  "decided": "2026-08-27",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0177, confirmed as written: moneykeel_pres_mock_income-end-to-end_v02.html APPROVED. 14 screens in one document; 13 earlier income mocks archived.",
  "the_log_records": "The income mock is approved: 14 screens in one document, with the 13 earlier income mocks archived so there is one live file rather than a folder to choose from.",
  "governs": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html"
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
  "id": "DEC-0188",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Who earns this income? You / Partner / Both",
  "the_log_records": "A spouse’s wage becomes its own block, using the SAME field names as your own, and the household total sums every earner. A household on $84,000 plus $54,000 had been read as $84,000 — one person’s income against two people’s spending.",
  "governs": "MK-CF-M-037 · MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-036"
 },
 {
  "id": "DEC-0190",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "Or answer guided setup questions",
  "the_log_records": "A signed-in person opening the guided setup now STAYS there. It previously bounced them back to Home in three of its four states, so the setup was effectively unreachable.",
  "governs": "src/screens/FirstRunScreen.tsx · src/screens/BasePayScreen.tsx"
 },
 {
  "id": "DEC-0194",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "effective tax rate % from last year",
  "the_log_records": "The tax rate is shown where the money is, and can be corrected there. The rate could previously only be changed on a step inside the guided setup — itself unreachable — so the figure driving every take-home in the app could not be put right where you noticed it was wrong.",
  "governs": "MK-CF-M-035 · MK-CF-M-037 · MK-CF-M-031 · MK-CF-M-046"
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
  "id": "DEC-0201",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Use latest mockup version of income screen",
  "the_log_records": "Use latest mockup version of income screen",
  "governs": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html · the income screens"
 },
 {
  "id": "DEC-0202",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "onboarding",
  "the_log_records": "The base-pay step in the guided setup IS the base-pay screen — one piece of screen, two frames — so the questions cannot drift apart between the two places you can answer them. It saves as you type rather than on a Save button the setup never shows.",
  "governs": "src/screens/BasePayScreen.tsx · src/screens/FirstRunScreen.tsx"
 },
 {
  "id": "DEC-0208",
  "decided": "2026-09-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "worked out",
  "the_log_records": "Where one person entered their take-home and the other’s is calculated, the note says so per person — “Your take-home: $5,000 (you entered) · Sam’s take-home: about $3,686 (calculated)”. The prose version was misread: the entered $5,000 was taken for gross.",
  "governs": "MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-035 · MK-CF-M-044"
 },
 {
  "id": "DEC-0209",
  "decided": "2026-09-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Always use same words to describe same thing in the app. There is no score for creative writing.",
  "the_log_records": "One word per concept across the income screens: “take-home” replaces “lands in your bank” and “takes home”; “calculated” replaces “worked out”, “Estimated federal tax” and “our estimate”. A test enforces it.",
  "governs": "MK-CF-M-037 · MK-CF-M-043 · MK-CF-M-032 · MK-CF-M-031"
 },
 {
  "id": "DEC-0213",
  "decided": "2026-09-14",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "Connect your bank ›",
  "the_log_records": "The door to link a bank reads “Connect your bank” everywhere. Home still said “Connect your first account”, so the same door had two names depending on where you met it. Home now takes its wording from the one list.",
  "governs": "MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md · src/screens/CashFlowScreen.tsx"
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
  "id": "DEC-0283",
  "decided": "2026-09-10",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.",
  "the_log_records": "“Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.” So “Gross” is labelled “before any deductions”, and the earlier wording “before tax” is retired — it meant something different and narrower.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md"
 },
 {
  "id": "DEC-0287",
  "decided": "2026-09-10",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "activity",
  "the_log_records": "“activity.” One word for the list of what has happened in an account.",
  "governs": "src/screens/CashFlowScreen.tsx · MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md"
 },
 {
  "id": "DEC-0288",
  "decided": "2026-09-10",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "one-time. Lump-sum does not always mean one-time. What's the intent behind \"plan for the lump sum\" before you change it to one-time? · his answer 2026-09-12: No monthly payment — the full balance is due on that date.",
  "the_log_records": "“one-time. Lump-sum does not always mean one-time. What’s the intent behind ‘plan for the lump sum’ before you change it to one-time?” The word is “one-time” — and his question stopped a rename that would have changed the meaning of a sentence rather than just its wording.",
  "governs": "src/screens/RetirementCockpit.tsx · src/screens/CashFlowScreen.tsx"
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
  "id": "DEC-0295",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "never the word \"safe\" — kills \"safe to spend\" and \"safe withdrawal rate\"",
  "the_log_records": "“never the word ‘safe’.” It kills “safe to spend” and “safe withdrawal rate”. Nothing in a projection is safe, and a word promising safety is a promise the app cannot keep.",
  "governs": "src/screens/NetWorthScreen.tsx · src/screens/CashFlowScreen.tsx"
 },
 {
  "id": "DEC-0320",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "property sale/purchase as two events · stepped part-time income · pre-65 health premiums as a spread · owner tag you/spouse/joint with a full-value joint column · survivor inputs · insurance labels (SIPC clause) · amber box sorted by money · expense-to-income ratio (TTM) · pacing method stated · debt-to-asset · debt-payments-to-income denominator stated",
  "the_log_records": "Nine things settled in one go: a property sale or purchase is recorded as TWO events, not one; part-time income can step down in stages; health premiums before 65 are spread rather than lumped; every item is tagged as yours, your spouse’s or joint, with a joint column at full value; survivor inputs are captured; insurance labels carry the protection clause; the attention box is sorted by money at stake; and two ratios are added — expenses against income over the trailing year, and debt against assets.",
  "governs": "src/screens/PlanHubScreen.tsx · src/screens/CashFlowScreen.tsx · src/domain/planning/index.ts"
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
  "id": "DEC-0345",
  "decided": "2026-09-13",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "inputs assembled once per family — one function builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and no screen assembles its own",
  "the_log_records": "“inputs assembled once per family — one function builds the person’s state for a family and every orchestrator in that family reads it.” The data a group of screens needs is assembled once, so two screens in the same family cannot start from different inputs.",
  "governs": "MK-NW-F-145 netWorthInputs (src/hooks/useNetWorthInputs.ts) · src/screens/NetWorthScreen.tsx · src/screens/HomeScreen.tsx · src/screens/InsightsScreen.tsx · src/screens/OtherInvestmentsScreen.tsx · src/screens/StressTestScreen.tsx · src/screens/JobSafetyScreen.tsx · src/screens/IncomeManagerScreen.tsx"
 },
 {
  "id": "DEC-0365",
  "decided": "2026-09-26",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "Q6 — future dollars and tax. FIRST ANSWER (mine, and wrong): “today’s money, after tax”. HIS CORRECTION, 2026-09-26: “does this even make sense to you? … I thought I already made decision in the past … to keep retirement number pre-tax, as we cannot determine tax accurately. The lengthly explanation is horrible.”",
  "the_log_records": "“Q6 — future dollars and tax.” MY FIRST ANSWER WAS WRONG — I proposed ‘today’s money, after tax’. HIS CORRECTION: “does this even make sense to you?” It did not, and the row records the correction rather than quietly replacing my answer.",
  "governs": "src/screens/RetirementCockpit.tsx · src/screens/CashFlowScreen.tsx"
 },
 {
  "id": "DEC-0375",
  "decided": "2026-09-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?",
  "the_log_records": "“No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?” He rejected the grouping and sent me to check the code — where the nesting turned out to be correct, and my proposal was wrong.",
  "governs": "MK-XS-M-006 · MK-CF-M-006 · MK-CF-M-007 · MK-CF-M-008 · MK-CF-M-009 · MK-CF-M-010 · MK-CF-M-027 · MK-CF-M-029 · MK-MN-M-011 · MK-MN-M-012 · MK-MN-M-013 · MK-MN-M-014 · MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-034 · MK-CF-M-035 · MK-CF-M-036 · MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-039 · MK-CF-M-040 · MK-CF-M-041 · MK-CF-M-042 · MK-CF-M-043 · MK-CF-M-044 · MK-CF-M-045 · MK-CF-M-046"
 },
 {
  "id": "DEC-0380",
  "decided": "2026-09-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first build-54 device pass — the card contradicted itself ($21,159 − $4,380 − $1,656 ≠ $16,403) because every estimated earner was granted the FULL joint deduction; and a two-earner household was banded as single (32% vs jointly 24%).",
  "the_log_records": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first device pass of build 54, where the card contradicted itself because every estimated earner was granted the FULL joint deduction.",
  "governs": "MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-034 · MK-CF-O-001 · MK-CF-O-001"
 },
 {
  "id": "DEC-0389",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "calculated (your standing order, 2026-09-02)",
  "the_log_records": "“calculated” is the word for a figure the app worked out — his standing order. “worked out”, “Estimated federal tax” and “our estimate” are retired.",
  "governs": "MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-035 · MK-CF-M-044"
 },
 {
  "id": "DEC-0392",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "\"you entered\"",
  "the_log_records": "“a figure the person gave us → ‘you entered’.” One phrase for a number you typed, so it is never confused with one the app worked out.",
  "governs": "the canon table · BasePayScreen · ItemizeScreen · WillItLastScreen · ContributionRoomScreen"
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
  "id": "DEC-0396",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "/month, /year",
  "the_log_records": "“/month, /year.” One way of writing a period, everywhere — and, asked about the rest, “/quarter, /week, /2 weeks”. “a month” and “/mo” are retired.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/screens/IncomeDetailScreen.tsx"
 },
 {
  "id": "DEC-0440",
  "decided": "2026-09-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Approved",
  "the_log_records": "“Approved.” The cash-flow mocks become ONE file: moneykeel_pres_mock_cash-flow_v01.html. It carries the four-tab architecture from v02 together with the This month and Expenses screens as revised in v07, so there is no longer a choice between two half-current versions. v02 and v07 are dated and archived.",
  "governs": "MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md · MoneyKeel/documents/standards/moneykeel_calc_spec_one-door-per-question_v01.md"
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
  "id": "DEC-0454",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "we should capture as some debt might not be due for many years",
  "the_log_records": "“we should capture as some debt might not be due for many years.” A debt’s due date is captured even when it is far off, because a lump due in 2031 still belongs in the plan.",
  "governs": "src/screens/NetWorthScreen.tsx · src/screens/CashFlowScreen.tsx"
 },
 {
  "id": "DEC-0485",
  "decided": "2026-07-01",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "What's the flow to add actual day to day expenses such grocery, gas, etc? Also, what's the flow to capture or add income?",
  "the_log_records": "HIS QUESTION: “What’s the flow to add actual day-to-day expenses such as grocery, gas? Also, what’s the flow to capture or add income?” Two everyday journeys that had no drawn flow.",
  "governs": "src/screens/CashFlowScreen.tsx · src/screens/HomeScreen.tsx"
 },
 {
  "id": "DEC-0499",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "are month bars cashflows - showing inflow and outflow?",
  "the_log_records": "HIS QUESTION: “are month bars cashflows — showing inflow and outflow?” A chart that does not say what it plots has not said anything.",
  "governs": "src/screens/CashFlowScreen.tsx · src/screens/RetirementCockpit.tsx"
 },
 {
  "id": "DEC-0503",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "How is income + spending captured, at what frequency, and what about cash / unconnected cards?",
  "the_log_records": "HIS QUESTION: “How is income + spending captured, at what frequency, and what about cash / unconnected cards?” The parts no connection reaches still have to be captured somehow.",
  "governs": "MK-CF-M-031"
 },
 {
  "id": "DEC-0505",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "Why does the will-it-last number live in the Spend tab? (retiree-centric)",
  "the_log_records": "HIS QUESTION: “Why does the will-it-last number live in the Spend tab?” — noting it reads as retiree-centric, on a tab about spending.",
  "governs": "src/screens/CashFlowScreen.tsx · MK-XS-M-002"
 },
 {
  "id": "DEC-0506",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Net worth + money + spending all on one tab -- too much?",
  "the_log_records": "HIS QUESTION: “Net worth + money + spending all on one tab — too much?”",
  "governs": "src/screens/NetWorthScreen.tsx · src/screens/CashFlowScreen.tsx · the tab bar"
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
  "id": "DEC-1112",
  "decided": "2026-10-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "ok. open them from build but make sure it meets new design standards.",
  "the_log_records": "The six Cash flow screens that had no drawing — Log income, Month detail, Bill calendar, Paycheck months, Monthly income, Worth a look — are approved as built, on condition that each meets the screen standard. Each was audited against it the same day and the gaps fixed; the v02 drawings show the result.",
  "governs": "MoneyKeel/documents/cashflow/moneykeel_pres_mock_bill-calendar_v02.html · MoneyKeel/documents/cashflow/moneykeel_pres_mock_monthly-income_v02.html · src/screens/BillCalendarScreen.tsx · src/screens/MonthlyIncomeScreen.tsx · src/constants/doors.ts"
 },
 {
  "id": "DEC-1134",
  "decided": "2026-10-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "I am pretty confident - these are no longer needed per new design and like before you like to beat around the bush and be stubborn that you are right, versus trying to think through - why we need this, and does the need still exists.",
  "the_log_records": "Four Cash flow screens are retired: Month detail, Paycheck months, Log income and Worth a look. No approved design draws a door to any of them, and no ruling needs them. Bill calendar and Monthly income stay only as the editors behind figures the approved designs show — not as destinations.",
  "governs": "src/screens/CashFlowScreen.tsx (no door to a month or the calendar) · src/components/PaycheckCard.tsx · src/domain/insights/index.ts · app/_layout.tsx · MK-CF-M-017 · MK-CF-M-026 · MK-CF-M-064 · MK-CF-M-067 · MK-CF-M-068 (retired) · MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md"
 },
 {
  "id": "DEC-1560",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Rest - keep it.",
  "the_log_records": "In twelve named places the app differs from its approved drawing and the app stays as it is.",
  "governs": "[a test of the app] · [a test of the app] · [a test of the app] (each names the difference) · Calculation Module code/scripts/moneykeel_workplan.json"
 },
 {
  "id": "DEC-1625",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "#4 - remove second sentence.",
  "the_log_records": "On Your base pay, when the app calculates the tax, the card states its own sum and stops: \"$11,500 gross − $873 tax − $1,200 of 401(k)s = $9,427.\" The second drawn sentence is not shown.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts (MK-CF-O-001 basePay) · src/screens/BasePayScreen.tsx · [a test of the app]"
 },
 {
  "id": "DEC-1668",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "add it to the cash as losing job does not mean loosing rental income too.",
  "the_log_records": "The emergency fund counts rent from a property. Rent keeps arriving when pay stops, so each month it is added to the cash: months = cash ÷ (a month of essentials − the rent).",
  "governs": "MK-NW-M-013 EMERGENCY FUND — X.X months · MK-NW-M-046 at your planned spend · MK-NW-M-064 rent from your property, which keeps arriving · MK-MN-M-020 · MK-MN-M-025 · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · MoneyKeel/functions/cashflow/income-summary.ts (MK-CF-O-004 incomeSummary, lands.rentMonthly) · src/screens/NetWorthScreen.tsx · src/screens/StressTestScreen.tsx · src/screens/JobSafetyScreen.tsx · src/screens/InsightsScreen.tsx"
 },
 {
  "id": "DEC-1859",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "#1 - remove langage to include interest on mortgage in maintenance expenses, as that is not standard practice.",
  "the_log_records": "On the Rent from a property screen, the hint under \"What it costs to run each month\" no longer lists mortgage interest. It reads \"Tax, insurance, repairs, management.\" A mortgage on a rented-out property belongs in Debts.",
  "governs": "src/screens/IncomeManagerScreen.tsx (Rent from a property) · MK-CF-M-027 · MK-NW-M-064 rent from your property, which keeps arriving · [a test of the app]"
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
  "id": "DEC-1926",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "unless rental income is added on the income screen, assume property is second or vacation home.",
  "the_log_records": "A property is a second or vacation home unless rental income is entered for it on the Income screen. With rental income entered, it is a rental.",
  "governs": "src/domain/assets/index.ts (realEstateUseOf) · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · src/screens/IncomeManagerScreen.tsx (Rent from a property) · MK-NW-M-064 rent from your property, which keeps arriving"
 },
 {
  "id": "DEC-2164",
  "decided": "2026-09-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "rise with inflation each year",
  "the_log_records": "The draw from savings rises with inflation each year, so it keeps its buying power. The figure shown is what it buys today.",
  "governs": "MK-CF-M-055 · MoneyKeel/functions/cashflow/future-paycheck.ts (MK-CF-O-017 futurePaycheck)"
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
  "id": "DEC-7171",
  "decided": "2026-10-21",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-21 on master question Q35, made without asking him, as his order of 2026-09-30 says, following his comment of 2026-08-26 on this figure (Trailing Twelve Months, not just 12 months). Holding detail reads Dividends received (trailing twelve months); it read Dividends received (12 mo). Income's line for an account's interest and dividends reads paid out over the trailing twelve months; it read over the last year. The figures do not change. One word from him reverses it.",
  "governs": "MK-NW-M-034 (where Q35 sits) · MK-NW-O-006 theHolding (MoneyKeel/functions/networth-and-performance/holding.ts) · MK-CF-F-184 incomeFromAccounts (src/domain/income/from-accounts.ts) · src/screens/HoldingDetailScreen.tsx · src/screens/IncomeManagerScreen.tsx"
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
  "id": "DEC-7608",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-3523 (tenet 5) and DEC-0327, made without asking him, as his order of 2026-09-30 says. 5.00% state rate typed on the Tax organizer: the words read \"federal income tax only\"; they now read \"federal income tax, plus the 5.00% state rate you entered\". The Tax organizer's own words say the rate tunes every tax estimate, so the typed rate counts. To reverse: leave the typed state rate out of the calculated rate and say \"federal income tax only\". One word from him reverses it.",
  "governs": "MK-CF-M-031 · MK-CF-F-181 rateInForce"
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
  "id": "DEC-7798",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. A 5.00% state rate entered on the Tax organizer, no rate typed: the line under Calculated federal tax said federal only, that the rate knew nothing about the state, while the calculated rate held the state rate the person entered. It now reads \"Federal income tax, plus the 5.00% state rate you entered — it knows nothing about Social Security or Medicare.\", the words built for the typed-rate case (DEC-7608). With no state rate entered it reads as built, federal only. The figures do not change. To reverse: take the state rate out of the calculated rate, and the line stands as built. One word from him reverses it.",
  "governs": "MK-CF-M-044 (the line under Calculated federal tax) · MK-CF-O-004 incomeSummary (MoneyKeel/functions/cashflow/income-summary.ts) · MK-CF-F-181 rateInForce"
 },
 {
  "id": "DEC-7887",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283 and DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. A couple with $169,200 of wages and $19,200 into 401(k)s: the card printed only the gross, $169,200, while the bracket and a calculated tax were worked on $150,000. It now prints three rows: Gross a year $169,200, Your 401(k)s −$19,200, What it is taxed on $150,000. The drawing's own household (frame 5a): $167,400 − $14,400 = $153,000, bracket 22%. With no 401(k) the 401(k) row reads $0 and the two totals are the same. Two new figures: MK-CF-M-076, the gross a year, and MK-CF-M-077, the year's 401(k)s; MK-CF-M-041, What it is taxed on, is the gross less the 401(k)s. MK-CF-M-044's worked example is now the calculated case, $15,340, the federal tax on $150,000 less the $32,200 standard deduction ($2,480 + $9,120 + 22% × $17,000); it showed the typed 22% case, $37,224 — the code was right and the words were wrong. Sign-up's Taxes step names about $55,200 it is taxed on, the gross less the 401(k) (it named about $60,000, for $60,000 of wages and $4,800 into a 401(k)). The two rows are drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07. To reverse: drop the two rows and print the gross as What it is taxed on again. One word from him reverses it.",
  "governs": "MK-CF-M-041 · MK-CF-M-076 · MK-CF-M-077 · MK-CF-M-044 · MK-CF-O-004 incomeSummary (MoneyKeel/functions/cashflow/income-summary.ts) · src/screens/IncomeSummaryScreen.tsx · src/onboarding/modules.tsx (the Taxes step)"
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
  "id": "DEC-7942",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenets 3 and 5), made without asking him, as his order of 2026-09-30 says. A $5,000 take-home with the person's own 0% rate: the gross box showed 5475.378787878787, worked back from the federal tables, the card read Everything else taken out $475/month · 0%, and its last line said nothing there was calculated. The gross is now worked back with their own rate, $5,000.00, under the line \"≈ Worked back from the take-home you entered. Type the gross from a payslip to replace it.\", and the card's last line says the take-home is what was entered and the gross was worked back from it. The typed take-home is unchanged ($5,000 on This month). Typing a gross brings back the drawing's words. The drawing's rule 9: every estimate is prefixed ≈ and says what it cannot see. To reverse: work the gross back from the federal schedule and print the drawn words. One word from him reverses it.",
  "governs": "MK-CF-F-186 convertTakeHomeMode · MK-CF-O-001 basePay · MK-CF-M-030 · src/screens/BasePayScreen.tsx"
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
  "id": "DEC-7947",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-4529 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. Two drawing errors, each left as drawn with its correction line on bill-calendar v02, as his DEC-4529 asks. The foot line ended with a promise to tap any row for that month's full detail, and a screen reader said each month row opens the month's detail; month detail was retired on 2026-10-02, so the sentence is gone and no row promises it. The line under the title read Oct 2026 – Sep '27 2027, the year twice, copied from the build; it reads \"Oct 2026 – Sep 2027\", each end written by the app's one date writer, and a screen reader hears Jan 2027 where it heard Jan '27 2027. The month names in the table do not change. To reverse: give each month row a door and print the sentence again; print the drawn line. One word from him reverses it.",
  "governs": "src/screens/BillCalendarScreen.tsx · MK-ST-F-095 monthYearShown (src/domain/_shared/dates.ts)"
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
  "id": "DEC-7950",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. With balances hidden a row was heard as Mortgage, debt and the dots; it is heard as Mortgage, debt, minus hidden. The planned-expenses door said only that it was planned expenses, by category; it now says each group and the total — Bills & fixed $1,100, Everyday expenses $900, total $2,000. A brand-new person's empty box held its Add your income door out of a screen reader's reach; the door is the box's own spoken action. To reverse: remove the spoken labels and the action. One word from him reverses it.",
  "governs": "src/screens/CashFlowScreen.tsx (sayRow) · src/screens/BudgetScreen.tsx (dueInDays, dueWords) · src/screens/HomeScreen.tsx"
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
 },
 {
  "id": "DEC-0036",
  "decided": "2026-08-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "above what your own numbers support long-term",
  "the_log_records": "The warning about drawing more than about 4% a year is reworded to be about YOUR numbers rather than a rule of thumb: “above what your own numbers support long-term”.",
  "governs": "src/domain/decumulation/index.ts rateBandWords · src/screens/PlanHubScreen.tsx · src/screens/RetirementCockpit.tsx (both the verdict sentence and the rate box) · src/components/PaycheckCard.tsx"
 },
 {
  "id": "DEC-0180",
  "decided": "2026-08-27",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "one component, two frames",
  "the_log_records": "One live income mock, with ten superseded versions archived. Where several versions of a design exist, only one is live — otherwise the next piece of work starts from whichever file was opened first.",
  "governs": "MoneyKeel/documents/standards/moneykeel_naming_spec_file-and-folder-naming_v01.md · MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md"
 },
 {
  "id": "DEC-0269",
  "decided": "2026-09-03",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "money going out in a month → Expenses (planned / actual / recurring by context); 'Outflow (expenses + debt)' for money leaving; evaluate context, never replace blindly · his answer 2026-09-12: replace with expenses in prose too. Again keep in mind context per my prior response",
  "the_log_records": "“money going out in a month → Expenses (planned / actual / recurring by context); ‘Outflow (expenses + debt)’ for money leaving.” One word for money going out, with the context saying which kind.",
  "governs": "MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md · src/screens/BudgetScreen.tsx"
 },
 {
  "id": "DEC-0273",
  "decided": "2026-09-03",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "the per-category monthly plan → Budget; review context before replacing",
  "the_log_records": "“the per-category monthly plan → Budget; review context before replacing.” One word for the plan, with the caution that “budget” means something else in some sentences — read the context first.",
  "governs": "MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md · src/screens/BudgetScreen.tsx"
 },
 {
  "id": "DEC-0302",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "one mechanism per shape: amount + start year + end year + growth rate",
  "the_log_records": "“one mechanism per shape: amount + start year + end year + growth rate.” Every income stream and every cost is described the same four ways, so a new kind needs no new machinery.",
  "governs": "src/screens/RetirementCockpit.tsx · src/domain/retirement/index.ts"
 },
 {
  "id": "DEC-0312",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "deferred, not dropped: forward income (Q18), budget rollover (Q28), non-USD holdings (Q25 — store the currency field now)",
  "the_log_records": "“deferred, not dropped: forward income, budget rollover, non-USD holdings — store the currency field now.” Three things put off rather than abandoned, and the currency field is stored TODAY so the data exists when they are picked up.",
  "governs": "src/domain/assets/index.ts · src/screens/NetWorthScreen.tsx"
 },
 {
  "id": "DEC-0318",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "affordability replaces safe-to-spend: recurring cost with an end date; one-off purchase against liquid assets and months of cover",
  "the_log_records": "“affordability replaces safe-to-spend: recurring cost with an end date; one-off purchase against liquid assets and months of cover.” The question becomes whether you can afford a specific thing, rather than a general figure calling itself safe.",
  "governs": "Calculation Module code/engines/events.ts · src/domain/assets/index.ts"
 },
 {
  "id": "DEC-0420",
  "decided": "2026-09-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "fix cashflow screens before moving forward.",
  "the_log_records": "“fix cashflow screens before moving forward.” The cash-flow screens are brought onto the standards before any new work starts.",
  "governs": "MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md · MoneyKeel/documents/standards/moneykeel_calc_spec_one-door-per-question_v01.md"
 },
 {
  "id": "DEC-0434",
  "decided": "2026-09-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "let's discuss how to clean cashflow mockups and combine into one file, as currently we have v2 with few final screen, and v7 with this month and expense screen revised.",
  "the_log_records": "“let’s discuss how to clean cashflow mockups and combine into one file, as currently we have v2 with few final screen, and v7 with this month and expense screen revised.” The cash-flow mocks become ONE file, so there is no choosing between two half-current versions.",
  "governs": "src/domain/assets/index.ts · src/screens/BudgetScreen.tsx"
 },
 {
  "id": "DEC-0477",
  "decided": "2026-07-01",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Is it imported directly using Plaid? Also, Does it capture interest payment for bonds?",
  "the_log_records": "HIS QUESTIONS: “Is it imported directly using Plaid? Also, does it capture interest payment for bonds?” What comes in automatically and what does not.",
  "governs": "src/domain/assets/index.ts · src/screens/BudgetScreen.tsx"
 },
 {
  "id": "DEC-7610",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his ruling DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. The editor's own header says it is the plan for a typical month (the 2026-06-23 surplus decision, in the code's comment; it has no row in this log). A $1,200 December bill reads $100 a month there, while This month and the Expenses tab read it only in December. To reverse: point its groups at MK-CF-F-221 spendByMonthByBucket for this month. One word from him reverses it.",
  "governs": "src/screens/BudgetScreen.tsx (the per-group spent / planned)"
 },
 {
  "id": "DEC-7943",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0264 and DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. A $386.42 car payment was offered as 386, so Log recorded $386 and left the balance 42 cents too high; it is offered as 386.42 and recorded to the cent. A $250 car-loan payment moves Debts and Net worth together: owed $333,000 → $332,750, surplus +$900 → +$650, Home's Outflow $4,350. To reverse: offer the payment rounded to the dollar again. One word from him reverses it.",
  "governs": "src/screens/BudgetScreen.tsx (openPay) · MK-NW-M-010"
 },
 {
  "id": "DEC-7948",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenets 4 and 8), made without asking him, as his order of 2026-09-30 says. iOS read a dot nested inside a sentence by its glyph, whatever its label, so the mortgage comparison on the Debts tab ended with the dot heard as a symbol. The two nested dots, the mortgage comparison and Required withdrawals, now sit beside their sentence, and every dot is said as About, then what it explains — About How we calculate your odds, About Summary, About Day one, About Earned, About Debt. A guard reads all 36 dots in src and fails on a nested one. Moving the two dots changes the layout a little: a check on a phone is owed. To reverse: put the two dots back inside their sentence and the glyph in the label. One word from him reverses it.",
  "governs": "src/components/UI.tsx (the info dot label) · the Debts tab (src/screens/BudgetScreen.tsx) · src/screens/RequiredWithdrawalsScreen.tsx"
 }
]
```
