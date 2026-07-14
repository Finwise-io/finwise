// Pure income calculations (spec service 1). No I/O. Fully unit-tested.
import { IncomeSource, TaxProfile, IncomeState, MonthlyCell, Frequency } from './types';

export const PERIODS_PER_YEAR: Record<Frequency, number> = {
  ONETIME: 1, WEEKLY: 52, BIWEEKLY: 26, MONTHLY: 12, QUARTERLY: 4, ANNUAL: 1,
};

const isRental = (t: string) => t === 'LONG_TERM_RENTAL' || t === 'SHORT_TERM_RENTAL';

/** Annual NET contribution of a source: jobs use gross; rentals net out operating expenses. */
export function annualNet(s: IncomeSource): number {
  const perPeriod = isRental(s.income_type) ? s.gross_amount - (s.operating_expenses || 0) : s.gross_amount;
  return perPeriod * PERIODS_PER_YEAR[s.frequency];
}

/** Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized. */
export function grossAnnualBaseline(sources: IncomeSource[]): number {
  return sources.reduce((t, s) => t + annualNet(s), 0);
}

export function employerMatchAnnual(sources: IncomeSource[]): number {
  return sources.reduce((t, s) => t + (s.employer_match_amount || 0) * PERIODS_PER_YEAR[s.frequency], 0);
}

// ── tax ──────────────────────────────────────────────────────────────────────
// SYSTEM_CALCULATED default uses the IRS federal bracket schedule (see ./tax.ts).
// Deliberately federal-single-filer for now — state tax, filing status, deductions deferred.
import { effectiveRateOnGross } from './tax';

export function estimateEffectiveTaxRate(grossAnnual: number): number {
  return effectiveRateOnGross(grossAnnual);
}

export function effectiveTaxRate(grossAnnual: number, tax: TaxProfile): number {
  if (tax.use_manual_tax_override && tax.manual_effective_tax_rate != null) {
    return Math.min(Math.max(tax.manual_effective_tax_rate, 0), 1);
  }
  return estimateEffectiveTaxRate(grossAnnual);
}

// ── monthly cash-flow grid ───────────────────────────────────────────────────
/** Gross dollars a source delivers in each of the 12 months (lumpy items land on
 *  specific months; even cadences spread evenly). */
function grossByMonth(s: IncomeSource): number[] {
  const m = new Array(12).fill(0);
  const amt = isRental(s.income_type) ? s.gross_amount - (s.operating_expenses || 0) : s.gross_amount;
  switch (s.frequency) {
    case 'MONTHLY': for (let i = 0; i < 12; i++) m[i] += amt; break;
    case 'WEEKLY':  for (let i = 0; i < 12; i++) m[i] += amt * 52 / 12; break;
    case 'BIWEEKLY':for (let i = 0; i < 12; i++) m[i] += amt * 26 / 12; break;
    case 'QUARTERLY': [2, 5, 8, 11].forEach((i) => (m[i] += amt)); break;  // Mar/Jun/Sep/Dec
    case 'ANNUAL':  m[Math.min(12, Math.max(1, s.landing_month ?? 12)) - 1] += amt; break;   // the user's month (default Dec)
    case 'ONETIME': m[Math.min(12, Math.max(1, s.landing_month ?? 1)) - 1] += amt; break;    // the user's month (default Jan)
  }
  return m;
}

export function buildIncomeState(userId: string, sources: IncomeSource[], tax: TaxProfile): IncomeState {
  const gross = grossAnnualBaseline(sources);
  const rate = effectiveTaxRate(gross, tax);
  const net = gross * (1 - rate);

  const grid: MonthlyCell[] = [];
  for (let i = 0; i < 12; i++) {
    const g = sources.reduce((t, s) => t + grossByMonth(s)[i], 0);
    grid.push({ month: i + 1, gross: round2(g), net: round2(g * (1 - rate)) });
  }

  return {
    user_id: userId,
    total_gross_annual: round2(gross),
    total_net_annual: round2(net),
    effective_tax_rate: round4(rate),
    net_monthly_income: round2(net / 12),
    monthly_cash_flow_grid: grid,
    employer_match_annual: round2(employerMatchAnnual(sources)),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
