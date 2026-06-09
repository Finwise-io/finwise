# FinWise — Data Structure Review

A critical pass over the data model: what's captured-but-unused, what's not linked, cross-module
duplication, sync gaps, and the pros/cons of the structure. **Verified against the code (2026-06)** —
two earlier auto-findings were wrong and are corrected below.

## ✅ Corrections to common misconceptions (verified)
- **`onboardingProfile` IS cloud-synced** (it's in SYNC_FIELDS). It's not a gap. Good — it's the
  blob the whole domain layer reads.
- **`loans` IS consumed** — by the cashflow module (`cashflowYear` / `upcomingBills`). It's not
  income, so the income module ignores it by design; that's correct.

---

## 1. Captured but unused (dead inputs)
We ask for these but nothing computes with them:

| Field | Where captured | Status |
|---|---|---|
| `travelBudget` | retirement (travelBudget step) | **unused** — never read |
| `medicalBudget` | retirement (medicalBudget step) | **unused** — never read (notable: medical is a top retiree risk) |
| `spendingChangeLater` | retirement | **unused** — never feeds the projection (we even ask "will spending change?" then ignore it) |
| `benefitTypes` | benefits step | descriptive only — not used in any calc |
| store `incomeIsFixed` | onboarding | ✅ **REMOVED** (was 0 readers) |
| store `lastEconomicFetch` | economic data | ✅ **REMOVED** (was set-but-never-read) |
| store `allocPromptSkipped` | net-worth allocate prompt | **actually wired** — HomeScreen reads it (earlier "unused" call was wrong); keep |

**Update (2026-06-09):** `incomeIsFixed` and `lastEconomicFetch` removed; `travelBudget` /
`medicalBudget` / `spendingChangeLater` now **wired** into retirement spend (`retirementSpendMonthly`).
The remaining captured-only field is `benefitTypes` (harmless descriptive metadata — kept).

**Action:** either wire them (medicalBudget → retirement spend; spendingChangeLater → a spend
ramp in the projection) or stop asking. Asking for data we ignore erodes trust and lengthens
onboarding.

## 2. Computed but not consumed (dead outputs / missing links)
Real signal we calculate then drop:

- **Actual investment income** — `transactions.investmentIncomeAnnual()` (real dividends/interest)
  and `bonds.couponIncomeAnnual()` are computed but **not fed into the income totals**. Income only
  uses the onboarding estimate `invAnnual`. → a user with real holdings sees an estimate, not their
  actual passive income.
- **RMDs in the retirement Monte Carlo** — `decumulation` knows RMDs (age 73+), but the retirement
  `simulate()` doesn't force them. Post-73 forced withdrawals / tax aren't modeled.
- **Debt at retirement** — the retirement projection ignores `liabilities`; it implicitly assumes
  debt-free at retirement.
- **Goals waterfall** — `goals.waterfall()` recommends an allocation order but nothing records what
  actually got funded (suggestion-only, no feedback loop).

## 3. Duplication (same concept, multiple implementations)
| Concept | Implemented in | Risk |
|---|---|---|
| Net monthly income | income/calc, budget (re-derives), cashflow (re-derives) | formula drift if tax logic changes |
| Spend-by-month | `budget.spendByMonth` **and** cashflow's own loop | category-schema changes must touch both |
| Scholarship/loan month placement | `income.scholarshipByCalendarMonth` **and** cashflow inflows loop | two copies of placement logic |
| Effective tax rate | income/onboarding **and** income/calc | minor — both consistent, snapshot uses calc |

**Action:** have cashflow consume `budget.spendByMonth` and the income placement helpers instead of
re-deriving. One source of truth per concept.

## 4. Sync gaps (persisted locally but not to cloud)
| Field | Sync? | Verdict |
|---|---|---|
| `transactions` (audit ledger) | ❌ | minor — positions live in `assetAccounts` (synced); only the history is device-local. Sync if you want portfolio history across devices. |
| `displayMode`, `fontScale` | ❌ | device preferences — arguably fine local; sync for cross-device consistency |
| `debts` (legacy) | ❌ | legacy duplicate of `liabilities` (which IS synced) — consolidate/remove |
| `priceCache`, economic data | ❌ | correct — ephemeral, re-fetched |

## 5. Two-vs-canonical fields
- **`debts` vs `liabilities`** — `liabilities` is canonical (synced, used by Net Worth/DTI/payoff).
  `debts` is legacy. Pick one; remove the other to avoid confusion.
- **Nest egg vs net worth** — correctly distinct: `assets.retirementEarmarkedValue` (funds
  retirement, excludes home/car) vs `networth.buildNetWorth` (everything − debt). Keep; document.

---

## Pros of the current data structure
- **One profile, many read-models.** `onboardingProfile` + pure domain functions + `buildSnapshot`
  is clean: deterministic, testable (219 tests), no hidden state. Changing an input recomputes
  everything.
- **Pure domain layer.** No I/O in calculations → trivially unit-tested and reused across screens.
- **Per-account net worth + positions/lots** is a solid, real model (cost basis, cap gains, live
  pricing), not a toy.
- **Synced where it matters** (onboardingProfile, accounts, liabilities, goals, retirement).
- **Clear module boundaries** with a single orchestrator.

## Cons / risks
- **Onboarding-coupled.** Domain reads raw `op` fields, so post-onboarding edits must flow back into
  `onboardingProfile` or they won't reflect. (Net Worth/Budget edits write their own store arrays
  that some modules read, but income/cashflow lean on `op`.) → editing income after onboarding is
  the weak spot.
- **Estimate vs actual not unified.** Income uses onboarding estimates even when real
  ledger/holdings exist (dividends, coupons). Two parallel truths.
- **Duplication** (section 3) invites drift.
- **Asked-but-ignored fields** (section 1).
- **`op` is loosely typed** (`Record<string, any>`), so typos/missing fields fail silently rather
  than at compile time.

## Recommended fixes, prioritized
1. **Wire or drop** `medicalBudget` / `spendingChangeLater` / `travelBudget` (and remove
   `incomeIsFixed`, `lastEconomicFetch`). *Cheap, high trust.*
2. **Feed actual passive income** (`investmentIncomeAnnual` + `couponIncomeAnnual`) into the income
   total when holdings exist (fall back to the estimate otherwise).
3. **De-duplicate** spend-by-month + scholarship/loan placement (cashflow consumes budget/income).
4. **Consolidate `debts` → `liabilities`**.
5. **Type `onboardingProfile`** with an interface (even partial) to catch field typos.
6. (Optional) model **RMDs** in the retirement sim; **debt** in the runway-to-retirement.
