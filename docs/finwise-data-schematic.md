# FinWise — Data Schematic

How data flows from capture → storage → computation → screens. Verified against the codebase
(2026-06). Use this to see what we capture and whether it's connected.

## The four layers

```
1. CAPTURE        Onboarding wizard  →  `answers` object  (src/onboarding/modules.tsx, engine.ts)
                  In-app editors     →  store actions      (Net Worth, Budget, Performance, etc.)
        │  finish() consolidates answers →
        ▼
2. STORE          Zustand store (src/store/useStore.ts), persisted (AsyncStorage) +
                  cloud-synced for SYNC_FIELDS (app/_layout.tsx). Key blob: `onboardingProfile`.
        │  domain functions read `op` (= onboardingProfile) and store arrays
        ▼
3. DOMAIN         Pure read-models in src/domain/* (income, budget, cashflow, debt, assets,
                  networth, goals, retirement, decumulation, performance, planning, …)
        │
        ▼
4. SCREENS        src/screens/* render the domain read-models.
```

`buildSnapshot(uid, op, econ)` (src/domain/snapshot.ts) is the orchestrator: it assembles every
core module's read-model from one `onboardingProfile` (profile → income → assets → debt → networth
→ budget → goals → retirement).

---

## Layer 1→2: onboarding answer keys (what we capture)

All consolidated into `onboardingProfile` (which **is** in SYNC_FIELDS — cloud-synced). Grouped:

| Group | Keys |
|---|---|
| **Income — employment** | `incomeSources`, `salaryFreq`, `baseSalary`, `hoursPerWeek`, `salaryMode`, `salaryByMonth`, `salaryMonthMode`, `tipsMonthly`, `whoEarns` |
| **Income — bonus/equity** | `bonusAnnual`, `bonusMonth`, `signingOnetime`, `equityType`, `rsuGrants`, `optStrike`, `optMarket` |
| **Income — 401(k)** | `c_401k`, `employerMatchValue`, `employerMatchMode` |
| **Income — other sources** | `rentals`, `seAmount`/`seFreq`, `invAnnual`, `otherAmount`/`otherFreq`/`otherLabel`, `benefitMonthly`, `benefitTypes`, `supportMonthly`, `scholarships[]`, `loans[]` |
| **Income — retirement** | `ri_ss`, `ri_pension`, `ri_withdrawals`, `ri_rmd`, `ri_annuities`, `ri_other` |
| **Tax** | `taxMode`, `manualTaxRate` |
| **Spending** | `monthlySpending`, `spendCats[]` (`{id,label,tier,bucket,unit,amount,months,dueDay,custom}`), `savingsByMonth`, `savingsMode` |
| **Retirement plan** | `birthYear`/`birthMonth`, `currentRetirementSavings`, `c_roth`/`c_invest`/`c_property`, `targetRetirementAge`, `expectedRetirementSpending`, `horizonAge`, `currentSavingsPortfolio`, `retLocation`, `travelBudget`, `medicalBudget`, `spendingChangeLater` |
| **Investments** | `investObjective`, `trackingLevel`, `investmentHoldings` |
| **Goals / household / debt / legacy** | `goals[]`, `monthlySavingsCapacity`, `hasPartner`/`partnerName`/`partnerEmail`, `dependentsCount`, `debtName`/`debtBalance`/`debtRate`/`debtPayment`, `legacyTarget` |

(~70 keys. Status of each — wired vs unused — is in the companion **data-review** doc.)

---

## Layer 2: store fields (live app data, beyond onboarding)

| Domain | Fields (all in SYNC_FIELDS unless noted) |
|---|---|
| Auth/onboarding | `user`*, `onboardingComplete`, `onboardingPaused`, `onboardingDraft`, `onboardingProfile`, `employmentStatus`*, `selectedGoals` |
| Money ledgers | `incomes`, `expenses`, `recurringIncomes`, `recurringExpenses`, `savings`, `investments` |
| Net worth | `assetAccounts` (positions/lots/cash), `liabilities`, `nwSeeded`, `nwSetupChoice`, `allocatedByMonth`, `monthlySnapshots` |
| Debt (legacy) | `debts`* (legacy; `liabilities` is canonical) |
| Goals/gamify | `goals`, `badges`, `xp`, `streak`, `lastCheckIn` |
| Retirement | `retirementPlan`, `retirementAssumptions`, `retirementScenarios`, `benchmarkReturns`, `estatePlan` |
| Market | `priceCache`*, `pricesFetchedAt`*, `transactions`* (ledger) |
| Settings | `currency`, `locale`, `displayMode`*, `fontScale`*, `budgetFrequency`, `payFrequency`, `monthlyBudgetTarget`, `hourlyRate`, `jobRiskLevel`, `emergencyMonths`, economic data* |

`*` = NOT in SYNC_FIELDS (device-local / ephemeral). See data-review for which of these matter.

---

## Layer 3: domain module map (inputs → output)

| Module | Reads (key `op` fields / store) | Produces |
|---|---|---|
| **income** | salary*, bonus, equity, rentals, se/inv/other, benefits/support/scholarships, ri_*, 401k, tax | `IncomeState` (gross/net annual, effective rate, **monthly grid**, employer match) |
| **budget** | `spendCats`, `monthlySpending`; income's gross+rate | `spendBuckets`, `spendByMonth`, `savingsByMonth`, `monthlyEssentials`, `emergencyTest`, surplus |
| **cashflow** | scholarships/loans (dated), spendCats, income fns | `cashflowYear` (12-mo running balance), `upcomingBills` (day-level "ask by") |
| **debt** | `liabilities` | payoff plan, DTI, loan amort, credit util, score band |
| **assets** | `assetAccounts` | total value, **nest egg** (earmarked), blended/actual return |
| **networth** | assets − debt | `net_worth` |
| **goals** | `goals`, capacity | progress, waterfall, sinking fund |
| **retirement** | profile age, assets nest egg, contributions, spend, ri_* | Monte-Carlo success %, projection, solve-retire-age |
| **decumulation** | assets earmarked split | withdrawal plan, order, depletion age, RMDs |
| **performance** | `assetAccounts` positions + `priceCache` | per-holding return vs benchmark, cap-gains, allocation, trend |
| **planning** | (pure; UI inputs) | education (529), insurance (DIME), Roth conversion |

### Cross-module dependency graph
```
income ──▶ budget ──▶ cashflow            (cashflow also imports income directly)
income ──▶ cashflow
assets ──▶ decumulation, alternatives, bonds, performance(types), transactions
performance ──▶ transactions(types)
profile/income/assets/debt/networth/budget/goals/retirement ──▶ snapshot (orchestrator)
planning, insights, completeness ── standalone (no domain deps)
_shared (num, ids, firestore, eventBus) ── used by all
```

---

## Layer 3→4: who renders what

| Screen | Domain read-models used |
|---|---|
| Home | snapshot, income grid, budget, insights, completeness, monthlySnapshots |
| Net Worth (analytics) | assets, debt, networth, budget (runway) |
| Budget | budget (vs-actual), transactions ledger |
| Retire | retirement, decumulation, assets |
| Goals & Debt | goals, debt (DTI/payoff), planning (credit/college/insurance/estate/Roth) |
| Performance | performance (+ priceCache) |
| Bill calendar | cashflow (`cashflowYear`, `upcomingBills`) |
| Stress test | budget (`emergencyTest`) |

This is the intended wiring. The **data-review** doc lists where it's not fully connected.
