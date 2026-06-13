# Finwise Bug Ledger

Single source of truth for bugs and design questions surfaced by the comprehensive-testing effort
(see `docs/finwise-launch-test-plan.md` for the umbrella plan). Conventions:

- Every newly **failing** test gets a row here BEFORE any fix lands.
- Questionable-but-current behavior gets a **documenting test** (passes today, pins behavior) and a `by-design?` status until a decision is made.
- A bug counts as "identified" once it has a row + a committed exposing/documenting test, even if the fix is deferred.

Statuses: `open` · `fixed` · `by-design?` · `by-design` · `deferred`

Baseline (2026-06-12, commit 4dbfe77): 264/264 tests green, `tsc --noEmit` clean.
Closeout (2026-06-12): comprehensive-testing pass complete — **494 tests** (264 → 494: invariants,
journeys, store seeding, services, shared utils, UI components, all-28-screen smoke + deep screens,
edge extremes), both jest projects + `tsc` green. Open rows below each name their exposing test.

**Summary: 2 HIGH fixed (B-15, B-16) · 4 open with fix candidates (B-24, B-18, B-19, B-25) ·
2 by-design (B-17, B-20) · 1 by-design? pending decision (B-21) · 1 closed-not-a-bug (B-22) ·
1 deferred (B-23).**

User-lens QA walk (2026-06-12, docs/finwise-userlens-qa-2026-06-12.md, 34 test cases: 21 pass /
9 fail / 4 pass-with-notes) added **B-28..B-36**: 2 HIGH (B-34 salary smoothing corrupts
Home/Budget/goal-capacity; B-31 cockpit ignores captured SS/pension) + 4 MED + 3 LOW. Suggested
fix order in the report.

Persona walk addendum (retiree / student / gig, 15 test cases: 10 pass / 5 fail) reproduced
B-28 on ALL personas (highest-frequency bug), reproduced B-34 on the gig worker (flat income chart
for swing pay), reproduced B-31 worse for an actually-retired user, **scoped B-33 to the
lump-monthlySpending-no-categories path** (didn't reproduce where categories exist), and added
**B-37** (retiree cockpit shows accumulation framing). Confirmed working: student tuition-crunch
planner + gig lean-month calendar are accurate.

| ID | Severity | Area | Symptom | Root cause | Exposing test | Status | Notes |
|----|----------|------|---------|------------|---------------|--------|-------|
| B-15 | HIGH | Onboarding→Net Worth | Re-running onboarding never updates Net Worth accounts; stale balances drive retirement math | `seedNetWorth` one-time guard (`src/store/useStore.ts:536`): `s.nwSeeded ? {} : {...}` | `journeys.test.ts` "re-seeding with updated answers", `store_networth.test.ts` | **fixed** 2026-06-12 | = user-test feedback #15. Fixed via origin-tagged merge: seeded rows carry `origin: 'onboarding'`; re-seed replaces only those, manual accounts never touched, legacy untagged rows deduped by label+bucket |
| B-16 | HIGH | Onboarding restart | `restartOnboarding` wiped ALL asset accounts/liabilities incl. user-created ones, contradicting its own comment | Blanket wipe at `src/store/useStore.ts` restartOnboarding; no per-account origin flag existed | `journeys.test.ts` "manual account survives restart", `store_networth.test.ts` | **fixed** 2026-06-12 | Same origin-tag mechanism: restart clears only `origin: 'onboarding'` rows |
| B-17 | LOW | Income gate | Gate is on source selection, not amounts — but $0 amounts still yield $0 income, so selection alone can't fabricate income | `currentRetirementIncomeMonthly` (`src/domain/income/onboarding.ts:171-175`) | `invariants.test.ts` "selecting retirement_income with $0 amounts" | by-design | Verified harmless; gate correctly blocks the working-40yo future-SS leak both ways |
| B-18 | MED | Market data | Network failure, invalid ticker, and malformed response all silently return `null` → stale cached prices shown with no staleness indicator, no retry, no ticker validation | `src/services/marketData.ts` fetchSeries try/catch → null; store `refreshPrices` falls back to cache silently | `marketData.test.ts` documenting tests | open | UX risk: user sees outdated portfolio values as if live |
| B-19 | MED | Net worth accuracy | Position with a ticker missing from the price cache contributes $0 to account balance → silent net-worth understatement | `recomputeBalances` (`src/store/useStore.ts:13-20`) treats missing price as 0 | `store_prices.test.ts` documenting test | open | Should at least fall back to lot cost basis or flag the row |
| B-20 | LOW | Goals capacity | Negative capacity (invest > surplus) — divide-by-negative risk in months-to-goal | `buildGoalsState` guards with `> 0` → `months_to_goal: null`; snapshot also clamps (`src/domain/snapshot.ts:60`) | `invariants.test.ts` negative-capacity probe | by-design | Verified guarded; negative capacity passes through for display but never divides |
| B-24 | MED | Budget/Goals consistency | User states total spend AND itemizes part of it → month grid honors the full total, but `projected_to_save` (→ goal capacity) only sees the categorized part; goal pool overstates free cash by the uncategorized remainder | `budgetFromOnboarding` (`src/domain/budget/index.ts:154`) takes bucket total when > 0, ignoring `monthlySpending` remainder; `spendByMonth` (line 89-90) adds it | `invariants.test.ts` "stated-total vs itemized spending diverges" | open | Found by invariants suite 2026-06-12. Fix candidate: `monthly_spending: max(bucket total, monthlySpending)` |
| B-21 | LOW | Onboarding seeding | Explicit $0 answers for retirement savings / holdings create no account at all (vs. a $0 account the user could edit later) | `assetsFromOnboarding` `bal > 0` filter (`src/domain/assets/index.ts:182-183`) | `journeys.test.ts` documenting test | by-design? | Probably fine; decide and flip to by-design |
| B-22 | LOW | Retirement solver | Suspected non-monotonic `solveRetireAge` results from per-iteration rounding | `src/domain/retirement/index.ts` solver loop | `edge_extremes.test.ts` "solveRetireAge is monotonic in starting balance" | closed — not a bug | Probe ran across 6 balance levels (100k→3.2M): strictly monotonic; rounding happens only on outputs |
| B-25 | LOW | Economic data | Fallback inflation/treasury values (BLS/Treasury outage) carry no flag, so projections silently run on defaults and the UI can't label them as estimates | `fetchEconomicData` (`src/services/economicData.ts:28-39`) returns the same shape for live and fallback | `economicData.test.ts` "fallback data is indistinguishable" | open | Add `isFallback` (or per-source flags) and surface a subtle "using typical rates" note |
| B-34 | HIGH | Income accuracy | IncomeState salary = max(salaryByMonth)×12 — six $0 months ignored → Home take-home, IncomeDetail gross/net, Budget projected_to_save, and one-pool goal capacity all overstated (~$60k/yr gross for Jane); tax organizer & bill calendar use the true table → screens contradict | `grossSalaryMonthly` (`src/domain/income/onboarding.ts:60`) returns `Math.max(...salaryGrossByMonth)` and is booked as flat MONTHLY in `incomeFromOnboarding` | user-lens TC-21/22 (docs/finwise-userlens-qa-2026-06-12.md) | open | Fix: book salary from the table (sum÷12 or per-month source); align IncomeState with totalGrossAnnual |
| B-31 | HIGH | Retirement handoff | Cockpit computes with $0 guaranteed income and asks "Are you eligible?" although onboarding captured ri_ss $2,000 + ri_pension $1,500; pension never consumed at all; snapshot surfaces DO count it → contradictory advice ("keep saving $3,775/mo") | `RetirementCockpit.tsx:62` `ssIncome = A.ssEligible ? … : 0`; ri_* only used after on-screen setup | user-lens TC-12 | open | Default ssEligible/ssMonthly from ri_*; add pension to guaranteed income |
| B-28 | MED | Goals/Plan tab | "Typical free cash to save $17,250/mo" = income BEFORE spending; true free cash $2,250/mo | `GoalsScreen.tsx:30` uses `incomeMonthlyGrid(op,'available')` instead of `savingsByMonth(op)` | user-lens TC-07 | open | One-line fix |
| B-29 | MED | Goals handoff | Onboarding goals (2 set) never appear on Plan tab ("No goals yet") | `GoalsScreen.tsx:22` reads `store.goals` only; `op.goals` unconsumed; Sharpen checklist has the same gap (TC-31) | user-lens TC-08/TC-31 | open | Merge onboarding goals on first visit (origin-tag like seedNetWorth) |
| B-35 | MED | Tax organizer | 2026 taxable income includes $42,000 SS/pension the (non-retired) user does not receive — the SS-leak gate is bypassed on this screen | tax organizer sums retirement income un-gated (planning domain) | user-lens TC-23 | open | Use currentRetirementIncomeMonthly |
| B-33 | MED | Stress test | Same screen says "$3,000 hit puts you in the red" AND "✓ you already have 3 months of essentials — strong cushion" | `monthlyEssentials()` → $0 when spendCats empty (ignores monthlySpending) → recommendedFund $0 → $0 cash passes | user-lens TC-20 | open | Fall back to monthlySpending |
| B-30 | LOW | DTI guideline | Mortgage holder graded with renter guideline (20% → "High" at 33% instead of homeowner 36%) | `debtsFromOnboarding` hardcodes `debt_type:'OTHER'`; `GoalsScreen` homeowner check needs MORTGAGE type | user-lens TC-09 | open | Infer type from label/kind picker |
| B-32 | LOW | Retirement copy | "You plan to spend $8,288/mo" — user said $15,000; Portugal COL ×0.6 applied silently on the cockpit | retirementSpendMonthly COL factor unlabeled outside onboarding | user-lens TC-13 | open | Label: "$15,000 at home ≈ $8,288 in Portugal" |
| B-36 | LOW | Tool prefills | Insurance check (savings/assets $0 → "$3.5M gap" for a 74yo with $1.75M), Roth converter (pre-tax $0 despite known $250k; misleading zero-state message) | Tools don't prefill from store/onboarding | user-lens TC-26/27 | open | Prefill from known data |
| B-37 | MED | Retirement framing | Retiree cockpit shows accumulation framing ("Grow my nest egg · assumes age 65") for a retired 74yo, contradicting Home's "drawdown" focus | No `targetRetirementAge` → defaults 65; cockpit doesn't force drawdown when retired/age ≥ retire age | persona walk TC-R2 (docs/finwise-userlens-qa-2026-06-12.md addendum) | open | Force drawdown when employmentStatus retired or age ≥ retire age; don't default a retiree's retire age below their current age |
| B-23 | LOW | Currency | Store has `currency`/`locale` but all domain calcs assume USD (tax packs, thresholds) | Cross-cutting | `_shared/money.test.ts` currency-seam test (Phase 5) | deferred | Known launch constraint; US-only at launch |
