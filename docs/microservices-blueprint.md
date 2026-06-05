# FinWise — Modular Services Blueprint (v1)

_Adapts the backend spec (docs/RP-PD.pdf) to FinWise's actual stack. For sign-off, then build one module at a time._
_Decided 2026-06-02: modular-on-current-stack · accumulation only · Monte Carlo from the start._

---

## 1. Architecture: "microservices" as modules, not infrastructure
The spec describes Kafka microservices. We get the **same domain boundaries** with none of the ops cost by mapping each service to:

| Spec concept | FinWise implementation |
|---|---|
| A microservice | A **domain module** under `src/domain/<name>/` (pure TypeScript: types, calculations, Firestore repo) |
| Service database | A **Firestore collection** owned by that module (zero-duplication, shared keys) |
| Event broker (Kafka) | **In-app pub-sub** (a tiny event bus) now; **Firestore triggers / Cloud Functions** when server-side is needed |
| Heavy/secure compute (Monte Carlo, Plaid webhooks) | **Cloud Function** (added when needed; none today) |
| Output payload schema | The module's **public read-model type** (what the UI/other modules consume) |

Rule preserved from the spec: **each module owns its fields; others reference by id** (`user_id`, `entity_id`), never duplicate. The existing Zustand store becomes the **client cache / read-model**, hydrated from Firestore.

```
src/domain/
  profile/        income/        assets/        debt/
  networth/       budget/        goals/         retirement/
  _shared/        # ids, money types, the event bus, Firestore helpers
```
Each module: `types.ts` · `calc.ts` (pure, unit-tested) · `repo.ts` (Firestore) · `events.ts` · `index.ts` (public API).

## 2. The modules (8 + Profile), with v1 gap-fixes folded in
| # | Module | Owns | Key calculation | v1 note |
|---|---|---|---|---|
| 0 | **Profile** *(new)* | age, target retirement age, country, dependents, partner, **plan-to horizon** | — | NEW — fixes the orphaned-planning-params gap; where onboarding lands |
| 1 | **Income** | job inflows, rentals, tax config | gross→net, net rental, monthly grid | capture **employer match %/cap**; household/partner income |
| 2 | **Assets** | balances, tax bucket, returns | portfolio %, **value = prior + flows + returns** | FIX: apply returns, not just cash flows |
| 3 | **Debt** | liabilities, rates, amortization | aggregate debt, amortization tracker | toxic-debt flag (>7%) feeds Goals |
| 4 | **Goals** | priority routing (waterfall) | waterfall allocation, variance | needs Income's match + IRS limits to "max out" correctly |
| 5 | **Net Worth** | — (derived) | assets − debt | a **triggered derivation**, not a standing service |
| 6 | **Retirement** | planning run | **Monte Carlo → probability of success** + corpus/gap | accumulation only; **net Social Security/pension** out of corpus |
| 8 | **Budget** | transactions, category caps | **surplus runway**, burn rate | **authoritative source of truth for surplus** |
| 7 | Plaid enhance | — | live bank feed | **DEFERRED** to a later phase |

## 3. Surplus — one source of truth (fixes the triple-count gap)
```
Budget module computes monthly surplus  →  publishes SurplusCalculated
   → Goals consumes it (waterfall allocation)
   → Retirement consumes it (contribution capacity for the projection)
```
Income computes *net income*; Budget subtracts actual spending to get *surplus*; Goals/Retirement **never recompute it** — they read it.

## 4. Retirement: Monte Carlo from the start
- Simulate **many market-return paths** (e.g. 1,000) over years-to-horizon → **% chance of success** (the Boldin number), plus the median projection curve and funding gap.
- **Net guaranteed income** (expected Social Security + pension, from Profile/Income) out of the required spending each year — so users aren't falsely shown underfunded.
- **Where it runs:** start **client-side** (a few thousand paths in JS is acceptable on-device with a brief loading state) — no new infra. Escalate to a **Cloud Function** only if device performance is poor.
- Inputs: Profile (age, retire age, horizon), Assets (balances, target returns, tax bucket), Income (contributions, match, expected guaranteed income), Budget (surplus capacity).

## 5. Onboarding → module mapping (most inputs already captured)
| Onboarding field (already built) | Lands in |
|---|---|
| status, birth, targetRetirementAge, retLocation, dependents, partner | **Profile** |
| income, incomeFreq, whoEarns | **Income** |
| currentRetirementSavings, contributionsByType, employerContribution, investmentHoldings | **Assets** (+ match → Income) |
| debts | **Debt** |
| monthlySpending, flexBuckets, categoryBudgets, bills | **Budget** |
| goals, monthlySavingsCapacity | **Goals** |
| expectedRetirementSpending | **Retirement** inputs |

→ Building modules is largely **formalizing onboarding data into domain collections + calculations + dashboard**, not re-collecting.

## 6. Build sequence (dependency order) & per-module "done" definition
**Order:** Profile → Income → Assets → Debt → Net Worth → Budget → Goals → Retirement.
(Asset & Debt management ship early; Budgeting mid; Retirement last since it orchestrates all.)

A module is **done** when it has: typed schema + Firestore repo · pure calc with **unit tests** · onboarding-data wired in · published/consumed events · a **dashboard slice** rendering its read-model · matches the spec's output payload.

## 7. Scope & deferrals
- **In v1:** accumulation retirement, budgeting, debt, assets, net worth, goals waterfall, Monte Carlo, the gap-fixes in §2.
- **Deferred:** decumulation/retired-user drawdown; tax-aware withdrawal, capital gains, required minimum distributions; healthcare/long-term-care; salary-growth modeling; Plaid for assets/debt; multi-currency.

## 8. Security (must design in, not bolt on)
Financial PII in Firestore: per-user security rules (a user reads/writes only their own docs), no secrets in the client, Plaid (when added) tokens only server-side via Cloud Function. Revisit before any bank linking.

## 9. Review additions (2026-06-02)
**A. Help / Glossary module.** A searchable in-app reference defining every term and acronym used
(net worth, surplus, tax bucket, Roth, required minimum distribution, Monte Carlo / chance-of-success,
toxic debt, sequence-of-returns, etc.). A small "?" affordance on each screen deep-links to the relevant
definition. Owns a static `glossary` collection; no calculations.

**B. Default assumptions when the user doesn't provide them.** The Retirement/Simulation module must not
require the user to know inflation or expected returns. Defaults, **reusing the existing
`src/services/economicData.ts` feed** (already pulls BLS inflation + Treasury yields):
- **Inflation** → latest BLS CPI rate (fallback constant if feed unavailable).
- **Risk-free / conservative return baseline** → current **Treasury yield**; equity/portfolio return →
  the asset's target return, else a sensible long-run default.
- Every default is **shown to the user, labelled "assumption," and overridable.** Persist whether each
  value is `SYSTEM_DEFAULT` vs `USER_OVERRIDE` (mirrors the spec's tax-config flag pattern).

**C. UI guidelines (apply across all modules).**
- **Show the formula** for any *calculated* number in small print beside/under it (e.g. Net Worth =
  Assets − Debt; Surplus = Income − Fixed − Discretionary − Sinking). Builds trust + doubles as inline help.
- **Show "last updated" per section** (timestamp / "as of …") so users know how fresh each number is —
  the schemas already carry `last_updated`/`timestamp`; surface them.

**D. Naming — rename "surplus."** "Projected month-end surplus" reads as jargon. Use plain language:
**"Projected to save"** (or "Free to save this month"), with the formula in small print
(income − fixed − discretionary − sinking). It means: based on income and planned spending, what you're
on track to have left over to save this month.

**E. Auth & account (foundation, independent of the module sequence).**
- **Email verification on signup** — send a Firebase verification email (`sendEmailVerification`); gate
  full access on a verified address so we have a valid, reachable account tied to the right person.
- **Login screen:** add **Forgot password** (Firebase `sendPasswordResetEmail`).
  **Forgot User ID** — only meaningful if login uses a separate username; today login is the email itself.
  DECISION NEEDED: is the login identifier the email (then "Forgot password" suffices) or a distinct
  User ID (then we need an email-based User-ID recovery)? Defaulting to email unless told otherwise.
