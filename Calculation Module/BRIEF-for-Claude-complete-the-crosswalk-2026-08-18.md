# Brief — complete the investment metrics crosswalk

**To:** Claude · **From:** MoneyKeel (Palak) · **Date:** 2026-08-18
**File:** `investment-api-performance-crosswalk.xlsx`

---

## What this file is, and why I am asking you

You built the first version of this — the metric matrix, the field crosswalk across FDX / Plaid /
Yodlee / OFX / MX / ISO 20022 / SnapTrade, the per-asset-class semantics, and the gaps list. It is
the clearest artifact we have on this subject, and it is now the **master reference** for how our
app computes every number.

I have extended it (columns **G–J** on the Metric Matrix, and 25 new cream-coloured rows) to map
your research onto our actual product. **Column J — "WHAT WE NEED to trust this number" — is the
work list.** Everything below is about finishing the parts I could not.

**Please keep your original rows and wording intact.** Where you disagree with something I added,
change it and say why in the row — I would rather have the correction than the politeness.

---

## Context you need about our product

**MoneyKeel** is a retirement-planning app for people aged 55–70 who are not finance
professionals. Every number has to be explainable to someone with no background. Screens in scope:
**Net worth**, **Performance**, **Account detail**, **Holding detail**, plus Look-back and Import.

**Connections:** SnapTrade today (E*TRADE, Vanguard live-verified). **Plaid for beta.**

**Recent real-world findings that shape this work** — all reproduced by running our code against a
real Vanguard activity file:

- The app reported **$1,064,493 of contributions and $424,818 of withdrawals on an account where
  nothing came in or out.** Cause: an unrecognised broker word falls through to a guess based on
  the sign of the amount. Vanguard's `Sweep out`, `Sweep in` and `Corp Action (Redemption)` are not
  in our table, so the same ~$220k of Treasury bills, rolled three times, booked its principal as
  new money on every roll.
- **Interest showed $2,387 against $1,193 actually received** — exactly double. A money-market
  dividend arrives as a *pair* (the credit, and the reinvestment debit that nets to zero). We store
  `Math.abs(amount)` at import, destroying the sign, so both legs add.
- **Beginning market value came out as −$448,028** against a statement's $378,022. A market value
  cannot be negative; it is back-solved rather than measured, so it inherits every ledger error.
- **Verified in FDX 6.3 and 6.4:** `maturityDate` appears only on the Loan entity, and `couponRate`
  appears zero times. A bond's maturity and coupon live in description text on **every** road.

---

## What I need you to do

### 1 · Fill the gaps in the Metric Matrix (columns A–F) for the 25 rows I added

I wrote our columns G–J for them, but several of my A–F entries are thinner than yours. In
particular I would value your judgement on **Inputs required** and **Notes / trap** for: net worth
trend series · one-account class split · capital-gains lot treatment · option position detail ·
portfolio vs benchmark trend.

### 2 · The question I most want answered: **the canonical transaction taxonomy**

Your Gaps tab says: *"Build a canonical transaction taxonomy with four axes: direction (in/out),
externality (external flow vs internal move), income vs principal, and realised vs unrealised."*

**Please build that taxonomy as a new tab.** This is the single highest-value thing in this brief —
it is the thing that would have prevented both the $1.4m and the $2,387.

For each canonical event, give: the four axis values · whether it affects contributions, withdrawals,
income, or nothing · and the source word for it in **FDX, Plaid Core Exchange, Plaid Investments,
Yodlee, OFX, MX and SnapTrade**, plus the literal strings we have seen from **Vanguard file exports**
(`Dividend`, `Reinvestment`, `Sweep out`, `Sweep in`, `Corp Action (Redemption)`, `Interest`, `Buy`,
`Fee`) and **E*TRADE** (`CONTRIBUTION`, `WITHDRAWAL`, `REDEMPTION`, `MISC`, `SERVICE FEE`,
`EXCHANGE RECEIVED IN`, `OPTIONEXPIRATION`, `OPTIONEXERCISE`).

Cover at minimum: external cash in/out · buy/sell · dividend cash · dividend reinvested · capital-gain
distribution (and reinvested) · interest · accrued interest at purchase · bond/CD maturity ·
return of capital · sweep in/out · internal journal · transfer in/out (cash and in-kind) · fees ·
tax withheld · margin interest · corporate actions (split, merger, spin-off, cash-in-lieu) ·
option exercise / expiry / assignment, **separating share-settled from cash-settled**.

**Include an explicit rule for what to do with a word that matches nothing.** Our answer is "record
it, show it, count it in no total" — tell me if you would do differently.

### 3 · A decision table for the three cost-basis definitions

Your Gaps tab names them (lot-with-fees / average-with-commission / derived-price×units) and says to
store a provenance tag. Please turn that into a table: which providers give which · what each is
worth for capital-gains reporting · and what a UI should say when it only holds the weakest one.

### 4 · Sanity-check my column J entries

Especially where I claim something needs **nothing**. If a metric I have marked BUILT is resting on
an assumption I have not noticed, that is the most useful thing you can tell me.

### 5 · Two specific questions

- **The snapshot store.** Your Gaps tab says to snapshot holdings and cash daily and treat that as
  the system of record. We currently store **one number per day for total net worth**, pruned at 400
  days. What is the minimum viable per-account daily record — fields, granularity, retention — to
  support BMV, Modified Dietz, and contribution-to-return?
- **Short-window honesty.** For a 55–70 audience, what should the app show when a period return is
  computable but *not meaningful* (a 10-day window, a holding bought mid-period)? We would rather
  show nothing than mislead, but "nothing" is its own kind of confusing.

---

## Conventions to keep

- **Plain English. No jargon.** Our audience is a retiree, not an analyst. If a term must be used,
  define it in the row.
- **Every claim carries its source** — a spec URL, or "verified against a real file".
- **Unknowns say UNKNOWN.** A guess that reads as fact is worse than a blank.
- Keep the existing tab structure and the `NOT PRESENT` / `DERIVED` / `PARTIAL` vocabulary.

---

## What good looks like

The Metric Matrix and the new taxonomy tab together should let an engineer who has never seen our
code write the ingest layer correctly — knowing, for every broker word, which canonical event it is,
which totals it touches, and which sign it carries. That is the artifact that ends the guesswork.
