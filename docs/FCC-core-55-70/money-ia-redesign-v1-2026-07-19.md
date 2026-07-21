# One Money surface — research + information architecture (v1, 2026-07-19)

**Trigger (founder, Build-43 review):** the Budget screen (Activity · Budget · Debts) and the Cash flow
screen are two screens showing the same information in different formats. Users want to: track income,
monitor expenses (including big-ticket items), manage debts, and manage cash flow. Proposal on the
table: ONE screen with four tabs.

## What the best-in-class products do (pattern research)

| Product | How they structure money movement | The lesson |
|---|---|---|
| **Quicken Simplifi** | ONE "Spending Plan" = income − bills − subscriptions − spending, plan and actual in the same view; Transactions separate; "Bills & Payments" for recurring/big-ticket | The most-praised budgeting UX of the last few years — **plan-vs-actual merged INTO the cash-flow month**, never two screens |
| **Copilot** | Budget with the month's cash summary as its header; Transactions; Recurring | Same merge: the budget IS the cash-flow view |
| **Monarch** | Cash Flow (income vs spend reports) + Budget + Transactions + Recurring | Even split across more surfaces, income and spending live INSIDE cash flow — never a parallel budget screen with the same numbers |
| **YNAB** | One Budget center; Reflect (reports); Accounts | One opinionated surface; zero duplication |
| **Rocket Money** | Dashboard; Transactions; Recurring (their famous surface); Budgets | Dedicated surfaces for RECURRING/big-ticket items earn their keep |

**The industry lesson in one line:** nobody successful ships "Budget" and "Cash flow" as sibling screens
with the same numbers — the winners merge plan-vs-actual into the month view, keep transactions as one
surface, and give recurring/big-ticket items a first-class home.

## The recommended architecture (the founder's four tabs, refined)

ONE screen in the Cash flow tab position. Four sub-tabs:

1. **Cash flow** *(default — the glance)* — the month: In − Out = Surplus, spending pace against the
   plan, the by-category plan (absorbing the old Budget tab; limits editable here), the 12 dated
   month bars, and the future-paycheck projection. *Budget/cash-flow merged — the duplication dies here.*
2. **Income** — every source with its amount and cadence; "Set up ›" opens the approved
   stable/variable pop-up; this month's received income from the ledger; the by-month table for
   variable earners. *(job: track income)*
3. **Spending** — the transaction activity (browse by month, search, add/edit, import), the category
   breakdown vs limits, **Big-ticket radar**: one-off large expenses flagged + upcoming big bills
   (from the bill calendar) + recurring charges. *(jobs: monitor expenses + big-ticket items)*
4. **Debts** — balances, rates, "pay first" on the costliest, payoff progress, log-a-payment.
   *(job: manage debts)*

**What retires:** the separate Budget screen (Activity → Spending; Budget → the plan section inside
Cash flow; Debts → the Debts tab; Import → a link inside Spending). One engine (`budgetVsActual`,
`plannedMonthlySpend`) keeps feeding everything — this is presentation-layer consolidation, no money
math changes.

**Lens behavior:** retirees keep their paycheck-first hero on the Cash flow tab (Safe to spend — the
month, guaranteed + safe draw), same four tabs.

**Ordering rationale:** Cash flow first and default — the app's glance-then-drill rule; the other
three tabs are drills. (The founder proposed Income first — flip the order if preferred; nothing
else changes.)

**Canonical fields:** untouched. The income pop-up writes baseSalary / salaryByMonth; spending plan
writes the same budget categories; debts unchanged. Zero new fields.

Status: mock `mockups/money-v1-hifi-4tabs-2026-07-19.html` — awaiting founder approval; on yes,
detailed design gets a v1.3 changelog row and the build follows the mock.
