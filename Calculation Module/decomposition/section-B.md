# SECTION B — PORTFOLIO PERFORMANCE — metric use-case grid

Dated 2026-08-19. Spine: crosswalk tab "9. Comprehensive Metrics" rows 24–41. Arithmetic governed by master tab "1. Metrics" (column K); current behaviour cited from master tab "2. Engines" and the engine files in `Calculation Module code/engines/`. Audit references are to `audits/cross-tab-consistency-audit-2026-08-19.md`. "Refuse" always means: show the dollars we do know, then one plain reason, never a blank (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B16–B17).

Coverage line: 18 of 18 Section B metrics (spine rows 24–41) · 51 of 51 purpose cases · 306 of 306 condition cells — every cell a calculation, a named refusal, an argued N/A, or a pointer to the cell that carries the rule. (The earlier count of 47 cases / 282 cells was a tally error; the grid itself was always complete.)

---

### Period return
What the person is really asking: How did my investments do?

#### P1 — How did my money do (my deposit timing included)

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Beginning value: no snapshot on or before the window start | Refuse the rate. Never back-solve the beginning value from today minus the ledger — on the founder's own Vanguard account that produced minus $448,028 against a statement's $378,022 (snapshots.ts:1-13). Show the dollars instead: "worth $X today; $Y went in and $Z came out since <first recorded date>" (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B16). The person can supply it: type a statement value with its date, kept as "as you entered it". A flow with no date: fall back from Modified Dietz to Simple Dietz — assume mid-period, and say so on screen; it is a stated assumption, not a hidden one (the master's Metrics tab K16; audit 5). |
| B degraded | Only month-end values; or flows known as period totals, not dated | Modified Dietz still holds with a month-end beginning value: R = (end − start − net flows) ÷ (start + Σ flow × w), w = (D−d)/D with the flow fixed at the END of its day, matching the after-close snapshot (the master's Metrics tab K17; audit 6). Worked: start $100,000, $10,000 added on day 20 of 30, end $112,500 → gain $2,500 ÷ (100,000 + 10,000×⅓) = 2.4%. A denominator at or below zero — a large withdrawal landing early does it — REFUSES, never prints: a near-zero base turns pocket change into a spectacular percentage (the master's Metrics tab K17). Undated flow totals → Simple Dietz, labelled. Simple return may stand in ONLY when net flow is under 1% of the beginning value (the master's Metrics tab K15) — and note the same decision carries a second threshold of 10% on the spine's Comprehensive Metrics tab (crosswalk-Aug19) B15 (audit 4, open question 1). |
| C shape-per-road | File import and connection can carry the same days twice; unsigned amounts with stated directions | A double-loaded ledger invents flows: every row needs a stable identity (account, date, type, amount, units, security) so importing the same file twice changes nothing (the master's Metrics tab K48). Direction comes from the EVENT, never the sign (the master's Transaction taxonomy tab rule 1) — but today ledger.ts:165 sums absolute values and money.ts:39 lets a stated direction override a received sign, so a payment and its reversal ADD (audit 36). Until fixed, any window containing a reversal pair fails the identity check and the rate must not display. |
| D time-bounded | 3 days / 3 weeks / 3 months | Under ~30 days: refuse the RATE, not the screen — show the dollar walk with one plain line: "a percentage over ten days would be mostly noise" (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B15–B17). 30 days to the record's start: baseline = last snapshot on or before the window start; if the record starts inside the window, label "measured from <first date>", never as the asked window (coverage.ts; the spine's Comprehensive Metrics tab (crosswalk-Aug19) B20). Boundary convention: the window opens AFTER the start day's close, so a flow dated on the start day is OUTSIDE the window (the Metrics tab K6, convention 2; audit item 2 — carried downstream only by these grids until it lives in one tested module). Never annualise under a year (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B19; audit 47 — the one adopted baseline fix skipped the flows test, do not repeat that). Over a year, annualise only a deposit-aware figure — Modified Dietz in, never simple return — on actual calendar days including leap days (the master's Metrics tab K21; audit 9). And where IRR stands in for Dietz (spine R24 allows either): solving with t in years returns an ANNUAL rate by construction, so a sub-year window must convert back — (1+r)^(days/365) − 1 — or the never-annualise rule is broken silently; and when the flows change direction more than once the equation has several valid answers, so detect that and refuse (the master's Metrics tab K19; audit 7 — the refusal is missing from the engine's list today). |
| E related events | Reinvestments, transfers, in-kind moves | A reinvested dividend is NOT a flow — it is income ONCE, on its income leg; the purchase leg raises units AND cost basis, and is never a flow (the Metrics tab K14; the Transaction taxonomy tab rows 20–21; founder case 5; events.ts:78 rightly keeps it out of the flow list — the basis half is audit item 1's open defect). An internal transfer nets only when BOTH legs have arrived; legs land on different days and can straddle the window boundary — hold an unmatched leg as pending, don't count it (the master's Metrics tab K10). Securities moved in or out ARE flows at market value on the transfer date (the master's Metrics tab K8/K9) — but today an outbound in-kind transfer books as a CONTRIBUTION (events.ts:139 maps "delivered out" to SECURITIES_IN; audit 32), and SnapTrade's underscore spelling misses the pattern entirely so those flows vanish (audit 33). Until both fix, in-kind rows must be quarantined from the flow list and named on screen. |
| F account-type / confidence | IRA vs taxable; rebuilt vs measured history | The rate itself has no tax — same math every account type. The LABEL changes: growth inside an IRA is before tax on withdrawal; never present it as spendable. If the beginning value comes from a reconstructed day, the rate carries "estimated from rebuilt history" (snapshots.ts:57 origin flag; the spine's Comprehensive Metrics tab (crosswalk-Aug19) B13). If any account in the set is stale beyond tolerance, name that account rather than blending silently. |

#### P2 — How did my investments do (deposit timing stripped, comparable to an index)

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No daily value series — the store is young or absent | Refuse the time-weighted return entirely. Nobody transmits history (snapshots.ts:10-12), so it exists only from the day the store starts. Offer P1's money-weighted figure, labelled as answering a different question. The screen says: "we can compare you to an index from <store start date> onward". |
| B degraded | Month-end points only; days where a holding has no price | Chain monthly sub-period returns, each month computed as that month's own Modified Dietz — NEVER the raw ratio of month-end values, which counts a mid-month deposit as growth, the exact thing this return exists to strip. Honest but blind inside the month; label "from month-end values". An unpriced day drops out; a gap wider than a few days breaks the chain → refuse, with "no daily price exists for this holding" so absence reads as a fact about the instrument, not an app failure (the master's Metrics tab K55; audit 23). |
| C shape-per-road | Where flows and prices came from | Same as P1-C — the daily series is ours regardless of road; only the flow rows differ per road, and the same identity rule applies. |
| D time-bounded | Short and long windows | Same as P1-D, plus: no window longer than the daily record (2 years of dailies, snapshots.ts:72); since-inception splices month-ends, labelled. |
| E related events | Flow dates and corporate actions | A mis-dated deposit shifts a whole sub-period of the chain — flow DATES matter more here than in P1. A split must not read as a value change: events.ts:89 says CORPORATE_ACTION touches units but ledger.ts:42 maps it to ADJUSTMENT which touches nothing (audit 39) — a 2-for-1 split day would show a fake −50% until units are adjusted. Reinvestments are not flows, as in P1-E. |
| F account-type / confidence | What may sit next to an index | This is the ONLY return allowed beside a benchmark (the master's Metrics tab K32; audit 15). Same labels as P1-F otherwise. |

#### P3 — How did this account do

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | This account's history starts later than the household's | Same as P1-A, per account — the store keeps per-account rows (snapshots.ts AccountSnapshot; the spine's Comprehensive Metrics tab (crosswalk-Aug19) B7). Label each account with its own "measured from" date; never let the household's older date imply coverage. |
| B degraded | Same inputs as P1-B | Same as P1-B, scoped to the one account, INCLUDING its cash — the account's return is Modified Dietz over the whole account, cash included; per-holding figures only explain it (the master's Metrics tab K59). Today VALUE_WEIGHTED_RETURN weights holdings by today's value and drops cash (the master's Engines tab r71; audit 26, 46) — that number is not the account's return and must not be labelled as one. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | Transfers between the person's own accounts | The scope changes the answer: a transfer from Vanguard to Schwab IS a flow for the Vanguard account and NOTHING for the household. One engine, two scopes — today the engine cancels only inside the measured set with no household register (the master's Engines tab r76; audit 30). Both legs must still have arrived (P1-E). |
| F account-type / confidence | Account tax type | Same as P1-F; the account's own tax type drives the label ("before tax on withdrawal" on IRA/401(k) accounts). |

---

### Dollar gain
What the person is really asking: Am I ahead, in money?

#### P1 — Total gain

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Beginning value missing | Gain = end − beginning − net flows; with no beginning value there is no gain figure, full stop. Show what we do have: worth today, money in, money out, income received — each "since <first recorded date>". Do not show a gain "since install" dressed as a longer period (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B20). Person supplies: a statement value with its date. |
| B degraded | Rows we could not classify | An unknown word is quarantined — kept, shown, counted in NOTHING (engines/events.ts:95–96) — with an alert on first sight within a day (the Transaction taxonomy tab rule 3b); the alert is not built yet (audit item 44). The gain therefore excludes those rows by construction, and the screen must say "N entries we could not classify are in none of these figures" (ledger.ts:169 unclassified) — until the alert exists, that count on screen is the only warning anyone gets. |
| C shape-per-road | Signed vs unsigned amounts, reversals | Same as Period return P1-C — the $2,387 class: reversals add instead of cancelling under today's absolute-value sum (audit 36). A dollar-gain figure over a window containing an unmatched reversal is wrong by twice the reversed amount; the identity check must gate display. |
| D time-bounded | Window gain | Same baseline rule as Period return P1-D. The dollar walk is the thing we show precisely when the rate refuses — dollars stay well-defined when a percentage does not (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B16). |
| E related events | Accrued interest; money coming back; in-kind moves | The agreed rule: ending value = positions + cash + ACCRUED INTEREST, reconciled against the broker's own stated total (the master's Metrics tab K7). The snapshot store has no accrued-interest field yet (audit 3, 49), so until it does the $1,289 the founder's own T-note carries sits as its own visible line — "difference we cannot yet explain", which the person may categorise (founder comment K6) — never folded into gain. A maturing bond or CD is the person's own money back, not gain and not a deposit (events.ts:80); only the slice bought below or above face is a small realised gain or loss, on its own line (the master's Transaction taxonomy tab R29). In-kind transfers as in Period return P1-E (audit 32, 33). |
| F account-type / confidence | Tax framing | In a taxable account: "before tax and before trading costs". In an IRA/Roth: the gain is real but pre-tax on withdrawal (IRA) or tax-free (Roth) — no capital-gains words in either. Income that was already taxed must never re-appear inside "gain" — see Return by holding P1-E for the basis rule that enforces this. |

#### P2 — Split: what markets did vs what I added

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No per-holding history at the period start | The split needs market movement MEASURED bottom-up: Σ shares held × price change + gains realised on sales + income earned; then unexplained = (end − beginning − flows) − measured (the master's Metrics tab K12). Without per-holding start data, refuse the split and show only the total with "we cannot yet split this between the market and your deposits". Never derive "market" by subtraction alone — that renames every ledger error as market performance (spine R25 trap). |
| B degraded | The realised-gain leg cannot be computed | The engine's totals vocabulary has no realised-gain member (events.ts:56; audit 31), and the two-route identity check — beginning + flows + market + income − costs = ending, within a cent — is not built (the master's Transaction taxonomy tab rule 4; audit 45). Until both exist, the measured route lacks a leg: show the unexplained remainder honestly sized, and treat a large one as the ledger telling us something is wrong, not as noise. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | Same as P1-D — both routes use the same window baseline, or the gap between them is definitional, not real. |
| E related events | Reinvested income; restated days | Reinvested income sits inside value AND basis — in the bottom-up sum count the income ONCE (its income leg) and the purchase leg as units only. On single-row file rails the income leg is currently lost entirely (events.ts:112 maps the whole row to the purchase; audit 34). A restated past day must arrive as a NEW versioned row with the old kept — today record() destroys the earlier row (snapshots.ts:101 vs the spine's Comprehensive Metrics tab (crosswalk-Aug19) B12; audit 54) — otherwise last month's split can silently change and nobody can say why. |
| F account-type / confidence | Same as P1-F | Same as P1-F, plus: the unexplained line always prints when above tolerance — scaling the parts to fit makes every part wrong (the master's Metrics tab K30). |

---

### Return by holding
What the person is really asking: Which of my investments is working? (The founder's five unrealized-gain cases live here — each is honoured verbatim below.)

#### P1 — Since purchase

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Founder case 1: cost basis not available. Founder case 3: quantity not available | Basis missing → NO percentage and NO gain figure. Show value, units, income received, and: "We don't know what you paid for this. Add what you paid — or the purchase date and we'll look up the price." Never treat missing basis as zero: that reports the entire value as gain (the engine already skips such lots rather than calling shares free — the master's Engines tab r62). Quantity missing → we cannot even value it ourselves; if the broker states a market value, show it tagged "as stated by your broker", with no per-share figures and no return, and ask for the share count. |
| B degraded | Founder case 2: only average cost, not by lot | Total gain stays honest: value + cash distributions − average basis. What must be suppressed: any long/short split and any pick-these-shares advice — there are no purchase dates to judge (the spine's Snapshot & Honesty tab (crosswalk-Aug19) F7). Today one synthetic lot feeds a GUESSED split (audit 51) — that stops. Where the basis is price×units with fees excluded, the gain is overstated by the fees paid, and the missing sentence is mandatory: "It does not include trading costs, so your real gain is likely smaller" (the spine's Snapshot & Honesty tab (crosswalk-Aug19) F8; audit 52). Every basis figure carries its definition tag, and two differently-tagged figures are never added silently (the spine's Snapshot & Honesty tab (crosswalk-Aug19) B10); rank lot-with-fees over average over price×units, and fall back downward only — never upgrade a weak figure by inventing the missing part (the spine's Snapshot & Honesty tab (crosswalk-Aug19) B11; audit 53). |
| C shape-per-road | Basis arrives differently per source; options priced per share vs per contract | A file may carry fees inside basis; a feed may send an average without fees; FDX-derived basis is price×units with no fee field (the spine's Snapshot & Honesty tab (crosswalk-Aug19) R6–R8) — tag per source, never one choice for the whole app. Options: value is contracts × price × 100 only when the price is per SHARE; SnapTrade documents option cost per CONTRACT — multiplying by 100 again overstates what was paid a hundredfold (the master's Metrics tab K57; audit 25). Record per source which it is and assert the result against the broker's own stated position value before display. And fractional shares and crypto need exact decimal arithmetic end to end — today every engine runs ordinary floating point, which loses slivers of a unit that surface as a few cents that never reconcile and cannot be traced (the master's Metrics tab K50; audit 21). |
| D time-bounded | Founder case 4, verbatim: performance page, duration 3 months — gain for the 3 months or the whole purchase period? How is cost basis determined for 3 days / 3 weeks / 3 months? | The rule: cost basis is NEVER re-determined for a window. "Gain since purchase" keeps its basis; a 3-month figure is a different number — change in value over the window: units held × (price now − price at window start), plus for units bought inside the window, units × (price now − their purchase price). Baseline = the snapshot at window start, not any cost figure. Worked: 100 shares bought at $50 (basis $5,000), $90 at window start, $95 today → 3-month figure $500; since purchase $4,500. Two labels, never mixed. No snapshot at window start → refuse the window figure and show since-purchase labelled with the purchase date (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B18). |
| E related events | Founder case 5, verbatim: dividend marked reinvestment vs cash — how do income and unrealized gain each compute? | Cash dividend: income for the holding; units and basis unchanged; it belongs in income (and P3), never inside unrealized gain. Reinvested dividend: a reinvested dividend is income ONCE, on its income leg; the purchase leg raises units AND cost basis, and is never a flow (the Metrics tab K14; the Transaction taxonomy tab rows 20–21; founder case 5). Skip the basis increase and the person's own reinvested income re-presents as gain — income taxed once shown as gain to be worried about twice. Worked: fund bought for $50,000; $30,000 of dividends reinvested over the years; worth $110,000. True gain $30,000; with unadjusted basis the screen claims $60,000 — half of it is their own taxed income. Today the reinvest event touches units only (events.ts:78; audit 1) and none of the four basis adjustments exist in code (the spine's Snapshot & Honesty tab (crosswalk-Aug19) B12; audit 50). Also: return of capital REDUCES basis and is not income — today it books as a plain SELL touching no basis (ledger.ts:36; audit 37); a split leaves total basis unchanged (audit 39). |
| F account-type / confidence | IRA/Roth vs taxable | Inside an IRA/Roth: never frame the gain in capital-gains terms and never show "tax if sold" — sales there create no taxable gain (the master's Metrics tab K47/K54; audit 22). Taxable: "before tax and before trading costs". Every gain figure carries one line naming its weakest ingredient — the person needs to know if it is good enough to act on, in those words (the spine's Snapshot & Honesty tab (crosswalk-Aug19) B13). |

#### P2 — Over a chosen window

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No price at the window start | Refuse the window return for that holding. For instruments with no daily price at all (CDs, some bonds): "no daily price exists for this holding" (the master's Metrics tab K55; audit 23) — offer the since-purchase view instead. |
| B degraded | Month-end prices only | Use the nearest month-end at or before the window start as baseline and label it; a 3-week window inside one month then has no honest baseline → refuse the rate, show the dollar change from the nearest covered date. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | This purpose IS the time-bounded variant | The full rule is P1-D. Additionally: a holding bought mid-window is weighted by the share of the window actually held and stays OUT of any full-window list unless so weighted (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B18; the master's Metrics tab K60). |
| E related events | A dividend paid inside the window | The price drops on the ex-date, so a price-only window return understates the holding by its income. Either label "price change only — income shown separately" or add cash distributions paid in-window to the numerator. Splits inside the window must be unit-adjusted or the return is nonsense (audit 39). |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

#### P3 — After income

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A | Same as P1-A — and if income history is shorter than the holding period, the "after income" figure understates silently; state the income lookback beside it (the master's Metrics tab K20). |
| B degraded | Same as P1-B | Same as P1-B. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | Which income may be added | CASH distributions only. Reinvested income is already inside value and inside basis — adding it to the numerator counts it a third time (the master's Metrics tab K20). Today HOLDING_TOTAL_ROI is gain ÷ paid and is PINNED while the Metrics tab calls it a DEFECT (the master's Engines tab r144; audit 8, 46) — the two tabs must agree before this ships. Return of capital is never added as income (audit 37). |
| F account-type / confidence | Same as P1-F | Same as P1-F — and note the cash-vs-reinvested split changes where return shows up (price vs income), not the total; say that plainly so two funds with different dividend settings compare fairly. |

---

### Contribution to return
What the person is really asking: What drove the change?

#### P1 — Winners and detractors

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No snapshot at the period start | Attribution needs BEGINNING weights: weight at period start × that holding's period return (the master's Metrics tab K30). No start snapshot → no attribution; show since-purchase gain per holding, ranked, labelled "since you bought them — not what drove this period". |
| B degraded | Holding bought or sold mid-period; unpriced holding | Mid-period holdings carry the share of the period actually held, never a full-period weight (the master's Metrics tab K60). An unpriced holding drops from BOTH numerator and denominator and is named on screen, not counted as flat (the master's Engines tab r71 note). Today the live engines weight by TODAY'S value — a holding bought last week gets credited with the whole quarter (the master's Engines tab r60/r71; audit 13, 26). |
| C shape-per-road | Same holding, two doors | Same as Period return P1-C for the flows; and the per-holding return underneath follows Return by holding P2. |
| D time-bounded | Short windows | Same refusal as the headline rate (Period return P1-D): if the portfolio return is refused as noise, its decomposition is noise too. |
| E related events | Mid-period money movement | The parts will NOT sum to the portfolio return when money moved — that gap is real arithmetic, not error. Show it as its own line, "rest of the change", never scaled away (the master's Metrics tab K30; audit 13). "Parts sum within tolerance" must be an assertion in code, not a hope in a comment (the master's Metrics tab K60) — it is the cheapest early warning in the whole module. |
| F account-type / confidence | Cash in the account | Cash is part of the account's return — a retiree's large cash sleeve earning 5% is a real contributor, and excluding it overstates everything else (the master's Metrics tab K59; audit 26). Label the list "explains the change — the headline return is measured separately". |

#### P2 — Which account moved the needle

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A | Same as P1-A, at account grain — the store keeps per-account rows precisely for this (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B7). |
| B degraded | Same as P1-B | Same as P1-B, with each account's weight at its beginning value. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | Transfers between accounts | A transfer between two of the person's accounts shifts weight without any market move — mark it, or account A reads as a loser and account B as a winner for moving money (same two-leg rule as Period return P3-E). |
| F account-type / confidence | Same as P1-F | Same as P1-F, plus each account's freshness named — one stale account inside a household attribution poisons the ranking silently. |

#### P3 — Which asset class did

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Class unknown for some holdings | The unclassified bucket is explicit and carries its own contribution line — never spread across classes (the master's Metrics tab K38). Same start-snapshot rule as P1-A. |
| B degraded | Same as P1-B | Same as P1-B, aggregated to class. |
| C shape-per-road | Same holding classified differently per door | One classifier for every road: the same holding imported by file and by connection must land in the same class — a test writable today (the master's Metrics tab K40; classify.ts ladder). |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | Same as P1-E | Same as P1-E. |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

---

### Benchmark comparison
What the person is really asking: Am I doing better or worse than just buying the index?

#### P1 — Return difference

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No time-weighted return yet (no daily series) | The difference is time-weighted portfolio return minus index return over identical dates — nothing else may be subtracted. Until the daily series exists, show the two numbers side by side — our money-weighted figure and the index's own — and print NO difference: "these answer different questions" (the master's Metrics tab K32; audit 15). Today the live engine blends benchmarks against a money-weighted number and prints "beat by" (the master's Engines tab r70) — that line comes down. |
| B degraded | Index series partial for the window | Identical dates or no comparison. A portfolio measured over 91 days against an index over 88 is a fabricated difference — refuse and say which days are missing. |
| C shape-per-road | Which index series | Market data is always ours (spine R28) — one source, one series, the TOTAL-return index, not the price index: a portfolio that includes dividends against a price-only index flatters the portfolio by the index's whole yield. Name the series and its as-of date on screen. |
| D time-bounded | Short windows | Same refusal as Period return P1-D — and a 3-week "you beat the market" is regret bait with no decision value; the dollar version (P2) is the honest short-window answer. |
| E related events | Deposits during the window | Deposits are exactly what the time-weighted return strips — that is why it is the only eligible number here. If the money-weighted number must appear, it appears beside, never subtracted (the master's Metrics tab K32). |
| F account-type / confidence | Fees and tax | The index pays no fees and no tax; the person does. One line: "the index number has no costs in it." Inside an IRA the comparison is clean of tax; in taxable, acting on it has a tax cost (see P2-F). |

#### P2 — The same money in the index instead

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Flow dates missing | Run the person's ACTUAL dated flows through the index's total-return series and compare ending dollars — one dollar figure, no return math, immune to the flow mismatch (spine R28; the master's Metrics tab K32). A flow without a date gets mid-period placement, stated on screen — the comparison inherits that assumption; if most flows are undated, refuse. |
| B degraded | Flows themselves degraded | Same flow rules as Period return P1 (A–C): phantom or double-loaded flows corrupt this comparison identically — the in-kind and reversal defects (audit 32, 33, 36) gate this screen too. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Flows predate the index history or the record | Refuse when either history is too short (the master's Metrics tab K63). The trend-chart version has the same rule: rebasing the index to the start is only fair when the portfolio line has no deposits in it — either mark the deposit points on the line or run the deposits through the index; today the probe PINS the bare rebase as correct (the master's Engines tab r115; audit 28). |
| E related events | In-kind transfers in | Shares that arrived in kind enter the simulation at market value on their arrival date, like any deposit (the master's Metrics tab K8) — booked at zero they make the index path unbeatable. |
| F account-type / confidence | Regret framing; tax | This is the most regret-inducing screen in a retirement app: show a RANGE of what could have happened, not one clean number, and keep "this is what happened, not what to do next" permanently beside it (the master's Metrics tab K63; audit 29). In taxable accounts add: "switching would have had a tax cost this comparison ignores." |

#### P3 — Risk-adjusted

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No return series | (Portfolio return − cash rate) ÷ volatility of the same series. Needs the daily store; without ~12 months of it, refuse — a risk-adjusted figure on 3 months is noise wearing a suit. |
| B degraded | Sparse series | Monthly points give at most 12 observations a year — say "based on N monthly observations" and refuse under 12. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Short windows | N/A beyond the refusal above, argued: a risk-adjusted number is definitionally a long-series statistic; there is no honest 3-week variant to offer. |
| E related events | Deposits in the series | Volatility must be computed on the RETURN series (flows stripped), not the value line — a deposit is not a rally. Same series discipline as Risk measures P1. |
| F account-type / confidence | Audience | Prefer plain words to ratios for this audience — "more swing per unit of gain than the index" (spine R36 trap). Whether Greek-letter measures appear at all is open question 6. |

---

### Income earned
What the person is really asking: What is this paying me?

#### P1 — Received last period

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | An account has balances but no transactions | Income there is UNKNOWN, not zero: "we can't see income for accounts without transaction history" — a manual account's interest is invisible and the total must say the household figure excludes it. Person supplies: connect the account or add income entries. |
| B degraded | History shorter than the window | Sum of signed income events in the window — dividends, interest, and fund capital-gain payouts as separate lines. History shorter than asked → label "from <first transaction date>" (the master's Metrics tab K20 discipline; coverage.ts). |
| C shape-per-road | Unsigned amounts; single-row reinvestment files | Count income from the INCOME event only; the reinvestment is a purchase (the master's Metrics tab K23). This is the founder's $2,387-shown-for-$1,193-received: the credit and its reinvestment debit both counted under absolute-value summing (money.ts:1-8; audit 36). On single-row file rails (OFX-style REINVEST), the income leg is currently counted NOWHERE — the whole row maps to the purchase (events.ts:112; audit 34) — so income on that road is understated and the screen must say so until the parser splits the row. |
| D time-bounded | 3 days / 3 weeks / 3 months | Income is a sum of dated events — always computable for any covered window, no rate involved, no 30-day refusal. Only rule: the window label carries its true dates, and a window predating the history refuses (same as B). |
| E related events | The misfiles that inflate or starve income | Return of capital is NOT income — it is the person's own money back and it reduces basis; counting it as income overstates what a retiree can safely spend, the most damaging misfile in the file (the master's Metrics tab K24; audit 37). A fund's capital-gain distribution is not a dividend and is taxed differently — today ledger.ts:33 labels it one (audit 35). Accrued interest PAID at purchase is money advanced, recovered from the next coupon — today it matches /interest/ and books as income RECEIVED (events.ts:136; audit 38). Tax withheld never nets against the income it came from (the master's Transaction taxonomy tab R32). Crypto staking rewards are income at the value on the day received, but the event does not exist yet and quarantines as UNKNOWN (the master's Transaction taxonomy tab R45; audit 43). |
| F account-type / confidence | Where the income lives | Taxable account: this income is taxable this year. IRA/401(k): not taxed now, taxed on withdrawal — never feed a current-year tax estimate from it. Roth: not taxed at all (qualified). Income already taxed once must never re-present as gain — the basis rule in Return by holding P1-E is what enforces this. |

#### P2 — Trailing twelve months

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A | Same as P1-A. |
| B degraded | Broker history shorter than 12 months | Same sum over 12 months, FLAGGED when history is shorter (spine R29): "covers 8 of the last 12 months" — an unflagged short lookback silently understates a retiree's income by a third. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | The 12-month window is the variant | Same as P1-D with a fixed 12-month window. |
| E related events | Same as P1-E | Same as P1-E. |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

#### P3 — By holding

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Income rows without a security | Group income events by security. Account-level interest (sweep, cash APY) carries no ticker — it lands on an "account cash" line, never force-assigned to a holding. |
| B degraded | Same as P1-B | Same as P1-B, per security. |
| C shape-per-road | Same as P1-C | Same as P1-C — the single-row reinvest defect (audit 34) hits per-holding income hardest, because the missing leg belongs to a specific fund. |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | Same as P1-E | Same as P1-E. |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

#### P4 — Cash vs reinvested

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The two events cannot be told apart | Two totals from two distinct events: dividend paid in cash vs the income leg of a reinvestment (the master's Transaction taxonomy tab R19–R21). Where a road cannot distinguish them, show ONE income total and say the split is unavailable on that road — never guess the split. |
| B degraded | Same as P1-B | Same as P1-B. |
| C shape-per-road | Single-row reinvest rails | Same as P1-C — this purpose is broken outright by audit 34 on file rails until the parser splits the row, because the reinvested half is exactly the half that vanishes. |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | What the split means | Both roads are income earned; the difference is spendability — cash landed in the account, reinvested bought more shares. For someone living on income this split IS the question; label it "paid to you" vs "bought more shares". |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

---

### Forward income
What the person is really asking: What will this pay me next year?

#### P1 — Projected annual income

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No rail sends a forward dividend rate; FDX sends no coupon at all | The formula — Σ units × annual rate per unit (dividend rate; coupon × face) — has no data source today (spine R30; the master's Metrics tab K56, verified against FDX 6.3/6.4). Two honest paths: (a) show trailing-12-months received, labelled "if the last year repeats" — with the warning that a special dividend or a called bond will not; (b) buy a security-master feed (open question 3/4). A bond's coupon comes from the description text, permanently (the master's Metrics tab K26); a parse failure is UNKNOWN, never zero — a 0% coupon reads as a fact and every figure built on it is confidently wrong (the master's Engines tab r37; audit 24). |
| B degraded | Rate inferred from the last payment alone | Assumes it repeats — say so on screen. Coupon income is face × rate, never today's value × rate: a $10,000 bond at 4% pays $400 at any price (the master's Engines tab r37). |
| C shape-per-road | Where the rate came from | Tag each holding's rate: parsed from the name, typed by the person, or inferred from history — three different confidences on one screen, and the total inherits the weakest (the spine's Snapshot & Honesty tab (crosswalk-Aug19) B13 pattern). |
| D time-bounded | "Next year" against maturities | Drop coupons past each bond/CD's maturity or call date — a ladder maturing in March does not pay 12 months of coupons. Maturity comes from the instrument's own fields or its name text; unknown maturity → project and flag, never silently assume perpetual. |
| E related events | Calls, cuts, maturities | A called bond stops paying; a dividend cut invalidates the trailing rate; a CD rolling over re-prices. The projection is a snapshot of current rates, not a promise — one line says exactly that. |
| F account-type / confidence | Spendability | Label the whole figure an ESTIMATE. Income arriving inside an IRA is not spendable without a withdrawal and tax; the "what will this pay me" a retiree can spend is the taxable-account slice plus what they choose to withdraw — show the split by account type. |

#### P2 — Monthly income calendar

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Payment dates unknown | Same rate inputs as P1-A; dates come from observed payment cadence per security. A new holding with no history has no cadence → an "unscheduled" bucket at the bottom of the calendar, never a guessed month. |
| B degraded | Cadence from few observations | Two observations suggest a cadence; say "based on N payments seen". Quarterly funds that pay a December special will surprise — label December accordingly once seen. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | Same as P1-D — the calendar makes maturity drop-off visible month by month, which is its whole value for a ladder holder. |
| E related events | Same as P1-E | Same as P1-E. |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

#### P3 — Coverage of essential spending

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No essential-spending figure | Projected income ÷ essential monthly spend. Essential spend must be CONFIRMED by the person, not decided by an algorithm (spine R46). Without it: show the income figure alone and ask — a coverage ratio against a guessed denominator is advice built on air. |
| B degraded | Same as P1-B | Same as P1-B in the numerator; and the ratio inherits BOTH weakest ingredients — name them. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | Same as P1-E | Same as P1-E. |
| F account-type / confidence | Tax makes the ratio flatter | Coverage must compare AFTER-TAX income to spending: taxable dividends are taxed, IRA withdrawals are taxed as income, Roth is not. Showing pre-tax income ÷ spending overstates coverage for exactly the people leaning on it — state the assumed rates or show the pre-tax ratio labelled "before tax". |

---

### Yield
What the person is really asking: What rate is my money earning?

#### P1 — Current yield on today's value

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Coupon or rate unknown; value unknown | Annual income ÷ current value. Coupon parse failure → UNKNOWN, no yield shown, never 0% (audit 24). No value → no yield, never a division by zero (the master's Engines tab r97). Person supplies: the coupon from their statement, one field. |
| B degraded | Zero-coupon and discount instruments | A T-bill has NO coupon — this formula reports 0% on an instrument earning well. SUPPRESS current yield for zero-coupon/discount paper and show yield to maturity instead (the master's Metrics tab K26; audit 10). And the two sides must share a basis: coupon is paid on FACE, price is quoted per 100 of face — mixed bases are wrong by the size of the position (the master's Metrics tab K26). |
| C shape-per-road | Bond price conventions per source | Record per source whether a bond price arrives per 100 of face or as a full value, and assert units × price against the broker's stated position value before showing any yield built on it (the master's Metrics tab K27 pattern; same discipline as the option per-contract rule, audit 25). |
| D time-bounded | A 3-week current yield | N/A, argued: current yield is an instantaneous rate — "what is it paying now" has no 3-week variant. The windowed question is "what did I receive" and that is Income earned P1. |
| E related events | Rate gone stale | A dividend cut or a call after the last observed payment leaves the shown yield stale — stamp the rate's as-of date, and a called bond's yield line ends on its call date. |
| F account-type / confidence | Day counts and plain words | Treasuries and corporates count days differently and the answer moves; yield to maturity quietly assumes every coupon is reinvested at the same yield, which nobody does. On screen, plain: "what this bond would earn a year if you hold it to the end and nothing changes" (the master's Metrics tab K27; audit 11). Bills are quoted as discount instruments — label them as such. |

#### P2 — Yield on what I paid

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Basis missing | Annual income ÷ cost basis — for long-held positions usually much higher than current yield, and the figure a retiree finds most meaningful (spine R31). No basis → refuse; same supply path as Return by holding P1-A. |
| B degraded | Average or fee-free basis | Average basis is fine — this is a total-level ratio. But a fees-excluded basis UNDERSTATES cost, so it OVERSTATES this yield; carry the tag and the trading-costs sentence (the spine's Snapshot & Honesty tab (crosswalk-Aug19) R8, F8). |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | N/A — same argument as P1-D. |
| E related events | Basis moves under the ratio | Reinvested dividends raise basis (yield-on-cost drifts down mechanically — that is honest); return of capital LOWERS basis, inflating this yield without the holding paying a cent more — for ROC-heavy funds the figure misleads and needs its ROC share named (the master's Transaction taxonomy tab R25). |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

#### P3 — Portfolio-wide yield

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Forward income absent | Total forward income ÷ investable assets — inherits Forward income P1-A entirely: without a rate source, the honest version is trailing-12 received ÷ investable assets, labelled "what it paid, not what it promises". |
| B degraded | Holdings with unknown rates | The numerator excludes them — say "excludes N holdings we have no rate for" or the portfolio yield silently understates. |
| C shape-per-road | Denominator discipline | Investable assets excludes home and car by CLASS, not account type, and the same base is used identically on every screen (spine R10). |
| D time-bounded | Same as P1-D | N/A — same argument as P1-D. |
| E related events | Same as Forward income P1-E | Same as Forward income P1-E. |
| F account-type / confidence | Same as P1-F | Same as P1-F, plus the account-type split from Forward income P3-F. |

---

### Realised gains this tax year
What the person is really asking: What will I owe on what I have already sold?

#### P1 — Year-to-date total

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Account tax type unknown; basis missing for a sold lot | Σ (proceeds − basis of the lots sold − fees) for sales in the tax year, TAXABLE accounts only. Tax type unknown → show NOTHING for that account, not an estimate — a guess invents a tax bill where the true answer may be zero (the master's Metrics tab K47; audit 22); the person marks the account type once. Sold-lot basis missing → that sale shows proceeds and "gain unknown — add what you paid". |
| B degraded | Average basis; synthetic lot | The year's TOTAL is computable from average basis; the long/short character is not (see P2). A synthetic price×units lot overstates gain by the fees it excludes — tag it and show the trading-costs sentence (the spine's Snapshot & Honesty tab (crosswalk-Aug19) R8; audit 51, 52). |
| C shape-per-road | Whose lot-matching method | Ours is first-in-first-out; the broker may use average cost (the mutual-fund default) or specific lots the person picked. Their 1099-B is what the IRS sees — name the method on screen, state the broker's form is authoritative, and never present this as a tax figure (the master's Metrics tab K13). We do not apply the wash-sale rule, which can disallow a loss we show as real — say so. |
| D time-bounded | The selected period | Realised gain must respect the selected period — cut by SALE date (founder threaded comment K12, requirements file), and it shows on both the account-detail and performance pages (founder G6). "This tax year" = the calendar year; any other window is labelled with its dates. History starting mid-year → "from <date>", never presented as the full year. |
| E related events | Options and small events that realise gains today's engine drops | An option expiring worthless realises the LOSS of its full basis (long) or the GAIN of the premium (written) — today expiry touches units only and no P/L ever appears (events.ts:93; audit 41). A cash-settled exercise's money enters no total (ledger.ts:43; audit 42). Cash in lieu of fractional shares is a small realised gain that currently maps to nothing (audit 40). A share-settled merger or spin-off is units only — basis carries across or is apportioned, never duplicated (the master's Transaction taxonomy tab R36–R37); half-recorded, its two legs read as a sale plus a purchase and INVENT a realised gain while destroying the holding period. Accrued interest RECEIVED at sale is interest income, not proceeds — rolled into proceeds it masquerades as capital gain and is taxed as the wrong thing (the master's Transaction taxonomy tab R27). And the engine vocabulary has no realised-gain member at all, so nine such rows are unrepresentable by construction (events.ts:56; audit 31). Until these land, the YTD figure must carry "does not include option outcomes or fractional-share cash" — naming what it does NOT include. |
| F account-type / confidence | IRA/Roth sales | Sales inside an IRA/Roth generate NO taxable gain — those accounts are excluded from this metric by definition, and the screen may say so once: "sales inside retirement accounts don't create a tax bill" (spine R32 trap). |

#### P2 — Long vs short split

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No real lot dates | With no lot dates there is NO split — never a guessed one (the spine's Snapshot & Honesty tab (crosswalk-Aug19) F7; audit 51). Show the total and the sentence: "this is an average across all your shares — we cannot tell which were bought when, so we cannot split the tax treatment." |
| B degraded | Same as P1-B | Same as P1-B — average basis kills the split even when a total survives. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | The anniversary rule | Long-term means held MORE THAN one year, and the clock starts the day AFTER purchase — a lot sold exactly on the anniversary is SHORT (the master's Metrics tab K53), which is the direction that understates a tax bill if reversed. Unreadable purchase date → SHORT, the cautious side. |
| E related events | Events that change the clock | A wash sale changes the holding period; inherited holdings are LONG regardless of how briefly held — common in this audience (the master's Metrics tab K53). Reinvestments create new young lots, so a 20-year fund position routinely has short-term slices. |
| F account-type / confidence | Same as P1-F | Same as P1-F. |

#### P3 — Against loss carryforwards

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Carryforward unknown | Net short against short, long against long, then across, then the annual $3,000 limit against ordinary income. The prior-year carryforward lives on last year's tax return — USER INPUT; without it show this year's net only, with "add your carryforward from Schedule D to complete this". |
| B degraded | Same as P1-B / P2-A | Same as P2-A — no character split means the short/long netting order cannot run; show the single net figure only. |
| C shape-per-road | Same as P1-C | Same as P1-C. |
| D time-bounded | Same as P1-D | Same as P1-D. |
| E related events | Same as P1-E | Same as P1-E. |
| F account-type / confidence | This is a projection | Even complete, this is "roughly, and your tax form decides" — the four unnamed assumptions rule applies (rates by income, the 3.8% surcharge above thresholds, state tax absent, account type) (the master's Metrics tab K54; audit 22). |

---

### Fees paid
What the person is really asking: What is this costing me?

#### P1 — Fees I can see

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No transaction history | Σ fee transactions in the window. No transactions → unknown, not $0 — same rule as Income earned P1-A. |
| B degraded | Short history | Label the true lookback (same as Income earned P2-B). |
| C shape-per-road | Reversals; misfiled costs | A fee reversal must cancel, not add (audit 36 applies here identically). Margin interest is a cost of borrowing, not a withdrawal; tax withheld is its own line and never nets against income — three separate cost lines (the master's Transaction taxonomy tab R31–R33). |
| D time-bounded | Any window | Dated events — computable for any covered window; label the dates; refuse before history starts. |
| E related events | Fees inside a trade | Commissions embedded in a buy live inside basis, not in this line — the line says "fees charged to your account", and what it does NOT include (see P2). |
| F account-type / confidence | The mandatory label | The line is called "fees we can see", with one sentence naming what is not in it — the visible fees are the small ones (the master's Metrics tab K33; audit 16 — the label exists nowhere downstream today). |

P2 (Fees inside the funds) and P3 (Lifetime drag) — CUT by the founder 2026-08-20 (brief §C, Q17/Q36): an expense ratio is never a transaction — it is taken inside the fund price, so it stays outside the ledger if ever added. The honest sentence naming the invisible fees stays in P1-F ("fees we can see").

---

### Currency effect on return
What the person is really asking: How much of my return was the exchange rate?

#### P1 — Split the return

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Holding currency or FX series missing | Three stated components: the asset's own-currency return, the currency move, and the interaction term — never one blended number (spine R40). No FX series → show the blended return labelled "includes any currency move" — never an invented split. Holding currency unknown → assume the account's, flagged; FDX allows a holding-level currency different from its account, and ignoring it sums yen and dollars (spine R21 trap). |
| B degraded | Blended-only display | The failure mode this metric exists to prevent: a good year in a falling currency reads as poor stock picking (spine R40 trap). If the split cannot run, at least name that currency is inside the number. |
| C shape-per-road | Currency fields per road | Files rarely carry a currency column; feeds may send one per holding — map per road, and a missing field falls back to the ACCOUNT's currency with a flag, the same stated assumption as P1-A — never a silent USD default (the honesty rule of events.ts UNKNOWN: assume nothing without saying so). |
| D time-bounded | Window FX coverage | The split needs the FX rate at both window ends — FX history not covering the window → refuse the split for that window, show blended, labelled. |
| E related events | Hedged funds | A currency-hedged fund already removes the FX move — splitting again double-counts it; hedging status is fund data we do not have → note "may be hedged" where the name says so, decide with the security-master question (open question 3). |
| F account-type / confidence | USD-only households | For a household with no non-USD holding this metric never fires — show nothing, not a 0.0% row. Whether non-USD holdings are in scope for v1 at all, and from what FX source, is open question 12. |

---

### Time in market
What the person is really asking: How long have I held this?

#### P1 — Holding period per lot

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No real lot dates — both live brokers sent none | Today − purchase date, per lot. With no lots, a synthetic single lot carries ONE date and every holding-period claim rests on it (spine R41 trap; audit 51) — instead show "held since at least <first seen date>", the earliest evidence we hold (first transaction or first snapshot), which is honest and useful. Person supplies: the purchase date, one field per holding. |
| B degraded | Average-basis positions | Same as A — an average has no dates; the long/short tax meaning is unavailable (the spine's Snapshot & Honesty tab (crosswalk-Aug19) F7) even when an approximate age is shown. |
| C shape-per-road | Dates per road | A file's earliest row and a feed's history start are both "first seen", not "bought" — tag which the date is; never promote first-seen to purchase-date. |
| D time-bounded | A windowed holding period | N/A, argued: the holding period IS the time measure; the windowed question — "what did I buy and sell recently" — is turnover, P2. |
| E related events | Events that move the clock | Reinvestments create new young lots continuously — a 20-year fund holder always has fresh slices. A wash sale extends the period; inherited lots are long-term regardless (the master's Metrics tab K53). A journal of securities between the person's accounts must carry dates and basis WITH it (the master's Transaction taxonomy tab R14) or age resets falsely. Splits change units, never dates (audit 39). |
| F account-type / confidence | What the age is for | In taxable accounts the age drives tax character (see Realised gains P2-D — more than one year, starting the day after purchase). Inside an IRA/Roth the age has no tax meaning — show it as tenure only, no long/short words. |

#### P2 — Turnover

| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Average portfolio value needs the series | Value bought or sold in the year ÷ average portfolio value. No daily series → use (start + end) ÷ 2, labelled as the rough base; no start value → refuse the ratio, show the traded dollars alone. |
| B degraded | Short history | A part-year of history cannot state an annual turnover — show "in the N months we can see", never scaled up to a year. |
| C shape-per-road | Same rows, two roads | Same double-load rule as Period return P1-C — a file re-import that duplicates trades doubles turnover. |
| D time-bounded | Any window | Traded dollars are dated events — computable per window; the denominator follows the window's average value; same coverage refusal as everywhere. |
| E related events | Rolls and internal events are not trading | Sweeps and reinvestments are NOT turnover — internal events stay out. A maturing T-bill rolled into the next is principal returning, not a sale decision: the founder's own ~$220k rolled three times would read as $660k of "trading" on a sleepy account (events.ts:4-7). Count maturities and rolls on their own line: "matured and rolled", separate from chosen trades. |
| F account-type / confidence | What the number implies | High turnover in a taxable account has a tax cost (links to Realised gains); the same turnover in an IRA does not — judge them differently, and say the ratio describes ACTIVITY, not skill. |

---

## Open questions for the founder — decisions I could not make as the CFA

All of these were answered by the founder on 2026-08-20 — the verdicts live in METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx and BRIEF-decisions-and-fixes-2026-08-20.md. Questions touching a cut metric (brief §C) are void. Kept for the record only.


1. Two thresholds exist for the same gate (audit 4): I propose 1% of beginning value governs "may simple return stand in for Modified Dietz" (the master's Metrics tab K15) and 10% governs "refuse any rate on a short window" (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B15) as two different decisions — confirm this reading or pick one number.
2. Which return is the HEADLINE on the Performance screen: the money-weighted figure (how your money did) with the time-weighted one behind the compare-to-index view, or both side by side always?
3. One purchase decision gates four metrics — Forward income, fund-internal Fees, Look-through, and hedged-fund detection: buy a security-master data feed, or ship all four as absent with the honest sentences written in their cells?
4. Until (3) is decided, may Forward income show the trailing-12-months stand-in labelled "if the last year repeats", or should the metric stay absent entirely?
5. Allocation target capture: may the app ask for a broad-shape target (shares/bonds/cash to the nearest 5 points) so "drift" can exist, and at what moment (onboarding vs first visit to the allocation screen)?
6. Risk display for this audience: may standard deviation, beta and Sharpe stay off the screen in v1, showing only worst-fall-and-recovery-time and typical-swing-in-dollars?
7. Sequence-of-returns buffer default: 2 or 3 years of (essential spend − guaranteed income) — a planning stance, not arithmetic.
8. Wash-sale stance: is the standing sentence "we can't check accounts we can't see, including a spouse's or an IRA elsewhere" sufficient, or should the harvest insight be suppressed entirely for households with known unconnected accounts?
9. The harvest SAVING figure needs the person's marginal rate — ask one bracket question in-app, or show only the loss in dollars and never the saving?
10. Money-market funds: confirm the one-rule sweep (a money-market fund is a holding that pays income; Cash is the broker's uninvested balance only — the master's Metrics tab K37) so Cash drag, Income earned and the account screens all read the same dollars.
11. Where does the person declare the deliberate cash reserve (emergency fund, near-term spending) that Cash drag P3 subtracts — a plan-tab entry or a per-account flag?
12. Non-USD holdings: in scope for v1 or refused with a named limitation — and if in scope, which FX rate source?
13. Sequence-of-returns withdrawal input: default to the plan's essential spending or full planned spending?
14. Sensitivity-to-market index (Risk measures P3): one household index for beta, or the per-holding benchmark blend (BENCHMARK_RETURN_BLENDED, the master's Engines tab r70)? One household index is simpler to say honestly.
