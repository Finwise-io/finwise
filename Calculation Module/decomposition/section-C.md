# Section C — BUDGET, SPENDING AND CASH FLOW — metric use-case grid
Spine: crosswalk tab "9. Comprehensive Metrics", rows 43–58 (16 metrics, in the spine's order).
Written 2026-08-19 as the Certified Financial Advisor for a 55–70-year-old client. Every cell is a
calculation or a named refusal; a figure that cannot be supported is absent, never invented.
"Refuse" always means: show the dollars we do know, then one plain reason, never a blank (master tab 9 B16–B17).

Coverage line: 16 of 16 Section C metrics (spine rows 43–58) · 45 of 45 purpose cases · 270 of 270 condition cells — every cell a calculation, a named refusal, an argued N/A, or a pointer to the cell that carries the rule.

One fact that shapes this whole section, verified against the code on 2026-08-19: the app has NO
bank or card connection today. Spending and household income arrive by four roads only — typed
entries, receipt photos (on-device ML Kit text recognition + total-line parser, src/services/receiptScan.ts,
used at src/screens/ExpenseScreen.tsx:136), declared repeating items that auto-log
(src/screens/ExpenseScreen.tsx), and the plan answers from onboarding. The only connected road is
the brokerage (SnapTrade). A bank/card feed (Plaid) is planned but not live. Where a purpose below
needs a bank feed, the cell says what the screen shows TODAY and what the connection will add.

---

### Income
What comes in?

#### P1 — Gross
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | The person entered take-home only and never told us gross. | Gross is worked back through the tax schedule (src/domain/income/tax.ts:47), but that function uses the SINGLE-filer schedule for everyone — a married couple's gross comes out too high (take-home $90,000 → gross overstated by $6,746). Until the filing status is passed through (Engines row 134, DEFECT), show gross for single filers only; for married filers say "We can show what lands in your account; to show before-tax pay we need your filing status" and take it in one tap. Never print the single-filer figure for a married person. |
| B degraded | Only deposits are visible (logged or, later, bank-fed) — net pay, no pay stub detail. | Gross is NOT computable from deposits: tax withheld and 401(k) contributions never appear in a bank deposit. Show the net figure labelled "what landed", and one line: "Before-tax pay and 401(k) savings don't show in deposits — add your salary to see the full picture." Do not estimate gross from a deposit. |
| C shape-per-road | Salary arrives as one monthly figure, a month-by-month table, or a take-home figure with a flag. | One rule (src/domain/income/onboarding.ts:46): a by-month table is used as given; a single figure fills all twelve months; a take-home entry is grossed up and every month scaled by the same factor so the shape of the year survives. A stated gross and a measured deposit are never mixed in one total without saying which is which. |
| D time-bounded | "Gross this month / last 3 months." | Sum the actual months from the by-month grid — never a representative month × N. The old version took the highest month × 12 and turned $30,000 of seasonal pay into $120,000 (bug B-34, pinned at src/domain/income/onboarding.ts:310). A window before the person's history starts is refused with the true first date shown. |
| E related events | Bonus, RSU vesting, one-off income. | Equity lands in the months its vest dates fall — one placement rule shared by every surface, so no screen shows a December lump another shows in March (equityVestWeights, src/domain/income/onboarding.ts:96). But the ANNUAL equity figure is a level run-rate: total scheduled value ÷ the years it vests across (rsuAnnual, src/domain/income/onboarding.ts:112) — an uneven schedule shows an average, not this year's actual vests. Label it "averaged across your vesting years" whenever the per-year vest table (equityCashFlow, src/domain/income/onboarding.ts:80) differs from the average; unvested equity is a schedule, never bankable money. A one-off is never spread across future months (src/domain/income/onboarding.ts:161). A reinvested dividend never reached the bank: it belongs to investment income (section B), not to "what comes in to spend" — the founder's case 5, applied here. |
| F account-type / confidence | Stated vs measured; retiree income. | Every income line carries "as you told us" or "as it landed". Retirement income counts as arriving NOW only if the person said they are receiving it — a future pension never inflates today's income (src/domain/income/onboarding.ts:191). |

#### P2 — Net after tax and deductions
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No withholding detail exists (there is no payroll feed on any road). | Net = gross minus MODELLED tax from the bracket tables (src/domain/income/tax.ts:94) minus the 401(k) deduction. Label it "estimated from the tax tables, not your pay stub". If a logged deposit exists for the month, the deposit is the truth for "what landed" and the model only explains the difference. |
| B degraded | No filing status chosen. | Default is single (src/domain/income/onboarding.ts:333) — the cautious side for tax owed, but it UNDERSTATES net pay. Show the assumption: "assuming you file single — change this and the figure changes." |
| C shape-per-road | Same as P1-C. | Same as P1-C, plus: when a bank feed arrives, the deposit becomes the measured net and the model is demoted to the explainer line. |
| D time-bounded | Net for one month. | That month's row of the net grid plus that month's logged one-off income — exactly what actualMonthFlow does (src/domain/budget/index.ts:93). Never a flat annual ÷ 12 when a by-month shape exists. |
| E related events | 401(k) contribution, employer match. | The employee 401(k) deduction reduces take-home but is saving, not spending — it is removed between "net" and "available" in the grid (src/domain/budget/index.ts:233). The employer match is never inside net pay; it is added to saving only (Engines row 124). |
| F account-type / confidence | Pre-tax vs Roth 401(k) contribution. | A Roth contribution does not reduce taxable income; a pre-tax one does. Verified: the engine subtracts NO 401(k) deferral before tax — taxableAnnual (src/domain/income/onboarding.ts:324) taxes the full gross, as if every contribution were Roth. For a pre-tax saver that overstates tax and understates net — the cautious side, but wrong by the deferral × marginal rate. Until the deferral type feeds the tax base, the label: "tax estimated without your 401(k) deduction — if yours is pre-tax, you keep more than shown." |

#### P3 — By source
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | A logged deposit has no payer name. | It goes to a visible "Other income" line, never guessed into a source. One tap to name the payer once; the name then sticks. |
| B degraded | One payroll deposit mixes salary and an expense reimbursement. | Show it as the person labelled it. The app never splits a single deposit on its own authority — a reimbursement misread as pay inflates income and the savings rate built on it. |
| C shape-per-road | Broker income rows arrive with the broker's own word. | Keep the taxonomy's lines apart: a capital-gain distribution is not a dividend and is taxed differently (audit item 35; taxonomy tab 5 row 22). On single-row rails (OFX-style REINVEST) the income leg is currently counted NOWHERE (audit item 34) — until that is fixed, the by-source view says "dividend history from this broker may be incomplete" for accounts on that road. |
| D time-bounded | Sources over a chosen window. | Group only rows dated inside the window, and label the window with its true start where the broker's history is shorter (Engines row 16: depth is tracked per account). |
| E related events | Return of capital; reinvested dividends; reversals. | Return of capital is the person's own money coming back — NEVER income (audit item 37; taxonomy row 25: counted as income it overstates what a retiree can safely spend, the most damaging misfile for this audience). A reinvested dividend is income ONCE, on its income leg; the purchase leg raises units AND cost basis, and is never a flow (master tab 1 K14; master tab 5 rows 20–21; founder case 5). Totals sum SIGNED amounts so a reversal cancels; absolute-value sums turned $1,193 of interest into $2,387 (audit item 36). |
| F account-type / confidence | Taxable vs non-taxable sources. | Keep them apart end to end (src/domain/income/onboarding.ts:161 already does): a non-taxable dollar is worth more, and blending them misprices the tax picture. Dividends inside an IRA are not taxable income this year — label them "inside your IRA, not taxed now". |

#### P4 — Stability
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Fewer than 12 measured months. | Refuse the stability figure. Show the months that exist and the true first date: "We can judge how steady your income is after 12 months — you have 4." Never compute a range over two points. |
| B degraded | Income is stated, not measured. | A single stated figure has zero variation BY CONSTRUCTION — a stability score from it is fiction. Show "based on what you told us, income is level at $X/month" and nothing more. |
| C shape-per-road | Seasonal work; months with no pay. | Count only months actually worked (src/domain/income/onboarding.ts:306) and show the range across ALL twelve months — a landscaper's zero months are the instability, not noise to remove. |
| D time-bounded | Range over 3 months vs 12. | A 3-month range misses annual seasonality; offer it labelled "last 3 months" and keep the 12-month range as the headline once it exists. |
| E related events | One-off income inside the window. | Exclude flagged one-offs from the stability of recurring income and say so — a signing bonus is not volatility. |
| F account-type / confidence | Retiree: guaranteed vs variable. | Split the floor from the rest: Social Security, pension and annuity payments are stable by contract; only the variable part (rentals, part-time work, distributions) gets a stability reading. One blended number would hide the one fact that matters at 65. |

---

### Total spending
What goes out?

#### P1 — This period
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No transactions logged this month. | Show "$0 logged so far this month" as a fact about the RECORDS, never as "you spent nothing" — with the planned figure beside it clearly labelled Planned. Offer the two capture doors (receipt photo, quick add). |
| B degraded | Only a stated monthly total exists — no transactions at all. | That is a plan number. Show it under Planned (src/domain/budget/index.ts:45 — the larger of the itemised buckets and the stated total, the cautious side). Never chart a stated figure as actual spending. |
| C shape-per-road | Typed entry, receipt photo, auto-logged repeating bill, and (future) bank feed. | All land in one ledger, each row carrying its road. The card trap when the feed arrives: card purchases AND the card payment from checking are the same dollars — exclude the card payment as a transfer, count the purchases (the spine's trap; the budgeting twin of the sweep problem). A transfer word the app does not recognise is quarantined, never sign-guessed into spending — the exact failure class that booked an outbound transfer as a contribution on the broker road (audit items 32, 33). |
| D time-bounded | Month, 3 days, 3 weeks — where does the window close? | Sum rows dated inside the window, under the one written convention used everywhere: the window opens AFTER the start day's close, so a flow dated on the start day is OUTSIDE the window (master tab 1 K6, convention 2; audit item 2 — carried downstream only by these grids until it lives in one tested module). Corollary for spending: a start-day row is outside, the last day's rows are inside. Label every figure with its actual dates; confirming K6 as the app-wide rule is open question 7. |
| E related events | Refunds, returns, reimbursements. | A refund carries the opposite sign and CANCELS the purchase inside the same total. Summing absolute values would add it — the $2,387 class (audit item 36). A reimbursed expense nets to zero across the pair; show both rows, net the total. |
| F account-type / confidence | Hand-typed rows; cents. | A manual row is trusted as typed and never second-guessed (src/domain/transactions/flags.ts — connected rows only are ever flagged). Ledger sums need exact decimal arithmetic; binary floating point leaks cents that never reconcile (audit item 21). |

#### P2 — Versus my own average
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Fewer than 3 complete measured months. | Refuse the comparison: "You'll see this against your own average after 3 full months — you have 1." A comparison against one month is a coin flip presented as a trend. |
| B degraded | Months before the app existed. | They are unknown, not zero. Average only over months WITH records, and label the true start: "average of your 5 recorded months" (the start-date rule, master tab 9 row 20). |
| C shape-per-road | Coverage changed mid-history (manual months, then a connected feed). | A jump in the average can be a COVERAGE jump, not a spending jump. Show coverage per month (how much of the month has records) beside the trend, or the person reads their own data improving as their spending exploding. |
| D time-bounded | Trailing 3 / 6 / 12-month averages. | Each average uses only complete months; the current partial month never enters its own average. Offer all three, labelled with their spans, as the spine asks. |
| E related events | A past month is re-imported or corrected. | Recompute the averages, and keep the earlier stored month as a versioned row rather than overwriting it (audit item 54; master tab 9 row 12) — otherwise history silently changes and last week's screen can never be explained. |
| F account-type / confidence | Planned vs measured months. | Never blend a planned month into a measured average. One basis per average, named in the label. |

#### P3 — Excluding one-offs
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Nothing is flagged one-off. | The two views are identical — say "no one-off costs flagged" rather than showing the same number twice as if it proved something. |
| B degraded | The flag is a judgement call. | The app may SUGGEST (a row several times the person's median money-out is a candidate — the same arithmetic F10 already uses, src/domain/transactions/flags.ts), but only the person confirms. An algorithm deciding what was "exceptional" in someone's life is the wrong division of labour. |
| C shape-per-road | Yearly bills look like one-offs. | A non-monthly category (insurance, property tax) is recurring-but-lumpy, NOT one-off — it will come back. Keep the bucket distinction (src/domain/budget/index.ts:72); only genuinely non-repeating costs get the one-off flag. |
| D time-bounded | Short windows swing hard. | Removing one $8,000 roof repair from a 3-month average moves it $2,667 a month. Always show BOTH figures — with and without — and the list of what was removed. |
| E related events | A one-off is refunded. | The refund follows the flag: it cancels inside the one-off bucket, not inside everyday spending — or the everyday average drops for a reason the person cannot see. |
| F account-type / confidence | Trust in the adjusted number. | The adjusted figure always names its exclusions ("excluding 2 one-off costs totalling $9,400"). A cleaned average with an invisible cleaning rule is not honest. |

---

### Spending by category
Where does it go?

#### P1 — This period
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Rows with no category. | A visible "Not yet sorted — $X" row of its own, never spread across the others (the same rule as the unclassified bucket on the balance sheet: an 'other' bucket that quietly holds 4% passes every test). One tap sorts them. |
| B degraded | Categories chosen at entry can be wrong; receipt reads are partial. | The receipt door reads the AMOUNT and MERCHANT on-device and the person confirms both; when the receipt is unreadable it says "enter details manually" and fills nothing — never a confident wrong figure (src/services/receiptScan.ts parseReceipt; src/screens/ExpenseScreen.tsx:138–143). The CATEGORY is always the person's own pick — the app does not auto-categorise today, so when a feed brings auto-categorisation, show how much of the period was recategorised — the spine's trap: a category trend can be a categorisation trend. |
| C shape-per-road | Custom categories vs built-ins. | One mapping decides every row's bucket (categoryBucketFor, src/constants/categories.ts:24, honouring the person's custom categories). The same label must land in the same bucket whichever door it entered by. |
| D time-bounded | Same as Total spending P1-D. | Same as Total spending P1-D. |
| E related events | Recategorising past rows. | Allowed, but the change is visible: "3 rows moved from Dining to Groceries this month." Silent recategorisation makes last month's chart unreproducible. |
| F account-type / confidence | 'Debt payment' rows. | Excluded from the category totals by rule (src/domain/budget/index.ts:270) — debt is tracked in the debt module. Say so under the chart, or the person adding their mortgage payment thinks the app lost it. |

#### P2 — Trend
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Under 3 months of records in that category. | Same as Total spending P2-A, per category: no trend line under 3 complete months. |
| B degraded | Sparse categories. | A category with 2 transactions a year (gifts) has no monthly trend — show the entries, not a line through noise. |
| C shape-per-road | Same as Total spending P2-C. | Same as Total spending P2-C. |
| D time-bounded | Category total per month over 12 months. | Complete months only; partial month shown as month-to-date, visually distinct from the closed months. |
| E related events | Same as P1-E, plus unmapped rows. | An unknown word is quarantined — kept, shown, counted in NOTHING (engines/events.ts:95–96) — with an alert on first sight within a day (master tab 5 rule 3b); the alert is not built yet (audit item 44). Until it exists, the trend must not claim months containing quarantined rows are complete. |
| F account-type / confidence | Same as P1-B. | Same as P1-B — the recategorised share is the trend's error bar. |

#### P3 — Versus budget
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No budget set for a category. | Show actual only, with "no budget set — tap to add one". A comparison against an unset budget of $0 reads as infinite overspend. |
| B degraded | Budget set at bucket level, spend known per category. | Today the built comparison is per BUCKET (fixed / non-monthly / flexible — src/domain/budget/index.ts:261). Compare at the level both sides exist; a per-category verdict from a bucket-level budget is invented precision. |
| C shape-per-road | Percent-based budget lines. | A category budgeted as % of take-home resolves through ONE conversion shared with the buckets (src/domain/budget/index.ts:61), so the line item always reconciles with its bucket total. |
| D time-bounded | Mid-month comparison. | That is the Pace purpose — see Budget vs actual P2. Point-in-time actual-vs-budget on day 5 always looks fine; label month-to-date comparisons as such. |
| E related events | Same as P1-E. | Same as P1-E. |
| F account-type / confidence | Planned vs actual labels. | The canonical labels: Actual (this month) / Planned (from the plan) — one engine, one pair of words (docs/finwise-taxonomy-spec.md). Never show a planned figure unlabelled next to a measured one. |

---

### Fixed vs variable vs discretionary
What could I cut if I had to?

#### P1 — Floor spending
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No category-level answers — just one total. | The floor cannot be separated: fall back to the WHOLE planned spend as the floor (src/domain/budget/index.ts:164, the B-33 fix) — cautious for every figure built on it — and say "we're treating all your spending as must-pay until you sort it". |
| B degraded | Only the three legacy summary figures (fixed / non-monthly / flexible), no tiers. | The bucket split exists but essential-vs-optional does not. Floor = the fixed bucket, labelled "your recurring bills — tell us which are must-pay to sharpen this". Never guess tiers from labels. |
| C shape-per-road | Recurring obligations declared vs (future) detected. | Declared repeating bills (src/screens/ExpenseScreen.tsx) are the floor's evidence today; a detected recurring charge from a future feed joins only after the person confirms it is theirs and must continue. |
| D time-bounded | Non-monthly essential bills (insurance, property tax). | Today they are EXCLUDED from the monthly floor as "lumpy, planned separately" (src/domain/budget/index.ts:168). For a monthly floor that is defensible only if the dated bills are shown beside it; for any ANNUAL floor they must be inside. Open question 3 for the founder. |
| E related events | Debt minimum payments. | The floor a person must pay includes debt minimums, which live in the debt module (src/domain/debt/index.ts:55). Floor shown = essentials + debt minimums, and 'Debt payment' logged rows are excluded from the expense side so the same dollars never count twice. |
| F account-type / confidence | Who decides what is essential. | The person confirms tiers; the app never decides what is essential in someone's life (the spine's trap — this number feeds the entire retirement plan). Unsorted remainder counts as essential — the cautious side (src/domain/budget/index.ts:173). |

#### P2 — Discretionary headroom
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | With no split, headroom is unknown — refuse rather than print total-minus-total = $0 headroom, which reads as "nothing to cut" and is false. |
| B degraded | Same as P1-B. | Headroom = flexible bucket only, labelled as the part the person called flexible. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Headroom this month vs this year. | Monthly headroom = take-home that month − floor − dated bills due that month; the by-month grid already carries the lumps (src/domain/budget/index.ts:208). A flat annual ÷ 12 hides the tuition month. |
| E related events | Same as P1-E. | Chosen extra debt payments above the minimum are discretionary by definition — they appear as headroom the person chose to spend on debt (src/domain/debt/index.ts:53–57: two named monthly-debt numbers, minimum vs actual, never merged). |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |
#### P3 — Retirement essential-spend input
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | The plan gets the whole planned spend as essential — the plan is conservative, and the screen says the plan will improve when spending is sorted. |
| B degraded | Same as P1-B. | Same as P1-B; the plan input is labelled with its quality ("from your three summary figures, unconfirmed"). |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Essential spend in TODAY'S dollars. | The retirement engine inflates it per future year itself — feeding an already-inflated figure counts inflation twice (Engines row 116). One basis, stated. |
| E related events | Spending that ENDS at retirement. | The essential floor for the plan must drop payments that end (mortgage payoff, work costs); the plan-side engines already model payments that end (src/domain/retirement/paymentsThatEnd.test.ts). The essential input carries its end dates, not a flat forever figure. |
| F account-type / confidence | The person confirms, the plan consumes. | The single most consequential confirmation in the app: essential = fixed + the necessary part of variable, confirmed by the person (spine row 46). The plan screen shows WHICH categories are inside the figure, so the one wrong row can be corrected. |

---

### Recurring subscriptions
What am I paying for without noticing?

#### P1 — Active list
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No transaction feed exists to detect from (today's reality). | The honest screen is the DECLARED list: "Your repeating bills, as you've told us" (src/screens/ExpenseScreen.tsx auto-logs them on their due dates). Detection — same merchant, similar amount, regular interval — becomes possible only when a bank/card feed connects; say that plainly rather than showing an empty "we found nothing". |
| B degraded | Feed history shorter than the cadence (future road). | An ANNUAL subscription needs more than a year of history to appear twice; most rails send 12–24 months (spine row 47 trap). Label the list "from N months of history — yearly charges may be missing", using the per-account true first date (Engines row 16). |
| C shape-per-road | Declared vs detected items. | Two origins, one list, each row marked "you added this" or "we spotted this — confirm it's yours". A detected charge the person does not recognise is exactly the row worth a look, not a row to silently include. |
| D time-bounded | "Active" means seen within its own cadence. | A monthly charge missing for 2 cycles is "possibly cancelled — confirm"; a yearly one is active until 13+ months pass. Judged per item cadence, never one global staleness line. |
| E related events | Price changes and merchant renames. | A renamed merchant looks like a new subscription plus a cancelled one; match on amount + interval before declaring either. Keep the old name visible in the row's history. |
| F account-type / confidence | Detection is inference. | Every detected row carries its evidence ("9 charges of $15.99, monthly since Jan"). A subscription list without evidence teaches the person to distrust the whole screen the first time it is wrong. |

#### P2 — Annual cost
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Annual cost = amount × declared frequency for the declared list. Nothing declared and nothing detected → no figure, with the add-door shown. |
| B degraded | Frequency inferred from only 2 observations (future road). | Two charges 30 days apart could be monthly or two one-offs. Below 3 observations, show the charges, refuse the annualised figure — annualising a guess multiplies it by 12. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Cost "per year" from mixed cadences. | Monthly ×12, quarterly ×4, yearly ×1 — each from ITS OWN cadence, then summed. Never average the charges and multiply. |
| E related events | A mid-year price change. | Annual cost uses the LATEST price for the forward figure and the actual charges for the trailing figure — two different questions; label which one is on screen. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

#### P3 — Price creep
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No history of charges (declared item, never observed). | Refuse: creep is a comparison of observed charges. "We'll watch this once charges appear" — or the person can update the amount by hand, which restarts the baseline. |
| B degraded | Fewer than 2 observed charges. | No comparison exists. Show the single known amount, no creep verdict. |
| C shape-per-road | Same as P1-C. | For declared items edited by hand, the comparison is against the previous declared amount, labelled "as you updated it". |
| D time-bounded | Creep since WHEN. | Latest amount vs the FIRST SEEN amount, with both dates shown (spine row 47) — "was $9.99 in Mar 2025, now $15.99" — never an unanchored percentage. |
| E related events | A plan upgrade is not creep. | A step change the person made (different tier) is not the vendor raising prices; one tap to mark "I changed my plan" resets the baseline. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

#### P4 — Unused
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Usage is invisible on every road. | No feed can see whether a subscription is USED — only paid. The app may flag cadence facts; it must never claim "unused". The verdict is the person's (spine row 47: "only the person knows"). |
| B degraded | Same as A — usage never arrives in degraded form; it never arrives at all. | Not applicable beyond A: there is no degraded shape of a signal that no road carries. The refusal in A is the whole answer. |
| C shape-per-road | Same as A. | Same as P4-A — no road carries usage; the cell exists to say so. |
| D time-bounded | "Haven't thought about this in a while." | The honest time-bounded fact: "You've paid this 12 times since you last changed anything about it." A fact about attention, not about use. |
| E related events | Cancellation follow-through. | After the person marks "cancel this", watch for the NEXT charge and surface it if it lands — the one moment the flag genuinely helps. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

---

### Net cash flow
Am I saving or dipping in?

#### P1 — Monthly
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Nothing logged this month. | Show the PLANNED surplus (income − spending from the plan, src/domain/budget/index.ts:30) labelled Planned, and "log income and spending to see the actual". Never present the plan as the month's result. |
| B degraded | One side measured, the other stated. | A mixed figure must name its halves: "income as it landed, spending from your plan". Better than nothing, worse than measured — and the label is what keeps it honest. |
| C shape-per-road | Transfers between the person's own accounts. | Money moved to savings or brokerage is SAVING, not spending, and never income on the receiving side. Netting requires BOTH legs, and both accounts in the measured set — the engine today nets only within the per-screen set, not household-wide (audit item 30; tab 1 K10). An unmatched leg is held pending, never counted as external (taxonomy tab 5 row 11). |
| D time-bounded | The month boundary. | Same convention as Total spending P1-D — one written rule, both sides of the flow use it, or income and spending can land in different months and invent a deficit. |
| E related events | Does the figure add up? | Run the identity: income − spending − debt payments = the change in cash across the accounts, within a cent (taxonomy tab 5 rule 4; not built — audit item 45). Storing each day's flows by bucket in the snapshot store makes this a lookup, and those fields are committed but missing (audit item 49). Until it runs, a phantom flow is invisible. |
| F account-type / confidence | Retiree framing. | For a retiree the default INVERTS: a portfolio withdrawal is not income, and counting it as such shows healthy cash flow while the pot drains (spine row 48). Retiree cash flow = guaranteed income + withdrawals − spending, with the withdrawal on its own labelled line, "from your savings". The paycheck engine already locks withdrawals out of "guaranteed" (src/domain/paycheck/index.ts, PRD erratum 18). |

#### P2 — Rolling
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Under 3 complete measured months. | Same as Total spending P2-A — no rolling figure below 3 complete months. |
| B degraded | Same as P1-B. | A rolling average never mixes measured and planned months; if the basis changed mid-window, split the window at the change. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Trailing 3 and 12-month averages. | The honest picture when income is lumpy (the spine's own point). Complete months only; label the span. |
| E related events | Same as Total spending P2-E. | Same as Total spending P2-E — corrected months recompute the roll, old versions kept. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

#### P3 — Retiree version
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Guaranteed income never captured. | Refuse the retiree cash flow rather than fake a $0 floor — the paycheck engine's own rule (guaranteedMissing prompts, never fakes zero — src/domain/paycheck/index.ts). The ask: "Add your Social Security or pension amounts from your benefit letter." |
| B degraded | Withdrawals not separable from other deposits. | Without typed withdrawal events, a bank deposit from the brokerage looks like income. Until the roads mark it, the retiree view says "including $X that may be withdrawals from your own savings" — the doubt named, not hidden. |
| C shape-per-road | Withdrawal identification per road. | On the broker road, WITHDRAWAL is a typed event (taxonomy tab 5 row 7 — an RMD or pension payment out is exactly this). On the logged road the person labels it. The two must reconcile when both see the same dollars — one movement, one meaning. |
| D time-bounded | This month vs this year. | The paycheck engine's year is the EXACT sum of its 12 months, never a month × 12 (src/domain/paycheck/index.ts:158). Same rule here. |
| E related events | RMDs. | An RMD is a compulsory withdrawal — cash flow in the bank, taxable income, and NOT new wealth. It appears in the retiree flow as "required withdrawal", never blended into "income" (the paycheck engine's locked definition excludes ri_rmd from guaranteed). |
| F account-type / confidence | Which pot the withdrawal came from. | A withdrawal from the IRA is taxed as income; from the Roth it is not; from taxable it is partly gain. The cash-flow line is the same dollars either way, but the after-tax meaning differs — carry the account's tax type on the withdrawal line (src/domain/assets/index.ts:253). |

---

### Runway / emergency reserve
How long could I last?

#### P1 — Months of full spending
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No cash accounts captured. | Refuse the months figure — "add your checking and savings balances to see how long you could last." A runway from $0 recorded cash reads as zero months and terrifies for no reason. |
| B degraded | Hand-entered balances gone stale. | A typed balance six months old is stale by rule (src/domain/assets/index.ts:95). Show the runway WITH the date: "about 7 months — using the balance you entered on 3 March." The person can judge their own figure (tab 1 K44). |
| C shape-per-road | What counts as reachable money. | Full-spending runway uses LIQUID assets. A brokerage balance counted as reserve assumes selling without loss at the worst moment — exactly untrue then (spine row 50 trap). Include it only in a labelled "if you also sold investments" variant, never in the headline. |
| D time-bounded | Which spending figure divides. | Divide by the trailing measured average where 3+ months exist, else the planned monthly spend — and the label names which (Planned vs your actual average). One denominator per figure, never a blend. |
| E related events | A known big bill inside the horizon. | A $9,000 tuition bill due in month 2 shortens every runway answer; the dated-bill planner already computes cash-on-the-day (src/domain/cashflow/index.ts:65). Show "runway after known bills" when dated bills exist. |
| F account-type / confidence | Retirement accounts before the age rules. | Under 59½, IRA money is reachable only with penalty; a 401(k) at 56 may be reachable under the age-55 separation rule; at 60 both are open (spine row 9: penalty ages change by account type). Exclude penalty-locked money from the reserve, and show it as "reachable with penalty: $X" — for a 55–70 audience this line IS the metric. |

#### P2 — Months of essential spending
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Essentials cannot be separated (no tiers). | Falls back to full planned spend as essentials (src/domain/budget/index.ts:164) — runway is then the SAME as P1 and the screen says why: "sort your must-pay bills to see the longer honest answer." |
| B degraded | Same as Fixed vs variable P1-B. | Same as Fixed vs variable P1-B — essentials from the fixed bucket only, labelled unconfirmed. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Non-monthly essentials. | If the floor excludes insurance-type bills (see Fixed vs variable P1-D), an "essentials runway" overstates during the months those bills land. Either add 1/12 of the essential non-monthly bills to the divisor, or show the dated bills on the runway itself. |
| E related events | Same as P1-E. | Same as P1-E — the engine's jobLossRunway divides cash by essentials (src/domain/budget/index.ts:197) and the recommended fund is 3× essentials (src/domain/budget/index.ts:191). |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

#### P3 — Cash-only version
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Same as P1-A. |
| B degraded | Same as P1-B. | Same as P1-B. |
| C shape-per-road | What "cash" means. | Cash means the truly uninvested money — the decided rule (tab 1 K37; Engines row 28): a money-market fund is a HOLDING that pays income, never inside the app's Cash figure. The cash-only runway divides by bank balances + broker sweep. Money-market funds may appear ONLY as a labelled second line ("with money-market funds: $Y more"), never blended into the headline — one rule, every screen. A CD before maturity is NOT same-day money — list it with its maturity date, out of the same-day figure. |
| D time-bounded | Same as P2-D. | Same as P2-D. |
| E related events | Same as P1-E. | Same as P1-E. |
| F account-type / confidence | Same as P1-F. | Same as P1-F — penalty-locked cash (IRA CDs) is not reserve cash. |

---

### Budget vs actual
Am I on plan?

#### P1 — Point in time
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No budget exists. | Nothing to compare — show actuals and the door to set a plan. Never compare against $0 and report 100% overspend. |
| B degraded | Budget at bucket level only. | Compare at bucket level (src/domain/budget/index.ts:261 — planned vs spent vs remaining per bucket). Same rule as Spending by category P3-B: compare only at the level both sides exist. |
| C shape-per-road | Actuals from mixed doors. | Same ledger rules as Total spending P1-C; the comparison inherits them. 'Debt payment' rows stay out of both sides (src/domain/budget/index.ts:270). |
| D time-bounded | Month-to-date vs full-month plan. | Always label "so far this month". The unlabelled version is the classic false comfort — see P2. |
| E related events | Refunds inside the month. | Same signed-cancel rule as Total spending P1-E; a refund returns headroom to its category's remaining figure. |
| F account-type / confidence | Same as Spending by category P3-F. | Same as Spending by category P3-F — the Actual/Planned word pair, everywhere. |

#### P2 — Pace
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Not built today — no pacing figure exists in the budget engine (src/domain/budget/index.ts has month-to-date only). | Build rule: compare spent-so-far against expected-by-now, where expected-by-now = fixed bills already due this month + the flexible budget × share of month elapsed. Until built, show plain month-to-date without any "on track" wording — a comparison that ignores pace must not imply pace. |
| B degraded | Straight pro-rata misleads. | Fixed bills land early (rent on the 1st): day-5 spending of 40% of budget can be exactly on plan. Pro-rate the FLEXIBLE part only; count fixed bills by their due dates (declared recurring items carry them). |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Day 5 vs day 25. | The whole point of the purpose: on day 5 the unpaced comparison always looks fine (spine row 51 trap). The pace line carries the day: "by day 20 you'd normally be at $2,400; you're at $3,100." |
| E related events | A one-off early in the month. | A flagged one-off wrecks the pace signal for the rest of the month; show pace with the one-off excluded and named (same rule as Total spending P3). |
| F account-type / confidence | Confidence in the pace verdict. | Pace needs at least the current month's records to be reasonably complete; with manual-only logging, say "based on what you've logged" — a pace verdict on a half-logged month is confidently wrong. |

#### P3 — Rollover
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Not built; no rollover rule exists. | Refuse silently rolling anything. Rollover changes the meaning of "budget" (an envelope, not a monthly allowance) and needs a founder decision on the rule: roll under- AND over-spend? capped at one month? per category or per bucket? Open question 1. |
| B degraded | Partial history months. | A rollover computed from an incomplete first month bakes the gap in forever; rollover starts only from the first COMPLETE month. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Where rollover shows. | Carried amounts appear as their own labelled line ("+$120 carried from July"), never silently merged into the new month's budget — the person must see why August's number moved. |
| E related events | Recategorising after month close. | If a past month's rows move category, its rollover changes; recompute forward and show the correction — same visibility rule as Total spending P2-E. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

---

### Cash flow forecast
What will my balance be?

#### P1 — End of month
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No starting balance. | Refuse — a forecast from an unknown start is a shape with no anchor. The dated-bill planner takes startBalance explicitly (src/domain/cashflow/index.ts:65); with none, ask for the checking balance, one box. |
| B degraded | Income smoothed to a daily average. | The engine accrues steady income daily (src/domain/cashflow/index.ts:85) — smooth by construction, so mid-month lows between paydays are invisible in the steady part. Honest while dated items carry the lumps; say "assumes your regular income arrives evenly". |
| C shape-per-road | Declared months/days vs measured dates. | Dated bills and inflows come from the months and due-days the person declared (src/domain/cashflow/index.ts:104). DEFECT, verified: percent-based bills here resolve against an INLINE net-of-tax base (src/domain/cashflow/index.ts:103) while the budget resolves the same bill against take-home after tax AND 401(k) (categoryMonthly, src/domain/budget/index.ts:61) — the forecast quietly shows a bigger dollar figure for the same bill than the budget does, by the 401(k) share. One bill, one dollar figure: route the forecast through the same shared conversion. When a feed arrives, measured recurring dates supersede declared guesses item by item — with the person confirming, not silently. |
| D time-bounded | End of month = balance + expected income − expected bills. | Computable today from the grid. Label it "projected", with the as-of date it was projected FROM. |
| E related events | A one-off planned cost. | Big planned costs enter on their dates (the big-costs capture feeds the simulation's one-off costs; same rule here) — never averaged into the months around them. |
| F account-type / confidence | Projection vs record. | The projected part of any chart is visually distinct from the measured part, with the seam dated. A forecast drawn in the same ink as history is the quiet lie this metric invites. |

#### P2 — Daily path and its low point
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Same as P1-A. |
| B degraded | Same as P1-B. | Same as P1-B — and the LOW POINT is the deliverable: the minimum-balance day is where an overdraft happens (spine row 53). The engine already computes cash-on-the-day per bill (availableByNeed, shortfall); surface the minimum day, not just the month-end. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | How far a daily path is credible. | Weeks, not years (spine row 53: precision decays fast). Show day-level for ~6–8 weeks, month-level beyond; the chart says where its own confidence ends. |
| E related events | Same as P1-E. | Same as P1-E, plus: when a projected bill is actually paid, the projection re-anchors on the real balance from that day. |
| F account-type / confidence | Same as P1-F. | Same as P1-F. |

#### P3 — Long range
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Same as P1-A. |
| B degraded | Everything beyond recurring items is assumption. | Months out, the forecast is recurring items + assumptions (spine row 53). Each assumption is named on screen; an assumption that is a stated fallback (e.g. inflation when the feed is down) carries its flag (Engines row 4). |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Years out. | At year scale this stops being a cash-flow forecast and becomes the plan (section D's simulation — 500 paths by default, src/domain/retirement/index.ts:161). Hand off rather than extend the daily engine — one long-range model in the app, not two that disagree. |
| E related events | Life events. | Retirement date, downsizing, payments that end — long range without them is arithmetic on a life that won't happen. Pull them from the plan; never keep a separate copy. |
| F account-type / confidence | Same as P1-F. | Same as P1-F — and never show a long-range path as one clean line; the band is the answer (same honesty rule as portfolio longevity). |

---

### Interest and fees paid
What is the friction costing me?

#### P1 — Interest on debt
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No rate on a debt. | No interest figure for that debt — show "rate needed" on its row rather than a total that silently skips it. Every debt in the app is typed by hand (Engines row 43 works from the name the person typed; no connected road carries debts today), so the ask is one field on a debt the person already entered. |
| B degraded | Rate present but stale or approximate. | Interest for the period ≈ balance × monthly rate for each month in the window, summed per debt. It is an estimate from the terms, not a measured charge — label "estimated from your balance and rate". Rates are the field most often wrong (spine row 13 trap); a card's rate changes with the market. |
| C shape-per-road | Typed debts today; card/loan feeds later. | Today: derived from typed terms. A future card feed carries the ACTUAL interest charge line each cycle — measured beats derived, per item, when it arrives. Debts are stored positive and subtracted (tab 1 K36; audit item 17) — one sign convention, stated once, so no screen re-derives it. |
| D time-bounded | Interest this month / this year. | Sum the per-month estimates inside the window. For an amortising loan use the schedule's interest portion per month (payment − principal), not balance × rate, once the payment is known (src/domain/debt/index.ts:44 keeps required payment per debt). |
| E related events | Extra principal payments. | An extra payment drops future interest, not past — recompute the schedule from the payment date forward. The logged 'Debt payment' row is the whole payment; never count the full payment as interest cost. |
| F account-type / confidence | Estimated vs charged. | Until a feed shows the charged line, every figure here says "estimated". Mortgage interest may be tax-deductible for itemisers — a note, never an assumption. |

#### P2 — Bank and card fees
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No bank feed; fees invisible unless logged. | Show only what is logged, labelled "fees you've recorded". No estimate — inventing a typical-fees figure would be a guess dressed as friction. The connection is what makes this line real. |
| B degraded | Fees buried inside a logged lump. | A logged "$35 bank stuff" row counts where the person put it; the app never splits it. |
| C shape-per-road | Future feed: fee-typed rows. | When the feed arrives, fee-typed transactions sum directly — signed (a refunded fee cancels; audit item 36 applies here verbatim). |
| D time-bounded | Fees in the window. | Sum of fee rows dated inside the window. Same boundary convention as Total spending P1-D. |
| E related events | A reversed fee. | Cancels its charge in the same total — the classic case where absolute-value summing doubles instead of zeroing. |
| F account-type / confidence | Same as P1-F. | Measured where fee rows exist, logged-only otherwise; the total names its coverage. |

#### P3 — Investment fees
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Fund internal charges — no road carries them. | The expense ratio never appears as a transaction; it needs a security master the app does not have (spine row 34). Refuse the inside-the-funds figure and SAY WHAT IS MISSING: the visible line is labelled "fees we can see" (tab 1 K33; audit item 16) with "funds also charge inside their price — usually the larger cost — not included here" (spine: a fees figure containing only visible fees understates by multiples). |
| B degraded | Fee rows exist but no fees line in the change walk. | Today the $460 of ADR custody fees on the founder's own file land inside "change in investment value" and read as market performance (tab 1 row 33; taxonomy row 31). The fix is a fees row of its own in the walk; until it exists, the fees total here and the walk will not reconcile — do not pretend they do. |
| C shape-per-road | Broker FEE events vs advisory fees netted invisibly. | FEE is a typed event on the broker road (taxonomy row 31: its own line, NOT a withdrawal). Advisory fees are sometimes netted inside performance invisibly (tab 1 row 33 col F) — name that as a limit of the road, not a zero. |
| D time-bounded | Fees in the window. | Same as P2-D. |
| E related events | Margin interest; accrued interest at purchase. | Margin interest CHARGED is a cost with the opposite sign to interest received and a nearly identical word — a sign-guess gets it exactly wrong (taxonomy row 33). Accrued interest PAID at a bond purchase is money advanced, recovered from the next coupon — never income and never a fee; today the pattern books it as income received (audit item 38), which flips friction into earnings. |
| F account-type / confidence | The three-fees total. | Interest on debt + bank/card fees + investment fees is often the largest controllable line in a household (spine row 55) — but only ADD the three when each is on the same footing; a total mixing measured fees with estimated interest carries the weaker label of its parts. |

---

### Effective tax rate
What share of income goes to tax?

#### P1 — On this year's income
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No filing status. | Single is assumed — the cautious side for tax owed (src/domain/income/onboarding.ts:333) — and the screen says "assuming single". No state rate entered → federal-only, labelled "before state tax", never a guessed state table (stateRateOf, src/domain/income/onboarding.ts:337; the rationale at src/domain/income/tax.ts:92: one honest user-entered percent beats fifty guessed tables). |
| B degraded | Modelled, not measured. | The rate is total modelled tax ÷ gross (src/domain/income/tax.ts:107) from the bracket fill — an estimate from the tables, not from a W-2 or return. Label: "estimated from the tax tables, not your tax return." If the person types their actual total tax from last year's return, that measured rate wins and is dated. |
| C shape-per-road | No withholding road exists. | Withholding never arrives on any current road; when a payroll or bank feed lands, withheld tax is CASH OUT but the year's true tax is settled at filing — never present withholding as the tax rate. Tax withheld on the broker road never nets against the income it came from (taxonomy row 32). |
| D time-bounded | "This year" means the TAX year. | The window is the calendar tax year, not trailing-12. Mid-year, the figure is a projection of the full year from year-to-date income — say "projected for 2026". |
| E related events | Effective vs marginal confusion. | The trap the spine names: every DECISION (a conversion, a sale, an extra withdrawal) turns on the MARGINAL rate; only the average uses effective. Never show one where the other belongs; the bracket-fill engine explains it correctly (src/domain/income/tax.ts:29 — one more dollar costs the higher rate on that dollar only). |
| F account-type / confidence | Which income is even taxable. | Roth withdrawals: not taxable. Municipal interest: federal-exempt. The effective rate's denominator is gross income as defined on screen — name whether non-taxable income is inside it, or two correct rates will disagree. |

#### P2 — Marginal rate on the next dollar
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | Same as P1-A. | Same as P1-A. |
| B degraded | Brackets without phase-outs. | The current engine knows the bracket bands only. The spine asks for phase-outs too (spine row 56) — for this audience the big ones are Social Security taxability (up to 85% becomes taxable above income thresholds) and the Medicare premium steps (IRMAA), which make the TRUE marginal rate on the next dollar exceed the printed bracket. Until modelled, label the marginal figure "your tax bracket — some benefits phase in or out on top of this". |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Marginal rate is a point-in-time fact for THIS year's income so far. | It moves during the year as income accumulates; date it. |
| E related events | Capital gains stack on top. | Short-term gains are taxed at the ordinary marginal band; long-term at the gains schedule that itself depends on total income (src/domain/income/onboarding.ts:390). A planned sale changes the marginal picture — this cell is the doorway to the section D conversion analysis, not a place to duplicate it. |
| F account-type / confidence | Suppress where the tax type is unknown. | The K47/K54 rule (audit item 22): when an account's tax treatment is unknown, show NO tax estimate for events in it — the true answer may be zero (an IRA sale) and a guess invents a tax bill. Also name the four standing assumptions when a rate is shown: retirement-account sales untaxed, long-term rate depends on income, the extra 3.8% above the surcharge threshold, and state tax as the person's one entered rate. |

#### P3 — In retirement
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No withdrawal plan. | The retirement tax rate depends on the withdrawal MIX (spine row 56); with no mix, refuse the number and point to the plan: "tell us which accounts you'll draw from and we'll show the tax." |
| B degraded | Mix known, thresholds not modelled. | Same limits as P2-B, and they bind harder in retirement: RMDs stack on top of Social Security taxability and IRMAA. Show the projected effective rate WITH its assumption list, per audit item 22 — never a bare percentage. |
| C shape-per-road | Same as P1-C. | Same as P1-C. |
| D time-bounded | Which retirement year. | The rate differs per year (pre-RMD vs RMD years). A single "retirement tax rate" is a fiction; show the years that differ, or the first RMD year at least (section D owns the full path). |
| E related events | Roth conversions. | A conversion is taxable income NOW to buy tax-free later — it changes this year's effective rate deliberately. Never show the conversion-year spike as a mistake; label it "includes your planned conversion". |
| F account-type / confidence | Same as P2-F. | Same as P2-F — the tax-type gate is the whole game across three account types. |

---

### Income replacement rate
Am I living on what I planned to?

#### P1 — Retiree view
| Condition | Case | Calculation or refusal |
|---|---|---|
| A missing | No pre-retirement history — the app was installed after the transition (the common case for this audience). | The denominator cannot be measured. Ask for it: one box — "about what did you spend (or earn) per month before you retired?" — and label the resulting rate "against the figure you gave us". Refuse only if the person declines; a stated denominator honestly labelled beats no answer. |
| B degraded | Only the 70–80% rule of thumb available. | The rules of thumb are averages of OTHER people's lives (spine row 58 trap). Show them only as a faint band behind the person's own figure, labelled "typical range" — never as the target. |
| C shape-per-road | Spending measured vs stated on either side of the transition. | The rate's two sides must be the same kind of thing: measured-over-measured or stated-over-stated, labelled. A measured numerator over a remembered denominator is fine ONLY with the label carrying the difference. |
| D time-bounded | Which months count. | 12-month averages on both sides, and the transition months themselves (the moving-out, the retirement-party year) excluded — they belong to neither life. History spanning the transition is the requirement the spine names; the snapshot store keeps month-end rows forever precisely so this stays answerable later (master tab 9 row 10). |
| E related events | Payments that ended at retirement. | A mortgage paid off at retirement drops spending without any lifestyle change. Show the rate, and beneath it the one-line reason when it is far from 100%: "your mortgage ended in 2025 — that alone is 24 points." |
| F account-type / confidence | Spending vs income comparison. | Compare spending to pre-retirement SPENDING where it exists — the better comparison (the spine's own note): income replacement overstates the need for anyone who was saving hard, because the saving does not need replacing. Name which comparison is on screen. |

---

## Open questions for the founder — decisions I could not make as the CFA

All of these were answered by the founder on 2026-08-20 — the verdicts live in METRICS-DELIVERABLE-ANSWERED-2026-08-20.xlsx and BRIEF-decisions-and-fixes-2026-08-20.md. Questions touching a cut metric (brief §C) are void. Kept for the record only.


1. Budget rollover (Budget vs actual P3): should an underspent category's leftover roll into next month at all, and if so — capped at one month, and does OVERspend roll too?
2. Savings rate (P1-E): does debt principal paydown count as saving? Today the surplus is measured after debt and principal is excluded from "saved" — defensible either way, but it must be one written rule on screen.
3. Essential floor (Fixed vs variable P1-D): do non-monthly essential bills (insurance, property tax) join the monthly floor at one-twelfth, or stay out as dated bills shown beside it? Today they are excluded, which overstates essentials-runway in the months they land.
4. Age of money (P1-F): ship it at all once a bank feed exists, or keep the essentials runway as the app's single buffer metric?
5. Savings rate headline (P1-F): the taxonomy spec (§6, 2026-06-22) already names the cash rate over take-home as primary. Does that stand for the 55–70 audience — where the total rate over gross is the one the 15% retirement-readiness benchmark speaks to — or does the headline flip, with the other one tap away?
6. Safe to spend (P1-E): when a missed bill surfaces and the number drops, does the screen retract loudly (a banner naming the change) or correct quietly with a changed as-of date?
7. Period boundary (Total spending P1-D): the convention itself is agreed at master tab 1 K6 (the window opens after the start day's close; start-day rows outside, last-day rows inside) — confirm it as the app-wide rule for spending windows too, so it lives in one tested module. Same confirmation as Section E open question 10; decide once for both.
8. When the bank/card feed (Plaid) arrives: do measured transactions REPLACE the hand-logged ledger for overlapping months, or merge with per-row confirmation? Merging without a rule re-creates the double-count class this module was built to end.
9. Pace comparisons (Budget vs actual P2): is the proposed rule — fixed bills by due date + flexible pro-rata — the founder's intended meaning of "on track mid-month", before it is built?
10. Interest and fees total (Interest and fees P3-F): may the three friction lines be added into one headline when one part is estimated and another measured, or do they stay three labelled lines until all are measured?
11. Savings rate denominator (P3-E): the spine (row 49) says employer money goes in BOTH the numerator and gross income; the taxonomy spec §6 and the built engine put it in the numerator only, which flatters the rate. The spine's finance is right — approve the one-line spec amendment and the engine change together, so the two documents stop disagreeing.
