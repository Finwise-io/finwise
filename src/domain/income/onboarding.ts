// Map onboarding answers → the Income domain (blueprint §5 + the Income service spec).
// Captures the full set of job inflows (salary monthly, bonus annual, RSUs valued as
// shares × price, signing bonus one-time), rental property (income − operating expenses),
// and the tax config (SYSTEM_CALCULATED vs MANUAL_OVERRIDE).
import type { UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { grossFromNet, effectiveRateOnGross } from './tax';
import { IncomeDoc, IncomeSource, WhoEarns, DEFAULT_TAX } from './types';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// How many pay periods per year for each salary cadence (hourly = 40h/wk × 52).
export const SALARY_PERIODS: Record<string, number> = {
  hourly: 2080, weekly: 52, biweekly: 26, monthly: 12, annually: 1,
};

/** Default weekly hours for an hourly worker when they haven't said otherwise. */
export const DEFAULT_HOURS_PER_WEEK = 40;

/** Annual amount of what the user ENTERED (not grossed up) — for display.
 *  Hourly annualizes by the user's actual hours/week × 52 (no fixed 40h assumption). */
export function annualizedEnteredSalary(op: Record<string, any> | null): number {
  const a = op ?? {};
  if ((a.salaryFreq ?? 'monthly') === 'hourly') {
    const hrs = toNum(a.hoursPerWeek) || DEFAULT_HOURS_PER_WEEK;
    return toNum(a.baseSalary) * hrs * 52;
  }
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

/** Extra income sources beyond salary/rental/equity (self-employment, investment, benefits, support,
 *  scholarship, other), split into taxable vs non-taxable steady monthly amounts + a one-time Jan amount.
 *  Benefits, support, and scholarships are treated as non-taxable for planning. */
export function extraIncome(op: Record<string, any> | null): { taxableMonthly: number; nontaxMonthly: number; onetimeJan: number } {
  const a = op ?? {};
  const seM = (a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount));
  const invM = toNum(a.invAnnual) / 12;
  const benM = toNum(a.benefitMonthly);
  const supM = toNum(a.supportMonthly);
  const schList = Array.isArray(a.scholarships) ? a.scholarships : null;
  const schM = schList
    ? schList.reduce((t: number, x: any) => t + (x?.freq === 'monthly' ? toNum(x?.amount) : toNum(x?.amount) / 12), 0)
    : (a.scholarshipFreq === 'monthly' ? toNum(a.scholarshipAmount) : toNum(a.scholarshipAmount) / 12);
  const othFreq = a.otherFreq ?? 'monthly';
  const othM = othFreq === 'annual' ? toNum(a.otherAmount) / 12 : othFreq === 'monthly' ? toNum(a.otherAmount) : 0;
  const othOnce = othFreq === 'onetime' ? toNum(a.otherAmount) : 0;
  const tipsM = toNum(a.tipsMonthly);   // average monthly tips (variable; taxable)
  return {
    taxableMonthly: round2(seM + invM + othM + tipsM),
    nontaxMonthly: round2(benM + supM + schM),
    onetimeJan: round2(othOnce),
  };
}

/** Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable. */
export function retirementIncomeMonthly(op: Record<string, any> | null): number {
  const a = op ?? {};
  return ['ss', 'pension', 'withdrawals', 'rmd', 'annuities', 'other'].reduce((t, k) => t + toNum(a['ri_' + k]), 0);
}

/** Scholarships/grants placed in the calendar months they actually land (Jan→Dec) — NOT averaged.
 *  A yearly award is split across the months chosen; a monthly award repeats every month. */
export function scholarshipByCalendarMonth(op: Record<string, any> | null): number[] {
  const a = op ?? {};
  const out = new Array(12).fill(0);
  const list = Array.isArray(a.scholarships) ? a.scholarships : null;
  if (list) {
    for (const sc of list) {
      const amt = toNum(sc?.amount); if (amt <= 0) continue;
      if (sc?.freq === 'monthly') { for (let i = 0; i < 12; i++) out[i] += amt; continue; }
      const months = Array.isArray(sc?.months) && sc.months.length ? sc.months : null;
      if (months) for (const m of months) out[Math.min(11, Math.max(0, m - 1))] += amt / months.length;
      else for (let i = 0; i < 12; i++) out[i] += amt / 12;
    }
  } else {
    const amt = toNum(a.scholarshipAmount);
    if (amt > 0) { const m = a.scholarshipFreq === 'monthly' ? amt : amt / 12; for (let i = 0; i < 12; i++) out[i] += m; }
  }
  return out;
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

  // Additional sources (self-employment, investment, benefits, support, scholarship, other)
  add('Tips', 'W2_JOB', toNum(a.tipsMonthly), 'MONTHLY');
  add('Retirement income', 'OTHER', retirementIncomeMonthly(op), 'MONTHLY');
  add('Self-employment', 'SELF_EMPLOYMENT', a.seFreq === 'annual' ? toNum(a.seAmount) : toNum(a.seAmount), a.seFreq === 'annual' ? 'ANNUAL' : 'MONTHLY');
  add('Interest & dividends', 'INVESTMENT', toNum(a.invAnnual), 'ANNUAL');
  add('Benefits', 'BENEFIT', toNum(a.benefitMonthly), 'MONTHLY');
  add('Child support / alimony', 'SUPPORT', toNum(a.supportMonthly), 'MONTHLY');
  if (Array.isArray(a.scholarships)) {
    for (const x of a.scholarships) add(x?.label?.trim() || 'Scholarship / grant', 'SCHOLARSHIP', toNum(x?.amount), x?.freq === 'monthly' ? 'MONTHLY' : 'ANNUAL');
  } else {
    add('Scholarship / grant', 'SCHOLARSHIP', toNum(a.scholarshipAmount), a.scholarshipFreq === 'monthly' ? 'MONTHLY' : 'ANNUAL');
  }
  add(a.otherLabel?.trim() || 'Other income', 'OTHER', toNum(a.otherAmount),
      a.otherFreq === 'annual' ? 'ANNUAL' : a.otherFreq === 'onetime' ? 'ONETIME' : 'MONTHLY');

  const tax = a.taxMode === 'manual'
    ? { use_manual_tax_override: true, manual_effective_tax_rate: Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1) }
    : { ...DEFAULT_TAX };  // system-calculated (progressive estimate)

  return { user_id: uid, sources, tax };
}

function parseYM(s: any): { y: number; m: number } | null {
  const m = String(s ?? '').match(/(\d{4})-(\d{1,2})/);
  return m ? { y: +m[1], m: +m[2] } : null;
}
/** Is the job active in calendar month i (0-11) of `now`'s year? Ongoing → always. Temporary →
 *  within [start, end] (missing start = already started; missing end = still going). */
export function jobActiveMonth(op: Record<string, any> | null, i: number, now: Date = new Date()): boolean {
  const a = op ?? {};
  if (a.jobType !== 'temporary') return true;
  const cur = now.getFullYear() * 12 + i;
  const start = parseYM(a.jobStartDate), end = parseYM(a.jobEndDate);
  const startIdx = start ? start.y * 12 + (start.m - 1) : -Infinity;
  const endIdx = end ? end.y * 12 + (end.m - 1) : Infinity;
  return cur >= startIdx && cur <= endIdx;
}
/** How many months of `now`'s calendar year the job is active (12 for an ongoing job). */
export function salaryActiveMonths(op: Record<string, any> | null, now: Date = new Date()): number {
  let n = 0; for (let i = 0; i < 12; i++) if (jobActiveMonth(op, i, now)) n++; return n;
}
/** Salary income for the calendar year, honoring a temporary job's active months. */
export function salaryAnnual(op: Record<string, any> | null, now: Date = new Date()): number {
  return grossSalaryMonthly(op) * salaryActiveMonths(op, now);
}

/** Total annual income across every inflow (salary for months worked + bonus + signing + equity + net
 *  rental + self-employment/investment/benefits/support/scholarship/other). Includes non-taxable income. */
export function totalGrossAnnual(op: Record<string, any> | null, now: Date = new Date()): number {
  const a = op ?? {};
  const ex = extraIncome(op);
  return salaryAnnual(op, now) + toNum(a.bonusAnnual) + toNum(a.signingOnetime) + rsuAnnual(op) + rentalNetAnnual(op)
    + ex.taxableMonthly * 12 + ex.nontaxMonthly * 12 + ex.onetimeJan + retirementIncomeMonthly(op) * 12;
}

/** Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates. */
export function taxableAnnual(op: Record<string, any> | null, now: Date = new Date()): number {
  const a = op ?? {};
  const ex = extraIncome(op);
  return salaryAnnual(op, now) + toNum(a.bonusAnnual) + toNum(a.signingOnetime) + rsuAnnual(op) + rentalNetAnnual(op)
    + ex.taxableMonthly * 12 + ex.onetimeJan + retirementIncomeMonthly(op) * 12;
}

/** Effective tax rate in use: the user's manual rate, else the IRS-schedule estimate on taxable income. */
export function effectiveRate(op: Record<string, any> | null): number {
  const a = op ?? {};
  if (a.taxMode === 'manual') return Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1);
  return effectiveRateOnGross(taxableAnnual(op));
}

/** A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness:
 *  salary & net rental are steady every month; the annual bonus lands in December; the
 *  signing bonus is one-time (January); equity is the level annual vesting spread across the
 *  month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).
 *  mode: 'gross' (pre-tax), 'net' (after tax), or 'available' (net minus the locked 401(k)). */
export function incomeMonthlyGrid(op: Record<string, any> | null, mode: 'gross' | 'net' | 'available' = 'available', now: Date = new Date()): { label: string; amount: number }[] {
  const a = op ?? {};
  const salaryM = grossSalaryMonthly(op);
  // Temporary job: salary only counts in months between its start and end dates.
  const salaryActive = (i: number) => jobActiveMonth(op, i, now);
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

  const ex = extraIncome(op);
  const retIncMonthly = retirementIncomeMonthly(op);
  const nontaxFlat = toNum(a.benefitMonthly) + toNum(a.supportMonthly);   // genuinely monthly, non-taxable
  const schByMonth = scholarshipByCalendarMonth(op);                       // lumpy — placed in its months
  const bonusIdx = Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1));   // bonus month (default December)
  return MONTH_ABBR.map((label, i) => {
    // taxable steady inflows (salary honoring end-date, rental, equity, self-employment/investment/other)
    let taxable = (salaryActive(i) ? salaryM : 0) + rentalM + equityByMonth[i] + ex.taxableMonthly + retIncMonthly;
    if (i === bonusIdx) taxable += bonus;           // annual bonus → its month (default December)
    if (i === 0) taxable += signing + ex.onetimeJan; // signing + one-time other → first month
    const nontax = nontaxFlat + schByMonth[i];      // benefits/support steady; scholarships in their months
    const gross = taxable + nontax;                 // benefits/support/scholarship are non-taxable
    let amount = mode === 'gross' ? gross : taxable * (1 - rate) + nontax;
    if (mode === 'available') amount -= c401kM;     // employee 401(k) is locked away
    return { label, amount: round2(amount) };
  });
}

export { DEFAULT_TAX };
