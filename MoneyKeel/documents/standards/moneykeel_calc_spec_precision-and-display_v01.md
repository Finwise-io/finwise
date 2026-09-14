# Precision and display — how numbers are held and how they are shown

**Founder ruling, master question Q49, 2026-09-09.** Supersedes the Reference-tab line of 2026-08-22 ("held as a float, decimals shown only for prices…") and the decimal-library reading of the 2026-08-20 brief's Q-56. Enforced by a guard test on every build.

## The rule, in one sentence

Every calculation runs at full precision and nothing is rounded inside a function; rounding happens once, at display, and the display precision is two decimals unless a figure's row states otherwise.

## Calculation — full precision

- No function in the calculation code rounds its answer or an intermediate value. The 244 cents roundings and the 18 four-decimal roundings that used to sit inside `src/domain`, `MoneyKeel/functions` and `Calculation Module code/engines` were removed in one pass on 2026-09-09, together with ten whole-dollar roundings on money values (the gross found from a net, the Social Security amount at a claim age, the projected pot, the mortgage-versus-treasury totals, the 401(k) room, the goal averages).
- A rounding that IS the rule stays, and is stated on the row: the odds to the nearest 5 (founder decision B6), the "if rates move" band to the nearest $1,000, a count of months or years, a percent shown as an integer on a progress bar, an index into a sorted list.
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

## What this changes for the file

- The functions tab no longer carries "rounds the answer to …" lines except where a rounding is the rule.
- The master's Reference tab carries this rule as the standing decision on numbers.
- A figure whose display precision is not two decimals must say so on its row; the row is the exception list.

## Enforcement

`src/__tests__/precision_guard.test.ts` reads the calculation code and fails the build on any `round2(` call outside the formatter that defines it, and on the cents and four-decimal rounding idioms. A rounding that is the rule is written with a plain `Math.round` on a count, an index or a stated band, which the guard does not touch — and its row says so.

## Related standards

- `moneykeel_calc_spec_objectives-and-verification_v01.md` — "right" means the same maths gives the same answer; the display rule is part of what "same" means.
- `moneykeel_naming_spec_calculation-vocabulary_v01.md` — the words for what is shown.
