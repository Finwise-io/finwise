# FinWise — Savings / Investments / Debt taxonomy analysis
### 2026-06-21 · the concern: unclear definitions → wrong term or formula → misleading numbers

## The concern (restated)
The money "objects" — **savings, investments** (and their sub‑types: stocks, ETFs, bonds, 401(k), …)
and **debt** — may not have crisp, mutually‑exclusive definitions. So the same balance can be counted
as "savings" on one screen and "investment" on another, or a 401(k)/bond/annuity gets the wrong
formula. This maps every term, where it's defined, where it's used, its formula, and the resulting
risk. **Verdict: the concern is valid** — there are three overlapping classification axes and several
overloaded words.

---

## 1. The structural root: every asset carries THREE classification axes

Each `AssetAccount` (`src/domain/assets/index.ts`) is tagged on three independent axes that don't line
up one‑to‑one:

| Axis | Field | Values | Purpose |
|---|---|---|---|
| **Instrument** | `kind` | checking, savings, brokerage, stocks_etf, fixed_income, private_equity, hedge_funds, commodities, crypto, annuities, college_529, 401k, trad_ira, roth_ira, hsa, home, vehicle, other_asset | what it *is* + benchmark return |
| **Tax treatment** | `tax_bucket` | CASH, PRE_TAX, ROTH, TAXABLE, PROPERTY | how it's taxed at withdrawal |
| **UI grouping** | `section` | Cash, Investments, Retirement, Property | how it's shown on Net Worth |

Plus two **off‑axis flags** that override the above:
- `maturity_date` / `face_value` / `coupon_rate` → the account is an **individual bond** (`isBond`,
  `src/domain/bonds/index.ts:10`) — detected by maturity date, *not* by `kind`.
- `retirement_pct` / `derive_balance` / `cash_balance` → earmarking + how the balance is computed.

Because `section` is derived from `kind` (via `ASSET_KINDS`), and `tax_bucket` is also derived from
`kind`, the mapping is fixed per kind — but the **conceptual words don't match the axes**, which is
where the confusion starts.

---

## 2. "Savings" — overloaded across FOUR unrelated meanings
This is the worst offender. "Savings" means four different things in the code:

| Meaning | What it is | Where | Formula |
|---|---|---|---|
| **A savings *account*** | `kind:'savings'` — a bank account | `ASSET_KINDS` → `tax_bucket:CASH`, `section:Cash` | a balance |
| **The "Cash" section total** | checking + savings balances | Net Worth "Cash" section | Σ balances where `tax_bucket==CASH` |
| **Cash‑flow "savings" (a FLOW)** | money left after spending | `projected_to_save`, `savingsByMonth`, `saveYr`/`totalSaveYr` (`domain/budget`, onboarding) | income − spend (± 401k/debt — see savings‑rate analysis) |
| **"Savings rate"** | a percentage | Net Worth tab + onboarding | (saved / income) — *itself* inconsistently defined |

So "your savings" can mean a bank balance, OR all your cash, OR last month's surplus, OR a rate.
A balance (stock) and a monthly flow are different *units* — conflating them is a real bug risk.

---

## 3. "Investments" — the section ≠ "investable" ≠ the nest egg
Three different asset totals exist, each a different subset, none labeled clearly:

| Total | Definition (code) | Includes | Excludes |
|---|---|---|---|
| **"Investments" section** | `section:'Investments'` | brokerage, stocks_etf, fixed_income, PE, hedge, commodities, crypto, annuities, **529**, other | cash, **401k/IRA/Roth**, property |
| **`investableValue()`** (`assets:90`) | everything except `PROPERTY` | cash + all investments + **all retirement** | only home/vehicle |
| **`retirementEarmarkedValue()`** (nest egg, `assets:108`) | Σ `earmarkedAmount` = balance × `retirement_pct` | retirement 100%, cash 50%, etc. | property, 529 |

**Risk:** "Investments" (the section, excludes 401k & cash) and "investable assets" (includes 401k &
cash) are different numbers that both read as "your investments." A user with a $300k 401(k) sees it
under **Retirement**, *not* **Investments** — yet `investableValue` counts it. (This is also the audit's
P0: InsightsScreen mixes an "investments" numerator that excludes cash with a denominator that
includes it.)

---

## 4. Sub‑type ambiguities (stocks/ETFs, bonds, 401k, 529, HSA, annuities)

- **Stocks / ETFs / positions.** `kind:'stocks_etf'` or `brokerage`; individual holdings are
  `Position` rows (ticker + lots) under an account. Performance is tracked via positions; an account's
  balance is derived from positions *only* if `derive_balance` is true, else positions are partial
  trackers that **don't** change the balance. **Risk:** a position‑tracked account vs a manual‑balance
  account compute value differently — easy to double‑count or under‑count if `derive_balance` is wrong.

- **Bonds — TWO representations.**
  1. **Individual bond** = an `AssetAccount` with `maturity_date`/`face_value`/`coupon_rate`
     (`isBond`). Coupon income (`couponIncomeAnnual`) and maturity metrics are computed only for these.
  2. **Bond fund / "Fixed income"** = `kind:'fixed_income'` (section Investments, benchmark 4.2%) — no
     coupon/maturity handling.
  **Risk:** the same economic thing (a bond) gets different formulas depending on which way it was
  entered; coupon income silently $0 for a bond entered as `fixed_income`.

- **401(k) / IRA / HSA.** `401k`,`trad_ira`,`hsa` → `PRE_TAX` + section **Retirement**; `roth_ira` →
  `ROTH` + Retirement. **HSA is health savings, shown under Retirement** — defensible (it's a stealth
  retirement account) but can mislead. 401(k) is an *investment* economically but lives in Retirement,
  not Investments (see §3).

- **529 (college).** `section:Investments`, `tax_bucket:TAXABLE`, **but** `earmarkDefault → 0` (not
  retirement) and `accountAllowsTicker → false`. So it's shown as an "Investment," excluded from the
  nest egg, and can't hold tickers — a special case that contradicts its section.

- **Annuities.** `kind:'annuities'` → section Investments (a balance), **but** annuity income also
  feeds `retirementIncomeMonthly` (guaranteed income). **Risk of double‑counting**: once as an
  investable balance, once as guaranteed income.

---

## 5. Debt taxonomy (the liability axis)
`Debt` (`src/domain/debt/index.ts`): `debt_type ∈ {MORTGAGE, CREDIT_CARD, STUDENT_LOAN, AUTO,
PERSONAL, OTHER}`, plus `remaining_balance`, `interest_rate_apr`, and **two** payment fields:
`minimum_monthly_payment` and `monthly_payment` (a user override).

- **Confirmed P0 (from the dedup audit):** `buildDebtState` computes debt service from
  `minimum_monthly_payment` only, while `requiredPayment()` respects the `monthly_payment` override —
  so debt‑service / DTI can disagree between Net Worth and Home/Goals/Budget.
- **Asset↔debt linkage:** a `MORTGAGE` (debt) pairs with a `home` (PROPERTY asset); net worth nets
  them, but they're independent objects with no enforced link — editing one doesn't reconcile the other.

---

## 6. The "asset total" trio — three different numbers people will read as one
| Term | = | Typical use |
|---|---|---|
| **Net worth** | all assets − all debts | the headline glance |
| **Investable assets** | all assets except property | retirement projections (draw‑down) |
| **Nest egg** (retirement‑earmarked) | Σ balance × `retirement_pct` | "will my money last" |

These are intentionally different, but if any screen labels one loosely as "your savings" or "your
investments," the user gets a misleading figure. The fix is **naming discipline**, not new math.

---

## 7. Prioritized risks (where wrong term/formula misleads the user)

| Pri | Risk | Why |
|---|---|---|
| **P0** | "Investments" (section) vs `investableValue` (incl. 401k+cash) read as the same | different numbers, same word — §3 (audit P0 already filed) |
| **P0** | Bond entered as `fixed_income` → coupon income silently $0 | §4 — same instrument, two formulas |
| **P0** | Annuity counted as investable balance **and** guaranteed income | §4 — double‑count inflates plan |
| **P1** | "Savings" = account vs cash‑flow surplus vs rate (balance vs flow vs %) | §2 — unit confusion |
| **P1** | `derive_balance` wrong → position value double/under‑counts account balance | §4 |
| **P1** | Debt service: `minimum_monthly_payment` vs `monthly_payment` override | §5 (audit P0) |
| **P2** | 529 shown under "Investments" but excluded from nest egg & tickers | §4 — surprising but documented |
| **P2** | HSA shown under "Retirement" | §4 — defensible, label clearly |

---

## 8. Recommended direction (for a future fix pass)
1. **One classifier, one vocabulary.** A single helper that, given an account, returns its canonical
   `{ assetClass, taxBucket, isBond, isInvestable, isRetirement }` — every screen reads from it instead
   of re‑deriving from `kind`/`tax_bucket`/`maturity_date` ad‑hoc.
2. **Name the totals distinctly and consistently** everywhere: **Net worth** vs **Investable assets**
   vs **Retirement nest egg** vs **Cash** — never just "savings"/"investments" for a total.
3. **Separate the flow word from the balance word:** call income−spend **"monthly surplus"** (or
   "money saved this month"), reserve **"Savings"** for cash accounts.
4. **Resolve the double‑counts:** decide annuity = income OR balance (not both); make "bond" one
   concept (detect by instrument, compute coupon for all bonds).
5. **Agreement tests** (per the dedup playbook §5): assert "Investments section total", "investable",
   and "nest egg" each equal their one canonical selector across every screen; assert coupon income is
   non‑zero for any account with a maturity date regardless of `kind`.

This is analysis only — no code changed. It complements `docs/finwise-dedup-audit.md` (concept
duplication) and `docs/finwise-robustness-assessment.md` (why these recur). The asset/liability
**taxonomy** is the next layer to make canonical after spend (done) and savings‑rate (in progress).
