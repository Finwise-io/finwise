# FinWise — User Guide & Test Checklist

A plain-English walkthrough of everything the app can do. Each numbered item is one capability you can
test on its own. Tick it off as you go.

**Getting around:** the bottom bar has four tabs — **Home**, **Budget**, **Retire**, **Goals**.
The **top-left ☰ menu** opens Settings. The **top-right "Net worth $…"** pill opens your Net Worth
screen, which is also the launchpad for the three portfolio tools (Performance, Bonds, Other
investments).

---

## 1. Getting started (Onboarding & Profile)

1. **Adaptive sign-up wizard** — A one-question-at-a-time setup that changes based on who you are. If
   you say you're retired it skips salary questions; if you pick "buy a home" it only asks what that
   goal needs. *Test:* run through sign-up (or Settings → "Re-run setup wizard") and notice questions
   adapt to your answers.
2. **The "aha" summary** — At the end of onboarding you see an animated count-up of your readiness
   score, a gauge, and a projected savings trajectory. *Test:* finish onboarding and watch the numbers
   animate in.
3. **Centi the mascot** — A little coin character that reacts as you move through setup.
4. **Per-section recaps** — After you enter income, budget, etc., a recap screen shows a bar chart of
   what you just captured so you can confirm it before moving on.

## 2. Home dashboard

5. **Greeting + streak** — Personalized "Good morning, [name]" with a daily-use streak counter.
6. **Persona focus card** — A colored card near the top with shortcuts tailored to your life stage
   (e.g. a pre-retiree sees "Retirement outlook" + "Portfolio"; a younger saver sees "Goals & debt" +
   "Grow investments"). *Test:* confirm the two shortcuts match your stage and that they open the right
   screens.
7. **Sharpen-your-plan nudge** — A card showing your plan-completion % and how many steps remain
   (only appears when you're under 100%). Tapping it opens the full checklist (see #45).
8. **Insights for you** — The top 2 personalized insights with a "See all ›" link (see #43).
9. **Live budget hero** — The big "spent $X of $Y" card for the selected month with a progress bar and
   "$ left / over."
10. **Debt-to-be-paid hero** — Companion card showing this month's debt payments and progress.
11. **Pace insight** — Projects whether you'll end the month over or under budget at your current rate.
12. **Month switcher** — Page back/forward between months with the ‹ › arrows; a recap card appears for
    past months that had activity.
13. **Quick-add expense / income** — The "+ Add expense" button and income sheet let you log a
    transaction in a couple taps (category chips, optional receipt scan).

## 3. Income

14. **Salary capture (gross or take-home)** — Enter pay with your pay frequency; a live insight shows
    your tax bracket as you type.
15. **Tax estimate** — Uses 2026 IRS single-filer brackets + standard deduction and can convert gross
    pay to expected take-home (and back).
16. **401(k) + employer match** — Enter your contribution and match; it checks against the IRS annual
    limit and tells you how much room is left.
17. **Equity / RSU & options** — A vesting-schedule grid (month/year) with a per-year cash-flow chart so
    you can see when equity turns into cash.
18. **Bonus, signing & rental income** — One-off and recurring inflows, including multiple rental
    properties.
19. **Income recap with lumpy cash flow** — Spreads salary evenly, drops your bonus in its month, and
    places equity by vest month, producing a month-by-month "available to save" picture (some months
    free up far more than others).
20. **Income Manager** — A single screen listing every income source with the ability to edit base pay,
    bonus, signing bonus, add one-off income, and record investment income. *Where:* reached from the
    income area / income detail.
21. **Dividends, interest & coupons line** — Investment income shown here automatically includes cash
    dividends you've logged **and** bond coupon income from your bonds (see #34).

## 4. Budget & Expenses

22. **Spending plan by category** — Common categories grouped as Fixed / Non-monthly / Flexible,
    entered in dollars or as a % of take-home.
23. **Budget vs actual** — Month-to-date actual spending vs your plan, both overall and per group.
24. **Expense logging** — Add expenses manually with category chips, custom categories, and a date.
25. **Recent activity feed** — A combined list of income (+) and expenses (−), each removable.
26. **Recurring transactions** — Repeating income/expenses on a weekly/biweekly/monthly cadence.
27. **Receipt scan (OCR)** — Photograph a receipt to auto-fill the total and merchant, with a manual
    fallback. *Note:* full scanning needs a native rebuild to activate; the manual path always works.

## 5. Net Worth (Assets & Debt)

28. **Per-account assets** — Track accounts grouped Cash / Investments / Retirement / Property, each with
    institution and balance.
29. **Debt & liabilities** — Balances, APR, and minimum payments; the highest-rate and "toxic" debts get
    flagged.
30. **Net worth (auto-calculated)** — Assets minus liabilities, shown as one number with a category
    donut. *Test:* add or edit an account and watch the top-right net-worth figure update.
31. **Benchmark return by asset type** — Each investment type has an expected historical return used in
    projections.
32. **Retirement earmarking** — Set what % of each account counts toward retirement vs other goals.

## 6. Portfolio — Performance (stocks & ETFs)
*Launch from the Net Worth screen → "Portfolio performance vs benchmark."*

33. **Holdings with cost basis** — Add stock/ETF holdings by ticker with purchase lots (shares, price,
    date). Prices update from a live market-data source.
34. **New-investor friendly entry** — You can add a holding with **just ticker + shares**; cost and date
    are optional ("add later for return-since-purchase"). *Test:* add a holding entering only shares and
    confirm it saves.
35. **Portfolio summary** — Total value, your return over the selected period, the benchmark's return,
    and how much you beat/trailed it. Period selector: 1M / 3M / 6M / YTD / 1Y / 3Y.
36. **Per-holding table** — Each holding's value, shares, return since purchase, and (in Advisor mode)
    its matching benchmark.
37. **Trend chart** — A line chart of your portfolio value vs the S&P 500 (rebased to the same start)
    over the selected period, with the % change for each.
38. **What drove your return (attribution)** — Which holdings contributed most/least to your period
    return (with weights shown in Advisor mode).
39. **Allocation** — Your mix by asset kind plus cash, as percentages.
40. **Record transactions** — Buy, sell, and dividend actions with guardrails (can't sell more shares
    than you own; cash checks; dividends only for tickers you actually hold).

## 7. Portfolio — Bonds
*Launch from Net Worth → "Bonds — coupons, maturity & yield."*

41. **Individual bonds** — Add a bond with issuer, face value, coupon rate, maturity date, and current
    value. The app shows annual coupon income, years to maturity, current yield, and an estimated yield
    to maturity. A summary card totals value, coupon/year, average yield, and your next maturity. Bonds
    count toward your net worth and retirement nest egg, and their coupons feed your income (see #21).

## 8. Portfolio — Other investments
*Launch from Net Worth → "Other investments — crypto, PE, commodities."*

42. **Alternatives at a manual value** — Track crypto, private equity, hedge funds, commodities, and
    annuities at a value you set, each with a type-appropriate note (e.g. "crypto is volatile"). A
    summary shows total value, what % of your investable assets it is, expected return, and estimated
    annual growth. These also count toward net worth and the nest egg.

## 9. Insights & plan completeness

43. **Insights for you** — A personalized, ranked list of suggestions generated from your actual numbers
    (e.g. high-interest debt to tackle, thin emergency fund, room left in your 401(k), too much in cash,
    over-concentration in one holding, low savings rate, plan incomplete). Most-urgent first; each one
    taps through to the relevant screen. *Where:* top 2 on Home; full list via "See all ›."
44. **Healthy state** — If nothing is urgent, the Insights screen says so. *Test:* clear out the issues
    and confirm the "all healthy" message appears.
45. **Sharpen your plan** — A checklist of six setup areas (income, accounts, spending plan, investments,
    retirement, goals) with a completion score; each unfinished item routes you to where to fix it.

## 10. Retirement
*The "Retire" tab.*

46. **Twin hero numbers** — Two side-by-side figures: where you'd land if you never saved another dollar,
    and your projected nest egg at your target retirement age (with the assumed return shown).
47. **Projection chart** — A year-by-year column chart of your nest egg to the target age, with each bar
    labeled, clearly based on your target retirement age.
48. **Return-basis selector** — Choose whether projections use your plan's assumed return or your actual
    trailing-12-month return.
49. **Plan vs Scenario sandbox** — Screen 1 is your committed plan; Screen 2 is a sandbox to test
    "what if I retire earlier / save more / markets do worse," with a "Use as my plan" button to commit
    a scenario. *Test:* change a scenario slider and confirm Screen 1 doesn't change until you commit.
50. **Monte Carlo** — A "chance your money lasts" simulation behind a button, with a percentile band.
51. **Tax-smart moves (while saving)** — Guidance like Roth vs Traditional, 401(k) headroom (incl. 50+
    catch-up), and a Roth-conversion window.
52. **Your drawdown (when retired)** — For retirees: a "will it last?" view with withdrawal rate vs the
    4% rule, the age your money runs out, withdrawal order (cash → taxable → pre-tax → Roth), and
    required minimum distributions (RMDs) starting at age 73.

## 11. Goals & Debt
*The "Goals" tab.*

53. **What you can save** — A card showing your typical free cash to save per month, and (when your cash
    flow is lumpy) the month-to-month range.
54. **Sinking-fund suggestion** — Suggests setting aside money each month for your non-monthly costs
    (travel, gifts, repairs) so they don't blow the budget; one tap creates the goal.
55. **Goals with progress** — Add savings goals (emergency fund, home, trip) with a target, amount saved,
    progress bar, and the monthly amount needed to hit your timeline.
56. **Debt-payoff plan** — Choose Avalanche (least interest) or Snowball (quick wins), add any extra
    monthly payment, and see how long until debt-free, total interest, interest saved, and the payoff
    order. *Test:* switch methods and add an extra payment; watch the months and interest change.

## 12. Settings & personalization
*Top-left ☰ menu.*

57. **Simple vs Advisor mode** — Simple hides technical detail (benchmark sources, Monte-Carlo jargon,
    attribution weights, caveats); Advisor shows everything. *Test:* toggle it, then open Performance or
    Retirement and confirm the level of detail changes.
58. **Text size (accessibility)** — Default / Large / Larger, applied across the whole app. *Test:*
    switch to Larger and confirm text grows everywhere.
59. **Email verification** — After signing up you get a verification email; Settings shows a banner with
    "Resend" and "I've verified" until your email is confirmed. *Note:* delivery is handled by the
    backend; confirm with a real email account.
60. **Forgot / reset password** — From the sign-in screen, request a reset link by email.
61. **Re-run setup wizard** — Redo onboarding to update goals and parameters.
62. **Job safety check** — A tool to plan for income gaps.
63. **Send feedback** — Submit feedback (feature/bug/etc.) from Settings.
64. **Sign out.**

## 13. Under the hood (still good to test indirectly)

65. **Cloud sync** — Your data saves to your account and reloads on sign-in across devices.
66. **Encrypted local storage** — Data stored on the device is AES-encrypted at rest, with the key held
    in the secure keychain. *Note:* keychain protection fully activates after a native rebuild; until
    then a safe encrypted fallback is used. Nothing to see directly — just confirm your data persists
    across app restarts.
67. **Currency formatting** — Money is formatted for your locale (a currency picker UI is still to come).

---

### Notes / known limitations to keep in mind while testing
- **Receipt OCR** and **keychain-backed encryption** need a native dev-client rebuild
  (`npx expo run:ios`) to fully activate; both have safe fallbacks today.
- **Bank/brokerage auto-linking (Plaid)** is not built yet (needs API keys + a backend).
- **Live market-data licensing** must be swapped before public launch; current prices are from a free
  source for development.
