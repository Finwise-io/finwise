# FinWise — "Tax file for your CPA" — proposal

Idea: a one-tap export (PDF + Excel) of income, expenses, and investments that a user hands to
their accountant at tax time. Below: what it really is, what we have vs need, a phased build, and
the honest risks.

## The honest framing (set expectations)
A CPA's return is built from **official documents** — W-2, 1099-INT/DIV/B, 1098 (mortgage),
1098-E (student-loan interest), 1098-T (tuition), K-1, SSA-1099, etc. Our self-entered numbers are
**estimates**, not source documents, and can't replace them. So the product is **not** "file your
taxes from FinWise." It's a **Tax Organizer**: a clean summary + checklist that (a) reminds the
user which income sources/accounts they have, (b) hands the CPA the things FinWise genuinely knows
better than a shoebox — especially **realized capital gains with cost basis** — and (c) lists the
documents to go collect. Framed that way it's high-value and low-liability.

## What we already have (tax-relevant)
- **Income by source** — wages (salary table), bonus, tips, self-employment, interest/dividends
  (estimate), rental net, retirement income (SS/pension/withdrawals/RMD), scholarships. (`income`)
- **Accounts** — brokerage / 401(k) / IRA / Roth / HSA / 529 / bank / property, with balances and
  **positions + cost-basis lots**. (`assetAccounts`, `performance`)
- **Realized gains** — sells in the transactions ledger → `capGains()` already splits long/short.
- **401(k) / HSA contributions** and IRS limits (`income/limits.ts`).
- **Debts** — mortgage, student loans (balances + rates) → interest is *derivable, not exact*.
- **Charitable / medical / property-tax** could come from `spendCats` if the user categorizes them.

## What's missing for a real tax file
- **Filing status, dependents-for-tax, state** — not captured (we have `dependentsCount`).
- **Actual 1099/W-2 figures** — we have estimates; the export should say "verify against your forms."
- **Deduction specifics** — charitable donations, deductible medical, property tax, mortgage-interest
  *paid* (vs balance), HSA contributions made — only partial via categories.
- **Itemize vs standard** logic — not modeled.
- The **transactions ledger isn't cloud-synced** (see data-review) — realized-gains export would be
  device-local until that's fixed.

## Phased build

**v1 — Tax Organizer PDF (low effort, high value, low risk)**
A clean one-pager the user prints/shares for their CPA:
- Income summary by source (this year), accounts list (type + institution + year-end balance),
  retirement contributions, and a **"documents to collect" checklist** (W-2, 1099s, 1098s, 1098-T/E…)
  auto-tailored to which sources/accounts they have.
- Tech: `expo-print` (HTML→PDF) + `expo-sharing`. ~1–2 days.

**v2 — Excel workbook (the part FinWise does better than paper)**
- Sheets: *Income by source*, *Realized gains* (per-lot: ticker, buy/sell dates, proceeds, basis,
  short/long, gain), *Deductible-candidate expenses* (from tiered `spendCats`), *Accounts & balances*.
- Tech: `xlsx` (already a dep) → write to `expo-file-system` → share. ~2–3 days. Requires syncing
  `transactions` first for cross-device correctness.

**v3 — Schedule-aware mapping (ambitious)**
- Map expense categories to Schedule A/C lines, estimate itemize-vs-standard, capture filing status.
  Bigger lift + more liability; only if there's demand.

## Format
- **PDF** = the human-readable organizer (CPA reads it).
- **Excel/CSV** = the line-item data (CPA imports it). Offer both.

## Risks / cons
- **Liability** — must be clearly labeled "summary/organizer, not a tax document; verify against
  official forms; not tax advice." Realized-gains numbers especially must match the broker 1099-B.
- **US-specific** — brackets/forms are US; gate by region.
- **Accuracy** — estimates vs actuals; the export should flag estimated lines.
- **Data dependencies** — realized gains need the (currently unsynced) transactions ledger; deduction
  detail needs more capture.

## Recommendation
Build **v1 (Tax Organizer PDF)** — it's cheap, ships the "give this to your CPA" moment, and is a
strong annual-retention hook, with minimal liability because it's explicitly an organizer. Add
**v2 Excel** once `transactions` is synced (so realized gains are reliable). Defer v3 unless users
ask. Before v2, capture **filing status + state** (small onboarding/settings addition) to make the
output materially more useful.
