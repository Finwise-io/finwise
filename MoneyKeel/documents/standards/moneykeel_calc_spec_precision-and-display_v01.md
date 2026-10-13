# Precision and display — how numbers are held and how they are shown

**Founder ruling, master question Q49, 2026-09-09.** Supersedes the Reference-tab line of 2026-08-22 ("held as a float, decimals shown only for prices…") and the decimal-library reading of the 2026-08-20 brief's Q-56. Enforced by a guard test on every build.

## The rule, in one sentence

Every calculation runs at full precision and nothing is rounded inside a function; rounding happens once, at display, and the display precision is two decimals unless a figure's row states otherwise.

## Calculation — full precision

- No function in the calculation code rounds its answer or an intermediate value. The 244 cents roundings and the 18 four-decimal roundings that used to sit inside `src/domain`, `MoneyKeel/functions` and `Calculation Module code/engines` were removed in one pass on 2026-09-09, together with ten whole-dollar roundings on money values (the gross found from a net, the Social Security amount at a claim age, the projected pot, the mortgage-versus-treasury totals, the 401(k) room, the goal averages).
- The odds are exact, with no rounding (founder, 2026-09-14: "use exact everywhere no rounding for odds" — replaces decision B6's nearest 5). 1,000 simulated futures give them to a tenth: 87.2%.
- A rounding that IS the rule stays, and is stated on the row: the "if rates move" band to the nearest $1,000, a count of months or years, a percent shown as an integer on a progress bar, an index into a sorted list.
- Numbers are JavaScript floats carried at full precision. The exact-arithmetic functions written for the 2026-08-20 brief's track 0 (`Calculation Module code/engines/decimal.ts`, fixed point over integers) exists and is used by nothing; it stays on disk until the founder decides whether the institution-download reconciliation should run on it. Nothing in the app depends on it.

## Display — round once, at the edge

| What is shown | Precision | Formatter |
|---|---|---|
| Totals, balances, projections, the odds' dollar sentences | whole dollars | `money`, `maskedMoney` |
| Prices, rates, expenses, per-share figures, cents-precise rows on holding detail | two decimals | `money2`, `maskedMoney2`, `maskedPrice` |
| Coin quantities | eight decimals, trailing zeros trimmed | `coinQuantity` |
| Yields and returns | a percent to two decimals | the screen's `pct` helpers |
| Anything else | stated on the figure's row in the master ("What comes out — unit and rounding") | — |

The three-decimal price formatter (`maskedPrice3`, for sub-$2 prices) was retired on 2026-09-09: it was my exception, not a stated one.

## A return over a window longer than one year

**Founder ruling, 2026-09-25.** A return for a window **longer than a year** is shown as a **yearly
rate**, and the screen says so in words — "a year" under the figure, and the window's own total
beside it: *"+15.10% over the two years, which is +7.30% a year."* A window of **a year or less** is
the window's own return, never annualised.

Why both, and why labelled:
- The convention was checked before it was written. The **GIPS standards** forbid annualising a
  period under one year and annualise periods above it; **brokerage statements** do the same;
  **Fidelity's own help page** warns that annualised returns of different periods may be compared
  but cumulative ones may not — a cumulative 2Y sitting beside a 1Y invites a false reading.
- A person does not read conventions. Stating both, with the words on them, means nobody has to
  know one: the yearly rate is comparable, and the total is what actually happened to their money.

Where it applies: every **fixed** window longer than a year — on Performance today, that is 2Y. The
control says so under itself, in the drawing’s words: `2Y is shown per year, so it sits fairly beside 1Y`.

**"Since" is not one of them (applied 2026-10-03, from the approved drawing).** Performance v17, phone
3, draws a record 26 months long as `Since Jun 3, 2024 +16.24%` with the words `Return is for the
window you picked (Jun 3, 2024 → Aug 4, 2026) — not a yearly rate`. "Since" answers how much the money has made since the records began, so it shows that window's own total and names both of its dates.
The code had been turning it into a yearly rate whenever the record passed a year. To reverse: drop
`wholeRecord` from the calls to `thePerformance` and "Since" becomes a yearly rate again.

Where a window's return is refused and the exact rate stands in its place (Q52), that figure is a
yearly rate by its nature and carries "/year" whatever the window's length.


## A window that reaches back whole months

1M, 3M, 6M, 1Y and 2Y start on the same day of the earlier month, or on that month's last day when the
day does not exist there (his approval, 2026-10-10, DEC-3768b): one month before 31 March is 28 February
(29 February in a leap year); a year before 29 February is 28 February. Before, the missing day rolled
into the next month, so 1M from 31 March started 3 March — a 28-day window. One rule in both places that
open a window: MK-NW-F-090 windowStartKey and MK-PF-F-008 startDateFor, held by
src/domain/performance/start_date_month_end.test.ts.

## Every return is a time-weighted return

**Owner decision, 2026-10-04 (DEC-1669):** *"All return should be True Weighted Return and not Dietz
return."* Not a Modified Dietz return, not a money-weighted return, and not a change in balance.

How it is worked out:
1. Split the period at every deposit, withdrawal or transfer into or out of the money being measured.
2. For each piece: the value just before the next money movement ÷ the value just after the last one.
   The first piece starts from the value on the start day; the last ends at the value on the end day.
3. Multiply the pieces together and take 1 off.

When it shows no figure, and never another method in its place:
- the start day is not recorded;
- money moved and the value just before it was not recorded;
- a piece starts at nothing — the period then starts at the first deposit.

A yearly rate is made only for a period longer than a year — (1 + the return)^(365 ÷ days) − 1 — and
the section above still decides how it is shown. "Return on cost" on one holding answers a different
question (am I ahead on what I paid) and keeps that name; it is never called "return" alone.

What the app's record holds, and the four rules that follow from it:
- **One value a day per account, taken after that day's money moved.** Since DEC-4439 (below) the
  value just before a movement is the previous evening's value. Money that moved on a day with no
  recorded value cannot be measured across: no figure.
- **An account that joins the record inside the period counts as money in**, at its first recorded
  value. Nothing it was already worth is earned.
- **A recorded day that is missing an account is not used.** A typed balance or a cash balance has no
  price, so its last recorded value stands until the next one.
- **Cash earns only interest.** Any other change in a cash balance is money moving, counted on the day
  the record first shows it. A paycheck arriving is not a return.

Shares moved in or out of the measured accounts: the record does not say what they were worth that
day, so there is no figure across that day.

### Money that moves on a day counts for that whole day (DEC-4439)

**Owner decision, 2026-10-11 (DEC-4439):** *"approved."* Money that arrives on a day is counted as
there for that whole day; money taken out is counted as gone for that whole day. Each recorded day is
one link:

> that day's growth = the evening value ÷ (the previous evening's value + money added that day − money taken out that day) − 1

His three examples, held by `Calculation Module code/engines/__tests__/time-weighted-return.test.ts`:

| Example | The day's link | Return that day |
|---|---|---|
| A new account opened with a $10,000 deposit, worth $10,050 that evening | 10,050 ÷ (0 + 10,000) − 1 | +0.50% (+$50) |
| The same, worth $9,800 that evening | 9,800 ÷ (0 + 10,000) − 1 | −2.00% (−$200) |
| Vanguard worth $50,000 the evening before, $10,000 added that morning, $60,300 that evening | 60,300 ÷ (50,000 + 10,000) − 1 | +0.50% (it read +0.60%) |

Before: the money counted as arriving at the end of the day, so a first deposit into a new account
could not be measured at all and a value below the money just added was refused. Both are now measured.
"The previous evening" is the latest recorded day before it. Every kind of money moving — a deposit, a
withdrawal, a transfer, an account joining or leaving the record, a change in a cash balance — is placed
the same way, so the same money gives the same return whichever account it lands in. Still no figure
when the previous evening's value + money added − money taken out is zero or less while that evening
holds a value (nothing to grow from); every other refusal above stands.

**Status on 2026-10-04: BUILT AND TESTED.** One function works out every return
(`Calculation Module code/engines/time-weighted-return.ts`). MK-NW-O-008 thePerformance (Performance,
each account's page, Home) and MK-NW-O-003 theNetWorth (return on cash + investments) both ask it. The
Modified Dietz function, the money-weighted rate and the balance change were removed from the code the
same day; `src/__tests__/guard_every_return_is_time_weighted.test.ts` fails the build if one comes back.
Source of the decision: `MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_note_to_claude_code_TWR.md`.


## His Performance decisions of 2026-10-12

**His words:** *"1, 2 - approved."* and *"3,4, 8-approved."* Items 6 and 7 were rules he had already made (*"we made the rule in last session while working on NW"*).

- **A window name the app does not have gives no figure (DEC-4640).** The screens offer Since, 1M, This year, 1Y and 2Y. If anything is handed another name (for example "5Y"), no window opens and no figure shows — never a guessed start. One table of window names (`WINDOW_MONTHS`) is read by MK-PF-F-008 startDateFor and MK-NW-F-090 windowStartKey, which now asks startDateFor. Before: "5Y" read as twelve months back in one and as today in the other. "Since" has no fixed length, so its first day — the record's — is handed over by the screen; it used to be read as today, so a holding's "Since" figure was one day's move.
- **A holding whose prices begin after the window opens is measured from its first price, and says so (DEC-4641).** Wherever that holding's window figure appears, its line reads: "Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year." One function writes it (MK-PF-F-045 priceHistoryShortSentence); the Holding page and each holding row of the Account page ask it.
- **Six unused functions are removed (DEC-4642):** avgCost (the Holding page's average is MK-NW-O-006 theHolding), attribution, allocation, portfolioTrend (the graph is drawn from the saved daily values), portfolioPeriodReturn (the return is MK-NW-O-008 thePerformance), periodDollarDelta (the dollars are wealth generated). Their six numbers are retired, each with its reason, in `Calculation Module code/scripts/moneykeel_function_register.json`.
- **A sale bigger than the purchases on record is counted once (DEC-4643).** A linked broker sends about two years of activity. Bought 10 at $50, sold 15 at $70: one sale, a gain of 10 × ($70 − $50) = $200 on the matched shares, and the line "$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record." (MK-PF-F-028, MK-PF-F-046). A sale typed by hand cannot sell more than is owned.
- **A holding's return includes its dividends once (DEC-4644 — his existing rule).** The price feed gives dividend-adjusted closes, so a holding's return already carries its dividends. Where the beginning is worked back from each holding's return, the dividends are not taken off again: 1,000 shares $100 → $105 paying $1,200, adjusted return 105 ÷ 98.80 − 1 = 6.28% → beginning $100,000; taking the dividend off again would read $98,800. The walk adds up: dividends + change in investment value = wealth generated.
- **Where the beginning is worked back, Return is the return of the holdings with a price history (DEC-5068, 2026-10-13 — replaces part 2 of DEC-3656).** His words: *"Wealth Generated and Return should be calculated and displayed for every asset with history. Below it display "Wealth Generated and Return does not include treasury gains as no price history available.""* Each holding's start = value now ÷ (1 + its own return over the window); Return = Σ values now ÷ Σ starts − 1, at full precision, rounded once to two decimals at display. A holding with no history adds no gain and is left out of Return, and the sentence below names it: "Wealth generated and Return do not include Treasury 2031's gains, as it has no price history." $50,000 = VTI $40,000 (+10%) + Treasury 2031 $10,000 → Wealth generated $3,636, Return +10.00%. Full rule: the classed-and-counted standard, "Performance and a window the record cannot reach".
- **The market figure includes dividends and interest (DEC-4645).** Corrected 2026-10-12: the market figure uses SPY and AGG adjusted closes, which include their dividends and interest. His Home line stays word for word: "you +3.69% (including dividends and interest) · market +2.83% · ahead by 0.85%". The 2026-09-30 records (DEC-0595, DEC-0640) that called it price only carry a dated correction.

Held by `src/domain/performance/start_date_month_end.test.ts`, `src/domain/performance/realized.test.ts`, `src/screens/__tests__/performance_decisions_2026_10_12.test.tsx`, `src/domain/gaps/gaps.test.ts` and the settled outside cases in `MoneyKeel/functions/networth-and-performance/outside_performance_claude_01.test.ts` … `_04.test.ts`.

## What this changes for the file

- The functions tab no longer carries "rounds the answer to …" lines except where a rounding is the rule.
- The master's Reference tab carries this rule as the standing decision on numbers.
- A figure whose display precision is not two decimals must say so on its row; the row is the exception list.

## Enforcement

`src/__tests__/precision_guard.test.ts` reads the calculation code and fails the build on any `round2(` call outside the formatter that defines it, and on the cents and four-decimal rounding idioms. A rounding that is the rule is written with a plain `Math.round` on a count, an index or a stated band, which the guard does not touch — and its row says so.

## What a money figure means — before or after tax

**His rulings, already made, in one place because they were not in any standard until now
(2026-09-26).** They lived only on the master's `rulings` tab, so a screen task that read the
standards and the workplan could not see them — and did not.

- **G6, 2026-09-08:** *"no built-in tax rates on the draw-order comparison; the person's own rates,
  or no number with the reason."*
- **G7, 2026-09-12:** *"no flat 22% inside the odds; every caller passes its own effective rate."*

What follows, and what a screen may therefore say:

| | |
|---|---|
| Every figure in the plan | **Before tax**, unless the person's own rate has been applied and the screen says where it came from |
| The one exception | The money the law forces out of pre-tax accounts from 73 — taxed at the person's own effective rate, clamped 10–60% (`rmd_tax_rate`) |
| With no rate to pass | **No tax at all**, and the row says so — never an invented rate |
| What a screen must never print | "after tax", "net of tax", or any figure implying a tax we did not compute from his own numbers |

Widening this — taxing ordinary withdrawals, or using the retirement year's rate rather than today's
— is a NEW question with numbers attached, not a re-asking of G6 or G7.

## Related standards

- `moneykeel_calc_spec_objectives-and-verification_v01.md` — "right" means the same maths gives the same answer; the display rule is part of what "same" means.
- `moneykeel_naming_spec_calculation-vocabulary_v01.md` — the words for what is shown.
