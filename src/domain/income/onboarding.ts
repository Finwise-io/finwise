// Map onboarding answers → the Income domain (blueprint §5 + the Income service spec).
// Captures the full set of job inflows (salary monthly, bonus annual, RSUs valued as
// shares × price, signing bonus one-time), rental property (income − operating expenses),
// and the tax config (SYSTEM_CALCULATED vs MANUAL_OVERRIDE).
import type { UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum } from '../_shared/num';
import { grossFromNet, effectiveRateOnGross } from './tax';
import { IncomeDoc, IncomeSource, WhoEarns, DEFAULT_TAX } from './types';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// How many pay periods per year for each salary cadence (hourly = 40h/wk × 52).
export const SALARY_PERIODS: Record<string, number> = {
  hourly: 2080, weekly: 52, biweekly: 26, monthly: 12, annually: 1,
};

/** Annual amount of what the user ENTERED (not grossed up) — for display. */
export function annualizedEnteredSalary(op: Record<string, any> | null): number {
  const a = op ?? {};
  return toNum(a.baseSalary) * (SALARY_PERIODS[a.salaryFreq] ?? 12);
}

/** Monthly GROSS salary — annualizes by cadence and backs out gross from take-home
 *  via the IRS schedule when the user entered take-home. */
export function grossSalaryMonthly(op: Record<string, any> | null): number {
  const a = op ?? {};
  const annualEntered = annualizedEnteredSalary(op);
  const annualGross = a.salaryMode === 'takehome' ? grossFromNet(annualEntered) : annualEntered;
  return annualGross / 12;
}

/** Value of one vesting-schedule row. RSUs vest at face value (shares × price); stock
 *  options are worth their "spread" — count × (market − strike), floored at $0 when
 *  underwater. Options share a single grant-level strike & market price. */
export function equityRowValue(row: any, type: string, strike?: any, market?: any): number {
  if (type === 'option') return toNum(row?.shares) * Math.max(0, toNum(market) - toNum(strike));
  return toNum(row?.shares) * toNum(row?.price);
}

/** Calendar year a row vests (first 4 digits of its date; this year if blank). */
export function rowVestYear(row: any): number {
  const m = String(row?.date ?? '').match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

/** Per-calendar-year vesting cash flow across all schedule rows — drives the chart & table. */
export function equityCashFlow(op: Record<string, any> | null): { year: number; amount: number }[] {
  const a = op ?? {};
  const type = a.equityType ?? 'rsu';
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  const byYear = new Map<number, number>();
  for (const r of rows) {
    const v = equityRowValue(r, type, a.optStrike, a.optMarket);
    if (v > 0) byYear.set(rowVestYear(r), (byYear.get(rowVestYear(r)) ?? 0) + v);
  }
  return [...byYear.entries()].sort((x, y) => x[0] - y[0]).map(([year, amount]) => ({ year, amount }));
}

/** Annual equity-comp run-rate: total scheduled value spread over the years it vests across
 *  (a level annual figure for the income estimate). Falls back to legacy single shares/price. */
export function rsuAnnual(op: Record<string, any> | null): number {
  const a = op ?? {};
  const type = a.equityType ?? 'rsu';
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  if (rows.length) {
    const valued = rows.map((r: any) => ({ v: equityRowValue(r, type, a.optStrike, a.optMarket), y: rowVestYear(r) }));
    const total = valued.reduce((t: number, x: any) => t + x.v, 0);
    const years = new Set(valued.filter((x: any) => x.v > 0).map((x: any) => x.y)).size || 1;
    return total / years;
  }
  return toNum(a.rsuShares) * toNum(a.rsuPrice);
}

/** Normalized list of rental properties. Uses the new `rentals` array when present,
 *  otherwise falls back to the legacy single rentalIncome/rentalExpenses/rentalType fields. */
export function rentalList(op: Record<string, any> | null): { type: 'long' | 'short'; income: number; expenses: number }[] {
  const a = op ?? {};
  const norm = (t: any): 'long' | 'short' => (t === 'short' ? 'short' : 'long');
  if (Array.isArray(a.rentals)) {
    return a.rentals
      .map((r: any) => ({ type: norm(r?.type), income: toNum(r?.income), expenses: toNum(r?.expenses) }))
      .filter((r: any) => r.income > 0 || r.expenses > 0);
  }
  if (toNum(a.rentalIncome) > 0) return [{ type: norm(a.rentalType), income: toNum(a.rentalIncome), expenses: toNum(a.rentalExpenses) }];
  return [];
}

/** Total net rental income per year, across all properties (income − operating expenses). */
export function rentalNetAnnual(op: Record<string, any> | null): number {
  return rentalList(op).reduce((t, r) => t + (r.income - r.expenses), 0) * 12;
}

/** Employer match resolved to $/month. A % is of YOUR 401(k) contribution (e.g. a
 *  "50% match" adds half of what you put in), not of salary. */
export function employerMatchMonthly(op: Record<string, any> | null): number {
  const a = op ?? {};
  const val = toNum(a.employerMatchValue);
  return a.employerMatchMode === 'pct' ? (toNum(a.c_401k) * val) / 100 : val;
}

export function incomeFromOnboarding(uid: UserId, op: Record<string, any> | null): IncomeDoc {
  const a = op ?? {};
  const who = (a.whoEarns as WhoEarns) ?? 'you';
  const sources: IncomeSource[] = [];
  const add = (label: string, type: IncomeSource['income_type'], gross: number,
               frequency: IncomeSource['frequency'], extra: Partial<IncomeSource> = {}) => {
    if (gross > 0) sources.push({
      income_source_id: newEntityId('inc'), label, income_type: type, gross_amount: gross,
      frequency, operating_expenses: 0, who_earns: who, ...extra,
    });
  };

  add('Base salary', 'W2_JOB', grossSalaryMonthly(op), 'MONTHLY', { employer_match_amount: employerMatchMonthly(op) });
  add('Bonus', 'W2_JOB', toNum(a.bonusAnnual), 'ANNUAL');
  add('Equity comp', 'W2_JOB', rsuAnnual(op), 'ANNUAL');  // RSUs + options, summed across grants
  add('Signing bonus', 'W2_JOB', toNum(a.signingOnetime), 'ONETIME');

  for (const r of rentalList(op)) sources.push({
    income_source_id: newEntityId('inc'), label: 'Rental property',
    income_type: r.type === 'short' ? 'SHORT_TERM_RENTAL' : 'LONG_TERM_RENTAL',
    gross_amount: r.income, frequency: 'MONTHLY', operating_expenses: r.expenses, who_earns: who,
  });

  const tax = a.taxMode === 'manual'
    ? { use_manual_tax_override: true, manual_effective_tax_rate: Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1) }
    : { ...DEFAULT_TAX };  // system-calculated (progressive estimate)

  return { user_id: uid, sources, tax };
}

/** Total annual gross across every inflow (salary grossed-up + bonus + signing + equity vesting + net rental). */
export function totalGrossAnnual(op: Record<string, any> | null): number {
  const a = op ?? {};
  return grossSalaryMonthly(op) * 12 + toNum(a.bonusAnnual) + toNum(a.signingOnetime) + rsuAnnual(op) + rentalNetAnnual(op);
}

/** Effective tax rate in use: the user's manual rate, else the IRS-schedule estimate on total gross. */
export function effectiveRate(op: Record<string, any> | null): number {
  const a = op ?? {};
  if (a.taxMode === 'manual') return Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1);
  return effectiveRateOnGross(totalGrossAnnual(op));
}

/** A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness:
 *  salary & net rental are steady every month; the annual bonus lands in December; the
 *  signing bonus is one-time (January); equity is the level annual vesting spread across the
 *  month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).
 *  mode: 'gross' (pre-tax), 'net' (after tax), or 'available' (net minus the locked 401(k)). */
export function incomeMonthlyGrid(op: Record<string, any> | null, mode: 'gross' | 'net' | 'available' = 'available'): { label: string; amount: number }[] {
  const a = op ?? {};
  const salaryM = grossSalaryMonthly(op);
  const rentalM = rentalNetAnnual(op) / 12;
  const bonus = toNum(a.bonusAnnual);
  const signing = toNum(a.signingOnetime);
  const c401kM = toNum(a.c_401k);
  const rate = effectiveRate(op);

  // distribute the level annual equity by the months its vests land on
  const equityByMonth = new Array(12).fill(0);
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  const type = a.equityType ?? 'rsu';
  const weights = new Array(12).fill(0);
  let totalV = 0;
  for (const r of rows) {
    const v = equityRowValue(r, type, a.optStrike, a.optMarket);
    if (v <= 0) continue;
    const m = String(r?.date ?? '').match(/\d{4}-(\d{1,2})/);
    const idx = m ? Math.min(11, Math.max(0, +m[1] - 1)) : 11;
    weights[idx] += v; totalV += v;
  }
  const eqAnnual = rsuAnnual(op);
  if (totalV > 0) for (let i = 0; i < 12; i++) equityByMonth[i] = eqAnnual * (weights[i] / totalV);

  return MONTH_ABBR.map((label, i) => {
    let gross = salaryM + rentalM + equityByMonth[i];
    if (i === 11) gross += bonus;     // annual bonus → December
    if (i === 0) gross += signing;    // signing bonus → one-time, first month
    let amount = mode === 'gross' ? gross : gross * (1 - rate);
    if (mode === 'available') amount -= c401kM;   // employee 401(k) is locked away
    return { label, amount };
  });
}

export { DEFAULT_TAX };
