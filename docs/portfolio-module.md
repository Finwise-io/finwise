# FinWise — Portfolio Module (design)

> Goal: one robust, build-once model for investments that handles real-life money movement,
> flows seamlessly to Income / Retirement / Net Worth, and is fully auditable (you can always
> see what you entered and when). Three management *surfaces* — Stock/ETF, Bond, Other — over
> one shared engine.

## 1. Core model

**Account** (extends today's `AssetAccount`)
- `type`: `CHECKING | SAVINGS` (cash) · `BROKERAGE_TAXABLE | IRA | ROTH | 401K | HSA | 529` (investment) · `HOME | VEHICLE` (property)
- `cash_balance`: uninvested cash held in the account (a brokerage is **not** 100% invested)
- `positions[]`: holdings (investment accounts only)
- **Account value** = `cash_balance + Σ(position market value)` (investment) · `balance` (cash/property)
- **Instrument eligibility** per type: `BROKERAGE_TAXABLE/IRA/ROTH/401K/HSA` → stocks/ETFs/bonds/funds; `529` → 529 portfolios only (no single stocks); `CHECKING/SAVINGS` → cash only. *(Fixes the "AMZN into a 529" bug.)*

**Position** = `ticker` + `lots[]` (shares, cost/share, purchase date) + `assetClass: 'stock_etf' | 'bond' | 'other'` (routes to the 3 services). Bonds also carry `coupon`, `maturity`, `faceValue`; "other" is flexible (units, NAV).

**Transaction** (append-only ledger — the source of truth for *history*)
`{ id, date, type, account_id, counter_account_id?, ticker?/position_id?, shares?, price?, amount?, note }`
Types: `OPENING_POSITION · OPENING_CASH · BUY · SELL · DEPOSIT · WITHDRAWAL · TRANSFER · TRANSFER_IN_KIND · DIVIDEND · INTEREST · COUPON · FEE`

**State strategy (hybrid, recommended):** keep live `cash_balance` + `positions/lots` as the displayed state for fast reads, AND append an immutable transaction for every change for audit/history. (Not full event-sourcing — simpler, robust, and we can still reconcile state from the ledger later.)

## 2. Scenarios → transactions

| Scenario | Transaction(s) |
|---|---|
| Add holding you already own (first capture) | `OPENING_POSITION` (+ `OPENING_CASH` for starting cash) |
| Move cash / securities between accounts | `TRANSFER` / `TRANSFER_IN_KIND` |
| Use account cash to buy | `BUY` (cash ↓, position ↑) |
| Use savings to buy | `TRANSFER` (savings→brokerage) → `BUY` |
| Sell and spend / move | `SELL` (position ↓, cash ↑) → `WITHDRAWAL` / `TRANSFER` |
| Dividend / interest / coupon | `DIVIDEND`/`INTEREST`/`COUPON` → cash ↑ **or** reinvest (adds shares/cost basis) |
| Paycheck / external contribution | `DEPOSIT` |
| Fees / expense ratios (optional) | `FEE` |

## 3. Flows to other modules (single source of truth, no duplication)
- **Net Worth** ← account value (cash + positions) − debts.
- **Retirement nest egg** ← earmarked portion of account value (existing earmark %).
- **Income** ← `DIVIDEND/INTEREST/COUPON` transactions (cash = spendable income; reinvested = not income, grows position).
- **Performance** ← positions + adjusted-close prices (total return) vs same-period benchmark (built).
- **Prices** drive value live → NW + nest egg move with the market (built; add refresh-on-open).

## 4. The three services (surfaces over one engine)
- **Stock / ETF management** — shares, cost basis, dividends, total-return vs benchmark. *(mostly built)*
- **Bond management** — coupon, maturity, face value, purchase price/yield; coupon income; price/yield view.
- **Other investments** — crypto (units), private equity (commitment/NAV), commodities, REITs, annuities.

## 5. Auditability
- Per-account **transaction history** (immutable, timestamped) — "what did I enter and when."
- Global **activity log** across accounts.
- Every input viewable + editable; corrections are new transactions (or edits with an edit trail).

## 6. Phasing (shippable increments)
- **Phase A — foundation (do first):** cash sleeve on investment accounts; transaction ledger + core types (`OPENING/BUY/SELL/DEPOSIT/WITHDRAWAL/TRANSFER/DIVIDEND`); instrument-eligibility (529 fix); per-account history view; Stock/ETF service runs on it; flows to NW/Retire/Income verified.
- **Phase B:** Bond management service (coupon/maturity/yield + coupon income).
- **Phase C:** Other-investments service (crypto/PE/commodities/REIT/annuity).
- **Later:** fees/expense-ratio drag; corporate actions; rebalance helper.

## 7. Open decisions
- Hybrid state+ledger (recommended) vs full event-sourcing.
- How granular the first-capture flow is (one "opening" snapshot vs requiring lots per holding).
- Whether "buy funded from savings" is one combined action or transfer-then-buy.
