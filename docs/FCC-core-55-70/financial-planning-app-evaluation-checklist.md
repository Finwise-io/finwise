# Financial Planning App — Evaluation Checklist

**Buyer profile:** 50, still working, needs investment aggregation + budgeting + retirement planning in one place.

**How to use this:** Complete Phase 0 once. Then duplicate Phases 1–5 for each app on the shortlist and run all trials **concurrently**, not one after another. Items marked ⛔ are dealbreakers — a fail there ends the evaluation for that app regardless of everything else.

**Shortlist (max 4):**

- App A: ______________________  Trial start: ______  Trial ends: ______
- App B: ______________________  Trial start: ______  Trial ends: ______
- App C: ______________________  Trial start: ______  Trial ends: ______

---

## Phase 0 — Prep (do once, before any trial)

### Build the data pack

- [ ] List every institution to connect, with login ready
  - [ ] Employer 401(k) recordkeeper
  - [ ] HSA
  - [ ] Equity comp platform (Fidelity/Schwab/Morgan Stanley at Work)
  - [ ] Taxable brokerage
  - [ ] Credit union / small regional bank
  - [ ] 529(s)
  - [ ] Old employer 401(k) / rollover IRA
  - [ ] Mortgage + any other debt
- [ ] Pull Social Security benefit estimates from ssa.gov (yours + spouse's)
- [ ] Write down current annual spending, split into: baseline / ends before retirement (mortgage, kids) / starts at retirement (healthcare)
- [ ] Gather equity comp grant details — grant date, type, vest schedule, strike
- [ ] Gather rental property details — value, basis, mortgage, net rent
- [ ] Note current asset allocation and account-by-account holdings

### Define the standard scenario (identical in every app)

Fill these in once. Enter the *same* numbers everywhere — differences in output are the entire point of the exercise.

| Input | Value |
|---|---|
| Retirement age (base case) | ______ |
| Early retirement age (stress case) | ______ |
| Spouse retirement age | ______ |
| Annual retirement spending, today's dollars | ______ |
| Life expectancy assumption | ______ |
| Expected equity return | ______ |
| Inflation assumption | ______ |
| Social Security claim age (base) | ______ |
| State of residence at retirement | ______ |

---

## Phase 1 — Setup & aggregation (Day 1)

App under test: ______________________

- [ ] Signed up without giving a phone number to a sales team
- [ ] ⛔ Credentials are **read-only** — confirmed in writing
- [ ] MFA available and enabled
- [ ] Identified which aggregator it uses (Plaid / MX / Finicity / Yodlee): ______
- [ ] Connected all institutions from the data pack
  - Number connected on first try: ____ / ____
  - Institutions that failed: ______________________
- [ ] **Holdings-level data** visible — ticker + share count, not just balances
- [ ] Added rental property manually
- [ ] Added unvested RSU tranche
- [ ] Added a private/illiquid investment
- [ ] Manual assets flow into the *retirement projection*, not just the net worth number

**Time from signup to complete net worth picture:** ______ minutes
*Pass: under 45 minutes with all accounts linked.*

---

## Phase 2 — Feature audit

### Retirement engine

- [ ] ⛔ Monte Carlo simulation (not just straight-line average returns)
- [ ] Historical-sequence backtesting
- [ ] ⛔ Assumptions are visible and editable — return, volatility, inflation, fee drag, longevity
  - Clicks required to reach them: ______  *(more than 5 = fail)*
- [ ] Models multiple income phases (full work → part-time → retired)
- [ ] Models accumulation *and* decumulation, not just "hit your number"

### Tax modeling — weight this heaviest

- [ ] ⛔ Distinguishes taxable / tax-deferred / Roth and taxes withdrawals accordingly
- [ ] Federal marginal brackets applied correctly
- [ ] Capital gains taxed separately from ordinary income
- [ ] State income tax modeled
- [ ] RMDs modeled at age 75 (SECURE 2.0 cohort)
- [ ] Roth conversion modeling with lifetime tax comparison
- [ ] IRMAA cliffs flagged
- [ ] ACA premium subsidy cliffs flagged
- [ ] Catch-up contributions (401k / IRA / HSA) reflected

### Portfolio

- [ ] Blended expense ratio across all accounts
- [ ] Fund overlap detection
- [ ] Asset **location** analysis (which account type holds what), not just allocation
- [ ] Drift vs. target allocation
- [ ] Cross-account rebalancing suggestions
- [ ] Concentration risk flag on single-stock position

### Budgeting & cash flow

- [ ] Rules-based auto-categorization that persists
- [ ] Split a single transaction across categories
- [ ] Recurring subscription detection
- [ ] Retroactive recategorization
- [ ] Separates baseline spend from lumpy/one-time spend
- [ ] Produces a defensible "retirement spending number"

### Income, benefits, and risk

- [ ] Social Security optimizer — 62 / FRA / 70
- [ ] Spousal and survivor benefits
- [ ] Earnings test if working part-time before FRA
- [ ] Healthcare bridge: COBRA → ACA → Medicare
- [ ] Equity comp: vesting, RSU/ISO/NSO tax treatment, AMT
- [ ] Long-term care shock modeling
- [ ] Rental property cash flow, depreciation, sale with recapture
- [ ] Pension / deferred comp

### Scenarios & collaboration

- [ ] Save and name multiple plans
- [ ] Compare plans side by side
- [ ] Spouse access
- [ ] Advisor / CPA view
- [ ] Clean PDF report export

### Security, privacy, business model

- [ ] SOC 2 (or equivalent) attestation published
- [ ] ⛔ Written statement that data is **not sold**
- [ ] ⛔ Free tier is not lead-gen for an AUM advisory sales team
- [ ] Pricing model understood: $______ /yr — flat fee, not % of assets
- [ ] ⛔ Full data export in CSV or JSON
- [ ] Real account deletion policy exists

---

## Phase 3 — Scenario tests

Run all 15. Score each 1–5.

- [ ] **1. Cold-start onboarding** — timed in Phase 1. Score: ___
- [ ] **2. Messy asset test** — rental + RSUs + private investment appear in the *projection*, not just net worth. Score: ___
- [ ] **3. Baseline plan** — build the standard scenario, record success probability: ______%. Score: ___
- [ ] **4. Assumption audit** — found and changed return/inflation/tax assumptions. Score: ___
- [ ] **5. Sensitivity check** — drop equity return 1%, record new probability: ______%. Score: ___
- [ ] **6. Sequence risk test** — model a 30% drop in year one of retirement: ______%.
      *Pass: this hurts more than test 5. If it doesn't, the tool averages returns and doesn't understand sequence risk.* Score: ___
- [ ] **7. ⛔ Roth conversion test** — convert a fixed amount annually from retirement to RMD age.
      *Pass: shows lifetime tax with vs. without, the marginal bracket being filled, and flags IRMAA.*
      Lifetime tax delta: $______  Score: ___
- [ ] **8. Withdrawal order** — compare taxable-first / proportional / bracket-filling.
      *Pass: different ending wealth for each, with an explanation.* Score: ___
- [ ] **9. Social Security claiming** — 62 vs. 67 vs. 70 with spouse.
      *Pass: models survivor benefit, not just breakeven age.* Score: ___
- [ ] **10. Healthcare bridge** — retire at 58, model ACA subsidies to 65.
      *Pass: notices that Roth conversions raise MAGI and reduce subsidies.* Score: ___
- [ ] **11. Job loss shock** — unemployed at 52 for 18 months, return at 80% salary.
      *Pass: modeled without rebuilding the plan.* Score: ___
- [ ] **12. Transaction categorization** — import 90 days of real spending.
      Miscategorized: ____ / ____ = ____%  *(over 10% = fail)*. Score: ___
- [ ] **13. Portfolio X-ray** — blended expense ratio: ____%. True equity/fixed split: ____/____.
      Bonds sitting in a taxable account? Y / N
      *Pass: surfaces at least one thing you didn't already know.* Score: ___
- [ ] **14. The handoff** — generate something you'd actually send a CPA.
      *Pass: readable PDF with methodology stated, not a screenshot.* Score: ___
- [ ] **15. The exit** — export everything, read the deletion policy.
      *Pass: usable structured data plus a real delete option.* Score: ___

---

## Phase 4 — Durability (Day 14)

- [ ] Returned after two weeks without touching it
- [ ] Broken connections: ____ / ____
- [ ] Re-auth was painless (Y / N)
- [ ] Historical data survived the broken links
- [ ] **Monthly maintenance time in month two:** ______ minutes
      *Over ~30 min/month and you'll abandon it by month six. This is the most under-weighted criterion in software buying and the most predictive of actual use.*

---

## Phase 5 — Decision

### Weighted score

| Category | Weight | App A | App B | App C |
|---|---|---|---|---|
| Tax modeling (tests 7, 8, 10) | 30% | | | |
| Projection engine (tests 3–6) | 20% | | | |
| Aggregation reliability (tests 1, 2, Phase 4) | 20% | | | |
| Portfolio analytics (test 13) | 10% | | | |
| Budgeting (test 12) | 10% | | | |
| Security & portability (tests 14, 15) | 10% | | | |
| **Weighted total** | **100%** | | | |

*Budgeting is deliberately weighted low — it's the feature that sells apps and the one you'll use least by year two.*

### Final gates

- [ ] No ⛔ items failed
- [ ] Annual cost is a flat fee, understood and acceptable
- [ ] Maintenance burden is sustainable
- [ ] You can get your data out on the way to whatever replaces it

**Decision:** ______________________  **Date:** ______

---

*One caveat worth keeping in view: none of these tools substitutes for a CPA on the actual Roth conversion or equity comp decisions. The good ones get you to a well-framed question. The tax code has edges that software routinely misses — treat the output as a hypothesis to verify, not an answer.*
