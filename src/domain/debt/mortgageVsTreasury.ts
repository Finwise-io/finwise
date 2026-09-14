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

export interface MortgageComparison {
  /** the loan's own rate, as a percentage for display */
  mortgagePct: number;
  /** today's ten-year Treasury yield, as a percentage for display */
  treasuryPct: number;
  /** mortgage rate minus the yield, in percentage points; positive = paying down wins */
  gapPoints: number;
  /** what that gap is worth in a year at today's balance — the number a person can feel */
  annualDifference: number;
  /** over the life of the loan, how much better (positive) or worse (negative) off paying the
   *  extra leaves them versus putting the same money into Treasuries */
  lifetimeDifference: number;
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
 *     b = balance, months = 0, interest = 0
 *     months = infinity
 *     interest = infinity   when payment ≤ b × i
 *     charge = b × i
 *     the answer = { months, interest }
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
function amortise(balance: number, annualRate: number, payment: number): { months: number; interest: number } {
  const i = annualRate / 12;
  let b = balance, months = 0, interest = 0;
  // a payment that does not cover the interest never clears the loan; stop rather than loop forever
  if (payment <= b * i) return { months: Infinity, interest: Infinity };
  while (b > 0 && months < 1200) {
    const charge = b * i;
    interest += charge;
    b = b + charge - payment;
    months++;
  }
  return { months, interest };
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
 *     the answer = monthly × (((1 + i) ×  × months − 1) ÷ i)
 *
 * Called by ... MK-CF-F-043 compareMortgageToTreasury
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-043 compareMortgageToTreasury
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-126
 * Changed ..... not in git yet (—)
 */
function futureValue(monthly: number, rate: number, months: number): number {
  if (months <= 0 || monthly <= 0) return 0;
  const i = rate / 12;
  return monthly * (((1 + i) ** months - 1) / i);
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
 *     gap points = +((annual rate − treasury yield) × 100).to fixed(2)
 *     too close = size of(gap points) < TOO_CLOSE_POINTS
 *     base = amortise(balance, annual rate, monthly payment)
 *     fast = amortise(balance, annual rate, monthly payment + extra monthly)
 *     lifetime = 0
 *     freed months = base.months − fast.months
 *     paying down = future value(monthly payment + extra monthly, treasury yield, freed months)
 *     treasuries = future value(extra monthly, treasury yield, base.months)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Uses a built-in lifetime of 0.
 *     · Shows 2 decimal places.
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
}): MortgageComparison | null {
  const { balance, annualRate, monthlyPayment, extraMonthly, treasuryYield } = args;
  if (!(balance > 0) || !(annualRate > 0) || !(monthlyPayment > 0)) return null;

  const gapPoints = +((annualRate - treasuryYield) * 100).toFixed(2);
  const tooClose = Math.abs(gapPoints) < TOO_CLOSE_POINTS;

  const base = amortise(balance, annualRate, monthlyPayment);
  const fast = amortise(balance, annualRate, monthlyPayment + extraMonthly);
  let lifetime = 0;
  if (isFinite(base.months) && isFinite(fast.months) && extraMonthly > 0) {
    const freedMonths = base.months - fast.months;
    const payingDown = futureValue(monthlyPayment + extraMonthly, treasuryYield, freedMonths);
    const treasuries = futureValue(extraMonthly, treasuryYield, base.months);
    lifetime = payingDown - treasuries;   // Q49
  }

  return {
    mortgagePct: +(annualRate * 100).toFixed(2),
    treasuryPct: +(treasuryYield * 100).toFixed(2),
    gapPoints,
    annualDifference: (annualRate - treasuryYield) * balance,   // Q49
    lifetimeDifference: lifetime,
    tooCloseToCall: tooClose,
    direction: tooClose ? 'too-close' : gapPoints > 0 ? 'paying-down-wins' : 'treasuries-win',
  };
}
