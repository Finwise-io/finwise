// Pure income calculations (spec service 1). No I/O. Fully unit-tested.
import { IncomeSource, TaxProfile, IncomeState, MonthlyCell, Frequency } from './types';

export const PERIODS_PER_YEAR: Record<Frequency, number> = {
  ONETIME: 1, WEEKLY: 52, BIWEEKLY: 26, MONTHLY: 12, QUARTERLY: 4, ANNUAL: 1,
};

/** Whether an income source is rent from a property, long-term or short-term. */
/* ─ MK-CF-F-127 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isRental
 *
 * Answers ..... Whether an income source is rent from a property, long-term or short-term.
 *
 * Formula .....
 *     t = 'LONG_TERM_RENTAL' (or t = 'SHORT_TERM_RENTAL' when missing or zero)
 *
 * Called by ... MK-CF-F-044 annualNet · MK-CF-F-161 monthlyGrossOfSource
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-044 annualNet · MK-CF-F-049 buildIncomeState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-186 convertTakeHomeMode
 *               MK-CF-F-052 getIncomeState · MK-CF-F-045 grossAnnualBaseline
 *               MK-CF-F-097 grossFromNet · MK-CF-F-161 monthlyGrossOfSource
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-032 snapshotFromOnboarding
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
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-052 getIncomeState
 *               MK-CF-F-045 grossAnnualBaseline · MK-CF-F-097 grossFromNet
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-032 snapshotFromOnboarding
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
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-052 getIncomeState
 *               MK-CF-F-097 grossFromNet · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-045
 * Changed ..... 2026-06-05 (f742136)
 */
export function grossAnnualBaseline(sources: IncomeSource[]): number {
  return sources.reduce((t, s) => t + annualNet(s), 0);
}

/** The employer's 401(k) match for a year, added up across every job. */
/* ─ MK-CF-F-046 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * employerMatchAnnual
 *
 * Answers ..... The employer's 401(k) match for a year, added up across every job.
 *
 * Formula .....
 *     Σ over sources of ((employer match amount or 0) × PERIODS_PER_YEAR[frequency])
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-052 getIncomeState
 *               MK-CF-F-097 grossFromNet · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-032 snapshotFromOnboarding
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
// ONE RATE, THE ONE THE REST OF THE APP READS (2026-10-25, FIX-TAX, outside audit parts 5 and 17). The income state read with
// the profile takes its rate, its months and its take-home from the household path — MK-CF-F-181 rateInForce and the month
// grid MK-CF-F-092 incomeMonthlyGrid — the figures every Cash flow screen reads.
// MK-CF-F-048 effectiveTaxRate — RETIRED 2026-10-25. It was a second producer of the tax rate: never a filing status (the
// stored record carried none), never a 401(k), never a state rate, no take-home branch. Married on $138,432.60 with a 5% state
// rate and $14,311.43 into a 401(k) read 15.86% where the rate in force is 10.93% (DEC-0184 one tax function, DEC-0196 one rate
// everywhere, DEC-0283 the 401(k) is not taxed, DEC-0327 state tax on taxable income). Its one caller now reads the rate in
// force; the stored-record read below keeps the record's own typed rate or the schedule's share for it. To reverse: restore
// the function from git (b1c659e8) and have buildIncomeState call it again.
import { effectiveRateOnGrossFor } from './tax';
import { rateInForce } from './tax-rate';
import { incomeMonthlyGrid } from './onboarding';
import type { OnboardingProfile } from '../onboardingProfile';

// ── monthly cash-flow grid ───────────────────────────────────────────────────
/** Gross dollars a source delivers in each of the 12 months (lumpy items land on
 *  specific months; even cadences spread evenly). */

/** The gross amount one income source brings in each of the twelve months, with rent taken after its running costs and lump payments placed in the months they arrive. */
/* ─ MK-CF-F-161 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthlyGrossOfSource
 *
 * Answers ..... The gross amount one income source brings in each of the twelve months, with rent taken after its running costs and lump payments placed in the months they arrive.
 *
 * Formula .....
 *     m = 12 slots, each 0
 *     amt = gross amount − (operating expenses or 0)   if is rental(income type)
 *     gross amount   otherwise
 *     the answer = m
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-052 getIncomeState
 *               MK-CF-F-097 grossFromNet · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-032 snapshotFromOnboarding
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

/** The income picture for a year: gross, tax rate and take-home, and the gross, tax and take-home of each of the twelve months. */
/* ─ MK-CF-F-049 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildIncomeState
 *
 * Answers ..... The income picture for a year: gross, tax rate and take-home, and the gross, tax and take-home of each of the twelve months.
 *
 * Formula .....
 *     gross = for each of income monthly grid(op, 'gross'): amount
 *     take home = for each of income monthly grid(op, 'available'): amount
 *     gross year = Σ over gross of (each)
 *     take home year = Σ over take home of (each)
 *     gross = gross annual baseline(sources)
 *     net = gross × (1 − rate)
 *     monthly gross = for each of 12 slots, each 0: Σ over sources of (monthly gross of source(each)[i])
 *     grid = for each of monthly gross: month = i + 1
 *     gross = each
 *     net = each − each × rate
 *
 * Called by ... MK-CF-F-052 getIncomeState · MK-CF-F-097 grossFromNet
 *               MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-052 getIncomeState
 *               MK-CF-F-097 grossFromNet · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *     · Treats a year as twelve equal months.
 *     · Never lets manual effective tax rate fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-049
 * Changed ..... 2026-07-14 (cf50737)
 */
export function buildIncomeState(userId: string, sources: IncomeSource[], tax: TaxProfile, op?: OnboardingProfile | null): IncomeState {
  // WITH THE PROFILE — every caller a person can reach (Income detail, Home's snapshot): THE ONE TAKE-HOME AND THE ONE RATE
  // (2026-10-25, outside audit part 5, MK-CF-F-049). This read gross × (1 − its own rate) and never took the 401(k) off:
  // $5,000/month with $500 into a 401(k) at a 10% rate landed $4,500 where the take-home is $4,000; and a married couple on
  // $138,432.60 with a 5% state rate were taxed $21,957.82 a year, as a single filer with no state tax, where the rate in
  // force gives $18,106.80. Now each month is the month grid's — gross, the tax at the rate in force, the take-home after tax
  // and the 401(k) — and the year is the twelve added up, so the months and the year cannot disagree.
  if (op !== undefined) {
    const gross = incomeMonthlyGrid(op, 'gross').map((m) => m.amount);
    const takeHome = incomeMonthlyGrid(op, 'available').map((m) => m.amount);
    const grossYear = gross.reduce((t, g) => t + g, 0);
    const takeHomeYear = takeHome.reduce((t, n) => t + n, 0);
    return {
      user_id: userId,
      total_gross_annual: (grossYear),
      total_net_annual: (takeHomeYear),                    // take-home: after tax AND the 401(k)
      effective_tax_rate: round4(rateInForce(op).rate),
      net_monthly_income: (takeHomeYear / 12),
      monthly_cash_flow_grid: gross.map((g, i) => ({ month: i + 1, gross: (g), net: (takeHome[i]) })),
      employer_match_annual: (employerMatchAnnual(sources)),
    };
  }

  // WITHOUT IT — only the stored income record (MK-CF-F-052 getIncomeState), which no screen calls: the record holds its
  // sources and a typed rate, and nothing about a 401(k) or a state rate, so it is read as it stands — its typed rate, else
  // the schedule's share of its gross for the filing status it carries — and that one rate on every month (DEC-0196), where
  // the months used to fill the tax bands as the year went on (MK-CF-F-098, retired 2026-10-25).
  const gross = grossAnnualBaseline(sources);
  const rate = tax.use_manual_tax_override && tax.manual_effective_tax_rate != null
    ? Math.min(Math.max(tax.manual_effective_tax_rate, 0), 1)
    : effectiveRateOnGrossFor(gross, tax.filing_status ?? 'single', 0, tax.over65 ?? 0);
  const net = gross * (1 - rate);
  const monthlyGross = new Array(12).fill(0).map((_, i) => sources.reduce((t, s) => t + monthlyGrossOfSource(s)[i], 0));
  const grid: MonthlyCell[] = monthlyGross.map((g, i) => ({ month: i + 1, gross: (g), net: (g - g * rate) }));

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

/** Returns a number unchanged, because rounding is done once, where a figure is shown. */
/* ─ MK-CF-F-129 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * round4
 *
 * Answers ..... Returns a number unchanged, because rounding is done once, where a figure is shown.
 *
 * Formula .....
 *     n
 *
 * Called by ... MK-CF-F-049 buildIncomeState
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-049 buildIncomeState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-052 getIncomeState
 *               MK-CF-F-097 grossFromNet · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-129
 * Changed ..... not in git yet (—)
 */
const round4 = (n: number) => (n);
