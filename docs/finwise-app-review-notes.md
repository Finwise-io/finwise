# FinWise — App Store Review Notes (paste into "Notes for the Reviewer")

_Launch-review item R-3. Copy the **Reviewer note** block into App Store Connect → Version → "Notes for
the Reviewer", and fill in the demo credentials (Phase 2.5.4)._

---

## Reviewer note (copy/paste)

> **What FinWise is:** an **informational and educational** personal‑finance planning and tracking app.
> Users enter their own numbers (income, spending, savings, debts, goals) and FinWise shows budgets,
> net worth, cash flow, and retirement projections.
>
> **What FinWise is NOT (so the financial-services rules don't apply):**
> - It does **not** move, hold, or transfer money. No payments, no transfers, no wallet.
> - It does **not** link to or aggregate bank/brokerage accounts. All data is entered manually or
>   imported from a CSV the user provides.
> - It does **not** recommend, buy, or sell specific securities, and it is **not** an investment
>   adviser. Figures are clearly labeled estimates, with a "not financial advice" disclaimer at every
>   projection. We are not a financial institution and require no financial license to operate.
>
> **Privacy:** financial data is end‑to‑end encrypted (the key is derived from the user's password +
> recovery code; we cannot read it) and is **never sent to any AI/LLM provider** — money tips and
> receipt scanning run on the device.
>
> **Demo account (please use this — the app requires login):**
> - Email: `__FILL_IN__`
> - Password: `__FILL_IN__`
> - It is pre‑loaded with sample data so you can review every screen.
>
> **Walkthrough tips:**
> 1. Sign in with the demo account above (skip "Create account").
> 2. If you create a new account instead: after tapping "Create account" you'll see a one‑time
>    **recovery code** screen — this is by design (zero‑knowledge encryption). Tap **"I've saved it"**
>    to continue; a few seconds of "Securing your account…" is the encryption running.
> 3. Explore via the bottom tabs + the **Menu** (top bar) → Net Worth, Retirement, Budget, Goals, etc.
> 4. Account deletion: **Settings → Delete account** (re‑asks the password, then erases cloud data).

---

## Pre‑submit checklist for these notes (🧑)
- [ ] Create a real demo account (email + password) on the **production** build and add sample data.
- [ ] Paste those credentials into the note above and into App Store Connect.
- [ ] Confirm the demo account loads without requiring the recovery code (normal sign‑in).
- [ ] Confirm **Delete account** works end‑to‑end on the production build (Phase 2.5.5).
- [ ] Privacy Policy + Support URLs are live and match the in‑app claims (B‑L1 re‑host).
