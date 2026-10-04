# Note back to Claude Code — every return is a time-weighted return

MoneyKeel · calculation audit · from the networth 01 review · 2026-10-04

## The owner's decision

**Every return the app shows is a time-weighted return (TWR).** Not a Modified Dietz return, not a money-weighted return, and not a change in balance.

- Said by: owner, 2026-10-04, in his words: "All return should be True Weighted Return and not Dietz return."
- Settled. Record it as an owner decision with the next DEC number, and quote it on every card it touches.

## What TWR means here — the formula in words

1. Split the period at every deposit, withdrawal or transfer into or out of the money being measured.
2. For each piece, growth factor = value just before the next flow ÷ value just after the previous flow.
   - The first piece starts from the value on the start day.
   - The last piece ends at the value on the end day.
3. Multiply the factors together and subtract 1.

In symbols: TWR = (V₁⁻ ÷ V₀) × (V₂⁻ ÷ (V₁⁻ + F₁)) × … × (V_end ÷ (V_n⁻ + F_n)) − 1.
- Vₖ⁻ is the value just before flow k.
- Fₖ is the flow: plus for money in, minus for money out.

Keep full precision until the end, and hold the result as a share (0…1), per Q49 and DEC-0264.

## When it must refuse

- **The start day is not recorded**: no figure. This is the existing rule on MK-NW-M-002, unchanged.
- **A flow is recorded but the value just before it is not**: no figure.
  - That piece cannot be measured, and back-solving it would be inventing a number.
  - The screen says the return cannot be measured across that deposit or withdrawal.
- **A piece starts at zero**: no figure. You cannot divide by nothing.
  - Example: the account was empty until the first deposit. In that case the period starts at the first deposit instead.

Do **not** fall back to Modified Dietz or to the balance change when a value is missing. "No answer" is the honest answer.

## What needs doing

1. **Find every return in the code.**
   - Any figure labelled return, gain %, change %, or performance.
   - Any yearly rate built from one of those.
   - Check what each actually computes.
   - Known so far: `theNetWorth.investableChangePct` (MK-NW-O-003 → MK-NW-M-002, "Return on cash + investments"). Today it is a change in balance, so a deposit is reported as if it were earned.
2. **Check the data is there.** TWR needs the value on the date of every flow.
   - Confirm the daily record stores a value on each deposit or withdrawal date.
   - Confirm that value can be read as before the flow.
   - If the record holds only the after-flow value, say so — that changes the formula.
3. **Flows must be identifiable.** Each record must say whether it is:
   - money moving in or out (a flow), or
   - money earned inside (dividends, interest, price change — not a flow).
   - A dividend reinvested in the account is not a flow.
4. **Keep the labels honest.** "Return on cost" on a single holding (MK-NW-O-006: gain ÷ total paid) is a different thing — it answers "am I ahead on what I paid".
   - Either keep that label and make sure it never says "return" alone, or ask the owner whether it falls under this decision too.
5. **Any yearly figure made from a TWR:**
   - Annualise only for a period longer than one year: (1 + TWR)^(365 ÷ days) − 1.
   - For a period of one year or less, show the period return, not a yearly rate.

## The test case it changes (batch networth 01, MK-NW-O-003)

Comparing from 2025-10-04, exactly one year:
- $200,000 on 2025-10-04
- $212,400 on 2026-04-15, just before a $60,000 deposit that day
- $284,630 on 2026-10-04

Working:
- First piece: 212,400 ÷ 200,000 = 1.062000
- After the deposit: 212,400 + 60,000 = 272,400
- Second piece: 284,630 ÷ 272,400 = 1.0448972
- TWR = 1.062000 × 1.0448972 − 1 = 0.1096808, shown as **10.97%**

What the formula gives today: 284,630 ÷ 200,000 − 1 = **42.32%**.

The case is in `moneykeel_networth01_claude.json` with both values.

## For the next briefs

Add one line to the "Job 1 — check the formula" judging order, under owner rules:

> Every return is a time-weighted return (owner, 2026-10-04). A return made any other way is `WRONG`.
