# How the best tools show Net Worth, Net-Worth Change, and Investment Return — and what MoneyKeel should do

**Version:** v1 · **Date:** 2026-08-04 · **Method:** web research (product help centers, product pages, and hands-on reviews of Empower/Personal Capital, Monarch Money, Kubera, Copilot Money, Fidelity (Full View + brokerage Performance), Schwab, Vanguard, Betterment, Wealthfront, Quicken, YNAB, ProjectionLab, Boldin, plus UX writing on financial dashboards). All sources listed at the end.

**How to read this:** Parts 1–3 are "what the leaders do." Part 4 is "what MoneyKeel should do," mapped to our actual screens. The one-page summary table is at the end.

---

## Part 1 — Showing the net worth number itself

### The hero number: everyone leads with ONE big total

Every well-regarded tool puts a single total at the top — not two numbers, not a table.

- **Empower (Personal Capital):** the dashboard's Net Worth widget shows the current total **at the top of a 365-day graph**. Hovering the graph reveals the value and the one-day change for any date. The number is split into categories (Cash, Investment, Mortgage, Loan, Other) only when you go deeper.
- **Monarch Money:** net worth sits **at the top of the Accounts page**, covering all assets and liabilities; the chart below lets you change the period and touch the line to see the change for any day. You can "zoom in on your assets and liabilities" as a second step — the split is one interaction away, not on the hero.
- **Kubera:** a deliberately clean single sheet — total net worth up top, then assets, debts, and allocation below. Reviewers consistently praise it for being "clear and uncluttered."
- **Copilot Money:** accounts roll up into one real-time net worth figure (assets minus everything you owe, including credit cards and loans).
- **Fidelity Full View:** a Net Worth screen with **assets on the left, liabilities on the right**, and the net total as the headline. This is the clearest "own vs. owe" layout in the group.
- **YNAB:** the Net Worth report shows assets as blue bars and debts as red bars month by month, with the net-worth trend line over them — the own/owe split is *always* visible here, which works because it's a report page, not a home screen.
- **ProjectionLab:** current finances page shows assets and liabilities at the top plus a historical net-worth chart.

**Takeaway:** one number on the hero; the own/owe split lives one tap or one scroll away (Fidelity's two-column layout and YNAB's blue/red bars are the best split presentations once you get there). Nobody makes the user do subtraction on the home screen.

### The trend sparkline: standard, and it carries the "change" story

Empower's 365-day hero graph and Monarch's period-selectable line chart are the pattern: a **simple line under the number, no axes or gridlines on the hero**, with detail available on touch. YNAB's monthly bars are the exception, and that's a dedicated report screen. Verdict: a sparkline under the hero is the convention, and it should cover the same period as the change statement so the words and the picture agree.

### The as-of stamp: rare in consumer tools, but the UX literature is emphatic

Consumer tools mostly show **per-account freshness** ("updated 2 hours ago" next to each connected account) rather than a global "as of" stamp on the hero. Empower refreshes on login; Fidelity Full View states data is scanned and refreshed daily. But UX guidance on financial dashboards is unambiguous: label data with its freshness ("Data as of 10:42 AM"), warn when a connection is stale, and never present possibly-stale data as current — freshness labeling is called out repeatedly as a trust builder (Smashing Magazine on real-time dashboards; fintech-dashboard best-practice guides). **MoneyKeel's as-of stamp is ahead of consumer convention and matches the best-practice literature. Keep it.**

### Masked / privacy modes

The emerging convention is an **eye icon that hides amounts**:

- **Trading 212's "Visual Privacy Mode"** is the best-articulated version: it "blurs anything that reveals how much money you have, earn, or move, **while market data and percentages that are the same for everyone stay visible**." That's a smart rule — dollars are private, direction and percentages are not.
- **Monarch's Demo Mode** masks all balances, net worth, transactions, and charts at once — built explicitly for showing the app to someone else.

**Takeaway:** mask every dollar amount with one toggle; percentages and up/down direction may stay visible. (MoneyKeel already has hide-balances with mask classes — the Trading 212 rule is a good check that our masking of dollars-but-not-direction is the right line.)

---

## Part 2 — Showing the CHANGE in net worth

### Period conventions

- **Empower:** hero graph defaults to the **last 365 days**; hovering gives one-day changes. (Day-to-day wiggle is available but never the headline.)
- **Monarch:** a period selector on the chart; touch the chart for any day's change.
- **YNAB:** the report shows the **total change for the selected timeframe** plus an **itemized month-over-month change** — change over a period you chose, then the month steps inside it. Balances snapshot on the last day of each month.
- **Kubera:** a "Recap" view/report rolls up changes by day, week, month, quarter, and year — and its annual "Recap" wealth report shows the year's change; "since you started tracking" appears naturally because Kubera keeps full history.
- **Schwab:** performance pages allow fully custom date ranges.

**Takeaway:** the standard menu is roughly *1 month / 3 months / year-to-date (the year so far) / 1 year / all time*, with "all time" meaning "since you started tracking." The best tools lead with a **longer period** (a year, or the year so far) and make the daily wiggle an on-demand detail, not the headline. For people at or near retirement that ordering matters even more: a daily red number is anxiety with no decision attached.

### The key question: do the best tools DECOMPOSE net-worth change?

**At the net-worth level: essentially none of them do.** We checked Empower, Monarch, Kubera, Copilot, and YNAB — the net-worth screen in each shows the change as one undifferentiated number. (Monarch's *forecasting* tool decomposes projected balances into starting balance, deposits, growth, and withdrawals — but that's the forecast, not the history.) This is a real, verifiable gap.

**At the account/investment level, the best-in-class pattern exists and has settled wording:**

- **Fidelity's Performance page** has a section literally titled **"What drove your change in balance?"** breaking the period's balance change into: deposits and withdrawals · investment gains or losses · fees. Fidelity also states the principle outright: withdrawals are not treated as a decline in your return; deposits are added capital, not gains.
- **Wealthfront** separates **net deposits** from **change in value attributable to market performance** in its own reporting, and refuses to show "simple return" precisely because it blurs the two.
- **The cautionary tale is Robinhood:** its portfolio chart historically used a simple rate of return that let **deposits look like gains**, which drew years of criticism ("vastly overstates returns depending on your deposit strategy"); its newer managed-account charts switched to a method that excludes deposits. Conflating "money you added" with "money you made" is the documented way to lose trust.

**What honest-but-simple looks like for a 55–70 user:** the Fidelity question — *"What drove the change?"* — answered in at most three or four plain rows: what the markets did, what you added, what you took out or spent, what debt you paid down. Dollar amounts, not percentages. Rows must sum to the headline change. That's it.

One nuance worth stating in our copy someday: **paying down debt raises net worth only by the principal part** (the interest is money gone). "You paid down debt" rows must be principal only, or the sum won't reconcile — which is also the honest number.

---

## Part 3 — Showing investment return (ROI)

### Two camps: "your money's return" vs. "your investments' return"

Consumer tools split cleanly into two methodologies, and the labels they use are instructive:

**Money-weighted camp** (return of *your dollars*, counting when you added/withdrew — also called internal rate of return):

- **Fidelity** headlines **"Your Personal Rate of Return,"** explicitly described as money-weighted: it reflects the investments' performance *plus* "the size and timing of your additions and/or withdrawals," including dividends, interest, and fees.
- **Vanguard** also calls it **"personal rate of return"** (an internal rate of return) and explains it with the best plain-English device we found: *imagine a bank savings account with the same deposits and withdrawals on the same days — your personal rate of return is the interest rate the bank would have had to pay to end at your balance.* Vanguard also warns not to compare it with published fund returns, "which use a time-weighted calculation."
- **Quicken** shows **"Average Annual Return (IRR)"** — with 1, 3, and 5-year columns — defined as "the interest rate a bank account would have to pay to give you the same total return."
- **Kubera** uses internal rate of return everywhere, for every asset type, and benchmarks it (see below).

**Time-weighted camp** (return of *the investments themselves*, deposits taken out of the equation):

- **Schwab** computes its personal rate of return with a **time-weighted** method (Modified Dietz, linked monthly) and lets you view returns over custom time frames.
- **Monarch** states its investment return is **time-weighted**, shown on a performance graph against benchmarks like the S&P 500.
- **Wealthfront** leads with the **time-weighted return** ("evaluate us like an index fund"), *also* shows a **money-weighted return**, and pointedly does **not** show simple return.
- **Betterment** shows **both**, with the clearest plain-language framing in the industry: time-weighted "takes deposits and withdrawals out of the equation" (use it to judge how well the portfolio is built); the money-weighted **"Individual rate of return"** "includes the impact of the size and timing of your deposits and withdrawals."

**Takeaway:** the most trusted brokerages either pick money-weighted and label it "your personal rate of return," or show both with one sentence each explaining the difference. Nobody expects a 55–70 user to know the terms — the good ones translate: *"counts when you added money" vs. "ignores when you added money."*

### How they defuse the classic complaint — "my return looks wrong because I deposited money"

This complaint fills the Bogleheads and Reddit threads for every one of these products. The defusing devices, ranked by effectiveness:

1. **A standing sentence next to the number.** Fidelity: deposits are added capital, not gains; "withdrawals are not treated as a decline in your return." One sentence, always visible.
2. **The bank-account analogy** (Vanguard, Quicken). It converts internal rate of return into something anyone can picture.
3. **A worked example of how the two returns can differ** (Wealthfront's help center: deposit $10,000, it doubles; deposit $100,000, market drops 25% — time-weighted +50%, money-weighted −31%). Best kept in a help sheet, not on the screen.
4. **A dollar breakdown next to the percentage** ("What drove your change in balance?") so the user can *see* that their deposit is listed as a deposit, not as a gain.

### Period conventions for returns

- Period chips of roughly **1M / 3M / 6M / year-to-date / 1Y / All** are the norm (Monarch, brokerages). Quicken adds 1/3/5-year columns. Kubera shows since-purchase per asset.
- **Empower's "You Index" defaults to year-to-date.** Fidelity publishes account returns monthly with cumulative and annualized views.
- **Kubera has the most honest annualization rule we found:** it shows the annualized internal rate of return **only when the holding is older than one year**; for fixed windows (year-to-date, 1 year) or young holdings it shows the simple percentage gain instead — deliberately, "to show simple gain or loss over that window, not annualized performance." Never annualize a short window.

### Benchmark presentation

- **Empower "You Index":** the performance of your *current* holdings extrapolated backward, charted against the S&P 500 and other indexes. Honest detail worth copying: Empower states plainly what it **excludes** ("does not include your individual bonds, options, or other alternatives"). Weakness: because it uses current holdings extrapolated backward, it isn't your actual history.
- **Monarch:** performance graph of your (time-weighted) return vs. a chosen benchmark like the S&P 500 — same period, overlaid lines.
- **Kubera:** the most honest version for money-weighted comparison — it computes *"if you had invested the same money in the S&P 500 (or another ticker) for the same period, here's what you'd have"* — same dates, same cash flows, so it's a true apples-to-apples "should I have just bought the index?" answer.

**Takeaway:** the honest benchmark is **same dates, same money movements** — which is exactly the shape of MoneyKeel's existing same-dates, mix-matched benchmark. That approach is *ahead* of most consumer tools.

---

## Part 4 — Recommendations for MoneyKeel

Framing note for all of these: our audience is 55–70, our promises are plain English, honesty, and no invented numbers. The research supports big-type single numbers, dollar-first wording, longer default periods, one-sentence explanations instead of term labels, and honest fallbacks when we can't compute something.

### (a) The Net worth hero — keep it; it already matches or beats the leaders

Current: one number + "▲ up $2,110 this year" + as-of + sparkline.

1. **Keep the single hero number.** Every leader does exactly this. Keep own − owe one tap/scroll away (our existing split matches Fidelity Full View's assets-left/liabilities-right idea and YNAB's blue/red).
2. **Keep the change in dollars and words, not chips.** "▲ up $2,110 this year" is better than a bare "+2.4% · 1Y" chip for this audience: dollar-first (our standing decision), and the period is named in words. Add the matching down-state wording ("▼ down $1,340 this year") with the same calm tone — no red-alarm styling for normal market wiggle.
3. **Keep the as-of stamp.** Consumer tools mostly bury freshness per account; the UX literature says label it. It is one of our honesty differentiators. One stamp, one sentence, per our one-freshness-sentence rule.
4. **Keep the sparkline**, axis-free, covering the **same period as the change statement** so the words and the picture always agree.
5. **Masking:** mask all dollars; the up/down arrow and percent may remain visible (Trading 212's rule: amounts are private, direction isn't). Fits our existing mask classes.

### (b) Change decomposition — YES, build it, as a tap-through from the change line

**Verdict: worth building.** No mainstream net-worth tracker decomposes net-worth change into market vs. added vs. debt paydown — the pattern exists only at brokerage account level (Fidelity's "What drove your change in balance?"). For a 55–70 user the undecomposed number actively misleads in both directions: "up $2,110" might be $6,000 of deposits hiding a $3,890 market loss, and "down $500" might be a planned withdrawal, not a loss. Answering "am I actually getting ahead, or did I just move money?" *is* our honesty promise applied to the hero number.

**Placement:** a drill-down (tap the "▲ up $2,110 this year" line), not extra hero clutter. Hero stays one number + one line.

**Plainest wording (modeled on Fidelity's question format):**

> **Where the change came from** (this year)
> - Markets moved your investments — **▲ $1,480**
> - You added money — **+ $900**
> - You took money out — **− $620**
> - You paid down debt (principal) — **+ $350**
> - **Total change — ▲ $2,110**

Wording rules: "money you added," never "contributions" or "cash flow"; "markets moved your investments," never "market appreciation"; debt row is principal only (interest isn't a net-worth gain — and the rows won't sum otherwise).

**Honesty guardrails (must-haves, per our accuracy-is-trust rule):**
- The rows must **sum exactly to the headline change** — pin with a cross-screen agreement test.
- Where we can't split (a manual account with balance edits but no transactions, or a stale connection), say so: *"We can't break down the change for [account] — we only have its balances."* Show the unsplit remainder as its own labeled row rather than inventing a split. This is the Robinhood lesson inverted: they got pilloried for blending deposits into gains; we win by never blending and by admitting when we can't separate.

### (c) The Performance tab — keep the structure, fix two labels, add one sentence

Current: period chips 1M–3Y · price-only return + 4-line breakdown (incl. realized/dividends/interest) · same-dates mix-matched benchmark · separate money-weighted return card.

1. **Keep the 4-line dollar breakdown — it's our best feature.** It is exactly Fidelity's "what drove your change in balance" device, and the dollar rows are what make a percentage believable. Consider titling it with the question ("What drove this?") rather than a noun label.
2. **Fix the price-only headline.** For 55–70 portfolios heavy in bonds, CDs, and dividend payers, a price-only percentage systematically understates the truth (a CD looks like 0% forever). Either make the headline the **total return including dividends and interest** (with price/income split right below — the honest total is the better headline), or, at minimum, label the current headline explicitly: *"price change only — dividends and interest below."* Recommendation: promote the total; keep the split visible.
3. **Keep the money-weighted card, relabel it in words.** Suggested: **"Your money's growth rate"** with the subtitle *"Counts when you added or took out money — like the interest rate a bank would have had to pay you."* (Vanguard's analogy, one line.) Never lead with "money-weighted return" or "IRR"; those can sit in a small "how we figure this" note.
4. **Add the one standing sentence near returns:** *"Adding money isn't a gain — deposits don't count toward your return."* This single line (Fidelity's move) pre-empts the most common return complaint in every product's forums.
5. **Adopt Kubera's annualization rule:** show a yearly rate only when the window is longer than a year; for 1M–1Y chips show the plain percentage gain for that window. Never annualize a short window (a 6% month must never appear as "≈100%/yr").
6. **Keep the same-dates, mix-matched benchmark — it's ahead of the market.** Empower extrapolates current holdings backward; Monarch overlays the S&P 500; Kubera's same-period same-money comparison is the only equally honest one. Label it in words: *"A plain index mix like yours, over the same dates."* One honest caveat line if the mix is approximated.

### (d) Default periods per surface

| Surface | Default | Why |
|---|---|---|
| Net worth hero | **This year** (year-to-date) | Matches statements and taxes; long enough to be meaning, short enough to be current. Leaders lead long (Empower 365 days), never daily. |
| Change drill-down | **Follows the hero period** | The rows must explain the exact headline number — one period, one truth. |
| Performance tab chips | **This year** default; 1Y one tap away | Consistent with the hero; Empower's You Index also defaults to year-to-date. |
| Money's-growth-rate card | **Since you started** (all time), yearly rate only past 1 year | An internal rate of return is most meaningful over the whole history; short-window versions confuse. |

One period language rule: say **"this year," "last 12 months," "since you started"** — words, not "YTD/1Y/ALL," on any label a 55–70 user reads (chips can stay compact, but the selected period should be echoed in words near the number).

---

## One-page summary table

| Element | Convention the leaders use | Our recommendation | Why (55–70 lens) |
|---|---|---|---|
| Net worth hero | One big total on top (Empower, Monarch, Kubera, Copilot, Fidelity) | Keep single number, dollar-first | Glanceable; no arithmetic on the home screen |
| Own vs. owe | Split one step away; Fidelity assets-left/liabilities-right; YNAB blue/red bars | Keep own − owe one tap below hero | Simple hero, honest detail on demand |
| Trend sparkline | Standard under/behind the number (Empower 365-day, Monarch line) | Keep; axis-free; same period as the change words | Direction at a glance without chart-reading |
| As-of stamp | Rare on heroes; per-account "updated X ago"; UX literature strongly pro-labeling | Keep our global as-of + one freshness sentence | Trust: never present stale as current |
| Privacy mask | Eye icon; Trading 212 blurs amounts, keeps percentages/direction | Keep mask-all-dollars; arrow/percent may stay | Show the phone to family without exposing dollars |
| Change period | Leaders lead long (365 days / selected period); daily only on hover | Lead with "this year," words not codes | Daily red numbers = anxiety without a decision |
| Change decomposition | **Nobody does it at net-worth level**; Fidelity's account-level "What drove your change in balance?" is the model | **Build it** as a tap-through: markets / you added / you took out / debt paid (principal); rows sum to headline; honest "can't split" fallback | Answers "am I actually getting ahead?" — the honest heart of the product |
| Return methodology | Money-weighted: Fidelity/Vanguard/Quicken/Kubera. Time-weighted: Schwab/Monarch/Wealthfront. Both: Betterment/Wealthfront | Keep dollar breakdown as anchor + money-weighted card labeled "Your money's growth rate" | Dollars first; the method named in words, not initials |
| "Deposits aren't gains" | Explicit sentence (Fidelity); bank analogy (Vanguard); worked example (Wealthfront); Robinhood = the cautionary tale | Add one standing sentence near returns | Pre-empts the #1 return complaint in every forum |
| Annualizing | Kubera: yearly rate only if window > 1 year, else simple gain | Same rule everywhere | Never a scary/fake annualized number from a short window |
| Benchmark | You Index extrapolation (Empower); overlay vs. S&P 500 (Monarch); same-dates same-money (Kubera) | Keep our same-dates mix-matched benchmark; plain-words label | Apples-to-apples honesty beats a flattering index race |
| Default periods | Year-to-date is the most common lead (Empower You Index; statements) | This year everywhere; "since you started" for the money's-growth-rate card | Aligns with statements and taxes; stable, calm |

---

## Sources

**Net worth display**
- Empower support — Dashboard Overview (net worth widget, 365-day graph, 1-day hover): https://support-personalwealth.empower.com/hc/en-us/articles/201169740-Dashboard-Overview
- Rob Berger — Empower review and user's guide: https://robberger.com/empower-review/
- NerdWallet — Empower Personal Dashboard review: https://www.nerdwallet.com/finance/learn/empower-personal-dashboard-budget-app-review
- Monarch — tracking feature page: https://www.monarch.com/features/tracking
- Monarch — "Net Worth Improvements and More" blog: https://www.monarch.com/blog/net-worth-improvements-and-more
- Monarch — "New Net Worth Chart" blog: https://www.monarch.com/new-net-worth-chart-investment-transactions-and-more
- Kubera reviews (dashboard, Recap): https://moneywise.com/investing/reviews/kubera-review · https://wallethacks.com/kubera-review/ · https://www.wallstreetzen.com/blog/kubera-app-review/
- Copilot Money reviews: https://www.forbes.com/advisor/banking/copilot-budget-app-review/ · https://stackswitch.app/review/copilot-money
- Fidelity Full View FAQs (assets left / liabilities right; daily refresh): https://www.fidelity.com/go/full-view-faqs · https://www.fidelity.com/cash-management/faqs-full-view
- YNAB support — "Reflect on Net Worth" (blue/red bars, timeframe change + month-over-month): https://support.ynab.com/en_us/net-worth-BkwQO5WA5
- ProjectionLab — net worth page: https://projectionlab.com/net-worth · Rob Berger review: https://robberger.com/projectionlab-review/
- Boldin (audience-matched planner) reviews: https://wellkeptwallet.com/newretirement-review/ · https://www.retirebeforedad.com/boldin-review/

**Privacy / freshness / older-adult UX**
- Trading 212 — Visual Privacy Mode (blur amounts, keep percentages): https://helpcentre.trading212.com/hc/en-us/articles/34887476742045-Introducing-Visual-Privacy-Mode
- Monarch — Demo Mode (mask all balances): https://help.monarch.com/hc/en-us/articles/46153716425876-Demo-Mode
- Smashing Magazine — UX strategies for real-time dashboards (freshness labeling, "data as of"): https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/
- WildnetEdge — fintech dashboard UX best practices (freshness indicators): https://www.wildnetedge.com/blogs/fintech-ux-design-best-practices-for-financial-dashboards
- Springer / PMC — systematic review, age-friendly mobile app design: https://link.springer.com/article/10.1007/s40520-025-03157-7 · https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12350549/
- Fintech UX writing & readability guide (plain language builds trust): https://medium.com/@buckfirstmusic/designing-for-clarity-the-ux-writing-readability-guide-for-fintech-products-09ae790f346e
- Nielsen Norman Group — UX design for seniors: https://www.nngroup.com/reports/senior-citizens-on-the-web/

**Change decomposition**
- Fidelity.com Help — Performance ("What drove your change in balance?"; deposits ≠ gains; money-weighted definition): https://www.fidelity.com/webcontent/ap002390-mlo-content/19.09/help/learn_performancereporting.shtml
- Wealthfront — return calculation help (net deposits vs. market performance; no simple return): https://support.wealthfront.com/hc/en-us/articles/209353386-How-do-you-calculate-the-return-displayed-on-my-dashboard-and-account-pages
- BenFrankly — Robinhood's simple-rate-of-return chart criticism: https://www.benfrankly.com/money/robinhoods-use-of-srr-in-portfolio-performance-reporting-and-why-i-dont-use-it-to-track-my-investment-performance/
- Robinhood — Strategies charts (Modified Dietz, deposits excluded): https://robinhood.com/us/en/support/articles/strategies-charts
- Monarch help — Forecasting (starting balance / deposits / growth / withdrawals breakdown): https://help.monarch.com/hc/en-us/articles/48344305092244-Forecasting-in-Monarch

**Returns / ROI**
- Fidelity — Personal Rate of Return (money-weighted): https://www.fidelity.com/webcontent/ap002390-mlo-content/19.09/help/learn_performancereporting.shtml
- Vanguard — "Important information about personal rate of return" (internal rate of return; bank-account analogy; don't compare with time-weighted fund returns): https://personal.vanguard.com/us/content/MyPortfolio/performance/LMperfSummaryInfoContent.jsp
- Schwab — Personal Performance help (time-weighted, Modified Dietz): https://content.schwabplan.com/download/misc/PersonalPerformanceHelp.htm
- Betterment — understanding returns (time-weighted vs. "Individual rate of return"): https://www.betterment.com/resources/understanding-returns-in-your-betterment-account/ · https://www.betterment.com/help/time-weighted-returns · https://www.betterment.com/help/money-weighted-returns
- Wealthfront — TWR default, MWR shown, simple return rejected; +50%/−31% example: https://support.wealthfront.com/hc/en-us/articles/209353386-How-do-you-calculate-the-return-displayed-on-my-dashboard-and-account-pages
- Quicken — Average Annual Return (IRR) definition and views: https://info.quicken.com/win/how-do-i-view-my-average-annual-return-irr · https://info.quicken.com/win/tell-me-about-key-investment-performance-calculati
- Kubera — internal rate of return + benchmarking vs. S&P 500/tickers for the same period: https://help.kubera.com/article/79-irr-of-my-investment-in-kubera · https://www.kubera.com/blog/rate-of-return-diverse-portfolio
- Kubera — when ROI is shown instead of IRR (annualize only past 1 year): https://help.kubera.com/article/155-why-is-kubera-showing-roi-instead-of-irr-for-some-of-my-investments-is-it-a-bug
- Empower — What is the You Index (current holdings extrapolated backward; exclusions; year-to-date default): https://support-personalwealth.empower.com/hc/en-us/articles/201169610-What-is-the-You-Index
- Monarch help — Investments (time-weighted return; benchmark graph vs. S&P 500): https://help.monarch.com/hc/en-us/articles/41855507661076-Investments-in-Monarch
- Bogleheads — "Personal Capital: You Index vs Performance" (user confusion evidence): https://www.bogleheads.org/forum/viewtopic.php?t=314110
