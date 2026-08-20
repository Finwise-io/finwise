# Section A — Net worth and the balance sheet — metric use-case grid
Date: 2026-08-19. Spine: crosswalk tab "9. Comprehensive Metrics" rows 6–22 (17 metrics, 42 purpose cases). Conditions A–F per the founder's requirement of the same day. Written as the Certified Financial Advisor for a 55–70-year-old client: every cell is a calculation or a named refusal; a figure that cannot be supported is absent, never invented; money taxed once never re-presents as gain; every figure names what it does not include. "Refuse" always means: show the dollars we do know, then one plain reason, never a blank (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B16–B17).

Coverage line: 17 of 17 Section A metrics (spine rows 6–22) · 42 of 42 purpose cases · 252 of 252 condition cells — every cell a calculation, a named refusal, an argued N/A, or a pointer to the cell that carries the rule.

---

### Net worth
Am I building or losing ground?

#### P1 — Today's figure
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | An account has no value at all (new connection, first sync failed, never typed) | Compute total assets minus total debts from the accounts that HAVE values, and name the gap: "Does not include Chase checking — no balance yet." Never put a silent $0 in the total; a silent zero reads as a loss (the Metrics tab row 52 column K). The person supplies it by typing a balance or re-running the connection. |
| B degraded | A hand-entered value is months old | Include it at its dated figure and show the date: "as you entered it on 3 March" beats "may be out of date" (the Metrics tab row 44 column K; engine HAND_VALUE_AGE, the Engines tab row 35 — six months or older reads stale, and that six-month line is a choice, recorded as one). |
| C shape-per-road | Balances arrive by connection (balance.total.amount), by file (the money column), or typed (three doors — the Engines tab row 122) | One value per account whichever door it came through, and the same account arriving through two doors must be recognised as one account, not added twice. Debts are stored positive and subtracted — state that sign convention once (the Metrics tab row 36 column K; audit item 17). A debt stored negative and then subtracted ADDS to net worth and the total still looks plausible. Today debts are typed on the Debts screen and summed by totalDebtBalance (src/domain/debt/index.ts:64); net worth itself is assets minus debts, computed and never stored as a third number (src/domain/networth/index.ts:12; the Engines tab row 58). |
| D time-bounded | "Today" is really a mix of dates — the broker synced this morning, the house was typed in March | The total carries the OLDEST material valuation date as its label: "as of 3 March (your home's value)". A single clean "today" over mixed dates is false precision. |
| E related events | A transfer between the person's own accounts is mid-flight — one leg posted, the other not | Net worth is unchanged by moving your own money, so an unmatched leg is held pending, not counted (the Metrics tab row 10 column K). If one leg were counted, the total would dip and recover for no real reason. |
| F account-type / confidence | IRA and 401(k) balances look identical to Roth and taxable balances | Include every account at face value, and carry one line: "includes $X in accounts where tax is still owed on withdrawal" (crosswalk the the Comprehensive Metrics tab of the spine (crosswalk-Aug19) tab row tab row 78 rule; the embedded-tax figure itself lives in its own metric below). A retirement account is investable but not freely spendable before the age rules — that label, not a changed formula (the Metrics tab row 39 column K; audit item 18). |

#### P2 — Change over a period
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No stored value exists at the period start (the record began later) | Refuse the period figure and offer the honest one: "since 14 June, the first day we have a record" (snapshots.ts firstDate/covers, engines/snapshots.ts:137–146; crosswalk the the Snapshot & Honesty tab of the spine (crosswalk-Aug19) tab row tab row B20). NEVER back-solve the beginning value from today minus the ledger — that is how the founder's Vanguard account showed a beginning value of minus $448,028 against a statement's $378,022 (engines/snapshots.ts header; the Metrics tab row 6 column K). |
| B degraded | The beginning value is reconstructed from history, not observed (SnapshotDay.origin = 'reconstructed', engines/snapshots.ts:58) | Show the dollars — start value, money in, money out, end value — and refuse the percentage. A reconstruction is not a record and must never be the denominator of a return (the spine's Comprehensive Metrics tab (crosswalk-Aug19) Snapshot & honesty B13). |
| C shape-per-road | Which side of the boundary does a flow dated on the start day fall? | One written convention, used by every engine: the window opens AFTER the start day's close, so a flow dated on the start day is OUTSIDE the window (the Metrics tab K6, convention 2; audit item 2 — carried downstream only by these grids until it lives in one tested module). It goes into the one named place that also holds the thresholds below. |
| D time-bounded | Flows during the window make a plain percentage misleading (3 days / 3 weeks / 3 months alike) | Rule: show the dollar walk always; show a percentage only when net flows are small against the beginning value. Two thresholds are live for the SAME decision — 1% (the Metrics tab row 15 column K) and 10% (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B15) — and neither supersedes (audit item 4). Founder must pick one number, kept in one named place. The current engine NW_CHANGE_PCT (the Engines tab row 46) applies a chosen start date but NO flows test at all (audit item 47) — a $10,000 deposit into a $100,000 account currently reads as a 10% "return". Windows under about 30 days: dollars only, never a rate, never annualised (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B15, B19). |
| E related events | Deposits, withdrawals, transfers, and misfiled events inside the window | The change walk must add up from named parts: started with · put in · took out · income · debt paid down · what investments did — with market movement MEASURED bottom-up (shares held × price change + realised + income) and the leftover shown separately as "unexplained", never absorbed (the Metrics tab row 12 column K). Three live defects poison this today: an outbound in-kind transfer books as a CONTRIBUTION (engines/events.ts:139 maps "delivered out" into SECURITIES_IN; audit item 32); SnapTrade's EXTERNAL_ASSET_TRANSFER_IN arrives with underscores and falls to UNKNOWN, so contributions go silently missing on that road (audit item 33); and transfer netting only cancels inside the measured set, not across the household (the Engines tab row 76; the Metrics tab row 10 column K; audit item 30). And the one check that would catch all three — started with + flows + market + income − costs = ended with, within a cent — is committed on the taxonomy tab (rule 4(i)) and not built (audit item 45), so the walk cannot yet prove itself. Any unmapped event in the window → say "includes $X we could not classify" and refuse the split (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B15). |
| F account-type / confidence | The two end values are built to different definitions | Both ends must be positions + cash + ACCRUED INTEREST, or the difference contains a definition gap and calls it performance (the Metrics tab rows 6–7 column K). The snapshot record has no accrued-interest field today (HoldingSnapshot, engines/snapshots.ts:26–40), and on the founder's own T-note that is a $1,289 gap that would land as a fake market move (audit item 3). Also say which accounts actually repriced: a change that is 90% one hand-typed house revaluation is not "the market". |

#### P3 — Long-run trajectory
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | History before the app was installed does not exist | The line starts at the first real date and the label says so: "from 14 June, when we started keeping your record" (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B20). Nobody sends us history — no institution transmits last month's value (engines/snapshots.ts header) — so a longer line cannot be bought, only lived. |
| B degraded | Daily points age out to month-end points after two years (DAILY_YEARS = 2, engines/snapshots.ts:72; month-ends kept forever) | Draw the mixed-grain series and say where the grain changes. A monthly point is still a measurement; pretending it is daily is the only dishonest option. |
| C shape-per-road | A re-imported file restates a past month | Write a NEW dated row and keep the old one, so the person can be shown why a number changed (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B12). The current store does the opposite: record() drops the earlier row for the same date (engines/snapshots.ts:101–104), contradicting its own append-only header (audit item 54). Fix before trend lines are trusted. |
| D time-bounded | The person asks for a window longer than the record | Offer only windows the record covers — the Performance screen already caps its windows at the record's length for exactly this reason (engines/snapshots.ts:69–71 comment). A line drawn from dates we have no evidence for is fiction. |
| E related events | Deposits lift the line exactly like a good market month | Mark deposit and withdrawal days on the line, or draw a second line showing what the money itself did (growth of a fixed amount) — the honest answer to "how am I doing" (the Metrics tab row 42 column K). That marking is carried nowhere today (audit item 20; TREND_SERIES, the Engines tab row 130, has no flow marks). |
| F account-type / confidence | The line mixes measured accounts with hand-typed ones | A hand-typed house re-entered once a year makes a stair-step that is a revaluation, not growth. Mark revaluation days the same way deposit days are marked, and let the person toggle "investments only" (which is what NW_CHANGE_PCT already restricts itself to — the Engines tab row 46). |

---

### Total assets
What do I own?

#### P1 — Balance-sheet total
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as Net worth P1-A: sum what has values, name what is missing, never a silent zero. | Same as Net worth P1-A. |
| B degraded | Same as Net worth P1-B: stale values included at their dated figure, date shown. | Same as Net worth P1-B. |
| C shape-per-road | Three doors per account (connection / file / typed — the Engines tab row 122) | One value per account; the same account through two doors is one account. The classifier must put the same holding in the same class whichever door it entered by — a test writable today (the Metrics tab row 40 column K). |
| D time-bounded | Mixed valuation dates | Same as Net worth P1-D: label with the oldest material date. |
| E related events | An in-flight transfer between own accounts | Same as Net worth P1-E: hold the unmatched leg pending; total assets do not move when your own money moves. |
| F account-type / confidence | Deferred accounts at face value | Same as Net worth P1-F: face value in the total, one line naming the tax still owed on withdrawal. |

#### P2 — Denominator for every allocation percentage
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | An unclassified account | It goes in an explicit, visible Unclassified bucket — the denominator still includes it. The identity to enforce as a test: cash + investments + physical assets = total assets exactly, with the Unclassified bucket named (the Metrics tab row 38 column K). An "other" bucket quietly holding 4% of the money passes every test that only checks the total (spine row 7 trap). |
| B degraded | Same as P1-B — a stale ingredient makes every percentage exactly as stale; the denominator's freshness is its oldest ingredient. | Same as P1-B, plus: percentages inherit the staleness label. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Slices and denominator from different days | Refuse mixed dates: every slice and the total must come from the SAME day's values. A slice from today over last week's total is a percentage of nothing. |
| E related events | A short position or written option gives a negative value | Percentages then exceed 100% and can go negative — arithmetically true and unreadable. Weight on absolute exposure, disclose the basis in one line, and suppress the chart rather than draw a slice pointing the wrong way (the Metrics tab row 29 column K). The current allocation engine floors negative cash to zero instead (the Engines tab row 59; audit item 12) — that hides the fact rather than handling it. |
| F account-type / confidence | Percentages shown to more precision than the inputs support | One decimal at most, and no percentage at all on a day when any material account is unpriced — dollars still show. |

---

### Total liabilities
What do I owe?

#### P1 — Total debt
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | A debt is known to exist but has no balance | List it by name with no number and label the total: "at least $X — Amex balance not entered." A total that silently omits a known debt overstates net worth in the direction that hurts most. The person supplies it from the latest statement. |
| B degraded | A typed balance from months ago | Include at its dated figure with the date shown, same discipline as asset values. Typed debts carry NO last-confirmed date today — the Debt record has no value_as_of field (the full interface, src/domain/debt/index.ts:10–29), while assets have one (src/domain/assets/index.ts:83). Add the field: a stale debt balance is understated debt, because interest has accrued since. |
| C shape-per-road | Today debts are typed only (debtsFromOnboarding, src/domain/debt/index.ts:240); a connected liability feed comes later | Whichever road: store the balance POSITIVE and subtract — the sign convention stated once (the Metrics tab row 36 column K; audit item 17). A mortgage escrow balance is not debt; a card balance including pending charges double-counts purchases already recorded as spending (spine row 8 trap) — pending charges are named, not added. |
| D time-bounded | The total is as of the dates the balances carry | Label with the oldest date among material debts, same rule as assets. |
| E related events | A payment sent but not yet posted | The debt is still owed until the payment posts. Show "payment of $X in flight" rather than reducing the balance early — reducing early and then re-adding reads as new borrowing. |
| F account-type / confidence | A 401(k) loan | It is owed to the person's own account, not to a bank: include it in debts, but name it — "owed back to your own 401(k)" — because defaulting on it becomes a taxed withdrawal, which is a different risk than a bank debt. Typed balances are stated, not measured; the confidence label says so. |

#### P2 — Payoff planning
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The rate is missing | Refuse the payoff date. The screen says: "We need the interest rate from your statement to compute this." Never default a rate silently — a payoff date built on a wrong rate is confidently wrong (spine row 13 trap), and rates are the field the feeds most often omit or send stale. |
| B degraded | The rate is approximate or old | Show the payoff date with its assumption named: "about March 2031, using the 7.2% rate you entered in May." One stale input, one label. |
| C shape-per-road | A feed's rate versus the person's statement | The person's own statement rate wins over a stale feed rate; record which source the date was built on. |
| D time-bounded | Months remaining at the current payment | Solve the loan arithmetic for months to zero (monthsToClear, src/domain/debt/index.ts:89). When the payment does not cover the interest, monthsToClear returns null — the screen must say "at $200 a month this balance never falls", not show a blank or an absurd date. |
| E related events | A promotional 0% rate that expires, or an adjustable mortgage that resets | The payoff date is only good until the reset. Compute with the current rate to the expiry, the post-promo rate after, and label the date with that assumption. Capture the expiry date when the debt is entered. |
| F account-type / confidence | Deductible mortgage interest | Deductibility changes what the debt COSTS (P3), never WHEN it ends — the payoff date is tax-blind. Say so once so nobody "adjusts" it. |

#### P3 — Cost of carrying it
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No transaction history for a typed debt | Estimate: balance × rate ÷ 12, labelled plainly — "about $310 a month at your stated rate — estimated, not measured." When even the rate is missing, refuse: no rate, no cost figure. |
| B degraded | Only a year-to-date interest figure from a statement | Use it, labelled with the period it covers. A measured year-to-date number beats a modelled monthly one. |
| C shape-per-road | Interest charges arriving as transactions | A reversal or refund of interest must CANCEL the charge. Today the ledger sums absolute values and lets a stated direction override the received sign, so a reversal ADDS instead of cancelling — the $2,387 class rebuilt (ledger.ts totalOf + money.ts:39 per audit item 36). Measured interest-paid totals are not trustworthy until that is fixed; until then, label them "from your statements" only where imported figures were signed correctly. |
| D time-bounded | Interest in the selected window | Sum the interest charges dated inside the window, and only those. A card posts interest monthly — a two-week window may honestly contain zero, and the screen should say "no interest posted in this window", not "$0 cost". |
| E related events | Interest added to the balance instead of paid (deferred interest, negative amortisation) | Still a cost. It appears as balance growth, not as a transaction — name it: "your balance grew $140 from unpaid interest." A transaction-only cost figure misses it entirely. |
| F account-type / confidence | Margin interest vs mortgage interest vs card interest | Keep them as separate lines — different tax treatment, different fixes. Margin interest is a cost, never netted against investment income (the Transaction taxonomy tab rows 32–33: netting understates the gross income a retiree plans around). |

---

### Liquid net worth
What could I actually reach this month?

#### P1 — Emergency capacity
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No liquidity tag exists per account — true of the app today (AssetClass in src/domain/assets/index.ts:16 has no liquidity field; the only liquidity input is a typed number at src/domain/planning/index.ts:133) | Default each account's tag from its class — cash: same-day; listed stocks and funds: days; CDs and bonds: at maturity or sale; property: years — SHOW the assumed tag on each account, editable. The headline carries the assumption: "assumes brokerage holdings can be sold within days." A person can correct a visible assumption; nobody can correct a hidden one. |
| B degraded | A CD whose maturity date we cannot read | Maturity lives in the description text, not in a field, on every rail observed (institution-data-research-v1-2026-08-04.md). When the text does not parse, the CD goes to the "months" bucket with "maturity date unknown — add it from your statement", never guessed to a date. |
| C shape-per-road | A typed account is one lump; a connected account splits into cash + positions | The lump takes its class default as a whole. The connected account tags cash same-day and each holding on its own class. Same rule, different resolution — say which accounts are counted coarsely. |
| D time-bounded | "This month" needs the debts due within the period subtracted (spine row 9) | Subtract the minimum payments due before month-end (requiredPayment, src/domain/debt/index.ts:44), PLUS any due-in-full lump whose date falls inside the period — requiredPayment deliberately returns $0 monthly for those, so a balloon due this month vanishes from a payments-only subtraction (payment_type 'due_in_full' with payoff_date as the due date, src/domain/debt/index.ts:22–26,44–47). Without due dates, subtract one month of minimum debt service and label it so. |
| E related events | An unsettled sale, or a transfer in flight | Sale proceeds are not cash until settlement (one business day for listed securities); count them in "days", not "same-day". A pending transfer is counted once, at its destination tag, not twice. |
| F account-type / confidence | Retirement accounts before the penalty ages | The penalty ages differ by wrapper and the audience lives exactly on this line (spine row 9 trap): an IRA before 59½ is penalty-gated; a 401(k) opens penalty-free only when the person left THAT employer in or after the calendar year they turned 55, and only that employer's plan — an IRA rollover forfeits it; Roth CONTRIBUTIONS come out free but earnings are gated. Rule: under the person's applicable age, retirement money is EXCLUDED from this figure, with one line: "excludes $X in retirement accounts you'd pay penalties to reach." Whether to instead include it net of penalty and tax is a founder call (open question 5). |

#### P2 — 'Can I afford this' denominator
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Same as P1-A. |
| B degraded | Same as P1-B. | Same as P1-B. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | The purchase has a date | Count what is reachable BY that date: a CD maturing before the purchase date counts in full; the same CD counts only at its penalty-reduced value for a purchase next week. One purchase date in, one honest denominator out. |
| E related events | Same as P1-E, plus: money already earmarked for a goal | Earmarked balances are named and excluded — "after your $15,000 roof fund" — or the same dollars fund two plans. |
| F account-type / confidence | Same as P1-F, plus selling costs | An affordability figure built on selling taxable holdings should say "before any tax on gains" and point at the embedded-tax metric — never silently assume a tax-free sale. |

---

### Investable assets
What is actually working for me?

#### P1 — Denominator for portfolio return
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | An account with no class | It lands in Unclassified, which the investments total already includes (the Engines tab row 122) — so the denominator holds it. Flag when the Unclassified share is material (threshold: founder call, open question 12). |
| B degraded | A hand-typed brokerage lump inside the base | Included at its dated figure; the return computed on a base containing stale hand values carries the staleness label of its oldest ingredient. |
| C shape-per-road | Exclusion is by CLASS, not account type (TOTAL_INVESTABLE, the Engines tab row 141: cash + investments, home and car out) | Keep it that way on every road: a brokerage account can hold cash and a 401(k) can hold company stock (spine row 10 trap). The class comes from the one classifier, all three doors (the Metrics tab row 40 column K). |
| D time-bounded | A return denominator needs the base at the WINDOW START | Use the stored value at the period start (snapshots.ts valueOn), never today's base — weighting on today's money is the exact defect class flagged on the performance rows (the Metrics tab row 30 column K family). No stored start value → the return refuses, per Net worth P2-A. |
| E related events | The money-market fund | A live three-way contradiction: the class rule calls it an investment, the screen groups it under Cash, and the account screen subtracts it from cash AND drops it from holdings (the Metrics tab row 37 column K; audit item 46 — TOTAL_CASH carries opposite statuses on the two tabs). Whichever class wins, investable = cash + investments holds the dollars — EXCEPT on the account-screen path, where they leave BOTH buckets at once and the total itself runs short; the Metrics tab row 7 column K says outright that path cannot reconcile. One bucket, every screen. Founder to confirm the enforcement (open question 2). |
| F account-type / confidence | Retirement money in the base | It belongs in the base — it is invested — with the standing label that it is not freely spendable before the age rules (the Metrics tab row 39 column K; audit item 18). One base, used identically on every screen (spine row 10), which is the one-canonical-helper rule already standing in the repo (finwise/CLAUDE.md, money-math gate). |

#### P2 — Fee and allocation base
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Same as P1-A. |
| B degraded | Same as P1-B. | Same as P1-B. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Fee percentages quote against the base AT the time the fee applied | An annual fee drag divided by today's larger base flatters the fee. Divide period fees by the period's average or beginning base, and say which. |
| E related events | Same as P1-E. | Same as P1-E. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

---

### Home equity
How much of the house is mine?

#### P1 — Balance-sheet line
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No home value entered | No home-equity line at all. If a mortgage exists without a home value, show the debt and one ask: "Add what you think the house is worth to see your equity." Never infer a value from the mortgage size. |
| B degraded | An automated estimate, or an old figure | An automated home estimate is a guess with a wide band (spine row 11 trap): show a RANGE and the estimate date — "$580,000–$650,000, estimated January 2026" — or the whole net worth inherits false precision. The person's own figure shows single-valued but dated. |
| C shape-per-road | Value typed today (asset kind 'home', class real_estate — src/domain/assets/index.ts:156,182); a valuation service later | Equity = value − mortgage balance, the mortgage coming from the Debts screen, stored positive (Total liabilities P1-C). Whichever road supplies the value, it carries its date and, for a service, its band. |
| D time-bounded | Staleness tolerance for property | The account rule (six months, HAND_VALUE_AGE, the Engines tab row 35) is wrong for a house — too twitchy for a stable market, yet a five-year-old figure silently props up the whole picture (spine row 12 trap). Recommend: prompt to re-confirm at 12 months; founder to confirm (open question 3). |
| E related events | A HELOC draw, a refinance | A HELOC draw increases debt, not house value — equity falls by the draw. A refinance swaps one mortgage for another; escrow set up in it is not debt (Total liabilities P1-C). Each event reprices equity through the debt side only. |
| F account-type / confidence | The line's confidence | Home equity is the product of one stated number and one measured number; it is never better than "stated". Label it so, and never let it feed a percentage return anywhere — a retyped house value is a revaluation, not performance (Net worth P3-F). |

#### P2 — Downsizing or reverse-mortgage capacity
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Purchase basis of the home unknown | Show capacity as value − mortgage − selling costs (6–8%, both bounds shown), and REFUSE the tax line with a name: "tax on sale not included — we'd need what you paid for the house." Ask for the basis and improvements. |
| B degraded | Same as P1-B — a range in, a range out: capacity shows as a band, never one clean number. | Same as P1-B, propagated: "roughly $310,000–$370,000 after selling costs." |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Capacity for a sale years away | Do not project home prices. Capacity is quoted at today's stated value only, labelled: "at today's value — we don't forecast house prices." |
| E related events | The sale itself | On sale: gain above the exclusion ($250,000 single / $500,000 married filing jointly, section 121, as of 2026-08-19) is taxable — needs basis + improvements + filing status. With them, show the tax line as "roughly, if sold today"; without them, P2-A's refusal stands. |
| F account-type / confidence | Reverse-mortgage framing | A reverse mortgage draws against equity while living there — capacity is a fraction of equity set by age and rates, quoted only as "lenders typically allow a portion; get a quote", never computed as if the app knew the lender's table. Fiduciary line: name what the figure does NOT include (costs, accrued interest compounding against the estate). |

---

### Real estate and physical assets
What is the house, car, collection worth?

#### P1 — Balance-sheet inclusion
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No value entered for a listed item | Listed by name, no number, one ask. Same rule as every missing balance: named absence beats silent zero (Net worth P1-A). |
| B degraded | Old valuations | Latest estimate or the person's own figure WITH its date (spine row 12) — a five-year-old car value shown undated silently props up the picture (spine row 12 trap). |
| C shape-per-road | Typed today; a valuation service later | Typed values carry value_as_of (src/domain/assets/index.ts:83). A service value carries its date and band, per Home equity P1-B. |
| D time-bounded | Different assets age differently | A car loses value on a known curve; a house does not. Re-confirm prompts: vehicles yearly at least; property per open question 3. An un-reconfirmed vehicle older than its prompt shows its age next to the number. |
| E related events | Selling the asset | The sale converts the item to cash at the sale price — a class change, not a gain appearing from nowhere. Any gap between the last stated value and the sale price is corrected history, shown as a revaluation on the trend line (Net worth P3-F). |
| F account-type / confidence | Always stated, never measured | These values are the person's own words. Confidence label: "your estimate, dated". They are excluded from investable assets by class (the Engines tab row 141) and never feed a return. |

#### P2 — Whether they count toward retirement
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No earmark set | Default 0% earmarked for retirement, with an override per account (spine row 12). The default is the conservative one: a plan that quietly spends the house is not a plan the person agreed to. |
| B degraded | Same as P1-B — an earmarked share of a stale value is doubly soft; the plan input carries both labels. | Same as P1-B, with the earmark shown: "20% of your $40,000 boat — your estimate, dated May." |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Earmark for a dated plan event (e.g., "sell the house at 75") | Model it as a dated one-off inflow at the stated value less selling costs, in the retirement projection — not as a liquid asset today. |
| E related events | Same as P1-E. | Same as P1-E. |
| F account-type / confidence | Tax on the earmarked share | An earmarked home sale above the exclusion carries the same tax line rules as Home equity P2-E; personal property sales rarely produce deductible losses — never show a loss on a car as a tax asset. |

---

### Debt detail: rate, term, payoff date
When am I free of this, and what is it costing?

#### P1 — Payoff date
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Rate missing | Refuse the date; ask for the rate from the statement. Same rule as Total liabilities P2-A — never a silent default rate. |
| B degraded | Payment history says the person pays MORE than the minimum | Use the actual average payment where payments are measured, the stated payment otherwise, and label which: a date computed on the minimum overstates the term for anyone paying extra. |
| C shape-per-road | Same as Total liabilities P2-C: statement rate beats stale feed rate; record the source. | Same as Total liabilities P2-C. |
| D time-bounded | The date, and the age it implies | Solve months-to-zero at the payment (monthsToClear, src/domain/debt/index.ts:89). For this audience, show the AGE at payoff next to the date — "paid off March 2041, when you are 79" — because that is the sentence that changes decisions. Payment below interest → "this never clears at $X a month" (null return, same function). |
| E related events | Promo expiry, ARM reset, extra one-off payments | Same as Total liabilities P2-E, plus: a one-off extra payment recomputes the date the day it posts, and the screen shows the months it bought. |
| F account-type / confidence | Same as Total liabilities P2-F: payoff dates are tax-blind. | Same as Total liabilities P2-F. |

#### P2 — Interest cost to term
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Rate or payment missing | Refuse; the sum of scheduled payments minus balance (spine row 13) needs both. Name which is missing. |
| B degraded | A card with a declining-minimum payment | A true declining-minimum schedule runs decades; compute at a FIXED payment equal to the current minimum and say so — "assuming you keep paying $180 a month" — which is the honest, understandable version. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Cost within a chosen window vs cost to term | Two different questions: interest to term = total scheduled payments − balance; interest this year = the schedule's next 12 months. Label which one is on screen — a term figure shown against an annual budget frightens without informing. |
| E related events | An extra $200/month | Show the pair: new payoff date AND interest saved — "free 3 years sooner, $9,400 less interest." The comparison is the product; either number alone undersells it. |
| F account-type / confidence | Deductible mortgage interest | After-tax cost = rate × (1 − marginal rate) ONLY for itemisers — an assumption to name, not assume (most of this audience takes the standard deduction). Default: show pre-tax cost; offer the after-tax line behind the named assumption. |

#### P3 — Payoff-order strategy
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | One debt has no rate | It cannot rank in the cheapest-total-cost order (avalanche). Place it last with a flag — "enter this rate to rank it" — rather than guessing a rank. The engine already supports both orders (payoffPlan, src/domain/debt/index.ts:140). |
| B degraded | Two rates within a point of each other | The order is a tie; say so. "Either order costs about the same — pick the one you'll stick to." Rate precision does not support a confident ranking there. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Promo rates and the horizon | Rank on the rate that will apply over the payoff horizon: a 0% promo expiring in 6 months on a 3-year payoff ranks at its post-promo rate. Ranking on the teaser rate orders the person into the expensive mistake. |
| E related events | A debt paid off, a new debt added | Re-rank the day it happens, and show what changed: "your cheapest-cost order changed because the car loan is gone." |
| F account-type / confidence | Both orders are valid answers to different questions | Rank by rate = cheapest total cost; rank by balance = fastest count reduction (spine row 13). Present both, never pick silently. And never rank "sell retirement assets to clear debt" into the list — that comparison needs the tax-and-penalty math and the founder's after-tax framing (Weighted average cost of debt P2). |

---

### Weighted average cost of debt
What am I paying to borrow, overall?

#### P1 — One headline rate
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Some debts have no rate | Compute Sum(balance × rate) ÷ (the balances WITH rates), and say the coverage: "6.1%, based on the $210,000 of your $260,000 debt with known rates." Excluding from numerator only, while keeping the full denominator, would fake a lower rate — both sides shrink together. |
| B degraded | Stale rates | The headline carries the oldest rate date among material debts. An ARM re-rated last year is a stale ingredient like any other. |
| C shape-per-road | Same rate-source rule as Total liabilities P2-C. | Same as Total liabilities P2-C. |
| D time-bounded | Rates change on known dates | The headline is "as of today". Where a promo expiry is captured, show the after-expiry headline too: "6.1% today, 7.4% after your 0% card ends in November." |
| E related events | A payoff or new borrowing reweights the average | Recompute on the event; a big low-rate mortgage paid down RAISES the average while making the person better off — one line explains it: "your remaining debt is smaller but costlier per dollar." |
| F account-type / confidence | Pre-tax by construction | All rates here are nominal, pre-tax. The after-tax adjustment lives only in P2, behind its named assumption. |

#### P2 — Compare against the portfolio's expected return
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No expected-return assumption set | Refuse the comparison; never invent an expected return. The assumption is the person's (or the app's named default), shown in the sentence: "comparing your 6% mortgage with a 7% assumed return." Every figure states its assumed return or it cannot be reproduced (finwise/CLAUDE.md, briefs-are-code rule). |
| B degraded | The expected return is an assumption; the debt rate is a contract | Say the asymmetry out loud — it IS the analysis: "the 6% is certain; the 7% is hoped for, before tax" (spine row 14 trap). |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Horizon | Compare over the debt's remaining term, not one year: paying a 6% debt is a guaranteed 6% for the life of the balance. Short horizons make the risky side worse — say so. |
| E related events | Same as P1-E. | Same as P1-E. |
| F account-type / confidence | Tax on both sides | Debt is paid with after-tax money, so the return must be AFTER TAX before comparing (spine row 14) — and inside an IRA the "return" side is also deferred-taxed on the way out. One rule: compare after-tax certain against after-tax expected, assumptions named, or do not show the comparison. |

---

### Leverage and coverage ratios
Am I over-extended?

#### P1 — Debt to assets
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Missing balances on either side | The ratio inherits Net worth P1-A and Total liabilities P1-A: compute on what is known, name the gap, and suppress the ratio when a MATERIAL side is missing — a ratio with a named hole in its denominator misleads more than no ratio. |
| B degraded | Stale ingredients | The ratio carries the oldest date of its two sides. Same as Net worth P1-B. |
| C shape-per-road | Same sign convention as Total liabilities P1-C — debts positive. | Same as Total liabilities P1-C. |
| D time-bounded | Point-in-time by nature | Computed on same-day totals only; a today-debt over a last-month-assets ratio is refused (same rule as Total assets P2-D). |
| E related events | Same transfer-pending rule as Net worth P1-E. | Same as Net worth P1-E. |
| F account-type / confidence | Gross assets include penalty-gated money | For a 58-year-old, debt against assets they cannot cheaply reach overstates the cushion. Show the headline ratio AND the liquid version (debt ÷ liquid net worth's asset side), labelled. |

#### P2 — Debt payments to income
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Income unknown | Refuse; ask. The payments side exists (minimumDebtService, src/domain/debt/index.ts:55; debtToIncome at :123 already takes gross monthly). Never proxy income from deposits without saying so — a bank feed sees net pay, not gross (spine row 43 trap). |
| B degraded | Income stated at onboarding, not measured | Label "of your stated income". When measured deposits and the stated figure disagree materially, say so rather than silently choosing. |
| C shape-per-road | Gross vs take-home basis | Pick ONE basis, print it in the label, use it everywhere. The standing convention in the repo is take-home = after tax and 401(k) (finwise/CLAUDE.md, money/UX conventions); lender-style ratios use gross. Two valid bases — never mix them unlabelled. |
| D time-bounded | Lumpy income | Use the trailing 12-month average for the denominator when income varies; a ratio against one fat month reads healthy exactly when it should not. |
| E related events | A debt paid off mid-year | Required payments drop the month it clears; recompute, and show the step: coverage improved because a payment ended, not because income rose. |
| F account-type / confidence | The retiree denominator | For retirees, wages are the wrong denominator (spine row 15 trap): use guaranteed income (Social Security + pension + annuity) PLUS the planned sustainable withdrawal — never the raw withdrawals actually taken, which would reward draining the pot. Founder to confirm this definition (open question 10). |

#### P3 — Credit utilisation
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Card limit missing | Refuse the percentage; show the balance and ask for the limit. The current engine does the OPPOSITE: a missing limit returns 0% with status 'good' (creditUtilization, src/domain/debt/index.ts:108–110) — a silent zero that reads as perfect credit health, the exact defect class of the silent $0 balance. A utilisation figure with a guessed or absent limit is noise wearing a percent sign. |
| B degraded | Balance includes pending charges | Utilisation runs on the posted balance; pending is named separately, consistent with Total liabilities P1-C. |
| C shape-per-road | Typed vs feed balances | Same one-value-per-account rule; the feed's posted balance wins over an older typed one, with the date shown. |
| D time-bounded | Today's utilisation vs what the bureau sees | Bureaus see the statement-close balance. Show today's figure, and when a statement date is known, the close-date figure too — "what lenders will see". Without statement dates, today's only, labelled. |
| E related events | A one-off large purchase | A spike from a single purchase that will be paid at close is a timing artifact; flag it rather than alarm on it. |
| F account-type / confidence | Per-card and overall | Show both: one maxed card matters even when the overall figure is low. No account-type variant exists here — utilisation is a credit-card concept only, and that is the argument for confining it to cards. |

---

### Allocation by asset class
What am I actually invested in?

#### P1 — Household view
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | An account or holding with no class | An explicit, visible Unclassified slice — never spread across other slices, never dropped (the Metrics tab rows 38 and 46 column K). The identity: slices sum exactly to total assets (ALLOCATION_BY_CLASS, the Engines tab row 138). |
| B degraded | A typed lump account | Counted whole in one class (the Engines tab row 138: no breakdown → whole balance in the account's class). Coarse but honest — say "typed accounts counted whole" when they are a material share. |
| C shape-per-road | Same holding via file and via connection | Must land in the same class — one classifier, three doors, and the test is writable today (the Metrics tab row 40 column K). Also: the words under a slice must use the SAME rule as the amounts — today SLICE_WORDING picks holdings by the broker's type code while the amounts use our class (the Engines tab row 27; the Metrics tab row 46 column K), so a screen can describe one thing and total another. |
| D time-bounded | Same-day slices and total | Same as Total assets P2-D. |
| E related events | Negative positions; the money-market fund | Negative positions: suppress the chart, show dollars (Total assets P2-E; audit item 12). Money-market fund: the class is decided (a holding, not cash — the 2026-08-04 rule already in the classifier), yet today three surfaces give three answers for the same dollars (the Metrics tab row 37 column K; audit item 46). Founder to confirm the enforcement, open question 2. |
| F account-type / confidence | Class view cuts across tax types | By design (the Engines tab row 122 counts across tax types). Say so in one line — "your 401(k)'s stocks count here" — and leave the tax split to its own metric. |

#### P2 — Per account
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The broker's stated account total is missing | Sum the parts and label the total "unchecked" — the broker's stated total is the only outside check we get (engines/snapshots.ts:47–49; ACCOUNT_SPLIT reconciles to it, the Engines tab row 119). Without it, the split still shows; the reconciliation line says "could not verify against your broker". |
| B degraded | A holding we could not price | Visibly zero — "we could not price this" beside the holding (the Metrics tab row 52 column K) — and the account's percentages are suppressed while dollars remain: one unpriced holding makes every sibling slice wrong. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Same as P1-D. | Same as P1-D. |
| E related events | The leftover after holdings are placed, and it is NEGATIVE | Refuse to draw (the Metrics tab row 46 column K). A negative leftover means something is double-counted — the money-market fund pattern. The engine today silently absorbs a negative leftover into the largest holding (audit item 48, ACCOUNT_SPLIT the Engines tab row 119) — that is hiding a reconciliation failure inside the biggest slice. |
| F account-type / confidence | Same as P1-F, per account. | Same as P1-F. |

P3 (Look-through to what funds hold) — CUT by the founder 2026-08-20 (brief §C, Q17, same class as Look-through exposure): no security master exists. The honest sentence is the whole answer and it stays: "We can't see inside your funds. Your target-date fund is a whole portfolio in one line — a 60/40 split may already exist inside it."

---

### Allocation by tax treatment
How much is taxable, deferred, or tax-free?

#### P1 — Withdrawal sequencing
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Tax type unknown for an account | No institution tells us this reliably — it is always the person's own answer (TAX_TREATMENT, the Engines tab row 33). The engine defaults unknown to TAXABLE, the cautious side for tax owed — but for SEQUENCING advice a mislabeled account gives wrong advice, so: accounts still unconfirmed sit in a visible "confirm how this is taxed" state and sequencing output is suppressed until the material ones are confirmed. |
| B degraded | One wrapper, two tax characters (after-tax 401(k) money, nondeductible IRA basis) | The bucket totals stay by wrapper; a one-line note names the mixed money: "part of this IRA may already be taxed — your Form 8606 knows." Never split a wrapper on a guess. |
| C shape-per-road | The tax type is typed at Add account (Taxable / 401(k) / Traditional IRA / Roth / HSA — the Engines tab row 33) on every road | An explicit choice always wins over any later feed hint. Record that it is the person's answer — that is its confidence label. |
| D time-bounded | Sequencing is a per-year exercise | The buckets are today's; the sequence is drawn per tax year against that year's bracket room. The bucket VIEW needs no window — the plan built on it does, and says which year it is filling. |
| E related events | A Roth conversion or rollover | Dollars move BETWEEN buckets: record it as an internal move with a tax-character change — never as a withdrawal plus a contribution, which would poison both the flows and this view (the event-table rule family, the Transaction taxonomy tab rows 11–14). |
| F account-type / confidence | This metric IS the account-type axis | The residual F-risk is age gates ON TOP of tax character: tax-free is not penalty-free (Roth earnings before 59½ and the 5-year rule). The sequencing view carries the age flags from Liquid net worth P1-F. |

#### P2 — Roth conversion room
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Current-year taxable income unknown | Refuse the room figure — room = top of the target bracket − taxable income, and half of it is missing. Ask for this year's expected income; a conversion figure without income is a bracket accident waiting. |
| B degraded | Income is an estimate mid-year | Show the room as a band on the estimate: "roughly $28,000–$41,000 of room at your bracket, on your income estimate." Precision arrives in December, not July. |
| C shape-per-road | Same as P1-C — the deferred balance (the conversion universe) is the sum of accounts the person confirmed as tax-deferred. | Same as P1-C. |
| D time-bounded | Room is PER TAX YEAR | The window is the calendar year, hard: room unused on 31 December is gone, and next year's room is next year's brackets. Every room figure names its year. |
| E related events | The conversion's side effects | Filling a bracket can raise Medicare premiums two years later (the income-based premium thresholds) and stack onto capital-gains rates — the side effects most tools miss (spine row 70 trap). This tab's rule: the ROOM figure may show alone; a conversion RECOMMENDATION may not show without the premium-threshold check. |
| F account-type / confidence | Same as P1-F, plus | Conversions from unconfirmed accounts: suppressed until confirmed, per P1-A. |

#### P3 — True spendable net worth
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A — unknown-tax accounts default to taxable (cautious for tax owed), and the line says how much sits unconfirmed. | Same as P1-A, with the default working in the safe direction here. |
| B degraded | Same as P1-B. | Same as P1-B. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | The assumed rate is a TODAY's-law estimate | Label: "at today's rates, if withdrawn at your assumed bracket" — a 20-year projection of tax law is not a calculation, it is a guess with decimals. |
| E related events | Same as P1-E — conversions move money between buckets and change this figure without changing wealth; the walk names the move. | Same as P1-E. |
| F account-type / confidence | The calculation itself | Spendable = taxable at face + tax-free at face + deferred × (1 − assumed income rate). The deferred haircut uses an INCOME rate, never a capital-gains rate — gains in an IRA are taxed as income on withdrawal (crosswalk the the Comprehensive Metrics tab of the spine (crosswalk-Aug19) tab row tab row 78; audit item 22's rule family). A $1m IRA and a $1m Roth are not the same money (spine row 17), and this is the line that finally shows it. Assumed rate named on screen. The taxable bucket's own haircut — tax on unrealised gains — lives in the Embedded-tax metric: one screen may show either subtraction, never both without saying so, or the same tax is charged twice. |

---

### Allocation by liquidity
How fast could I raise cash?

#### P1 — Emergency planning
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No liquidity tag exists (same ground truth as Liquid net worth P1-A) | Same defaulting rule as Liquid net worth P1-A: class-based default tags into buckets — same-day / days / months / years — visible and editable per account (founder to bless the defaulting, open question 4). |
| B degraded | A CD before maturity | Two different "illiquid"s (spine row 18 trap): a brokered CD can be SOLD in days at market price; a bank CD breaks with a penalty; both differ from a house by years. Bucket CDs at "days, at a price" when brokered, "months or penalty" when bank — and when we cannot tell which, say "months" and ask. Maturity parsing per Liquid net worth P1-B. |
| C shape-per-road | Same as Liquid net worth P1-C: typed lumps bucket coarsely, connected accounts bucket per holding. | Same as Liquid net worth P1-C. |
| D time-bounded | The buckets ARE the time axis | Nothing extra to bound — the honest labels are the day-counts on the buckets themselves. Degenerate case: a known maturity date moves a CD up a bucket the day it passes; the buckets must be recomputed from dates, not stored. |
| E related events | Settlement and transfers | Same as Liquid net worth P1-E: unsettled proceeds sit in "days"; pending transfers count once. Crossing a penalty age moves retirement money from "years" to its holdings' own buckets on the birthday — compute from the date of birth, never hand-edit. |
| F account-type / confidence | Penalty-gated accounts | Same as Liquid net worth P1-F: before the applicable age, the whole account sits in "years" regardless of what liquid things it holds — the wrapper, not the holdings, is the gate. |

#### P2 — Large purchase planning
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Same as P1-A. |
| B degraded | Same as P1-B. | Same as P1-B. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | The purchase date is the boundary | Sum the buckets reachable by the date (spine row 18: first two buckets against the purchase amount — generalised to the date): a CD maturing before the purchase date counts in full; after it, at penalty value or not at all. Same rule as Liquid net worth P2-D. |
| E related events | Same as P1-E, plus earmarks per Liquid net worth P2-E. | Same as Liquid net worth P2-E. |
| F account-type / confidence | Same as P1-F, plus the tax line | Raising cash from taxable holdings triggers the embedded-tax metric; the purchase figure says "before tax on sales". |

---

### Concentration
Am I too dependent on one thing?

#### P1 — Largest single holding
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | A holding has no price, or no units | Its weight is unknowable — and so is everyone else's, because the denominator is wrong. Suppress the concentration figure and name the blocker: "we could not price LCTX, so shares of your total can't be computed." Never rank around a hole. |
| B degraded | Only account-level values, no holdings (typed lump) | The metric degrades to largest ACCOUNT share, and must say so — "your largest account", not "your largest investment". A lump can hide any concentration inside it. |
| C shape-per-road | The same security held at two brokers | Aggregate by SECURITY across accounts before ranking — the security key exists for this (engines/snapshots.ts:30–31, resolved once so a ticker change does not orphan history). Per-account ranking understates the true bet. |
| D time-bounded | Concentration is a today-fact | Computed on current values only. The one time-rule: report it only when at least two holdings exist and the top one is 25% or more (CONCENTRATION, the Engines tab row 74) — one holding is not a concentration, it is a portfolio. |
| E related events | Splits and spin-offs | A split multiplies units and divides price — concentration unchanged; never alarm on it. A spin-off creates a second position whose weight comes out of the first. Both arrive as corporate actions, which today touch units downstream inconsistently (audit item 39) — until fixed, a post-split weight jump is suspect data, not news. |
| F account-type / confidence | A broad index fund reads as 100% concentration | Word it so a fund is not mistaken for a single company: "your largest single investment", with the note that a fund spreads money across many companies (the Metrics tab row 61 column K; audit item 27 — that wording is carried nowhere today). |

P2 (Employer stock) — CUT by the founder 2026-08-20 (brief §C, Q10): vested shares are just stocks; origin changes no number. Concentration stands on the number alone. P3 keeps its label.

#### P3 — One-institution risk
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Institution unknown for typed accounts | Ask at entry ("where is this held?"); unassigned accounts sit in a visible "unknown institution" line rather than diluting the shares. |
| B degraded | Same as P1-B — lumps count whole at their institution. | Same as P1-B. |
| C shape-per-road | Institution comes free on connected accounts, asked-for on typed ones | Same aggregation either way: assets at one custodian ÷ total. |
| D time-bounded | Same as P1-D — a today-fact. | Same as P1-D. |
| E related events | A transfer between institutions mid-flight | Count the money once, at the sending institution until the receiving leg posts — consistent with Net worth P1-E. |
| F account-type / confidence | Insurance limits differ by account TYPE at the same institution | SIPC covers $500,000 per customer per capacity at a broker (cash sub-limit $250,000); FDIC covers $250,000 per depositor per bank per ownership category (figures as of 2026-08-19 — keep as reference data, reviewed, never hard-coded in engine logic; the RMD lesson, spine row 69, applies to every statutory number). The comparison is per institution per coverage type, and the app should say what the limits do NOT cover: market losses are not insured events. |

---

### Currency exposure
How much sits outside my home currency?

#### P1 — Balance-sheet translation
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No exchange rate for a holding's currency | Exclude it from the dollar total and show it in its own currency with a named line: "¥1,200,000 — no exchange rate available, not in your total." Summing yen and dollars is the failure this metric exists to prevent (spine row 21 trap). |
| B degraded | A stale exchange rate | Convert at the stated rate AND date — "at 149 yen per dollar, 12 August" (spine row 21: a stated rate and date is the calculation). A conversion without a date is a number without a meaning. |
| C shape-per-road | The rails disagree on where currency lives | FDX allows a holding-level currency different from the account's (spine row 21); file exports often carry none. Rule: use the holding's own currency where the institution states it; assume the account currency ONLY when stated at account level; otherwise flag the holding as currency-unknown and treat per P1-A. Never infer currency from a ticker's exchange suffix silently. |
| D time-bounded | Which day's rate | Balance-sheet translation uses the valuation date's rate — the same date as the value it converts. Value from Friday at Monday's rate manufactures a phantom move. |
| E related events | Currency-hedged funds | A hedged international fund has little currency exposure despite foreign holdings; an unhedged one has all of it. Fund-level exposure is a look-through question — same refusal as Allocation by asset class P3-A: without composition and hedging data, report fund currency exposure as "unknown for funds", counted separately from direct foreign holdings. |
| F account-type / confidence | Does the app handle any of this today? | Verified 2026-08-19: every snapshot row CARRIES a currency field (engines/snapshots.ts:39,50) but nothing converts it — no exchange-rate input or conversion exists anywhere in the engines or src/domain. The field without the conversion is the trap: a yen value can be written and summed as if it were dollars. Availability is PARTIAL on the spine; until conversion is built, the honest screen for a foreign holding is P1-A's named exclusion. |

#### P2 — Effect on return
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No exchange-rate SERIES for the window | Refuse the split; show the blended return labelled "includes currency movement — we can't yet separate it." A split needs start and end rates at minimum. |
| B degraded | Rates at month-ends only | Split at month-end resolution and say so; the interaction term absorbs the roughness. Never interpolate daily rates from monthly and present the result as daily. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | The window's two endpoints | Return in the holding's own currency over the window, then the currency move over the SAME window, then the interaction — three parts, stated separately (spine row 40 rule referenced by row 21). Reported as one blended number, a good year in a falling currency reads as poor stock picking. |
| E related events | Same as P1-E. | Same as P1-E. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

---

### Net worth data quality
How much of this can I trust?

#### P1 — Coverage
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | An account whose door we cannot determine | Count it as typed — the cautious side for a trust metric. Coverage = dollars in connected accounts ÷ total dollars, shown next to net worth: this is the honest confidence interval on every other number on the tab, and no consumer app shows it (spine row 22 trap). |
| B degraded | A connection that delivers balances but not positions | Half-covered: the balance is measured, the composition is not. Count it as connected for the balance-sheet metrics and as uncovered for anything holding-level — one account, two coverage answers, both true. |
| C shape-per-road | Coverage IS the per-road measure | Its whole job is naming the doors: measured (connected) / imported (file, as of its date) / stated (typed). Three shares that sum to 100% of dollars. |
| D time-bounded | Coverage on a past date | Coverage of a HISTORICAL figure is the coverage the record had THAT day, written into the day's row — which needs the per-day fields the store does not yet carry (audit item 49). Until then, historical coverage is not claimable. |
| E related events | An account closed or disconnected | Its history stays (append-only store); its coverage contribution ends at the disconnect date. Coverage never silently improves by dropping a dead account from the denominator. |
| F account-type / confidence | The labels themselves | One vocabulary everywhere: measured / imported-dated / stated. Every screen pulls the same three words from one place, or the trust metric itself becomes untrustworthy. |

#### P2 — Freshness
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No last-sync time stored | The per-account snapshot row is specified to carry last successful sync time and does not yet (the spine's Comprehensive Metrics tab (crosswalk-Aug19) row B9; audit item 49 — snapshots.ts AccountSnapshot has no such field). Until it exists, freshness for connected accounts is not claimable — show hand-entry dates only (value_as_of, src/domain/assets/index.ts:83), and say "sync times coming". |
| B degraded | Stale share | Freshness = dollars whose valuation is older than the tolerance ÷ total dollars. The tolerance is a named choice: six months for hand-entered values (HAND_VALUE_AGE, the Engines tab row 35). Show the DATE, not just "stale" — "as you entered it on 3 March" lets the person judge their own figure (the Metrics tab row 44 column K). |
| C shape-per-road | "Live" accounts go stale too | A live-priced account still shows its last successful sync — "live" with a three-day-old price is the same lie in a friendlier font (the Metrics tab row 44 column K). Different tolerance per road is legitimate: hours for a connection, months for a hand entry — both named. |
| D time-bounded | Freshness of a period figure | A change-over-period figure is as fresh as its STALEST endpoint. The label carries that date, consistent with Net worth P2. |
| E related events | A failed sync run | The value stays, the timestamp does not advance, the staleness accrues honestly. Never bump a timestamp on a failed fetch. |
| F account-type / confidence | Freshness feeds suppression | Stale beyond tolerance does not delete the number — it demotes it: dollars shown with their date, percentages suppressed where a stale ingredient is material. Suppress rather than decorate is the tab-8 stance (crosswalk the the Comprehensive Metrics tab of the spine (crosswalk-Aug19) tab row tab row 81). |

#### P3 — Manual share
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Trivially complete — every account has a door, and P1-A's rule assigns the doubtful ones to typed. No missing-input case survives; that is the argument this cell needs. | Manual share = hand-entered dollars ÷ total dollars, always computable. |
| B degraded | The honesty counters that do not exist yet | The day's row is specified to carry the count of unmapped events and the flows by bucket (the spine's Comprehensive Metrics tab (crosswalk-Aug19) row B9) and does not (audit item 49). Unmapped events are GUARANTEED, not rare — the rails pass unrecognised broker words straight through (the Transaction taxonomy tab row 46). An unknown word is quarantined — kept, shown, counted in NOTHING (engines/events.ts:95–96) — with an alert on first sight within a day (the Transaction taxonomy tab rule 3b); the alert is not built yet (audit item 44). Until the counter exists, the app cannot say "nothing unclassified today", only "we don't count this yet". On the founder's own file, seven of eight metrics were wrong and nothing on screen distinguished them (crosswalk the the Comprehensive Metrics tab of the spine (crosswalk-Aug19) tab row tab row 81) — this counter is that distinction. |
| C shape-per-road | A restated past day | Keep both rows — the new belief AND the old — so "why did this number change" has an answer (the spine's Comprehensive Metrics tab (crosswalk-Aug19) row B12). The store's record() currently drops the superseded row (engines/snapshots.ts:101–104; audit item 54), contradicting its own append-only promise. Until fixed, the app cannot honestly answer why a past number changed. |
| D time-bounded | Manual share over time | The share is written into each day's row when the fields exist (P2 family); until then, today's share only. |
| E related events | Corrections cascade | A corrected import changes past totals: the data-quality view must show "3 days restated this month", not silently absorb them — same append-only machinery as P3-C. |
| F account-type / confidence | Arithmetic honesty underneath everything | Money math must be exact-decimal end to end for fractional shares and crypto; today every engine runs on binary floating point and the work is untracked (the Metrics tab row 50 column K; audit item 21). The symptom is cents that never reconcile and cannot be traced — small numbers, large trust cost. One tracked work item, named here because this metric is where a person would first see the cents. |

---

## Open questions for the founder — decisions I could not make as the CFA

All of these were answered by the founder on 2026-08-20 — the verdicts live in METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx and BRIEF-decisions-and-fixes-2026-08-20.md. Questions touching a cut metric (brief §C) are void. Kept for the record only.

1. Flows threshold, one number: the same refuse-the-percentage decision carries 1% (the Metrics tab row 15 column K) and 10% (the spine's Comprehensive Metrics tab (crosswalk-Aug19) B15) — pick one and put it in the one named place with the other window conventions (audit items 2 and 4).
2. Money-market fund, one rule enforced on every screen: the class itself is already decided — the classifier carries your 2026-08-04 rule (money-market funds → Stocks / Funds; the code comment says it supersedes the older money-market-equals-cash rule — KIND_TO_CLASS, src/domain/assets/index.ts:174–177 and the rule comment at :185) and the master agrees (the Metrics tab row 37 column K). Two surfaces still disobey it: the grouping that files the fund under Cash, and the account screen that subtracts it from cash AND drops it from holdings, leaving that total short (the Metrics tab row 7 column K; audit item 46). Confirm the enforcement — those surfaces change to read the one classifier; nothing else is open.
3. Staleness tolerance for property and vehicles: the six-month account rule fits neither — is 12 months the re-confirm prompt for a home, and what for vehicles?
4. Liquidity tags: accept class-based default tags (visible and editable per account), or ask the person to set liquidity when an account is added?
5. Liquid net worth under the penalty ages: exclude pre-penalty retirement money entirely (my recommendation, one clean line), or include it net of penalty and assumed tax with a label?
6. Home downsizing line: may the app ask for home purchase basis, improvements, and filing status to compute the sale-exclusion tax line, or does the line stay at gross equity less 6–8% selling costs?
7. Employer-stock flag: add a user-set "this is my employer" flag on holdings so Concentration P2 can exist, or drop the employer-stock view until then?
8. Institution insurance limits: show SIPC/FDIC limits as maintained reference data next to one-institution risk, or keep statutory figures out of the app entirely?
9. Embedded-tax assumptions panel: one place holding the assumed income rate, capital-gains rate, the 3.8% surcharge threshold flag, and state tax — who sets the defaults, and may the person edit them?
10. Debt-payments-to-income for retirees: confirm the denominator = guaranteed income plus PLANNED sustainable withdrawal (never actual withdrawals taken).
11. Trend line marks: deposits and withdrawals are agreed (the Metrics tab row 42 column K) — confirm hand-entry revaluation days get the same mark, so a retyped house never reads as a market move.
12. Unclassified visibility threshold: at what share of total assets does the Unclassified bucket get flagged loudly (the quiet-4% trap — crosswalk the the Comprehensive Metrics tab of the spine (crosswalk-Aug19) tab row tab row 7; the Metrics tab row 38 column K) — 1%?
