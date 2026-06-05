# FinWise — Features & Capabilities Tracker

> One place to see every capability, what it does, who it's for, and whether it's built.
> Tick the box as things ship. Last updated: 2026-06-05 (Portfolio Performance service shipped).
> **See the "Parked / backlog" list at the bottom for everything we've consciously deferred.**

**Legend**
- `[x]` = built & working   ·   `[~]` = partially built / needs finishing   ·   `[ ]` = not built yet
- 🟢 shipped · 🟡 partial · 🔵 next up · ⚪ later / deferred · 🚧 launch-blocker

**At a glance**

| Area | Built | Partial | Planned |
|---|---|---|---|
| Onboarding & Profile | 6 | 0 | 1 |
| Home / Dashboard | 4 | 1 | 2 |
| Income | 6 | 0 | 1 |
| Budget & Expenses | 5 | 1 | 1 |
| Net Worth (Assets & Debt) | 6 | 0 | 1 |
| Retirement | 10 | 1 | 1 |
| Goals & Savings | 1 | 1 | 3 |
| Portfolio Performance | 4 | 0 | 0 (v2 parked) |
| Insights | 2 | 0 | 1 |
| Foundations (i18n, security, history) | 3 | 2 | 3 |
| Engagement & Intelligence | 3 | 1 | 1 |
| Account & Launch | 4 | 2 | 3 + 1 🚧 |

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
- [x] 🟢 **Ticker holdings drive account value** — A position-based account's value = Σ(shares × live price), so net worth auto-updates with the market. Cash/property stay manual. (See Portfolio Performance.)
  - *Use:* Your brokerage balance moves with the market, no manual edits.
- [x] 🟢 **Performance launch from Net Worth** — "📈 Portfolio performance vs benchmark" entry under the net-worth hero.
  - *Use:* Jump from net worth into per-holding performance.
- [ ] ⚪ **Runway / emergency-fund insight** — "Your cash covers N months of spending."
  - *Use:* "You have 4.2 months of expenses in cash."

## 6. Retirement

- [x] 🟢 **Two-screen cockpit (plan vs sandbox)** — Screen 1 "Where you stand" (your committed plan/facts) + Screen 2 "Scenario" (a what-if sandbox that only changes the plan via "Use as my plan"). State is fully separated.
  - *Use:* Experiment freely without your real plan shifting under you.
- [x] 🟢 **Twin hero (floor + target)** — "If you never save again → retire at X" + "At your target age → $Y, Z% chance it lasts"; each shows the assumed ROI.
  - *Use:* See your safety floor and your on-plan outcome side by side.
- [x] 🟢 **Earmarked nest-egg donut** — Nest egg (not net worth) split by section with per-account edit.
  - *Use:* See that property is excluded and why.
- [x] 🟢 **Holdings table + historic benchmarks** — Each holding's balance + real 30-yr historic benchmark (source + period, not editable) + your-12-mo vs benchmark weighted row + "set a type" for uncategorized.
  - *Use:* "Morgan Stanley benchmarks to S&P 500 TR, 30-yr, 10.4%."
- [x] 🟢 **Return-basis selector** — Choose what grows the projection: benchmark / your 12-mo (⚠ cautioned) / scenario return.
  - *Use:* Project on prudent benchmark, or stress with your own number.
- [x] 🟢 **Projected nest-egg chart** — Year-by-year column chart to retirement with value labels on every bar; stops contributions at retirement; amber retirement marker; now/saved/growth breakdown.
  - *Use:* Watch the nest egg climb, and see exactly what's contributions vs growth.
- [x] 🟢 **Monte Carlo (run on demand)** — Gated behind a "Run simulation" button with a plain-English explainer; p10–p90 band + median, age axis + legend.
  - *Use:* "60% chance your money lasts to 90, across ~400 markets."
- [x] 🟢 **What-if scenarios + Social Security** — Sliders with benchmark/plan reference markers; save/compare scenarios; SS modeled from claim age.
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

## 8. Portfolio Performance Analysis ✅ SHIPPED (v1)

- [x] 🟢 **Per-holding return vs same-period benchmark** — Each ticker holding's price return over the selected period vs the matching index over the SAME period (like-for-like — no more "directional only" caveat) + total ROI since purchase.
  - *Use:* "AAPL +53% vs SPY +24% over 1Y."
- [x] 🟢 **Cost-basis lots (robust, build-once)** — A holding = ticker + lots (shares, cost/share, purchase date); market value, gain, and ROI all derive from lots + live price.
  - *Use:* Two buys at different prices roll into one true cost basis.
- [x] 🟢 **Live pricing behind a swappable provider** — `PriceProvider` interface; data source can be changed in one file without touching model/UI. Positions drive account value → net worth auto-updates.
  - *Use:* Swap the data vendor at launch with zero rework.
- [x] 🟢 **Launchable from Net Worth *and* Retirement** — One screen: period selector (1M…3Y), portfolio value, you-vs-benchmark, per-holding table, add/edit holding sheet.
  - *Use:* Open the same analysis from either surface.
- [ ] 🚧 **Production data licensing (LAUNCH-BLOCKER)** — Dev uses the unofficial Yahoo endpoint, which is **not licensed for a commercial app**. Must swap to a licensed EOD vendor (Tiingo / EODHD / Alpha Vantage / Twelve Data) before release. One-file adapter swap. *(See Account & Launch + Parked list.)*
  - *Use:* Ship legally with reliable prices.
- *(v2 — attribution, allocation, trend chart, ticker autocomplete — see Parked list.)*

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
- [x] 🟢 **Live market pricing (EOD)** — Holding values auto-update from end-of-day market data (via the Performance service). *(Production needs a licensed vendor — see below.)*
  - *Use:* Portfolio value moves with the market without manual edits.
- [ ] 🚧 **Market-data licensing (LAUNCH-BLOCKER)** — The dev Yahoo Finance endpoint is unofficial and **not licensed for commercial/App-Store use**; Yahoo grants only personal viewing. Swap to a licensed EOD vendor before release (EOD/delayed data is cheap, ~$10–50/mo; real-time triggers costly exchange agreements). Confirm the vendor's commercial terms + any attribution. One-file `PriceProvider` adapter swap.
  - *Use:* Avoid a ToS violation and unstable/blocked prices in production.
- [ ] ⚪ **Detail-screen redesigns** — Refresh remaining legacy tab/detail screens.
  - *Use:* Consistent polish across every surface.
- [ ] ⚪ **Push notifications** — Reminders/nudges (plugin configured).
  - *Use:* "You're near your dining budget this month."

---

## 🅿️ Parked / backlog — consciously deferred (running list)

> Things we've decided to do later, grouped by when. Add here whenever we park something so nothing is lost.
> Priority: 🚧 launch-blocker · 🔵 next-up · ⚪ later.

### Must-do before public launch
- [ ] 🚧 **Market-data licensing** — swap the dev Yahoo endpoint for a licensed EOD vendor (Tiingo/EODHD/Alpha Vantage/Twelve Data); confirm commercial terms + attribution. *(one-file `PriceProvider` swap)*
- [ ] 🚧 **`EXPO_PUBLIC_` env keys** — AI tips + receipt OCR are silently off in release builds until keys are prefixed/inlined.
- [ ] 🚧 **Deploy Firestore security rules** — `firebase deploy --only firestore:rules` (written, not deployed).
- [ ] 🚧 **App Store submission package** — screenshots (6.7"/6.5"), description, keywords, category.
- [ ] 🔵 **Email verification + forgot password** — queued auth quick-wins.
- [ ] 🔵 **Encrypted local storage** — move sensitive data to expo-secure-store (currently plain JSON).
- [ ] 🔵 **Receipt OCR native rebuild** — `npx expo run:ios` to activate ML Kit, then test scan.

### Portfolio Performance — v2
- [ ] 🔵 **Attribution** — which holdings drove / dragged your return.
- [ ] ⚪ **Allocation view** — your mix vs a target.
- [ ] ⚪ **Trend chart** — portfolio value vs benchmark over time.
- [ ] ⚪ **Ticker autocomplete / validation** — catch typos, show company names.
- [ ] ⚪ **Price-cache TTL + per-lot edit polish.**

### Retirement
- [ ] 🟡 **Drawdown / decumulation view for retirees** — "will it last?" framing (accumulation done).
- [ ] ⚪ **Tax-aware drawdown** — withdrawal order, capital gains, RMDs, healthcare/LTC.
- [ ] ⚪ **Salary-growth assumption** — contributions rise with raises.

### Goals & Savings
- [ ] 🔵 **Savings goals full UI** — finish the waterfall-backed goals screen.
- [ ] 🔵 **Per-month available-to-save** — use lumpy monthly cash flow, not annual ÷ 12.
- [ ] 🔵 **Non-monthly → sinking-fund goals** — auto-create save-by-date goals (needs target dates).
- [ ] ⚪ **Goal target-date picker.**

### Foundations & i18n
- [ ] 🔵 **Currency picker UI** + on-device `Intl` verify.
- [ ] ⚪ **Full string internationalization** (translate copy, not just numbers).

### Insights & Intelligence
- [ ] 🔵 **Centralized insight service** — rank insights by relevance instead of hardcoding per screen.
- [ ] ⚪ **Plaid bank linking** — auto-pull balances/transactions.

### Home, Nav & Polish
- [ ] 🟡 **Header + bottom tab bar redesign.**
- [ ] ⚪ **Detail-screen redesigns** (legacy tab/detail surfaces).
- [ ] ⚪ **Net-worth-over-time card on Home.**
- [ ] ⚪ **Runway / emergency-fund insight** (needs cash balance).

### Income & Budget
- [ ] 🔵 **Single-total vs categories reconciliation** — one source of truth for spending.
- [ ] ⚪ **Configurable bonus month** (recap assumes December).

### Phase 2 (personas / stickiness)
- [ ] ⚪ **Gen-Z motivational framing** + app-wide **Simple Mode**.
- [ ] ⚪ **"Sharpen your plan" dashboard** — complete onboarding steps skipped earlier.
