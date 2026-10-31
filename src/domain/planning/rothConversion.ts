/** ROTH CONVERSION — WHAT IT BUYS LATER, AND THE MONEY AS IT STANDS AFTER IT (2026-10-27, FX-PLAN).
 *
 *  His words that day on the screen (DEC-8890): "What it buys section does not make any sense. Design properly and make it clear …
 *  Current odds of your money "xxx" lasting till target age of yy is 35.3%. Moving $20K/year to Roth will increase nest egg to and
 *  increase odds to 35.9%." Drawing: MoneyKeel/documents/plan/moneykeel_pres_mock_roth-conversion_v02.html.
 *
 *  The screen asks; it works nothing out (guard D1). Two answers live here:
 *  - rothConversionLater: the pre-tax and Roth money before and after, the first required withdrawal before and after, the
 *    difference, and the converted amount grown to that withdrawal — each at full precision, rounded once when printed (Q49);
 *  - accountsAfterRothConversion: the accounts as they stand once the conversion is done — the amount out of the pre-tax accounts and
 *    into the Roth, the tax out of the first accounts with money in them — the second run of the odds stands on these. Until
 *    2026-10-27 the screen took out only the tax, so the odds missed that more of the money comes out tax-free (35.9% where the
 *    conversion gives 36.2% for the drawing's household).
 *  Every figure the screen prints from them is declared below (rule 11). */
import { rmdAtAge, rmdDivisorAtAge, rmdStartAgeFor } from '../decumulation';

export interface RothLater {
  preTaxAfter: number; rothAfter: number;
  /** the age the first required withdrawal is worked at, and its year */
  rmdAge: number; rmdYear: number;
  /** false once the person is at or past the starting age: nothing grows, this year's withdrawal is the one */
  grows: boolean; years: number;
  rmdBefore: number; rmdAfter: number; smaller: number;
  /** the amount converted, grown at the stated rate to the first withdrawal — what the pre-tax money no longer holds then */
  grown: number;
  divisor: number;
}

/** What a Roth conversion buys later: the pre-tax and Roth money before and after, the first required withdrawal before and after and the difference, and the amount converted grown to that withdrawal — each at full precision. */
/* ─ MK-PL-F-095 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rothConversionLater
 *
 * Answers ..... What a Roth conversion buys later: the pre-tax and Roth money before and after, the first required withdrawal before and after and the difference, and the amount converted grown to that withdrawal — each at full precision.
 *
 * Formula .....
 *     start = rmd start age for(age)
 *     rmd age = max(start, age (or start when missing))
 *     grows = age ≠ nothing and age < start
 *     years = start − (age as number)   if grows
 *     0   otherwise
 *     grow = (b: number) => (grows ? b × math.pow(1 + growth rate, years) : b)
 *     left pre tax = max(0, pre tax − amount)
 *     rmd before = rmd at age(grow(pre tax), rmd age)
 *     rmd after = rmd at age(grow(left pre tax), rmd age)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-095
 * Changed ..... not in git yet (—)
 */
export function rothConversionLater(a: { preTax: number; roth: number; amount: number; age: number | null; growthRate: number; nowYear: number }): RothLater {
  const start = rmdStartAgeFor(a.age);
  const rmdAge = Math.max(start, a.age ?? start);
  const grows = a.age != null && a.age < start;
  const years = grows ? start - (a.age as number) : 0;
  const grow = (b: number) => (grows ? b * Math.pow(1 + a.growthRate, years) : b);
  const leftPreTax = Math.max(0, a.preTax - a.amount);
  const rmdBefore = rmdAtAge(grow(a.preTax), rmdAge);
  const rmdAfter = rmdAtAge(grow(leftPreTax), rmdAge);
  return {
    preTaxAfter: leftPreTax, rothAfter: a.roth + a.amount,
    rmdAge, rmdYear: a.nowYear + Math.max(0, rmdAge - (a.age ?? rmdAge)),
    grows, years, rmdBefore, rmdAfter, smaller: Math.max(0, rmdBefore - rmdAfter),
    grown: grow(a.preTax) - grow(leftPreTax), divisor: rmdDivisorAtAge(rmdAge),
  };
}

/** The accounts once the conversion is done: the amount leaves the pre-tax accounts, in their order, and lands in the first Roth
 *  account (a Roth IRA row is added when there is none); then the tax leaves the first accounts with money in them, property left
 *  alone — the order the screen has always paid the tax in. */
/* ─ MK-PL-F-096 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountsAfterRothConversion
 *
 * Answers ..... The accounts once the conversion is done: the amount leaves the pre-tax accounts, in their order, and lands in the first Roth account (a Roth IRA row is added when there is none); then the tax leaves the first accounts with money in them, property left alone — the order the screen has always paid the tax in.
 *
 * Formula .....
 *     moving = max(0, amount)
 *     x   when moving ≤ 0 (or tax bucket ! = 'PRE_TAX' (or not ((balance ?? 0) > 0) when missing or zero) when missing or zero)
 *     out = min(balance as number, moving)
 *     the answer:
 *     ...x = ...x
 *     balance = (balance as number) − out
 *     arrived = max(0, amount) − moving
 *     at = moved.find index((x) => tax bucket = 'ROTH')
 *     owed = max(0, tax)
 *     x   when owed ≤ 0 (or not ((balance ?? 0) > 0) (or tax bucket = 'PROPERTY' when missing or zero) when missing or zero)
 *     out = min(balance as number, owed)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it uses 0.
 *     · Never lets amount fall below 0.
 *     · Never lets tax fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-096
 * Changed ..... not in git yet (—)
 */
export function accountsAfterRothConversion<T extends { tax_bucket?: string | null; balance?: number | null }>(accounts: T[], amount: number, tax: number): T[] {
  let moving = Math.max(0, amount);
  const moved = accounts.map((x) => {
    if (moving <= 0 || x.tax_bucket !== 'PRE_TAX' || !((x.balance ?? 0) > 0)) return x;
    const out = Math.min(x.balance as number, moving);
    moving -= out;
    return { ...x, balance: (x.balance as number) - out };
  });
  const arrived = Math.max(0, amount) - moving;
  const at = moved.findIndex((x) => x.tax_bucket === 'ROTH');
  const withRoth: T[] = at >= 0
    ? moved.map((x, i) => (i === at ? { ...x, balance: (x.balance ?? 0) + arrived } : x))
    : [...moved, { asset_id: 'roth-conversion', label: 'Roth IRA', kind: 'roth_ira', tax_bucket: 'ROTH', balance: arrived } as unknown as T];
  let owed = Math.max(0, tax);
  return withRoth.map((x) => {
    if (owed <= 0 || !((x.balance ?? 0) > 0) || x.tax_bucket === 'PROPERTY') return x;
    const out = Math.min(x.balance as number, owed);
    owed -= out;
    return { ...x, balance: (x.balance as number) - out };
  });
}

/** ROTH CONVERSION'S TWELVE FIGURES ARE NOT DECLARED (2026-10-31, PF-TOOLS; the lead's ruling the same day, as for the draw sheet
 *  and the mortgage card on 2026-10-26). A figure is declared through the orchestrator that hands it to the screen; no orchestrator
 *  hands these — RothScreen asks rothConversionCost (MK-PL-F-032), rothConversionLater and accountsAfterRothConversion itself, and
 *  the Plan doors wait on his Q-PL-5 (workplan #121). FX-PLAN declared them on 2026-10-27/30 under MK-PL-F-032, a function, which
 *  the master cannot print as a door. So their numbers stay reserved on the metric register for the ruling they serve, DEC-8890
 *  (his words of 2026-10-27 on the screen); RothScreen prints them, and guard_figures_declared counts those places at their true
 *  number; src/domain/planning/roth_worked_examples_2026_10_31.test.ts keeps the eleven worked examples that prove the numbers:
 *    MK-PL-M-008 the nest egg the odds run on
 *    MK-PL-M-022 the amount converted this year
 *    MK-PL-M-023 the tax on the conversion
 *    MK-PL-M-024 your pre-tax money
 *    MK-PL-M-038 your pre-tax money after converting
 *    MK-PL-M-039 your Roth money
 *    MK-PL-M-040 your Roth money after converting
 *    MK-PL-M-041 the first required withdrawal, as you are
 *    MK-PL-M-042 the first required withdrawal, after converting
 *    MK-PL-M-043 how much smaller each required withdrawal is
 *    MK-PL-M-044 the amount converted, grown to the first required withdrawal
 *    MK-PL-M-026 your nest egg at retirement
 *  MK-PL-M-045 (the middle future's nest egg) is retired: one nest egg, MK-PL-M-026. */
