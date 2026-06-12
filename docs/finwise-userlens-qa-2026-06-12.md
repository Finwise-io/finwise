# User-Lens QA Walk — 2026-06-12

Method: walked every reachable screen on the iOS simulator (iPhone 17 Pro, dev client) signed in as
the live test persona **Jane** (74, born Aug 1951, employed Jan–Jun at $10k/mo then $0 + unemployment
benefits, $50k Jan bonus, RSUs, self-employment, $56k/yr investment income, rentals, $19k Nov gift,
$15k/mo spending, $250k 401(k) + $1.5M investments seeded, $760k mortgage at 3.4% / $7.5k/mo,
SS $2,000 + pension $1,500 set for the future, retire at 76, Portugal, 100%-of-free-cash invest plan,
two onboarding goals). Ground truth computed by running her exact dumped profile through the domain
code (`buildSnapshot` et al.). Each test case = the screen's **takeaway** (what a user must walk away
knowing) checked for accuracy, plain language, and display.

Verdict legend: **PASS** · **FAIL** (wrong/contradictory takeaway) · **PASS w/ notes** (works, with
advisory findings).

## Results — 34 test cases: 21 pass, 9 fail, 4 pass-with-notes

| # | Screen / takeaway under test | Verdict | Detail |
|---|---|---|---|
| TC-01 | NW chip: "my net worth is X" | ✅ PASS | $990,000 = $1.75M assets − $760k mortgage. Verified against domain. |
| TC-02 | Home: greeting + persona focus | ✅ PASS | "Good morning Jane", retirement-ready focus card fits a 74-year-old. |
| TC-03 | Home insight: emergency fund | ⚠️ PASS w/ notes | "Cash covers about 0.0 months" — accurate ($0 cash bucket) but "0.0 months" is robotic, and alarming for someone with $1.5M in liquid taxable investments. Should say "no cash set aside" and acknowledge liquid assets. |
| TC-04 | Home insight: 401(k) room | ⚠️ PASS w/ notes | "$14,500 left" arithmetic is right ($32.5k limit − $18k plan), but Jane has $0 salary after June — contributing requires earned income/payroll; advice is shaky for her actual situation. |
| TC-05 | Budget tab: "am I on budget this month?" | ❌ FAIL | Lands on Transactions with "$0 / $0 / $0 — No entries yet" even though Jane gave a full $15k/mo spending plan in onboarding. The takeaway (her plan vs actual) is invisible; reads as the app having lost her answers. |
| TC-06 | Invest tab: portfolio vs market | ✅ PASS | Honest empty state; explains tickers are needed. (Could acknowledge her $1.5M account exists.) |
| TC-07 | Plan tab: "what can I save per month?" | ❌ FAIL | Headline "typical free cash to save **$17,250/mo** · ranges $5,140–$51,665". Ground truth free cash: **avg $2,250/mo** (range −$9,860 to $36,665). Root cause: `GoalsScreen.tsx:30` feeds `incomeMonthlyGrid(op,'available')` (income BEFORE spending) into `availableToSaveSummary` instead of `savingsByMonth(op)`. Off by her entire $15k/mo spending. (B-28) |
| TC-08 | Plan tab: "my goals" | ❌ FAIL | "No goals yet" — but Jane set TWO onboarding goals (Emergency fund $36k/2027, House $45k/2029). `GoalsScreen` reads `store.goals` (manual list) and never consumes `onboardingProfile.goals`. #15-family producer→consumer gap. (B-29) |
| TC-09 | Plan tab: debt-to-income | ❌ FAIL | "33% **High** … aim for 20% or less (**renters**; rent isn't counted)" — Jane has a $760k **mortgage**; homeowners get the 36% guideline (→ "caution", not "High"). Root cause chain: `debtsFromOnboarding` hardcodes `debt_type:'OTHER'` even when the label is "Mortgage", so `GoalsScreen`'s `homeowner = some(debt_type==='MORTGAGE')` is false. Arithmetic itself ($7,500 ÷ $23,043 = 33%) is correct. (B-30) |
| TC-10 | Retire: nest egg "what you have" | ✅ PASS | Donut $1.75M = earmarked accounts; instruments table consistent ($1.5M @10.4% benchmark, $250k @7.9%, weighted 10.0%). |
| TC-11 | Retire: heroes arithmetic | ✅ PASS | "Retire 75 on today's $1.75M at 10.0%/yr" — 10.0% = correct value-weighted benchmark; "$1.75M + $45K + $591K = $2.39M" adds up; "keep saving $3,775/mo" = effectiveAnnualContribution $45,300/12 (deficit-honest). |
| TC-12 | Retire: Social Security handoff | ❌ FAIL | SS row says "Are you eligible? **Tap to set up**" and the cockpit computes with **$0 guaranteed income** — but Jane entered SS $2,000 + pension $1,500 in onboarding. `RetirementCockpit.tsx:62`: `ssIncome = A.ssEligible ? … : 0` — `ssEligible` is null until set on this screen, and `ri_ss` is only used *after* eligibility is tapped; `ri_pension` is never consumed at all. Her $3,500/mo materially changes "needed" and the "keep saving" advice. Snapshot-based surfaces DO count it → screens contradict each other. (B-31) |
| TC-13 | Retire: "in retirement you'll spend…" | ❌ FAIL | "You plan to spend **$8,288/mo** in today's dollars" — Jane said **$15,000**. It's $15,000 × 0.6 Portugal cost-of-living factor, applied silently; no "adjusted for Portugal" label on this screen. A user concludes the app lost her number. Fix: label it ("$15,000 at home ≈ $8,288 in Portugal"). (B-32) |
| TC-14 | Retire: 95% chance it lasts | ⚠️ PASS w/ notes | Internally consistent, but computed at 10%/yr expected return for a 75-year-old and without her SS/pension (TC-12) — two wrongs partially cancelling. Becomes solid once TC-12 is fixed. |
| TC-15 | Net Worth screen: composition | ✅ PASS | $990K donut; Investments 86% / Retirement 14% / Debts −$760K; "debt is 43% of assets" ✓ (760/1750). |
| TC-16 | Net Worth: cash-runway insight | ⚠️ PASS w/ notes | Same "~0.0 months" wording as TC-03; cash-only lens ignores $1.5M liquid. |
| TC-17 | Insights: concentration | ❌ FAIL (minor) | "86% of your portfolio is a **single position**" — it's a single *account* whose internal diversification is unknown (no tickers). Overclaims; should say "one account holds 86% — add holdings to see concentration". |
| TC-18 | Bill calendar: tight months | ✅ PASS | Rolling table internally consistent (running balance checks out); "Tight in Jun–Dec, dips to −$34,999" is the right warning for her income cliff; clear language. |
| TC-19 | Bill calendar: starting balance | ⚠️ PASS w/ notes | Defaults to $0 cash so the verdict ignores $1.5M liquid holdings; editable, but the default paints a scarier picture than reality. |
| TC-20 | Stress test: "can I absorb a $3k hit?" | ❌ FAIL | Top: "$3,000 hit would put you $3,000 in the red." Bottom, same screen: "✓ **You already have at least 3 months of essentials set aside. A strong cushion**" — direct self-contradiction. Root cause: `monthlyEssentials()` returns $0 when `spendCats` is empty (falls back to bucket totals, ignoring `monthlySpending` $15k), so recommendedFund = $0 and $0 cash ≥ $0 → false reassurance. (B-33) |
| TC-21 | Income manager: total + line items | ❌ FAIL | Headline $276,510/yr is correct, but the "Base salary" row shows **$120,000/yr** (entered $10k/mo × 12) while the total uses the by-month table ($60k actual). Rows sum to $336,510 ≠ $276,510 headline — line items don't add up to the total on the same screen. Same root as TC-22. |
| TC-22 | Income detail: gross/net/tax | ❌ FAIL — most serious find | Gross/year **$336,510** (should be $276,510), net $255,597, 24% rate — all inflated. Root cause: `grossSalaryMonthly()` (income/onboarding.ts:60) returns `Math.max(...salaryGrossByMonth)` = $10,000 and `incomeFromOnboarding` books it as a flat MONTHLY source → $120k/yr despite six $0 months. **This inflated `IncomeState` feeds Home take-home, Budget `projected_to_save` ($6,300/mo vs honest ~$2,250), and the one-pool goal capacity ($4,050/mo)** — the whole planning chain overstates her income by ~$60k gross/yr, while tax organizer/bill calendar/income-manager-headline use the correct $60k. Cross-screen contradiction. (B-34, HIGH) |
| TC-23 | Tax organizer: taxable income | ❌ FAIL | Includes "Retirement income (SS / pension / withdrawals) **$42,000**" in 2026 taxable income — Jane is NOT retired and receives $0 of it today (the SS-leak gate correctly excludes it everywhere else). Organizer's taxable $292,640 vs income module's $276,510. Root: tax organizer sums retirement income un-gated. (B-35) |
| TC-24 | Tax organizer: wages | ✅ PASS | W-2 wages $60,000 — the one screen that gets her salary exactly right. |
| TC-25 | Stress test: quick-pick chips & language | ✅ PASS | "What if…?" framing, Medical bill/Car repair chips — plain and friendly. |
| TC-26 | Insurance check (DIME) | ❌ FAIL (prefill) | "Additional coverage to consider: **$3,540,100**" for a 74-year-old with $1.75M assets — because "Savings/assets" prefills $0 (her $1.75M is in the store) and "years to replace" defaults to 10. Formula arithmetic is correct; the takeaway is absurd for her. Prefill savings/assets and age-aware years. |
| TC-27 | Roth conversion | ⚠️ FAIL (soft) | Pre-tax balance prefills $0 — her $250k 401(k) is known. Zero-state message "Your income already fills this bracket — pick a higher one, or there's no room" is wrong/confusing when the real reason is no balance entered. |
| TC-28 | College planner | ✅ PASS | Clear inputs/defaults, projected cost math sane, "Save as a goal" hook. |
| TC-29 | Credit builder | ✅ PASS | Educational, plain, honest empty inputs. |
| TC-30 | Estate checklist | ✅ PASS | 0/7, plain-English items, tappable. |
| TC-31 | Sharpen your plan | ❌ FAIL | 67% with "Set up retirement" and "Add a goal" pending — both were COMPLETED in onboarding (target age 76 + SS/pension; two goals). Completeness checks read screen-local state (`retirementAssumptions`, `store.goals`) instead of onboarding answers → Home nags her about finished steps. Same handoff family as TC-08/TC-12. |
| TC-32 | Rewards | ✅ PASS | Fresh Level-1 state consistent with no logged transactions. |
| TC-33 | Tips | ⚠️ PASS w/ notes | "This month at a glance: Income $0.00" contradicts the rest of the app for a user who declared $276k income; needs a "tracks what you log" hint. Also uses cents ($0.00) against the app-wide whole-dollar style. |
| TC-34 | Settings / Bonds / Other investments / Expense | ✅ PASS | Clear takeaways, honest empty states, account + display prefs visible. |

## Failure clusters (root causes, ranked)

1. **Smoothed-vs-placed salary (TC-21/22, HIGH — B-34):** `grossSalaryMonthly = max(salaryByMonth)`
   booked as flat monthly → IncomeState/Home/Budget/goal-capacity all run on $120k salary while
   tax/bill-calendar run on the true $60k. One fix (sum the table ÷ 12, or book per-month) realigns
   five screens.
2. **Onboarding answers not consumed by tool screens (TC-08, TC-12, TC-26, TC-27, TC-31):** goals,
   SS/pension, pre-tax balance, savings/assets — each tool re-asks for what onboarding already knows.
   #15's lesson generalized: every producer needs a consumer test per screen.
3. **Free-cash overstated on Plan tab (TC-07 — B-28):** income grid used where the savings grid
   belongs.
4. **Zero-category fallbacks lie (TC-20 — B-33):** `monthlyEssentials` ignores `monthlySpending`
   when categories are absent → "strong cushion" with $0 cash.
5. **Silent adjustments & mislabels (TC-13, TC-09, TC-17):** Portugal COL applied without a label;
   mortgage typed as OTHER → renter guideline; account called a "position".

## Suggested fix order

1. B-34 salary smoothing (corrupts the most screens, HIGH)
2. B-31 cockpit consumes ri_ss/ri_pension as defaults (retirement advice materially wrong)
3. B-28 Plan-tab free cash → savingsByMonth (one-line fix)
4. B-29 onboarding goals → Goals screen (merge on first visit, like seedNetWorth)
5. B-35 tax organizer gates retirement income by receipt
6. B-33 essentials fallback to monthlySpending
7. B-30 infer MORTGAGE debt_type from label; B-32 label the COL adjustment; prefills (TC-26/27);
   copy fixes (0.0 months, single position, Tips hint)

Artifacts: screenshots in /tmp/qa_*.png (this machine); Jane's profile dump used for ground truth
was computed via the domain code and deleted after use. No app code was changed by this walk.
