// Pure income calculations (spec service 1). No I/O. Fully unit-tested.
import { IncomeSource, TaxProfile, IncomeState, MonthlyCell, Frequency } from './types';

export const PERIODS_PER_YEAR: Record<Frequency, number> = {
  ONETIME: 1, WEEKLY: 52, BIWEEKLY: 26, MONTHLY: 12, QUARTERLY: 4, ANNUAL: 1,
};

/* ─ MK-CF-F-127 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isRental
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     t = 'LONG_TERM_RENTAL' (or t = 'SHORT_TERM_RENTAL' when missing or zero)
 *
 * Called by ... MK-CF-F-044 annualNet · MK-CF-F-161 monthlyGrossOfSource
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-044 annualNet · MK-CF-F-049 buildIncomeState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-052 getIncomeState
 *               MK-CF-F-045 grossAnnualBaseline · MK-CF-F-161 monthlyGrossOfSource
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-127
 * Changed ..... not in git yet (—)
 */
const isRental = (t: string) => t === 'LONG_TERM_RENTAL' || t === 'SHORT_TERM_RENTAL';

/** Annual NET contribution of a source: jobs use gross; rentals net out operating expenses. */
/* ─ MK-CF-F-044 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * annualNet
 *
 * Answers ..... Annual NET contribution of a source: jobs use gross; rentals net out operating expenses.
 *
 * Formula .....
 *     per period = gross amount − (operating expenses or 0)   if is rental(income type)
 *     gross amount   otherwise
 *     the answer = per period × PERIODS_PER_YEAR[frequency]
 *
 * Called by ... MK-CF-F-045 grossAnnualBaseline
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-052 getIncomeState · MK-CF-F-045 grossAnnualBaseline
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *
 * Decides .....
 *     · If operating expenses is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-044
 * Changed ..... 2026-06-05 (f742136)
 */
export function annualNet(s: IncomeSource): number {
  const perPeriod = isRental(s.income_type) ? s.gross_amount - (s.operating_expenses || 0) : s.gross_amount;
  return perPeriod * PERIODS_PER_YEAR[s.frequency];
}

/** Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized. */
/* ─ MK-CF-F-045 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * grossAnnualBaseline
 *
 * Answers ..... Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized.
 *
 * Formula .....
 *     Σ over sources of (annual net(each))
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-052 getIncomeState · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-045
 * Changed ..... 2026-06-05 (f742136)
 */
export function grossAnnualBaseline(sources: IncomeSource[]): number {
  return sources.reduce((t, s) => t + annualNet(s), 0);
}

/* ─ MK-CF-F-046 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * employerMatchAnnual
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     Σ over sources of ((employer match amount or 0) × PERIODS_PER_YEAR[frequency])
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-052 getIncomeState · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *
 * Decides .....
 *     · If employer match amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-046
 * Changed ..... 2026-07-14 (cf50737)
 */
export function employerMatchAnnual(sources: IncomeSource[]): number {
  return sources.reduce((t, s) => t + (s.employer_match_amount || 0) * PERIODS_PER_YEAR[s.frequency], 0);
}

// ── tax ──────────────────────────────────────────────────────────────────────
// SYSTEM_CALCULATED default uses the IRS federal bracket schedule (see ./tax.ts).
// Deliberately federal-single-filer for now — state tax, filing status, deductions deferred.
import { effectiveRateOnGrossFor, progressiveMonthlyTax } from './tax';


/* ─ MK-CF-F-048 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * effectiveTaxRate
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     min(max(tax.manual effective tax rate, 0), 1)
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-052 getIncomeState · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *     · Never lets manual effective tax rate fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-048
 * Changed ..... 2026-06-05 (f742136)
 */
export function effectiveTaxRate(grossAnnual: number, tax: TaxProfile): number {
  if (tax.use_manual_tax_override && tax.manual_effective_tax_rate != null) {
    return Math.min(Math.max(tax.manual_effective_tax_rate, 0), 1);
  }
  // The SAME function every other screen reads. Until 2026-08-27 this branch called a second,
  // single-filer-only one, so a married couple got one rate here and a different rate everywhere
  // else — from the same profile, on the same day.
  return effectiveRateOnGrossFor(grossAnnual, tax.filing_status ?? 'single', 0, tax.over65 ?? 0);
}

// ── monthly cash-flow grid ───────────────────────────────────────────────────
/** Gross dollars a source delivers in each of the 12 months (lumpy items land on
 *  specific months; even cadences spread evenly). */
/* ─ MK-CF-F-161 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthlyGrossOfSource
 *
 * Answers ..... ── monthly cash-flow grid ─────────────────────────────────────────────────── Gross dollars a source delivers in each of the 12 months (lumpy items land on specific months; even cadences spread evenly).
 *
 * Formula .....
 *     m = 12 slots, each 0
 *     amt = gross amount − (operating expenses or 0)   if is rental(income type)
 *     gross amount   otherwise
 *     the answer = m
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-052 getIncomeState · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *
 * Decides .....
 *     · If landing month is missing it uses 12.
 *     · If landing month is missing it uses 1.
 *     · If operating expenses is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Never lets month fall below 1.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-161
 * Changed ..... not in git yet (—)
 */
function monthlyGrossOfSource(s: IncomeSource): number[] {
  const m = new Array(12).fill(0);
  const amt = isRental(s.income_type) ? s.gross_amount - (s.operating_expenses || 0) : s.gross_amount;
  switch (s.frequency) {
    case 'MONTHLY': for (let i = 0; i < 12; i++) m[i] += amt; break;
    case 'WEEKLY':  for (let i = 0; i < 12; i++) m[i] += amt * 52 / 12; break;
    case 'BIWEEKLY':for (let i = 0; i < 12; i++) m[i] += amt * 26 / 12; break;
    case 'QUARTERLY': [2, 5, 8, 11].forEach((i) => (m[i] += amt)); break;  // Mar/Jun/Sep/Dec
    case 'ANNUAL':
      // multi-month lands (equity vesting) win: the amount splits by the vest-month shares —
      // walk row 6: no more parking the whole year's vests in December on this view
      if (s.landing_months?.length) { for (const lm of s.landing_months) m[Math.min(12, Math.max(1, lm.month)) - 1] += amt * lm.share; break; }
      m[Math.min(12, Math.max(1, s.landing_month ?? 12)) - 1] += amt; break;   // the user's month (default Dec)
    case 'ONETIME': m[Math.min(12, Math.max(1, s.landing_month ?? 1)) - 1] += amt; break;    // the user's month (default Jan)
  }
  return m;
}

/* ─ MK-CF-F-049 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildIncomeState
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     gross = gross annual baseline(sources)
 *     rate = effective tax rate(gross, tax)
 *     net = gross × (1 − rate)
 *     monthly gross = for each of 12 slots, each 0: Σ over sources of (monthly gross of source(each)[i])
 *     grid = []
 *     g = monthly gross[i]
 *
 * Called by ... MK-CF-F-052 getIncomeState · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-052 getIncomeState
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-049
 * Changed ..... 2026-07-14 (cf50737)
 */
export function buildIncomeState(userId: string, sources: IncomeSource[], tax: TaxProfile): IncomeState {
  const gross = grossAnnualBaseline(sources);
  const rate = effectiveTaxRate(gross, tax);
  const net = gross * (1 - rate);

  // PRD F2#11: per-month net uses progressive bracket-filling (manual override = the user's flat
  // rate) — the same withholding concept the cash-flow grids use, so months can't disagree
  const monthlyGross = new Array(12).fill(0).map((_, i) => sources.reduce((t, s) => t + monthlyGrossOfSource(s)[i], 0));
  const monthlyTax = tax.use_manual_tax_override
    ? monthlyGross.map((g) => g * rate)
    : progressiveMonthlyTax(monthlyGross);
  const grid: MonthlyCell[] = [];
  for (let i = 0; i < 12; i++) {
    const g = monthlyGross[i];
    grid.push({ month: i + 1, gross: (g), net: (g - monthlyTax[i]) });
  }

  return {
    user_id: userId,
    total_gross_annual: (gross),
    total_net_annual: (net),
    effective_tax_rate: round4(rate),
    net_monthly_income: (net / 12),
    monthly_cash_flow_grid: grid,
    employer_match_annual: (employerMatchAnnual(sources)),
  };
}

/* ─ MK-CF-F-129 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * round4
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     n
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-052 getIncomeState · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-129
 * Changed ..... not in git yet (—)
 */
const round4 = (n: number) => (n);
