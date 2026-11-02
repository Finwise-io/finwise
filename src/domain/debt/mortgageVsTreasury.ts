// SHOULD I PAY THE MORTGAGE DOWN FASTER? — founder ruling, 2026-08-14.
//
// "One critical factor is whether the current mortgage rate is higher or lower than the return on
// investment or the 10-year yield. If a person pays off the mortgage versus keeping money in a
// 10-year Treasury — what would be the net saving or cost?"
//
// WHY THE TREASURY AND NOT SHARES. Paying a mortgage down is a GUARANTEED return equal to the
// mortgage rate — every dollar of principal you retire is a dollar of interest you will never pay.
// So the fair comparison is against another guaranteed thing. Compare it to expected share returns
// and you are weighing a certainty against a hope, which is how people talk themselves into the
// wrong answer in both directions.
//
// THE ANSWER FLIPS, AND THAT IS THE POINT. Anyone still holding a 2021 loan at 3% is BELOW the
// yield, and for them paying down early COSTS money. "Pay off your mortgage" is the most repeated
// piece of advice this audience has ever been given, so a comparison that only ever supports paying
// down is not a comparison — it is that advice with a number bolted on.
//
// WE NEVER SAY WHAT TO DO. Both rates, the difference in dollars, stop. We are not advisers.

import { percentDigits, percentValue } from '../../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)

export interface MortgageComparison {
  /** the loan's own rate, as a percentage for display */
  mortgagePct: number;
  /** today's ten-year Treasury yield, as a percentage for display */
  treasuryPct: number;
  /** WHICH TREASURY RATE THE COMPARISON RUNS ON (2026-10-25, FIX-ROOM; the lead's ruling on MK-CF-F-043 under tenet 7 and
   *  DEC-0160's "net saving or cost"): after federal tax when the person's federal bracket is known, else before tax — and
   *  the card says which. Treasury interest is taxed federally and never by a state. */
  basis: 'after-tax' | 'before-tax';
  /** the Treasury yield after the person's federal bracket, as a percentage, full precision (4.30% at 24% → 3.268);
   *  null before tax */
  treasuryAfterTaxPct: number | null;
  /** the federal bracket used, as a percentage (24); null before tax */
  federalRatePct: number | null;
  /** mortgage rate minus the yield the comparison runs on, in percentage points; positive = paying down wins */
  gapPoints: number;
  /** what that gap is worth in a year at today's balance — the number a person can feel */
  annualDifference: number;
  /** over the life of the loan, how much better (positive) or worse (negative) off paying the
   *  extra leaves them versus putting the same money into Treasuries */
  lifetimeDifference: number;
  /** why there is no lifetime figure, when there is none: no extra a month, or a payment that never clears the loan
   *  (2026-10-25, FIX-ROOM, MK-CF-F-125: the card says the second in words instead of dropping the line silently) */
  noLifetimeBecause: 'no-extra' | 'never-clears' | null;
  /** the extra a month the comparison ran on, as handed in — the card names it (2026-10-26, PF-TOOLS) */
  extraMonthly: number;
  /** WHAT EACH ROUTE COMES TO at the later payoff date, both paying out payment + extra every month (2026-10-26, PF-TOOLS): the
   *  lifetime difference is the first less the second. The Plan brief's table prints both; the brief guard recomputes them from
   *  here (BRIEFS ARE CODE). Nothing when there is no lifetime figure. */
  routes: { payingDown: number; treasuries: number } | null;
  /** true when the two rates are close enough that neither choice is clearly better */
  tooCloseToCall: boolean;
  /** which way it points — the copy branches on this, never on the sign of a number */
  direction: 'paying-down-wins' | 'treasuries-win' | 'too-close';
}

/** Within a quarter-point, we do not pick a winner. A dollar figure implying precision we do not
 *  have is worse than no dollar figure — rates move, and so does the answer. */
export const TOO_CLOSE_POINTS = 0.25;

/** Months to clear a balance at a given payment, and the total interest paid getting there. */
/* ─ MK-CF-F-125 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * amortise
 *
 * Answers ..... Months to clear a balance at a given payment, and the total interest paid getting there.
 *
 * Formula .....
 *     i = annual rate ÷ 12
 *     b = balance, months = 0, interest = 0, last payment = 0
 *     months = infinity
 *     interest = infinity
 *     last payment = infinity   when payment ≤ b × i
 *     charge = b × i
 *     months = infinity
 *     interest = infinity
 *     last payment = infinity   when b > 0
 *     the answer = { months, interest, last payment }
 *
 * Called by ... MK-CF-F-043 compareMortgageToTreasury
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-043 compareMortgageToTreasury
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-125
 * Changed ..... not in git yet (—)
 */
function amortise(balance: number, annualRate: number, payment: number): { months: number; interest: number; lastPayment: number } {
  const i = annualRate / 12;
  let b = balance, months = 0, interest = 0, lastPayment = 0;
  // a payment that does not cover the interest never clears the loan; stop rather than loop forever
  if (payment <= b * i) return { months: Infinity, interest: Infinity, lastPayment: Infinity };
  // RUN UNTIL THE LOAN CLEARS (2026-10-25, FIX-ROOM; tenets 1-2): a payment above the first month's interest always clears
  // it, because each month's interest is then smaller than the last. It stopped at 1,200 months and called the loan
  // cleared: $100,000 at 6% with $501/month read 1,200 months with about $20,700 still owed, where it clears in 1,247.
  // The 12,000-month stop (a thousand years) only guards the loop; a loan still owing there is reported as never clearing.
  while (b > 0 && months < 12000) {
    const charge = b * i;
    interest += charge;
    // THE LAST PAYMENT IS WHAT IS LEFT, PLUS THAT MONTH'S INTEREST (2026-10-25, FIX-ROOM; tenet 1): $10,000 at 6% with $501/month
    // clears in 22 payments, the 22nd $40.31 ($40.11 left × 1.005), and the interest is $561.31 = 21 × $501 + $40.31 − $10,000.
    // The lifetime line counted that last payment as a full $501.
    lastPayment = Math.min(payment, b + charge);
    b = b + charge - payment;
    months++;
  }
  if (b > 0) return { months: Infinity, interest: Infinity, lastPayment: Infinity };
  return { months, interest, lastPayment };
}

/** Future value of a monthly contribution earning `rate`, contributed at the end of each month. */
/* ─ MK-CF-F-126 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * futureValue
 *
 * Answers ..... Future value of a monthly contribution earning `rate`, contributed at the end of each month.
 *
 * Formula .....
 *     0   when months ≤ 0 (or monthly ≤ 0 when missing or zero)
 *     i = rate ÷ 12
 *     monthly × months   when i = 0
 *     the answer = monthly × (((1 + i) ×  × months − 1) ÷ i)
 *
 * Called by ... MK-CF-F-043 compareMortgageToTreasury · MK-CF-F-229 balanceGrownTo
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-229 balanceGrownTo · MK-CF-F-043 compareMortgageToTreasury
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-126
 * Changed ..... not in git yet (—)
 */
function futureValue(monthly: number, rate: number, months: number): number {
  if (months <= 0 || monthly <= 0) return 0;
  const i = rate / 12;
  // AT 0% THE DEPOSITS THEMSELVES (2026-10-25, FIX-ROOM): the formula is 0 ÷ 0 there — $500/month for 12 months read NaN,
  // where it is $6,000. No caller sends 0% today; the next one will not have to know that.
  if (i === 0) return monthly * months;
  return monthly * (((1 + i) ** months - 1) / i);
}

/** WHAT A POT GROWS TO: a starting balance compounding monthly, plus a monthly contribution added at the end of each month
 *  (MK-CF-F-126 futureValue, the one formula for the contributions). Sign-up's retirement outlook reads this (2026-10-24);
 *  it carried its own copy of the same formula. */
/* ─ MK-CF-F-229 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * balanceGrownTo
 *
 * Answers ..... WHAT A POT GROWS TO: a starting balance compounding monthly, plus a monthly contribution added at the end of each month (MK-CF-F-126 futureValue, the one formula for the contributions).
 *
 * Formula .....
 *     start × (1 + rate ÷ 12) ×  × months + future value(monthly, rate, months)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-229
 * Changed ..... not in git yet (—)
 */
export function balanceGrownTo(start: number, monthly: number, rate: number, months: number): number {
  return start * (1 + rate / 12) ** months + futureValue(monthly, rate, months);
}

/**
 * Compare paying `extraMonthly` into the mortgage against putting the same money into Treasuries.
 *
 * The comparison is APPLES TO APPLES on purpose: both routes cost the same each month and finish on
 * the same date. Route A pays the loan down faster, then invests the WHOLE freed-up payment for the
 * months it bought back. Route B keeps the mortgage and invests only the extra, the whole way.
 * Anything less than that flatters one side.
 */
/* ─ MK-CF-F-043 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * compareMortgageToTreasury
 *
 * Answers ..... Compare paying `extraMonthly` into the mortgage against putting the same money into Treasuries.
 *
 * Formula .....
 *     nothing   when not (balance > 0) or !(annual rate > 0) or !(monthly payment > 0)
 *     fr = args.federal rate
 *     after tax = fr ≠ nothing and number.is finite(fr) and fr ≥ 0 and fr < 1
 *     yield used = treasury yield × (1 − fr!)   if after tax
 *     treasury yield   otherwise
 *     gap points = percent value(annual rate − yield used, 2)
 *     too close = size of(gap points) < TOO_CLOSE_POINTS
 *     base = amortise(balance, annual rate, monthly payment)
 *     fast = amortise(balance, annual rate, monthly payment + extra monthly)
 *     lifetime = 0
 *     routes = nothing
 *     clears = is finite(base.months) and is finite(fast.months)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Uses a built-in lifetime of 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-043
 * Changed ..... 2026-08-15 (dc3368f)
 */
export function compareMortgageToTreasury(args: {
  balance: number;
  annualRate: number;          // decimal, e.g. 0.055
  monthlyPayment: number;
  extraMonthly: number;
  treasuryYield: number;       // decimal, e.g. 0.0463
  /** the person's federal tax bracket, decimal (0.24); absent or null when it is not known — then the comparison runs before tax */
  federalRate?: number | null;
}): MortgageComparison | null {
  const { balance, annualRate, monthlyPayment, extraMonthly, treasuryYield } = args;
  if (!(balance > 0) || !(annualRate > 0) || !(monthlyPayment > 0)) return null;

  // AFTER FEDERAL TAX WHEN THE BRACKET IS KNOWN (2026-10-25, FIX-ROOM; the lead's ruling under tenet 7 and DEC-0160): a
  // Treasury's interest is taxed federally, so at a 24% bracket a 4.30% Treasury keeps 4.30 × (1 − 0.24) = 3.268%. A 4.10%
  // mortgage then wins by 0.83 points — about $1,440/year on $173,111 — where before tax the two read "too close to call".
  // The mortgage stays at its own rate: its interest is deductible only for those who itemise, and the card says so.
  const fr = args.federalRate;
  const afterTax = fr != null && Number.isFinite(fr) && fr >= 0 && fr < 1;
  const yieldUsed = afterTax ? treasuryYield * (1 - fr!) : treasuryYield;

  const gapPoints = percentValue(annualRate - yieldUsed, 2);   // the one percent writer, half up on the decimal value (R24)
  const tooClose = Math.abs(gapPoints) < TOO_CLOSE_POINTS;

  const base = amortise(balance, annualRate, monthlyPayment);
  const fast = amortise(balance, annualRate, monthlyPayment + extraMonthly);
  let lifetime = 0;
  let routes: { payingDown: number; treasuries: number } | null = null;
  const clears = isFinite(base.months) && isFinite(fast.months);
  if (clears && extraMonthly > 0) {
    const freedMonths = base.months - fast.months;
    // EACH ROUTE'S LAST PAYMENT IS ONLY WHAT IS LEFT (2026-10-25, FIX-ROOM): both routes spend payment + extra every month to
    // the same end date. Paying down: the month the loan clears frees what its last payment did not need, which grows to the
    // end; then the whole payment + extra each month after. Treasuries: the extra each month, and in the loan's last month what
    // that payment did not need. At a 0% yield the difference is exactly the interest saved.
    const payingDown = (monthlyPayment + extraMonthly - fast.lastPayment) * (1 + yieldUsed / 12) ** freedMonths
      + futureValue(monthlyPayment + extraMonthly, yieldUsed, freedMonths);
    const treasuries = futureValue(extraMonthly, yieldUsed, base.months) + (monthlyPayment - base.lastPayment);
    lifetime = payingDown - treasuries;   // Q49
    routes = { payingDown, treasuries };
  }

  return {
    mortgagePct: percentValue(annualRate, 2),
    treasuryPct: percentValue(treasuryYield, 2),
    basis: afterTax ? 'after-tax' : 'before-tax',
    treasuryAfterTaxPct: afterTax ? yieldUsed * 100 : null,
    federalRatePct: afterTax ? fr! * 100 : null,
    gapPoints,
    annualDifference: (annualRate - yieldUsed) * balance,   // Q49
    lifetimeDifference: lifetime,
    noLifetimeBecause: !(extraMonthly > 0) ? 'no-extra' : !clears ? 'never-clears' : null,
    extraMonthly,
    routes,
    tooCloseToCall: tooClose,
    direction: tooClose ? 'too-close' : gapPoints > 0 ? 'paying-down-wins' : 'treasuries-win',
  };
}
