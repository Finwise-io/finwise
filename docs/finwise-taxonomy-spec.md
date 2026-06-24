# FinWise — Canonical Money Taxonomy Spec
### 2026-06-22 · the agreed definitions, formulas, labels, and tests for every money concept

> Built term‑by‑term with the founder, each grounded in researched standards. This is the **single
> source of truth** the implementation follows. Replaces the ad‑hoc `kind`/`tax_bucket`/`section`
> tangle documented in `finwise-asset-taxonomy-analysis.md`.

---

## 0. The model — two orthogonal axes (Term #1)
Every account carries **two independent classifications** (never conflate them):

- **`assetClass`** = *what it is*: `cash | bonds | stocks_etf | alternatives | real_estate | personal_property`
- **`taxTreatment`** = *how it's taxed*: `taxable | tax_deferred | tax_free`

`real_estate` also carries **`use`**: `primary | rental | secondary | land`.
All "investable / nest‑egg / cash / investments" groupings are **derived** from these — not hand‑tagged.

### Canonical labels (one concept → one WORD, everywhere)
Naming consistency is part of the taxonomy, just like number consistency: the same class shows the same
user‑facing word on every surface. The single source is **`ASSET_CLASS_LABEL`** (`src/domain/assets`):

| class | label (standard finance term) |
|---|---|
| `cash` | Cash | `bonds` | Bonds | `stocks_etf` | Stocks / ETFs | `alternatives` | Alternatives |
| `real_estate` | **Real estate** (real property) |
| `personal_property` | **Personal property** (movable possessions — NOT the colloquial "belongings") |
| `mixed` | Unclassified |

The Net Worth donut and onboarding read these. The onboarding goal is **"Track my real estate & personal
property"** (was "property & belongings"). Guarded by `naming_consistency.test.ts`.

| Old (muddled) | New (canonical) |
|---|---|
| `kind` (mixed instrument+wrapper) | `assetClass` + `taxTreatment` (split) |
| `tax_bucket` incl. CASH/PROPERTY | `taxTreatment` (CASH→assetClass cash, PROPERTY→assetClass real_estate) |
| `section` (Cash/Investments/Retirement/Property) | derived from the two axes |

---

## 1. The asset totals (one canonical selector each)

| Term | Definition | Formula (by assetClass) | Caption shown to user |
|---|---|---|---|
| **Net worth** (#2) | everything you own − everything you owe (incl. primary home) | `totalAssets − totalDebt` | "All assets including your home, minus all debts." |
| **Cash** (#3) | liquid balance | Σ `assetClass=cash` (checking, savings, HYSA, money‑market, CDs, T‑bills) | "Checking, savings, money‑market, CDs, T‑bills." |
| **Investments / holdings** (#4,5,6) | what you're invested in (allocation) | Σ `assetClass ∈ {stocks_etf, bonds, alternatives}` **across all wrappers** | "Stocks/ETFs, bonds, and alternatives across all accounts (incl. 401(k)/IRA)." |
| **Investable assets** (#4) | liquid financial wealth | Σ `assetClass ∈ {cash, stocks_etf, bonds, alternatives}` (excl. real estate + personal property) | "Cash + investments + retirement accounts. Excludes home & personal property." |
| **Retirement nest egg** (#7) | the 4%‑rule withdrawal portfolio | retirement accounts + retirement‑earmarked stocks/bonds; **excl. emergency fund, primary home, rental, 529** | "Invested retirement money the 4% rule draws on. Excludes home, emergency cash, and rentals (those add income instead)." |

**Hierarchy:** `Cash ⊂ Investable assets ⊂ Net worth`; `Nest egg ⊂ Investable assets`.
Net worth includes the primary home; investable & nest egg do **not**.

---

## 2. Asset classes — definitions

- **Cash & cash equivalents** (#3): checking, savings, HYSA, money‑market, T‑bills, short CDs. *"Savings" is NOT a balance category — a savings account is just a cash instrument.* **Emergency fund** = a sized subset = **3–6 × monthly essentials**, held in cash; **0% earmarked to the nest egg** by default.
- **Stocks / ETFs (equities)** (#5): individual stocks + equity ETFs/index/mutual funds, across all wrappers. *"Brokerage" is a taxable account wrapper, not an asset class.* Employee stock options = **income (equity comp)** → become equities on exercise; traded options = **alternatives** (future).
- **Bonds / fixed income** (#6): individual bonds + bond funds/ETFs + Treasuries/munis/corporates. **Detected by `assetClass='bonds'`, not by maturity date.** Interest income computed for **every** holding (individual: `face × coupon`; fund: `value × yield`) — no silent $0.
- **Alternatives**: crypto, commodities, private equity, hedge funds, annuities (balance), traded options.
- **Real estate** (#8): `use ∈ {primary, rental, secondary, land}`. Always in net worth (equity = value − its linked mortgage); **never** in investable/nest egg. **Rental** → rent as income + keep‑vs‑sell toggle (below).
- **Personal property** (#8): vehicles, valuables. Net worth only.

---

## 3. Real estate / rentals (Term #8)
- **Mortgage links to its property** → per‑property equity = value − that mortgage.
- **Rental income**: net = rent − operating expenses. **Long‑term = static** (steady, dependable in retirement); **short‑term = dynamic** (seasonal/occupancy, higher expense ratio, risk‑adjusted — not a guaranteed floor).
- **Keep‑vs‑sell toggle** per property (never double‑count rent + equity):
  - **Keep for income** (default): rent → retirement income; equity in net worth, *not* drawn down.
  - **Plan to sell at age X**: net proceeds (equity − capital‑gains − depreciation‑recapture − costs) → investable portfolio at age X; rent stops then.

---

## 4. Retirement (Term #7)
- **Wrappers**: tax‑deferred = 401(k), Traditional IRA, HSA; tax‑free = Roth IRA/401(k).
- **Nest egg** = invested retirement portfolio (see §1). Excludes emergency fund, primary home, rental, 529.
- **Income added on top** (NOT in the nest egg / 4% draw): Social Security, pensions, annuities, **rental income**.

---

## 5. Debt & DTI (Term #9)
- **Types**: Mortgage, HELOC, Auto, Student loan, Credit card, Personal loan, Medical, Other. Type drives **secured/unsecured**, **housing‑vs‑all‑debt**, and **interest deductibility**.
- **Two named monthly‑debt numbers** (fixes the P0 — they're different concepts, not a bug to pick one):
  - **Minimum debt service** = Σ minimum payments → **DTI** + "required obligations."
  - **Actual debt payment** = Σ (override ≥ minimum) → **cash flow / leftover**.
- **Debt‑to‑Income ratio (DTI)** = monthly debt ÷ **gross** income. **Front‑end** ≤28% (housing/PITI: mortgage + HELOC + tax + insurance); **back‑end** ≤36% (all debt). Uses **minimum** payments.

---

## 6. Savings & savings rate (Term #10)
- **"Savings" is never a balance.** Balance = **Cash**; the per‑month flow = **Monthly savings** (`$/mo`); the percentage = **Savings rate** (`%`).
- **Monthly savings** = income − spend, **excluding debt payoff**.
- **Two savings rates** (numerator & denominator share a basis):
  - **Savings rate (cash)** — *primary*: `monthly savings ÷ take‑home`. Excludes 401(k) + debt. Benchmark **~20%** (50/30/20). **Same formula** for Actual (this‑month / 6‑mo) and Planned — fixes the Net‑Worth‑tab self‑contradiction.
  - **Total savings rate (with retirement)**: `(monthly savings + 401(k) + employer match) ÷ gross`. Benchmark **~15%** (Fidelity). Plan‑based ("estimated").
- Delete the dead `savings_rate_pct`.

> **Income‑base note:** DTI uses **gross** (lending standard); savings rate uses **take‑home** (50/30/20). Intentionally different — each labeled so it's not mistaken for an inconsistency.

---

## 7. Cross‑cutting rules
1. **One canonical selector per concept** (`totalAssets, totalDebt, cashTotal, equitiesTotal, fixedIncomeTotal, investableAssets, nestEgg, minimumDebtService, actualDebtPayment, savingsRateCash, savingsRateTotal`). Screens **read these**, never re‑derive inline.
2. **Caption rule:** every derived total displays an "includes…" caption (col. 4 of §1).
3. **Agreement tests** (per `finwise-dedup-audit.md` §5): for each concept, assert all surfaces equal its one selector across fixtures — incl. the edge cases (401(k) stocks counted in allocation; bond‑fund income ≠ $0; cash earmark 0%; rental equity in net worth but not nest egg; debt override respected in cash flow but not DTI; savings‑rate headline == 6‑mo avg).
4. **Verify on TestFlight**, not the simulator (ML Kit — see lessons L‑3).

---

## 8. Implementation sequencing (proposed — staged, one selector at a time)
1. Introduce `assetClass` + `taxTreatment` + `real_estate.use` on the account model; migrate `kind`/`tax_bucket` → derive both (back‑compat shim).
2. Canonical selectors + agreement tests (§7.1), screen‑by‑screen swap off inline math.
3. Bonds: income for all fixed income; debt: split min‑service vs actual; savings: two rates + delete dead value.
4. Real estate: `use`, mortgage linkage, rental income link, keep‑vs‑sell.
5. Captions everywhere; full suite green; TestFlight build to verify on device.

Each step is `tsc`‑clean + jest‑green + committed independently. No silent truncation; every screen's number traces to one selector.
