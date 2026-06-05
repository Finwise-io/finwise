# FinWise Onboarding — Data-Requirements Matrix (drives the flow)
_2026-06-01 · Onboarding captures MUST-HAVE only. All nice-to-haves are DEFERRED to a dashboard "Sharpen your plan" flow._

The flow is computed, not hand-written: **shown fields = union of the must-have fields of every service the user selected, given their life stage.** A service can never pull in data it doesn't need.

## Baseline (always, not service-gated)
- **Account** (email + password) — created right after Q2.
- **First name** — personalization only (1 field).

## Life stages (4)
Employed · Retired · Partially employed · Student

## Services (7) — objective + must-have (onboarding) + nice-to-have (deferred to dashboard)

### S1 · Track income & spending
- **Objective:** see money in vs out; a working budget.
- **Must-have:** `income` (status-framed, see below) · `monthlySpending` (baseline number).
- **Deferred:** category budgets, bills/subscriptions, flex-bucket setup, savings rate target.

### S2 · Retirement  — *accumulation* (Employed/Partial/Student) **or** *decumulation "make my money last"* (Retired/Partial)
- **Accumulation objective:** on track to have enough by retirement?
  - **Must-have:** `birthMonthYear` · `currentRetirementSavings` · `monthlyContribution` (or derive from income) · `targetRetirementAge` · `expectedRetirementSpending` (or current spending as proxy).
- **Decumulation objective:** will my savings + income last through life?
  - **Must-have:** `birthMonthYear` · `currentSavingsPortfolio` (drawdown pool) · `retirementIncomeSources` (SS / pension / 401k-IRA withdrawals / RMDs / annuities) · `monthlySpending` (current retirement spend) · `horizonAge`.
- **Deferred (both):** retirement **location / cost-of-living**, **travel** budget, **medical/LTC** budget, **spending-change-later**, employer match, tax modeling, Roth/SS optimization.

### S3 · Track investments
- **Objective:** see portfolio value & allocation.
- **Must-have:** `investmentHoldings` (accounts/balances).
- **Deferred:** cost basis, target allocation, risk tolerance, fee analysis.
- **Note:** does **not** require income, retirement, or spending. _(Fixes the retired+invest → income bug.)_

### S4 · Save for big goals
- **Objective:** plan & track progress to goals.
- **Must-have:** `goals[]` (each: target amount + target date) · `monthlySavingsCapacity` (reuse income−spending if S1 also chosen; else ask one number).
- **Deferred:** per-goal priority, existing balance per goal, auto-allocation rules.

### S5 · Manage money with a partner
- **Objective:** a shared household view.
- **Must-have:** `hasPartner` (yes) → `whoEarns` + partner's income folds into the `income` module.
- **Deferred:** invite partner (email), income-split rules, separate vs joint accounts.

### S6 · Manage money with family
- **Objective:** household-with-dependents view.
- **Must-have:** `dependentsCount`.
- **Deferred:** dependent ages, childcare/education planning, 529s.

### S7 · Pay down debt (Employed/Partial/Student) · Leave a legacy (Retired)
- **Debt objective:** a payoff plan. **Must-have:** `debts[]` (balance, rate, min payment) · capacity (reuse income−spending).
- **Legacy objective:** intended estate. **Must-have:** `legacyTarget` (uses already-captured savings/investments).
- **Deferred:** payoff strategy (avalanche/snowball), refinance, beneficiaries, estate docs.

## Must-have field × service (onboarding inclusion)
| Field \ Service | S1 spend | S2 retire | S3 invest | S4 goals | S5 partner | S6 family | S7 debt/legacy |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| firstName (baseline) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| income (status-framed) | ✅ | ✅ | — | ✅* | ✅ | ✅ | ✅(debt) |
| monthlySpending | ✅ | ✅(dec) / proxy(acc) | — | — | — | — | — |
| birthMonthYear | — | ✅ | — | — | — | — | — |
| currentSavings / portfolio | — | ✅ | — | — | — | — | legacy |
| investmentHoldings | — | — | ✅ | — | — | — | — |
| monthlyContribution | — | ✅(acc) | — | — | — | — | — |
| targetRetirementAge | — | ✅(acc) | — | — | — | — | — |
| horizonAge | — | ✅(dec) | — | — | — | — | — |
| retirementIncomeSources | — | ✅(dec) | — | — | — | — | — |
| goals[] | — | — | — | ✅ | — | — | — |
| monthlySavingsCapacity | — | — | — | ✅* | — | — | debt |
| hasPartner / whoEarns | — | — | — | — | ✅ | — | — |
| dependentsCount | — | — | — | — | — | ✅ | — |
| debts[] | — | — | — | — | — | — | ✅(debt) |
| legacyTarget | — | — | — | — | — | — | ✅(legacy) |

`*` = if S1 also selected, reuse income/spending instead of re-asking (no duplicate questions).

## Income module — status-framed content (must-have when income is required)
- **Employed / Partial (job portion):** take-home amount + frequency. (Partial also gets retirement-income sources.)
- **Retired:** retirement-income sources — SS, pension, 401k/IRA withdrawals, RMDs, annuities, dividends/rental.
- **Student:** light — part-time / stipend / family support.
- **Partner/Family selected:** prefix with `whoEarns` (you / partner / both).

## Flow composition rule (the engine)
```
fields = baseline ∪ ⋃(service ∈ selected) mustHave(service, status)
steps  = ordered, de-duplicated questions for those fields, each WORDED for {status, services}
// nice-to-haves are never added here → they live in the dashboard "Sharpen your plan"
```

## Worked examples (the two bugs, now correct by construction)
- **Retired + Track investments (only):** baseline + `investmentHoldings` → **Status → Goals → Account → Name → Investments → Summary**. *No income, no retirement, no location.* ✅
- **Retired + Investments + Make-my-money-last:** baseline + holdings + (birth, portfolio, retirementIncomeSources, monthlySpending, horizon) → **… → Name → Investments → Birth → Savings/Portfolio → Retirement income sources → Monthly spending → Horizon → Summary (will-money-last)**. *No "where will you retire" — that's deferred.* ✅
- **Employed + Spend + Retirement:** baseline + (income, monthlySpending) + (birth, savings, contribution, retirementAge) → standard accumulation flow → **Summary (nest-egg/readiness)**.

## Next: dashboard "Sharpen your plan"
A post-onboarding surface that progressively offers the **deferred** items (retirement location/travel/medical, category budgets, allocation, employer match, beneficiaries, …) to improve plan accuracy — Boldin's "add more to sharpen" pattern. Spec'd separately.
