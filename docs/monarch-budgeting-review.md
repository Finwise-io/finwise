# Monarch Money — Budgeting & Planning Flow Review (benchmark for FinWise)
_Research date: 2026-05-31_

## 1. Monarch's mental model: income-first, balanced monthly budget
Monarch's budget is a **monthly cash-flow system**: start from the income you expect this month, then **assign it to expenses and savings until the plan balances**. The headline number users watch is essentially "income − planned expenses − planned savings = left to budget." Everything hangs off *this month's income*, not a static target.

## 2. Two budgeting modes (switchable anytime)
- **Flex budgeting (the DEFAULT):** spending rolls up into just **three buckets — Fixed, Non-monthly/recurring, and Flexible spending**. You don't set a limit per category; categories flow up to the bucket total. Designed for people who *don't want to micromanage*. Can be redefined as Needs/Wants/Savings, etc.
- **Category budgeting:** a limit per category, tracked as transactions land. For users who want dollar-level control.
- The ability to switch modes (e.g., after a job change) is itself a feature.

## 3. Signature UX details that make it feel "premium"
- **Pace-aware color states:** green = under budget; **yellow = on track to go *over* if you keep spending at the current pace** (projection, not just current state); red = already over. The yellow/projection is the sophisticated touch most apps miss.
- **Rollovers:** leftover in a flexible category carries into next month (a "cycle" icon marks it). Great for lumpy categories (groceries, dining).
- **Cash Flow page + Sankey diagram:** an interactive in→out flow of money by category/group/merchant. Highly visual, "engaging."
- **Monthly Progress Review:** a guided, multi-page recap (cash flow, plan progress, top income/expense categories, net-worth change) surfaced as a dashboard widget — a "report card" moment each month.
- **Customizable dashboard:** rearrange widgets (net worth, spending trends, upcoming bills, investments) to taste.

## 4. FinWise today (src/screens/BudgetScreen.tsx) — honest assessment
Current budget experience:
- Budgeting lives inside a 4-way segmented control: **Transactions | Budget | Debts | Import**.
- "Budget" tab = one **overall "Spent" strip + progress bar** ("On track" / "Over target") and a **by-category breakdown** with per-category spend vs. limit + progress bars.
- Binary status (on track / over), category-level only, no income-driven allocation.

It's functional but it's a **spend-tracker against a flat target**, not a **plan**. That's the gap the user feels.

## 5. Gap analysis — where FinWise misses the bar
| Dimension | Monarch | FinWise today |
|---|---|---|
| Mental model | Income → allocate → "left to budget" (a plan) | Flat target + category spend (a tracker) |
| Low-effort mode | **Flex 3-bucket** default | Category-only (more tedious) |
| Progress feedback | **Pace-aware** green/yellow/red | Binary on-track/over |
| Rollovers | Yes | No |
| Cash-flow viz | Sankey in/out | Bar charts (analytics tab) |
| Monthly review | Guided recap widget | None (has analytics + gamification, not tied together) |
| Placement | Budget/Plan = first-class | One of four segmented sub-tabs |

## 6. Recommendations to raise FinWise to the bar (prioritized)
1. **Adopt the income-first balanced-budget model.** Top of the Budget tab: `Income this month → Expenses → Savings → Left to budget`, with a balance indicator. This is the single biggest mental-model fix and reuses the income/expense data already in the store. *(Highest leverage.)*
2. **Add Flex (bucket) budgeting as the default.** Three buckets — Fixed / Flexible / Savings (or Needs/Wants/Savings). Categories roll up. Offer Category mode as the power option, switchable. Especially important for FinWise because it's **manual-entry** (no bank link) — less to maintain = more likely the user sticks with it.
3. **Pace-aware progress.** Replace binary status with green/yellow/red where yellow = projected to exceed at current pace (compute from days-elapsed vs. spend-rate). Cheap, high-perceived-polish.
4. **Rollovers** for flexible categories (carry leftover/overage to next period). Matches FinWise's existing budget-frequency concept.
5. **A "Month in Review" moment.** FinWise already has analytics + gamification (XP/streaks/badges) — package them into a guided monthly recap card. This is a place FinWise can *beat* Monarch (Monarch has no gamification).
6. **Elevate Budget/Plan to a primary destination** rather than one of four segmented sub-tabs; move Import/Debts to secondary.

## Sources
- Monarch Flex vs Category budgeting; "Creating Your Budget in Monarch"; Cash Flow & Sankey; Rollover Budgets; Monthly Progress Report (help.monarch.com / monarch.com/blog).
- Reviews: Penny Hoarder, Experian, FinanceBuzz, ThinkSaveRetire (2026 Monarch reviews).
