# FinWise — Features & Capabilities Tracker

> One place to see every capability, what it does, who it's for, and whether it's built.
> Tick the box as things ship. Last updated: 2026-06-05.

**Legend**
- `[x]` = built & working   ·   `[~]` = partially built / needs finishing   ·   `[ ]` = not built yet
- 🟢 shipped · 🟡 partial · 🔵 next up · ⚪ later / deferred

**At a glance**

| Area | Built | Partial | Planned |
|---|---|---|---|
| Onboarding & Profile | 6 | 0 | 1 |
| Home / Dashboard | 4 | 1 | 2 |
| Income | 6 | 0 | 1 |
| Budget & Expenses | 5 | 1 | 1 |
| Net Worth (Assets & Debt) | 5 | 0 | 2 |
| Retirement | 8 | 1 | 2 |
| Goals & Savings | 1 | 1 | 3 |
| Portfolio Performance | 0 | 0 | 3 |
| Insights | 2 | 0 | 1 |
| Foundations (i18n, security, history) | 3 | 2 | 3 |
| Engagement & Intelligence | 3 | 1 | 1 |
| Account & Launch | 4 | 2 | 3 |

---

## 1. Onboarding & Profile

- [x] 🟢 **Adaptive onboarding flow** — Life-stage-first, one-question-at-a-time wizard whose steps are generated from a data-requirements matrix based on employment status + selected goals.
  - *Use:* A retiree skips income questions entirely; an employed saver gets 401(k)/equity steps.
  - *Use:* User picks "buy a home" and only the fields that goal needs appear.
- [x] 🟢 **Profile module (service 0)** — Owns identity & planning params: age, retirement age, country, dependents, partner, horizon.
  - *Use:* Derives current age & years-to-retirement everywhere from one source.
- [x] 🟢 **Animated summary ("aha" moment)** — Boldin-style count-up readiness %, gauge, and growing trajectory/depletion chart at the end of onboarding.
  - *Use:* New user instantly sees their projected nest egg and feels progress.
- [x] 🟢 **Centi mascot** — SVG coin character that reacts through onboarding (bobs, grins on summary).
  - *Use:* Warms up an otherwise dry data-entry flow.
- [x] 🟢 **Per-section recaps** — Bar-graph recap screens after income/budget/etc. confirming what was captured.
  - *Use:* User reviews their income breakdown before moving on.
- [x] 🟢 **Onboarding design standard** — Hero-amount inputs, segmented pills, green "smart insight" callouts applied to every amount screen.
  - *Use:* Salary screen shows tax-bracket insight as the user types.
- [ ] 🔵 **"Sharpen your plan" dashboard** — A place to complete the optional steps the user skipped during onboarding.
  - *Use:* User skipped debts at signup; later a card nudges them to add it.

## 2. Home / Dashboard

- [x] 🟢 **Live budget home** — Spend-vs-budget hero for the selected month with a progress bar and "$X left / over".
  - *Use:* Mid-month glance: "spent $2,100 of $3,000, $900 left."
- [x] 🟢 **Pace insight** — Projects whether you'll finish the month over/under based on flexible spend per day.
  - *Use:* "At this rate you'll be $150 over by month-end."
- [x] 🟢 **Month switcher + prior-month recap** — Page between months; a recap card (income/spent/saved) appears once a prior month has activity.
  - *Use:* Compare this month's spending to last month's.
- [x] 🟢 **Quick-add & income sheets** — Bottom-sheet to log an expense (category chips + scan) or add one-off income / edit base pay.
  - *Use:* Snap a receipt total in two taps; log a gift as one-off income.
- [~] 🟡 **Header & bottom tab bar polish** — Greeting/streak/avatar header and nav still use older styling; redesign pending.
  - *Use:* A more refined, less-busy top and bottom chrome.
- [ ] ⚪ **Cockpit tiles → redesigned detail screens** — Tiles currently route to some not-yet-redesigned legacy screens.
  - *Use:* Tapping "Budget" opens a polished detail surface, not a legacy tab.
- [ ] ⚪ **Net-worth-over-time card on home** — Trend of net worth across months from snapshots.
  - *Use:* "Your net worth is up $40k over 6 months."

## 3. Income

- [x] 🟢 **Salary capture (gross/take-home)** — Hero amount + pay frequency with a live tax-bracket insight.
  - *Use:* Enter take-home pay; app shows effective vs marginal rate.
- [x] 🟢 **Progressive tax estimate** — 2026 IRS single-filer brackets + standard deduction; gross↔net inversion.
  - *Use:* Convert a gross offer into expected take-home.
- [x] 🟢 **401(k) + employer match** — Hero contribution + match with an IRS contribution-limit check.
  - *Use:* "You're $4k under the $24,500 limit — room to add."
- [x] 🟢 **Equity / RSU & options vesting** — Vesting schedule grid with month-year picker and per-year cash-flow chart.
  - *Use:* Model when RSUs vest and how much cash that frees up each year.
- [x] 🟢 **Bonus, signing & rental income** — One-off and recurring inflows, multi-property rental.
  - *Use:* December bonus and January signing bonus land in the right months.
- [x] 🟢 **Income recap + lumpy monthly cash-flow** — Distributes salary steady, bonus to Dec, equity by vest month → available-by-month grid/chart.
  - *Use:* See that some months free up far more cash to save than others.
- [ ] ⚪ **Configurable bonus month** — Recap currently assumes December; let the user pick.
  - *Use:* User whose bonus pays in March sets it correctly.

## 4. Budget & Expenses

- [x] 🟢 **Spending plan by category** — Common categories grouped Fixed / Non-monthly / Flexible, in $ or % of take-home.
  - *Use:* Set rent (fixed), travel (non-monthly), dining (flexible) budgets.
- [x] 🟢 **Budget-vs-actual** — Month-to-date actual spend vs plan, overall and per bucket.
  - *Use:* "Flexible spending is 80% used with a week left."
- [x] 🟢 **Expense logging** — Manual add with category chips, custom categories, and date.
  - *Use:* Log a $40 grocery run in seconds.
- [x] 🟢 **Recent activity feed** — Combined income (+) and expenses (−), each removable.
  - *Use:* Spot and delete a mis-entered transaction.
- [x] 🟢 **Recurring transactions** — Repeating income/expenses on weekly/biweekly/monthly cadence.
  - *Use:* Auto-track the monthly Netflix charge.
- [~] 🟡 **Receipt scan (OCR)** — Camera/library capture + ML Kit text recognition to parse total & merchant; manual fallback.
  - *Use:* Photograph a receipt; total + store auto-fill. *(Needs `npx expo run:ios` native rebuild to fully activate.)*
- [ ] 🔵 **Single-total vs categories reconciliation** — Decide between the one "average monthly spending" figure and the category breakdown as the source of truth.
  - *Use:* Avoid double-counting spending in recaps vs budget.

## 5. Net Worth (Assets & Debt)

- [x] 🟢 **Per-account assets** — Accounts by section (Cash / Investments / Retirement / Property) with institution & balance.
  - *Use:* Track Fidelity 401(k), Chase checking, and home value separately.
- [x] 🟢 **Debt & liabilities** — Balances, APR, minimum payment; highest-rate and toxic-debt flags.
  - *Use:* See your 19% credit card flagged as toxic debt.
- [x] 🟢 **Net worth (derived)** — Assets − liabilities, with a categorical donut.
  - *Use:* One number for "what I'm worth," broken down by section.
- [x] 🟢 **Benchmark ROI by asset kind** — Expected return per investment type, editable, used for projections.
  - *Use:* Set private-equity benchmark higher than bonds.
- [x] 🟢 **Asset earmarking for retirement** — Set what % of each account counts toward retirement vs other goals.
  - *Use:* Count 100% of the IRA but only 50% of cash toward the nest egg.
- [ ] 🔵 **Benchmark ROI on the Net Worth screen** — Surface the per-type benchmark return on NW too (currently only on Retirement).
  - *Use:* Judge each holding's expected return from the NW view.
- [ ] ⚪ **Runway / emergency-fund insight** — "Your cash covers N months of spending."
  - *Use:* "You have 4.2 months of expenses in cash."

## 6. Retirement

- [x] 🟢 **Two-screen cockpit** — Screen 1 "Where you stand" (facts) + Screen 2 "Scenario" (what-ifs).
  - *Use:* Read your status, then jump in to test changes.
- [x] 🟢 **"Retire at age Y" hero** — Plain-English headline: the age you could retire even if you never save again, from current nest egg + blended benchmark.
  - *Use:* Instant gut-check: "I could retire at 66 today."
- [x] 🟢 **Earmarked nest-egg donut** — Nest egg (not net worth) split by section with per-account edit.
  - *Use:* See that property is excluded and why.
- [x] 🟢 **Instruments table** — Each holding's balance + benchmark ROI with the return's source and period.
  - *Use:* "My Morgan Stanley account benchmarks to S&P 500, 30-yr, 7%."
- [x] 🟢 **Beating-benchmark insight** — Compares your self-reported actual return to your blended benchmark (ahead/behind).
  - *Use:* "You're beating your benchmark by +2.9 pts."
- [x] 🟢 **Projected nest-egg chart** — Year-by-year column chart to retirement (stops contributions at retirement; amber retirement marker).
  - *Use:* Watch the nest egg climb to ~$8.8M by your retirement year.
- [x] 🟢 **Monte Carlo + percentile band** — Probability-of-success and a 10th–90th percentile balance band (log-scaled).
  - *Use:* "78% chance your money lasts to 90."
- [x] 🟢 **What-if scenarios + Social Security** — Sliders (retire age, return, save, spend, inflation) with save/compare; SS modeled from claim age.
  - *Use:* Compare "retire at 60" vs "retire at 65" side by side.
- [~] 🟡 **Drawdown / decumulation view for retirees** — Accumulation is solid; the "will it last?" retired-user surfaces need finishing.
  - *Use:* A retiree sees depletion, not accumulation, framing.
- [ ] ⚪ **Tax-aware drawdown** — Order-of-withdrawal, capital gains, RMDs, healthcare/long-term-care.
  - *Use:* Model drawing from taxable before pre-tax to cut lifetime tax.
- [ ] ⚪ **Salary-growth assumption** — Let contributions rise with raises over time.
  - *Use:* Project higher savings as income grows.

## 7. Goals & Savings

- [~] 🟡 **Savings goals** — Targets with progress (goals tab exists; full waterfall UI to finish).
  - *Use:* Save for a $30k down payment with a progress ring.
- [x] 🟢 **Goal contribution waterfall (engine)** — Allocates available cash across goals by priority.
  - *Use:* Fund emergency fund first, then vacation, with what's left.
- [ ] 🔵 **Per-month available-to-save** — Use lumpy monthly cash flow (not annual ÷ 12) to drive savings capacity.
  - *Use:* Save more in bonus months, less in tight ones.
- [ ] 🔵 **Non-monthly → sinking-fund goals** — Auto-create save-by-date goals from non-monthly categories (needs target dates).
  - *Use:* "$5,000 for travel by July" → required $X/mo set-aside.
- [ ] ⚪ **Goal target dates picker** — Month/year picker per goal to back-calc the monthly amount.
  - *Use:* Set "new car by Dec 2027" and get the monthly number.

## 8. Portfolio Performance Analysis (NEXT major service)

- [ ] 🔵 **Trailing-12-month actual ROI per instrument** — Real per-holding return vs benchmark, sourced trustworthily (ticker data or a contribution ledger).
  - *Use:* "Your tech ETF returned 14% vs its 7% benchmark."
- [ ] 🔵 **Service launchable from NW *or* Retirement** — One performance engine surfaced from both screens.
  - *Use:* Open the same analysis whether you start from net worth or retirement.
- [ ] 🔵 **Per-account contribution ledger / ticker pricing** — The data foundation that makes actual returns accurate (separates deposits from market growth).
  - *Use:* Distinguish "I added $10k" from "the market grew $10k."

## 9. Insights

- [x] 🟢 **Inline smart insights** — Contextual callouts (tax bracket, budget pace, windfall months, "keep $X of every $100").
  - *Use:* "You keep $72 of every $100 you earn."
- [x] 🟢 **AI expense tips** — Claude-generated suggestions from spending patterns.
  - *Use:* "Dining is 22% of spend — here's a target."
- [ ] 🔵 **Centralized insight service** — Rules/data-driven engine that ranks insights by relevance instead of hardcoding per screen.
  - *Use:* The most relevant nudge surfaces first, consistently app-wide.

## 10. Foundations (i18n, Security, Data)

- [~] 🟡 **Currency & locale formatting** — Money model + app-wide formatter wired on active screens; picker UI + on-device verify pending.
  - *Use:* A UK user sees £ and UK number formatting.
- [ ] 🔵 **Currency picker UI** — Let the user choose currency/locale.
  - *Use:* Switch the whole app from USD to EUR.
- [ ] ⚪ **Full string internationalization** — Translate UI copy, not just numbers.
  - *Use:* Use the app in Spanish.
- [x] 🟢 **Monthly snapshots / data history** — Frozen month-end metrics + per-account balances, by category, for trends.
  - *Use:* "Gas spending is up 15% vs last quarter."
- [~] 🟡 **Firestore security rules** — Per-user read/write rules written; must be deployed.
  - *Use:* A user can only ever read their own data. *(Run `firebase deploy --only firestore:rules`.)*
- [ ] 🔵 **Encrypted local storage** — Move sensitive local data to expo-secure-store (currently plain JSON).
  - *Use:* Financial data on-device isn't readable in plaintext.

## 11. Engagement & Intelligence

- [x] 🟢 **Gamification (XP / badges / streaks)** — Rewards for consistent tracking.
  - *Use:* A daily check-in streak keeps the habit going.
- [x] 🟢 **Economic data ticker** — Live inflation (BLS) and Treasury yields feeding defaults.
  - *Use:* Projections default to current inflation, not a stale guess.
- [x] 🟢 **CSV import** — Bulk-import transactions.
  - *Use:* Import a year of bank transactions at once.
- [~] 🟡 **AI/economic API keys in production** — Keys need `EXPO_PUBLIC_` prefix or AI tips + OCR are silently off in release builds.
  - *Use:* Shipped app actually returns AI tips and scans receipts.
- [ ] ⚪ **Plaid bank linking** — Auto-pull balances/transactions.
  - *Use:* Connect a bank so balances update without manual entry.

## 12. Account & Launch

- [x] 🟢 **Firebase auth + persistence** — Email/password login with RN persistence.
  - *Use:* Stay logged in across app restarts.
- [x] 🟢 **Clean-slate on new account** — New login without cloud data resets local store (no data leak between accounts).
  - *Use:* A shared device doesn't expose the prior user's data.
- [x] 🟢 **Settings, legal & error boundary** — Privacy/ToS links, financial disclaimer, feedback form, sign-out; white-screen crash guard.
  - *Use:* Required App Store compliance + graceful crash recovery.
- [x] 🟢 **App icon, splash & EAS build pipeline** — Branded assets + production build/submit config (launch crash fixed).
  - *Use:* Build #18 opens cleanly on device.
- [~] 🟡 **Email verification + forgot password** — Queued auth quick-wins.
  - *Use:* Reset a forgotten password; verify email at signup.
- [~] 🟡 **App Store submission package** — Listing created; needs screenshots, description, keywords, and the `EXPO_PUBLIC_` key fix.
  - *Use:* Pass App Store review and go live.
- [ ] ⚪ **Live market pricing** — Auto-update holding values from market data.
  - *Use:* Portfolio value moves with the market without manual edits.
- [ ] ⚪ **Detail-screen redesigns** — Refresh remaining legacy tab/detail screens.
  - *Use:* Consistent polish across every surface.
- [ ] ⚪ **Push notifications** — Reminders/nudges (plugin configured).
  - *Use:* "You're near your dining budget this month."
