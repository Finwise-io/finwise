# Finwise — What Needs Fixing

Consolidated, prioritized fix backlog from the comprehensive-testing pass + user-lens QA walk
(Jane) + retiree/student/gig persona walk (2026-06-12). Source of record: `finwise-bug-ledger.md`.
Detail and screenshots: `finwise-userlens-qa-2026-06-12.md`.

**Status:** 2 HIGH already fixed (B-15, B-16). **15 open** below. Already-decided non-issues
(B-17, B-20 by-design; B-22 not-a-bug; B-21 pending product call; B-23 deferred, US-only at launch)
are listed at the bottom and need no code.

Recommended order is top-to-bottom: it front-loads the bugs that corrupt the most screens and are
cheapest to fix. The first four are the launch-blockers.

---

## P0 — Launch blockers (wrong numbers a user will act on)

### 1. B-34 (HIGH) — Salary is smoothed to the highest month, inflating income everywhere
- **Broken:** A user with uneven pay (gaps, seasonal, hourly) has their gross overstated. Jane's
  6-months-on/6-off income shows **$336,510** instead of **$276,510**; the gig worker's swing pay
  shows **$33,600** instead of **$28,800**, and the "not smoothed" income chart literally draws 12
  equal bars. This inflated `IncomeState` flows into Home take-home, Budget `projected_to_save`, and
  the one-pool goal capacity — while the tax organizer and bill calendar use the true by-month table,
  so screens contradict each other.
- **Root cause:** `grossSalaryMonthly()` returns `Math.max(...salaryGrossByMonth)` and
  `incomeFromOnboarding` books it as a flat MONTHLY source. `src/domain/income/onboarding.ts:60`.
- **Fix:** book salary from the actual table — sum the 12 months ÷ 12 for the IncomeState monthly
  figure, or make the salary source per-month. Align `IncomeState` with `totalGrossAnnual` (which is
  already correct). Add a regression test asserting `IncomeState` gross == `totalGrossAnnual` for a
  gapped-salary profile.
- **Blast radius:** one fix realigns Income detail, Income manager headline-vs-rows, Home take-home,
  Budget surplus, and goal capacity.

### 2. B-31 (HIGH) — Retirement cockpit ignores the Social Security & pension the user already entered
- **Broken:** Jane entered SS $2,000 + pension $1,500 in onboarding; the cockpit still says "Are you
  eligible? Tap to set up" and computes with **$0 guaranteed income**, producing a wrong "keep saving
  $3,775/mo." For the actually-retired persona it's worse — she's *drawing* $3,500/mo today and is
  told to set it up. The pension is never consumed anywhere on the screen. Snapshot-based surfaces DO
  count it, so the app disagrees with itself.
- **Root cause:** `RetirementCockpit.tsx:62` — `ssIncome = A.ssEligible ? … : 0`, where `ssEligible`
  is null until set on this screen; `ri_ss` only used after that, `ri_pension` never.
- **Fix:** default `ssEligible`/`ssMonthly` from `ri_ss` (and claim age) when the assumption is unset;
  add `ri_pension` into guaranteed monthly income.

### 3. B-28 (MED, but highest-frequency) — Plan tab shows income as "free cash to save"
- **Broken:** The Plan tab headline ("typical free cash to save") shows income **before** spending.
  Wrong on **all four personas**: Jane $17,250 (true $2,250), retiree $3,500 (true −$300), student
  $1,733 (true −$217), gig $2,400 (true $0). It tells cash-strapped users they have thousands free.
- **Root cause:** `GoalsScreen.tsx:30` feeds `incomeMonthlyGrid(op,'available')` into
  `availableToSaveSummary` instead of `savingsByMonth(op)`.
- **Fix:** one line — use `savingsByMonth(op)`.

### 4. B-29 (MED) — Onboarding goals never reach the Plan tab or the Sharpen checklist
- **Broken:** Jane set two goals during onboarding; the Plan tab says "No goals yet" and "Sharpen your
  plan" nags her to add one. Same producer→consumer gap class as #15.
- **Root cause:** `GoalsScreen.tsx:22` reads `store.goals` only; `onboardingProfile.goals` is never
  consumed. Completeness checks (`SharpenPlanScreen`) read screen-local state too.
- **Fix:** merge onboarding goals into `store.goals` on first visit (origin-tag pattern, mirroring the
  `seedNetWorth` fix so a re-run updates rather than duplicates).

---

## P1 — Wrong or contradictory takeaways (fix before TestFlight)

### 5. B-35 (MED) — Tax organizer taxes retirement income the user doesn't receive yet
- **Broken:** Jane (not retired) sees $42,000 of SS/pension added to her 2026 taxable income; the
  organizer's taxable total ($292,640) disagrees with the income module ($276,510). The SS-leak gate
  that protects every other screen is bypassed here.
- **Fix:** gate retirement income by receipt — use `currentRetirementIncomeMonthly` in the tax
  organizer (planning domain).

### 6. B-33 (MED) — Stress test contradicts itself
- **Broken:** Same screen says "a $3,000 hit would put you $3,000 in the red" and "✓ you already have
  3 months of essentials — a strong cushion." Reproduces only when the user gave a lump
  `monthlySpending` with no itemized categories (Jane); personas with categories are fine — which
  scopes the fix.
- **Root cause:** `monthlyEssentials()` returns $0 when `spendCats` is empty (ignores
  `monthlySpending`) → fund target $0 → $0 cash "passes."
- **Fix:** fall back to `monthlySpending` (or a fraction of it) when categories are absent.

### 7. B-37 (MED) — Retiree cockpit shows "grow your nest egg, assumes age 65" to a 74-year-old
- **Broken:** Home shows the retiree a "drawdown" focus, but the cockpit shows accumulation framing
  and "assumes age 65" for a retired 74-year-old — the two screens disagree.
- **Root cause:** no `targetRetirementAge` set → defaults to 65; cockpit doesn't force the drawdown
  branch when the user is retired or past their retire age.
- **Fix:** force drawdown when `employmentStatus === 'retired'` or `age ≥ retire_age`; never default a
  retiree's retire age below their current age.

### 8. B-24 (MED) — Stated-total vs itemized spending splits the free-cash number two ways
- **Broken:** When a user states a total monthly spend AND itemizes only part of it, the month grid
  honors the full total but `projected_to_save` (→ goal capacity) only sees the categorized part, so
  the goal pool overstates free cash by the uncategorized remainder.
- **Root cause:** `budgetFromOnboarding` (`src/domain/budget/index.ts:154`) takes the bucket total
  when > 0, ignoring the `monthlySpending` remainder that `spendByMonth` (lines 89–90) does add.
- **Fix:** `monthly_spending: max(bucket total, monthlySpending)`.

### 9. B-18 (MED) — Market-data failures are silent (offline looks identical to a bad ticker)
- **Broken:** Network failure, invalid ticker, and malformed response all return the same `null`; the
  UI shows stale cached prices as if live, with no staleness indicator, no retry, no ticker
  validation.
- **Root cause:** `src/services/marketData.ts` try/catch → null; store `refreshPrices` falls back to
  cache silently.
- **Fix:** distinguish offline from not-found; surface a "prices as of <date>" / stale badge; validate
  ticker format before fetch; optional retry/backoff.

### 10. B-19 (MED) — A held ticker with no cached price silently counts as $0 in net worth
- **Broken:** A position whose price isn't in the cache contributes $0 to its account balance →
  net worth quietly understates.
- **Root cause:** `recomputeBalances` (`src/store/useStore.ts:13-20`) treats a missing price as 0.
- **Fix:** fall back to lot cost basis (or last known price) and flag the row as stale rather than
  zeroing it.

---

## P2 — Polish & honesty (post-launch acceptable, but cheap)

### 11. B-25 (LOW) — Economic-data fallbacks are unlabeled
- During a BLS/Treasury outage, projections run on default inflation/treasury values with no flag.
- **Fix:** add an `isFallback` flag from `fetchEconomicData` and a subtle "using typical rates" note.

### 12. B-30 (LOW) — Mortgage holders get the renter debt-to-income guideline
- A $760k mortgage is graded against the 20% renter bar (→ "High" at 33%) instead of the 36%
  homeowner bar (→ "caution"). Arithmetic is right; the bar is wrong.
- **Root cause:** `debtsFromOnboarding` hardcodes `debt_type:'OTHER'` even when the label is
  "Mortgage", so `GoalsScreen`'s homeowner check (needs `MORTGAGE`) is false.
- **Fix:** infer debt type from the label/kind at seeding time.

### 13. B-32 (LOW) — Cost-of-living adjustment applied silently on the retirement cockpit
- "You plan to spend $8,288/mo" when the user said $15,000 — it's the Portugal ×0.6 factor, applied
  with no label. Reads as the app losing her number.
- **Fix:** label it — e.g. "$15,000 at home ≈ $8,288 in Portugal."

### 14. B-36 (LOW) — Tools don't prefill known data
- Insurance check leaves savings/assets at $0 → a "$3.5M coverage gap" for a 74-year-old with $1.75M;
  the Roth converter shows pre-tax $0 despite a known $250k 401(k), with a misleading zero-state
  message.
- **Fix:** prefill these tools from store/onboarding.

### 15. Copy nits (LOW, bundle with the above)
- "Your cash covers about **0.0 months** of spending" — robotic; say "no cash set aside," and don't
  alarm a user who has $1.5M in liquid investments (Home + Net Worth insights).
- "86% of your portfolio is a **single position**" — it's a single *account*; say "one account holds
  86% — add holdings to see real concentration" (Insights).
- Tips screen "Income $0.00" contradicts a $276k-income user; add a "tracks what you log" hint and
  drop the cents to match the app-wide whole-dollar style.
- Student's parental support labeled "Child support / alimony" (Income manager).
- "Room left in your 401(k)" nudge shown to users with no earned income / no 401(k) (retiree, gig).

---

## Already triaged — no code needed
- **B-15, B-16 (HIGH):** fixed 2026-06-12 (origin-tagged Net Worth seeding).
- **B-17, B-20 (LOW):** by-design (SS gate harmless; negative goal capacity is guarded).
- **B-22:** closed — `solveRetireAge` probed monotonic, not a bug.
- **B-21 (LOW):** product decision — should a $0 onboarding answer create a $0 account or none? Pick one.
- **B-23 (LOW):** deferred — currency/i18n is US-only at launch.

---

## Theme behind most of these
Two patterns cause the majority of the open bugs, and a fix to each prevents recurrence:
1. **Producer → consumer gaps:** onboarding captures data (goals, SS/pension, balances, retire age)
   that individual tool screens don't read, so they re-ask or show empty. The #15 lesson generalized.
   Every onboarding field should have a screen that consumes it, with a test (the journey suite is the
   place to add them).
2. **Which derived number a screen picks:** the domain engine is correct (bill calendar, tax wages,
   tuition planner all check out) — the bugs are screens choosing income where they mean savings
   (B-28), max-month where they mean the table (B-34), or un-gated where they mean gated (B-35).
