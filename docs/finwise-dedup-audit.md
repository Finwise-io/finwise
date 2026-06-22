# FinWise Dedup Backlog Report

_Generated 2026-06-21 — Verified semantic-duplication findings + structural clone audit_

## 1. Executive Summary

We audited **11 core financial concepts** for semantic duplication and ran a structural clone scan across the React Native/Expo codebase.

**Concept-level health:**

| Status | Count | Concepts |
|---|---|---|
| Clean single source (no fixable duplication) | 0 | — |
| Duplicated with a confirmed canonical source | 11 | salary/gross income, monthly spend/budget, net worth, savings rate, retirement guaranteed income, retirement spend target, investable assets, debt total/DTI, emergency fund runway, effective tax rate |

Every concept _has_ a canonical source defined — the problem is that **screens and the onboarding recap bypass those canonical selectors**, either reading raw store fields directly or reimplementing the formula inline. None of the 11 concepts is fully clean today; all carry at least one confirmed duplication.

**Top risks (user-visible disagreeing numbers — P0):**

1. **Monthly spend/budget** — Three screens (HomeScreen, RetirementCockpit, SharpenPlanScreen) read raw `op.monthlySpending` or use a divergent function, bypassing the `MAX(buckets, stated)` logic in `plannedMonthlySpend()`. Users can see a lower/wrong spend number that drives downstream readiness and completeness scores.
2. **Savings rate** — The app shows **three different savings-rate numbers** depending on screen: AnalyticsScreen (live transactions only), HomeScreen snapshot (hybrid planned + live), and an unused planned value in domain/budget. This directly violates the in-code rule "Two screens disagreeing about the same pool is how dollars get counted twice."
3. **Investable assets** — InsightsScreen computes concentration/drag ratios with a numerator that **excludes CASH** over a denominator that **includes CASH**, producing mathematically incorrect percentages.
4. **Retirement spend target** — Onboarding recap feeds raw `expectedRetirementSpending` into `capitalNeeded()`, skipping travel/medical/trajectory/cost-of-living adjustments; can diverge 15–20%+ from the live Retirement Cockpit at the exact moment the user finalizes their retirement readiness.
5. **Debt total / DTI** — `buildDebtState` computes monthly debt service from `minimum_monthly_payment` only, ignoring the user-editable `monthly_payment` override that `requiredPayment()` respects; NetWorthScreen and HomeScreen/GoalsScreen/BudgetScreen can disagree.
6. **Retirement guaranteed income** — A full duplicate `retirementMonthlyIncome` in onboarding uses a `num()` helper that strips negative signs, while the canonical uses `toNum()` that preserves them — a latent bug on corrections/refunds.

**Structural clones:** 110 exact clones across 153 files, 824 duplicated lines (3.12% of codebase). The worst are near-identical 450-line form screens (ExpenseScreen ≈ IncomeScreen) and a screen-init/alert pattern cloned across 9 feature screens.

---

## 2. Prioritized Duplication Backlog

**Priority key:** **P0** = can show users disagreeing numbers / high severity. **P1** = bypasses the canonical selector but currently agrees (latent divergence). **P2** = cosmetic, comment, or structural-only.

| Pri | Concept | Should use (canonical) | Offending site(s) | Fix |
|---|---|---|---|---|
| **P0** | Monthly spend/budget | `plannedMonthlySpend(op)` — `src/domain/budget/index.ts:45-46` | `src/screens/HomeScreen.tsx:168` | Replace raw `op.monthlySpending` read with `plannedMonthlySpend(op)` |
| **P0** | Monthly spend/budget | `plannedMonthlySpend(op)` | `src/screens/RetirementCockpit.tsx:78` | Uses `retirementSpendMonthly(op)` (different formula, no MAX logic); decide if retirement-specific is deliberate or fall back to `plannedMonthlySpend()` |
| **P0** | Monthly spend/budget | `plannedMonthlySpend(op)` | `src/screens/SharpenPlanScreen.tsx:25` | Replace raw `num(op.monthlySpending)` with `plannedMonthlySpend(op)` for completeness scoring |
| **P0** | Savings rate | Single canonical `calculateSavingsRate(num, denom)` to be added in `src/domain/budget/` | `src/screens/AnalyticsScreen.tsx:57` (live) vs `src/domain/budget/index.ts:37` (planned) | Extract canonical helper; decide and document live-only vs planned-only per screen |
| **P0** | Savings rate | (same canonical helper) | `src/screens/HomeScreen.tsx:78-85`, `137` (hybrid planned+live) | Stop blending planned baseline with live `store.incomes`; pick one source for the snapshot |
| **P0** | Investable assets | `investableValue()` — `src/domain/assets/index.ts:90-92` | `src/screens/InsightsScreen.tsx:30`, `41-42` | `investAccts` excludes CASH but `investable` denominator includes it; align numerator filter to `investableValue()` so ratios are correct |
| **P0** | Retirement spend target | `retirementSpendMonthly(a)` — `src/domain/retirement/index.ts:48-55` | `src/onboarding/modules.tsx:1781` | Change `monthlySpend: num(a.expectedRetirementSpending)` → `retirementSpendMonthly(a)` so capital-needed matches Cockpit |
| **P0** | Debt total / DTI | `totalDebtMonthly` / `requiredPayment(d)` — `src/domain/debt/index.ts:29-31` | `src/domain/debt/index.ts:130` (`buildDebtState`) | Use `requiredPayment(d)` instead of `d.minimum_monthly_payment` so custom `monthly_payment` overrides (set at `NetWorthScreen.tsx:402`) are respected everywhere |
| **P0** | Retirement guaranteed income | `retirementIncomeMonthly` — `src/domain/income/onboarding.ts:193` | `src/onboarding/modules.tsx:359` (duplicate `retirementMonthlyIncome`) | Delete duplicate; import canonical. Duplicate uses `num()` which strips negatives → diverges from `toNum()` on refunds/corrections |
| **P0** | Net worth (debt total) | `buildDebtState(uid, liabilities).total_debt_balance` — `src/domain/networth/index.ts:12` / debt selector | `src/screens/GoalsScreen.tsx:37`, `src/screens/InsuranceScreen.tsx:18` | Replace direct `liabilities.reduce(... remaining_balance)` sums with the selector |
| **P1** | Net worth | `buildNetWorth` / live selectors | `src/store/useStore.ts:892` (`useNetWorth` hook) | Dead code using deprecated `store.savings/investments/debts` arrays — remove after grep-confirming no importers |
| **P1** | Salary / gross income | `salaryGrossByMonth` / `salaryAnnual` + `DEFAULT_HOURS_PER_WEEK`, `SALARY_PERIODS` — `src/domain/income/onboarding.ts` | `src/onboarding/modules.tsx:703-706` (`enteredMonthly`) | UI-only; reimplements `enteredMonthlyRaw()` with hardcoded `'40'`. Import the constants or extract a public `computeEnteredMonthly()` |
| **P1** | Emergency fund / runway | New `emergencyFundRunway(op, cash)` in `src/domain/budget/index.ts` | `src/screens/NetWorthScreen.tsx:73-74`, `src/screens/InsightsScreen.tsx:27,36` | Both inline `cash ÷ plannedMonthlySpend`; extract one helper (both already cite B-50) |
| **P1** | Investable assets | `investableValue()` — `src/domain/assets/index.ts:90-92` | `src/screens/HomeScreen.tsx:245-246` | Inline `filter(tax_bucket !== 'PROPERTY') + sum` reimplements the function; call `investableValue()` |
| **P1** | Effective tax rate | `effectiveRate(op)` — `src/domain/income/onboarding.ts:307-311` | `src/onboarding/modules.tsx:351-352` (`incomeTaxRate()`) | Functional duplicate; refactor to call `effectiveRate()` |
| **P1** | Effective tax rate | New `netMonthlyIncomeFromProfile(op)` in `src/domain/income/onboarding.ts` | `src/domain/budget/index.ts:59`, `78`, `111` | Same `(totalGrossAnnual*(1-effectiveRate))/12` formula repeated 3×; extract one helper |
| **P2** | Monthly spend/budget | `plannedMonthlySpend(op)` (distinct store field) | `src/screens/ExpenseScreen.tsx:19` (`monthlyBudgetTarget`, default 3500) | Keep as distinct UI field; add warning/sync if it drifts from `budget.monthly_spending` |
| **P2** | Monthly spend/budget | n/a (comment accuracy) | `src/screens/BudgetScreen.tsx:249` | Fix misleading comment: `planned_total` is bucket-only, not the full MAX formula |
| **P2** | Retirement spend target | `retirementSpendMonthly(a)` | `src/onboarding/modules.tsx:1805` (display) | Display raw `expectedRetirementSpending`; switch to `retirementSpendMonthly(a)` so recap matches Cockpit |
| **P2** | Retirement guaranteed income | `toNum()` — `src/domain/_shared/num.ts:4` | `src/onboarding/modules.tsx:25` (`num()` helper) | Helper strips hyphens (`[^0-9.]`); resolved by removing the duplicate consumer above |
| **P2** | Savings rate | n/a | `src/domain/budget/index.ts:37` (`savings_rate_pct`) | Computed but never displayed; delete unless a consumer is found |
| **P2** | Savings capacity | intentional override | `src/domain/snapshot.ts:75`, `src/onboarding/modules.tsx:1759` (`monthlySavingsCapacity`) | Intentional user override; validate users understand it only affects goal capacity, not displayed savings rate |

---

## 3. Per-Concept Detail

### 3.1 Monthly salary / gross income — P1 (UI only, safe)
**Canonical:** `src/domain/income/onboarding.ts` (`salaryGrossByMonth`, `grossSalaryMonthly`, `salaryAnnual`, `totalGrossAnnual`).
`enteredMonthlyRaw()` (`onboarding.ts:34-40`) is reimplemented as `enteredMonthly` in `modules.tsx:703-706`, using hardcoded `'40'` instead of `DEFAULT_HOURS_PER_WEEK` and inline `FREQ_MULT` instead of `SALARY_PERIODS`. **Verified safe:** `enteredMonthly` is UI-only (form pre-population/display text, never feeds calculations); all 68 real consumers route through canonical selectors (confirmed at `modules.tsx:712`). Risk is future maintenance only — if `DEFAULT_HOURS_PER_WEEK` ever changes, the hardcoded `'40'` silently drifts.
**Fix:** import the constants, or extract a public `computeEnteredMonthly()` in the canonical module.

### 3.2 Monthly spend / budget — P0
**Canonical:** `plannedMonthlySpend(op)` — `src/domain/budget/index.ts:45-46` — applies `MAX(itemized buckets, stated monthlySpending)`.
- **`HomeScreen.tsx:168` (HIGH):** reads raw `op.monthlySpending` as `estSpend`; shows the lower wrong value when itemized categories exceed the stated total.
- **`RetirementCockpit.tsx:78` (HIGH):** uses `retirementSpendMonthly(op)` — a *different* function (adds travel/medical/COL, no MAX logic). Diverges when retirement adjustments or uncategorized remainder exist. Needs a decision: is the retirement-specific path deliberate, or should it fall back to `plannedMonthlySpend()`?
- **`SharpenPlanScreen.tsx:25` (HIGH):** raw `num(op.monthlySpending)` drives `planCompleteness` scoring on an incomplete value.
- **`ExpenseScreen.tsx:19` (MED):** `store.monthlyBudgetTarget` (default 3500) is a genuinely distinct store-only field — keep it, but surface a warning if it drifts from `budget.monthly_spending`.
- **`BudgetScreen.tsx:249` (MED):** comment falsely claims `planExpenses` (= `bva.planned_total` = `spendBuckets().monthly_total`) equals `plannedMonthlySpend`; it's bucket-only and misses the MAX. Fix the comment.
- **Dismissed:** `snapshot.ts:90` correctly routes through `budgetFromOnboarding()` → `plannedMonthlySpend()`.

### 3.3 Net worth — P0 / P1
**Canonical:** `buildNetWorth(uid, grossAssets, grossDebt)` — `src/domain/networth/index.ts:12`; all primary consumers route through `buildAssetsState`/`buildDebtState`.
- **`useStore.ts:892` `useNetWorth` (P1):** orphaned hook computing `totalSavings + totalInvestments - totalDebt` from deprecated arrays; never imported. Dead code → remove (grep-confirm no external importers).
- **`GoalsScreen.tsx:37` and `InsuranceScreen.tsx:18` (P0):** both directly sum `liabilities[].remaining_balance`, bypassing `buildDebtState(...).total_debt_balance` (Goals for DTI, Insurance for prefill). No mutual divergence today, but will diverge if the selector adds filtering/rounding. Route both through the selector.
- **Dismissed:** `journeys.test.ts:89-90` direct sums are legitimate verification (comparing store raw arrays to snapshot totals).

### 3.4 Savings / savings rate — P0
**Canonical to establish:** a single `calculateSavingsRate(numerator, denominator)` in `src/domain/budget/`.
The app shows **three different rates**:
- **`AnalyticsScreen.tsx:57`:** `(income − spent)/income` from **live** `store.incomes`/`expenses`.
- **`HomeScreen.tsx:78-85, 137`:** frozen snapshot blends `incomeMonthlyGrid` (planned) + `store.incomes` (live) — a **hybrid** matching neither.
- **`domain/budget/index.ts:37`:** planned `savings_rate_pct` from onboarding baseline — **computed but never displayed**.
This violates `modules.tsx:1751-1752`: "Two screens disagreeing about the same pool is how dollars get counted twice."
**`monthlySavingsCapacity`** (`snapshot.ts:75`, `modules.tsx:1759`) is an intentional override of the computed pool — keep, but validate user understanding.
**Dismissed:** rounding differences (Math.round vs round2) — both UI calculators use Math.round, and the round2 path is unused, so no divergence.
**Actions:** extract the canonical helper; decide LIVE vs PLANNED vs snapshot per screen and document it; delete unused `savings_rate_pct` unless a consumer is found.

### 3.5 Retirement guaranteed income (SS + pension) — P0
**Canonical:** `retirementIncomeMonthly` — `src/domain/income/onboarding.ts:193`.
`modules.tsx:359` `retirementMonthlyIncome` is a complete duplicate (same 6 sources, same cadence divisors) but uses local `num()` (`modules.tsx:25`, regex `[^0-9.]`) instead of `toNum()` (`_shared/num.ts:4`, regex `[^0-9.\-]`). Verified: `num('-100')=100`, `toNum('-100')=-100` → silent divergence on negative income (corrections/refunds). Consumed by `Summary.tsx:29,41`.
**Dismissed:** the gate at `modules.tsx:1344` (different computation, no sync risk); `RetirementCockpit.tsx:76` (`hasPension` boolean only); Cockpit's main path imports the canonical function (`line 23`).
**Fix:** delete the duplicate, import `retirementIncomeMonthly`/`currentRetirementIncomeMonthly` in Summary; the latter bakes the gate into the canonical computation.

### 3.6 Retirement spend target — P0 / P2
**Canonical:** `retirementSpendMonthly()` — `src/domain/retirement/index.ts:48-55` = `(expectedRetirementSpending + travel/12 + medical/12) * trajectory_mult * colFactor`.
- **`modules.tsx:1781` (HIGH):** passes raw `num(a.expectedRetirementSpending)` into `capitalNeeded()`, skipping all adjustments → can diverge 15–20%+ from the Cockpit at the moment users finalize readiness.
- **`modules.tsx:1805` (MED):** recap displays raw `expectedRetirementSpending`, contradicting the live tab.
**Dismissed:** `modules.tsx:414` (validation boolean), `modules.tsx:925` (UI hint comparison).
**Fix:** both lines call `retirementSpendMonthly(a)` (import from `../domain/retirement`).

### 3.7 Investable assets — P0 / P1
**Canonical:** `investableValue()` — `src/domain/assets/index.ts:90-92` (includes CASH, excludes PROPERTY).
- **`InsightsScreen.tsx:30, 41-42` (HIGH):** `investAccts` filters out **both** PROPERTY and CASH, then divides by `investable` (which includes CASH) → numerator/denominator mismatch → wrong concentration/drag percentages.
- **`HomeScreen.tsx:245-246` (MED):** inline `filter(tax_bucket !== 'PROPERTY') + sum` reimplements the function; matches today but diverges if `investableValue()` changes.
**Fix:** align Insights numerator to `investableValue()`; refactor HomeScreen to call the function.

### 3.8 Debt total / debt-to-income — P0
**Canonical:** `totalDebtMonthly` — `src/domain/debt/index.ts:29-31`, using `requiredPayment(d)` = `Math.max(minimum, monthly_payment override)`.
**`buildDebtState` `total_monthly_debt_service` (`debt/index.ts:130`)** uses `d.minimum_monthly_payment` only, ignoring the user override editable at `NetWorthScreen.tsx:402`. NetWorthScreen (`:189`, displaying `dState.total_monthly_debt_service`) then disagrees with HomeScreen/GoalsScreen/BudgetScreen.
**Dismissed:** `BudgetScreen.tsx:322` `totalMinMonthly` is intentionally minimum-only for payoff-plan simulation — keep as-is.
**Fix:** change `debt/index.ts:130` to `requiredPayment(d)`.

### 3.9 Emergency fund / cash runway — P1
**Canonical to establish:** `emergencyFundRunway(op, cash)` in `src/domain/budget/index.ts` (alongside `plannedMonthlySpend` `:45-47` and `emergencyTest` `:134-148`).
`NetWorthScreen.tsx:73-74` and `InsightsScreen.tsx:27,36` both inline `cash ÷ plannedMonthlySpend(op)` with identical null-checks across two independent render paths (both cite B-50). Extract one helper; label it "Runway = cash ÷ planned monthly spend (excludes lumpy/non-monthly costs)" to distinguish from `monthlyEssentials` used by `emergencyTest`.
**Dismissed:** `JobSafetyScreen.tsx:22-42` uses a distinct `monthSpend` baseline (user-driven calculator); `scenarios.test.ts:13` is a test-only helper.

### 3.10 Effective / marginal tax rate — P1
**Canonical:** `effectiveRateOnGross()` (`src/domain/income/tax.ts:42-44`) → `effectiveRate()` selector (`src/domain/income/onboarding.ts:307-311`).
- **`modules.tsx:351-352` `incomeTaxRate()` (MED):** functional duplicate of `effectiveRate()` (identical manual/system-mode control flow). Refactor to call the domain function.
- **`budget/index.ts:59, 78, 111` (MED):** `(totalGrossAnnual*(1-effectiveRate))/12` repeated in `spendBuckets`, `spendByMonth`, `monthlyEssentials`. Extract `netMonthlyIncomeFromProfile(op)`.
**Dismissed:** `planning/index.ts:71` (formatting), `planning/index.ts:100` (distinct Roth marginal rate), `cashflow/index.ts:73/103/149` (`:103` uses the algebraically distinct non-taxable-income form — keep, document why).

---

## 4. Structural Clones

110 exact clones, 153 files, 824 duplicated lines (3.12% of codebase).

| Severity | Files | What's duplicated | Why it matters |
|---|---|---|---|
| **High** | `screens/ExpenseScreen.tsx` ≈ `screens/IncomeScreen.tsx` | Near-identical 450–480-line form screens: add/edit/recurring tabs, parallel state (amount/date/notes), list rendering, submission, validation. `434-455` mirrors `455-468` at 237+ tokens | Bug fixes in one won't reach the other |
| **High** | `screens/BondsScreen.tsx` ≈ `screens/OtherInvestmentsScreen.tsx` | 280+ tokens of rendering, list management, calc display. `168-187` mirrors `114-133` at 281 tokens | Inconsistent UX between investment types |
| **High** | `BillCalendarScreen` + `CreditScreen` + `EducationScreen` + `EstateScreen` + `InsightsScreen` + `InsuranceScreen` + `RothScreen` + `StressTestScreen` | Screen-init + alert-handling pattern; `BillCalendarScreen:145-159` repeats across 8+ screens, 50–194 tokens/pair | Blocks independent refactoring of any single screen |
| **Med** | `onboarding/modules.tsx` (internal) | 6+ clone pairs of render/state patterns for onboarding steps, 50–130 tokens each | Missing parameterized step component |
| **Med** | `screens/AnalyticsScreen.tsx` (internal) | Chart rendering + data filtering, `147-226`, 4+ patterns at 54–62 tokens | Extract chart/filter components |
| **Med** | `screens/NetWorthScreen.tsx` ≈ `screens/RetirementCockpit.tsx` | Init + net-worth display; `30-40` mirrors `775-786` at 255 tokens | Calc bug fixes won't propagate (overlaps §3.2/§3.8) |
| **Med** | `store/useStore.ts` (internal) | State update/subscription patterns, `409-432` vs `779-788` at 152 tokens | Missing factory/middleware for recurring mutations |
| **Med** | `services/dataCrypto.ts` ≈ `store/secureStorage.ts` | Encryption/decryption logic, `24-34` mirrors `18-29` at 101 tokens | **Security/consistency risk** if crypto implementations diverge |
| **Low** | `screens/HomeScreen.tsx` (internal) | 5+ clone pairs of handlers/transforms/UI sections, 41–99 tokens | Extract sub-components |
| **Low** | `components/InputModal.tsx` + `ExpenseScreen` + `IncomeScreen` + `JobSafetyScreen` + `RetirementScreen` + `BudgetScreen` | Input/form state boilerplate; `InputModal:96-111` duplicated 5+ times, 46–100 tokens | Candidate for a shared form hook |

**Recommended structural priorities:** (1) unify ExpenseScreen/IncomeScreen behind one parameterized transaction-form component; (2) consolidate `dataCrypto.ts`/`secureStorage.ts` into a single crypto module (security-sensitive); (3) extract the screen-init/alert pattern into a shared hook to unblock the 9-screen cluster.

---

## 5. How to Prevent Recurrence

The root cause across all 11 concepts is the same: **screens and the onboarding recap reach around the canonical selectors** — either reading raw store fields (`op.monthlySpending`, `liabilities[].remaining_balance`, `expectedRetirementSpending`) or copying a formula inline. Two mechanisms close this for good.

### 5.1 Agreement tests (catch divergence at CI)
For every concept with a canonical source, add a test that asserts **all surfaces produce the same number from the same fixture profile**:

- Build a small set of profile fixtures, including the edge cases that currently diverge: itemized buckets exceeding stated `monthlySpending`; a custom `monthly_payment` above minimum; negative retirement income; non-zero travel/medical/COL retirement adjustments; CASH-heavy portfolios.
- For each concept, assert the screen-facing value equals the canonical selector value:
  - spend: `HomeScreen` est-spend, `SharpenPlan` score input, `RetirementCockpit` spend == `plannedMonthlySpend(op)` (or document the retirement-specific exception explicitly).
  - debt service: `buildDebtState(...).total_monthly_debt_service` == `totalDebtMonthly(...)`.
  - net worth / debt total: Goals/Insurance debt sums == `buildDebtState(...).total_debt_balance`.
  - investable ratios: Insights numerator scope == `investableValue()` scope.
  - retirement income: onboarding recap == `retirementIncomeMonthly` (assert negative-value handling).
  - savings rate: assert which definition each screen uses and that snapshots match it.
- Extend `journeys.test.ts` (already verifies store-raw vs snapshot consistency) to also cover screen-derived values — that test pattern is exactly the right shape, just broaden its coverage.

### 5.2 No-raw-field-access gate (catch it before merge)
Add a lint/grep gate in CI that fails when screens read concept fields directly instead of through selectors:

- Forbid in `src/screens/**` and `src/onboarding/**`: direct reads of `op.monthlySpending`, `.remaining_balance` reductions, `op.expectedRetirementSpending` into calculations, inline `tax_bucket !== 'PROPERTY'` sums, and the local `num()` helper for financial parsing (use `toNum`).
- Require these to route through: `plannedMonthlySpend`, `buildDebtState`/`requiredPayment`/`totalDebtMonthly`, `retirementSpendMonthly`, `investableValue`, `retirementIncomeMonthly`, `effectiveRate`.
- Allow exceptions only with an inline annotation (e.g. `// raw-read-ok: <reason>`) so every bypass is a deliberate, reviewed decision — as with the legitimately distinct `store.monthlyBudgetTarget`, `totalMinMonthly` payoff simulation, and test-verification sums.

### 5.3 Consolidate the helpers
Three new canonical helpers remove the most-copied formulas: `calculateSavingsRate(num, denom)`, `emergencyFundRunway(op, cash)`, and `netMonthlyIncomeFromProfile(op)`. Delete the duplicate `num()` helper (`modules.tsx:25`) in favor of `toNum()`, and remove dead code (`useNetWorth` hook, unused `savings_rate_pct`). After this, each concept has exactly one computation path, and the agreement tests + gate keep it that way.