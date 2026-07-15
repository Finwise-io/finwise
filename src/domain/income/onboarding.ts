// Map onboarding answers → the Income domain (blueprint §5 + the Income service spec).
// Captures the full set of job inflows (salary monthly, bonus annual, RSUs valued as
// shares × price, signing bonus one-time), rental property (income − operating expenses),
// and the tax config (SYSTEM_CALCULATED vs MANUAL_OVERRIDE).
import type { UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { grossFromNet, effectiveRateOnGross } from './tax';
import { IncomeDoc, IncomeSource, WhoEarns, DEFAULT_TAX } from './types';
import type { OnboardingProfile } from '../onboardingProfile';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// How many pay periods per year for each salary cadence (hourly = 40h/wk × 52).
export const SALARY_PERIODS: Record<string, number> = {
  hourly: 2080, weekly: 52, biweekly: 26, monthly: 12, annually: 1,
};

/** Default weekly hours for an hourly worker when they haven't said otherwise. */
export const DEFAULT_HOURS_PER_WEEK = 40;

/** Annual amount of what the user ENTERED (not grossed up) — for display.
 *  Hourly annualizes by the user's actual hours/week × 52 (no fixed 40h assumption). */
export function annualizedEnteredSalary(op: OnboardingProfile | null): number {
  const a = op ?? {};
  if ((a.salaryFreq ?? 'monthly') === 'hourly') {
    const hrs = toNum(a.hoursPerWeek) || DEFAULT_HOURS_PER_WEEK;
    return toNum(a.baseSalary) * hrs * 52;
  }
  return toNum(a.baseSalary) * (SALARY_PERIODS[a.salaryFreq ?? 'monthly'] ?? 12);
}

/** A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly). */
function enteredMonthlyRaw(a: Record<string, any>): number {
  if ((a.salaryFreq ?? 'monthly') === 'hourly') {
    const hrs = toNum(a.hoursPerWeek) || DEFAULT_HOURS_PER_WEEK;
    return (toNum(a.baseSalary) * hrs * 52) / 12;
  }
  return (toNum(a.baseSalary) * (SALARY_PERIODS[a.salaryFreq] ?? 12)) / 12;
}

/** Per-month GROSS base salary, Jan→Dec. The `salaryByMonth` table (12 entries) is the source of
 *  truth when present — set $0 for a gap, raise mid-year, etc.; otherwise a single entered amount is
 *  applied to every month. Take-home entries are grossed up (annual net → gross via the tax schedule,
 *  scaled per month so the month-to-month shape is preserved). */
export function salaryGrossByMonth(op: OnboardingProfile | null): number[] {
  const a = op ?? {};
  const tbl = Array.isArray(a.salaryByMonth) && a.salaryByMonth.length === 12 ? a.salaryByMonth : null;
  const raw: number[] = tbl ? tbl.map((x: any) => toNum(x)) : new Array(12).fill(enteredMonthlyRaw(a));
  if (a.salaryMode === 'takehome') {
    const net = raw.reduce((t, x) => t + x, 0);
    const gross = net > 0 ? grossFromNet(net) : 0;
    const scale = net > 0 ? gross / net : 1;
    return raw.map((x) => round2(x * scale));
  }
  return raw.map((x) => round2(x));
}

/** A representative full-month GROSS salary (the highest month — undiluted by $0 gap months). */
export function grossSalaryMonthly(op: OnboardingProfile | null): number {
  const arr = salaryGrossByMonth(op);
  return arr.length ? Math.max(...arr) : 0;
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
export function equityCashFlow(op: OnboardingProfile | null): { year: number; amount: number }[] {
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
export function rsuAnnual(op: OnboardingProfile | null): number {
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
export function rentalList(op: OnboardingProfile | null): { type: 'long' | 'short'; income: number; expenses: number }[] {
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
export function rentalNetAnnual(op: OnboardingProfile | null): number {
  return rentalList(op).reduce((t, r) => t + (r.income - r.expenses), 0) * 12;
}

/** Calendar months (1-12) benefits are received — e.g. unemployment that starts in July is
 *  [7..12]. Absent/empty = ongoing, all 12 months. */
export function benefitActiveMonths(op: OnboardingProfile | null): number[] {
  const m = Array.isArray(op?.benefitMonths) ? op!.benefitMonths!.filter((x) => x >= 1 && x <= 12) : [];
  return m.length ? [...m].sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

/** Annual benefits = monthly amount × the months it's actually received. */
export function benefitAnnual(op: OnboardingProfile | null): number {
  return toNum(op?.benefitMonthly) * benefitActiveMonths(op).length;
}

/** Extra income sources beyond salary/rental/equity (self-employment, investment, benefits, support,
 *  scholarship, other), split into taxable vs non-taxable steady monthly amounts + a one-time Jan amount.
 *  Benefits, support, and scholarships are treated as non-taxable for planning. */
export function extraIncome(op: OnboardingProfile | null): {
  taxableMonthly: number; nontaxMonthly: number; onetimeTaxable: number; onetimeNontax: number;
} {
  const a = op ?? {};
  const seM = (a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount));
  const invM = toNum(a.invAnnual) / 12;
  const benM = benefitAnnual(a) / 12;             // annual average — honors active months
  const supM = toNum(a.supportMonthly);
  const schList = Array.isArray(a.scholarships) ? a.scholarships : null;
  const schM = schList
    ? schList.reduce((t: number, x: any) => t + (x?.freq === 'monthly' ? toNum(x?.amount) : toNum(x?.amount) / 12), 0)
    : (a.scholarshipFreq === 'monthly' ? toNum(a.scholarshipAmount) : toNum(a.scholarshipAmount) / 12);
  const othFreq = a.otherFreq ?? 'monthly';
  const othM = othFreq === 'annual' ? toNum(a.otherAmount) / 12 : othFreq === 'monthly' ? toNum(a.otherAmount) : 0;
  const othOnce = othFreq === 'onetime' ? toNum(a.otherAmount) : 0;
  const othTaxable = a.otherTaxable !== 'no';   // gifts aren't taxable income to the recipient
  // NOTE: tips are job income — handled with salary (gated to active job months), NOT here.
  return {
    taxableMonthly: round2(seM + invM + (othTaxable ? othM : 0)),
    nontaxMonthly: round2(benM + supM + schM + (othTaxable ? 0 : othM)),
    onetimeTaxable: round2(othTaxable ? othOnce : 0),
    onetimeNontax: round2(othTaxable ? 0 : othOnce),
  };
}

/** Retirement income (ri_*) counts as CURRENT income only when the user actually receives it
 *  now — i.e. 'retirement_income' is among their selected income sources (or there's no source
 *  list: the legacy retired flow). ri_* set elsewhere (e.g. the outlook's future-Social-Security
 *  editor) feeds the retirement model, NOT today's cash flow — without this gate, a working
 *  40-year-old's future SS inflates today's free cash. */
export function currentRetirementIncomeMonthly(op: OnboardingProfile | null): number {
  const srcs = op?.incomeSources;
  if (Array.isArray(srcs) && !srcs.includes('retirement_income')) return 0;
  return retirementIncomeMonthly(op);
}

/** Calendar month (1-12) a one-time "other income" lands in (default January). */
export function otherIncomeMonth(op: OnboardingProfile | null): number {
  return Math.min(12, Math.max(1, toNum(op?.otherMonth) || 1));
}

/** Tips are part of employment income — they only count in the months the job is active, and the
 *  annual figure is prorated like salary (a temp job that ends stops the tips too). */
export function tipsAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  return toNum((op ?? {}).tipsMonthly) * salaryActiveMonths(op, now);
}

/** Per-month divisor for a cadence (monthly=1, quarterly=3, annual=12). */
const RI_CAD_DIV: Record<string, number> = { monthly: 1, quarterly: 3, annual: 12 };

/** Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.
 *  Each source carries its own cadence in `ri_<k>_freq`; normalize to per-month. */
export function retirementIncomeMonthly(op: OnboardingProfile | null): number {
  const a = op ?? {};
  return ['ss', 'pension', 'withdrawals', 'rmd', 'annuities', 'other']
    .reduce((t, k) => t + toNum((a as any)['ri_' + k]) / (RI_CAD_DIV[(a as any)['ri_' + k + '_freq']] ?? 1), 0);
}

/** Scholarships/grants placed in the calendar months they actually land (Jan→Dec) — NOT averaged.
 *  A yearly award is split across the months chosen; a monthly award repeats every month. */
export function scholarshipByCalendarMonth(op: OnboardingProfile | null): number[] {
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
export function employerMatchMonthly(op: OnboardingProfile | null): number {
  const a = op ?? {};
  const val = toNum(a.employerMatchValue);
  return a.employerMatchMode === 'pct' ? (toNum(a.c_401k) * val) / 100 : val;
}

export function incomeFromOnboarding(uid: UserId, op: OnboardingProfile | null): IncomeDoc {
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

  // B-34: book the TRUE annual salary (sum of the by-month table), expressed as a monthly average so
  // the employer-match annualization stays correct. Using the max month here inflated income for
  // anyone with $0 gap months (e.g. 6-on/6-off), and disagreed with totalGrossAnnual elsewhere.
  add('Base salary', 'W2_JOB', salaryAnnual(op) / 12, 'MONTHLY', { employer_match_amount: employerMatchMonthly(op) });
  add('Bonus', 'W2_JOB', toNum(a.bonusAnnual), 'ANNUAL', { landing_month: Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12)) });
  add('Equity comp', 'W2_JOB', rsuAnnual(op), 'ANNUAL');  // RSUs + options, summed across grants
  add('Signing bonus', 'W2_JOB', toNum(a.signingOnetime), 'ONETIME', { landing_month: 1 });

  for (const r of rentalList(op)) sources.push({
    income_source_id: newEntityId('inc'), label: 'Rental property',
    income_type: r.type === 'short' ? 'SHORT_TERM_RENTAL' : 'LONG_TERM_RENTAL',
    gross_amount: r.income, frequency: 'MONTHLY', operating_expenses: r.expenses, who_earns: who,
  });

  // Additional sources (self-employment, investment, benefits, support, scholarship, other)
  add('Tips', 'W2_JOB', tipsAnnual(op) / 12, 'MONTHLY');   // B-34: tips ride with worked months, not a flat ×12
  add('Retirement income', 'OTHER', currentRetirementIncomeMonthly(op), 'MONTHLY');
  add('Self-employment', 'SELF_EMPLOYMENT', a.seFreq === 'annual' ? toNum(a.seAmount) : toNum(a.seAmount), a.seFreq === 'annual' ? 'ANNUAL' : 'MONTHLY');
  add('Interest & dividends', 'INVESTMENT', toNum(a.invAnnual), 'ANNUAL');
  add('Benefits', 'BENEFIT', benefitAnnual(a) / 12, 'MONTHLY');
  add('Child support / alimony', 'SUPPORT', toNum(a.supportMonthly), 'MONTHLY');
  if (Array.isArray(a.scholarships)) {
    for (const x of a.scholarships) add(x?.label?.trim() || 'Scholarship / grant', 'SCHOLARSHIP', toNum(x?.amount), x?.freq === 'monthly' ? 'MONTHLY' : 'ANNUAL');
  } else {
    add('Scholarship / grant', 'SCHOLARSHIP', toNum(a.scholarshipAmount), a.scholarshipFreq === 'monthly' ? 'MONTHLY' : 'ANNUAL');
  }
  add(a.otherLabel?.trim() || 'Other income', 'OTHER', toNum(a.otherAmount),
      a.otherFreq === 'annual' ? 'ANNUAL' : a.otherFreq === 'onetime' ? 'ONETIME' : 'MONTHLY',
      { landing_month: Math.min(12, Math.max(1, toNum(a.otherMonth) || 1)) });

  const tax = a.taxMode === 'manual'
    ? { use_manual_tax_override: true, manual_effective_tax_rate: Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1) }
    : { ...DEFAULT_TAX };  // system-calculated (progressive estimate)

  return { user_id: uid, sources, tax };
}

/** Is base salary present in calendar month i (0-11)? Driven by the per-month table. */
export function jobActiveMonth(op: OnboardingProfile | null, i: number, _now: Date = new Date()): boolean {
  return salaryGrossByMonth(op)[((i % 12) + 12) % 12] > 0;
}
/** How many months of the year you draw a salary. */
export function salaryActiveMonths(op: OnboardingProfile | null, _now: Date = new Date()): number {
  return salaryGrossByMonth(op).filter((x) => x > 0).length;
}
/** Salary income for the year = sum of the per-month gross salary. */
export function salaryAnnual(op: OnboardingProfile | null, _now: Date = new Date()): number {
  return salaryGrossByMonth(op).reduce((t, x) => t + x, 0);
}

/** Total annual income across every inflow (salary for months worked + bonus + signing + equity + net
 *  rental + self-employment/investment/benefits/support/scholarship/other). Includes non-taxable income. */
export function totalGrossAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  const a = op ?? {};
  const ex = extraIncome(op);
  return salaryAnnual(op, now) + tipsAnnual(op, now) + toNum(a.bonusAnnual) + toNum(a.signingOnetime) + rsuAnnual(op) + rentalNetAnnual(op)
    + ex.taxableMonthly * 12 + ex.nontaxMonthly * 12 + ex.onetimeTaxable + ex.onetimeNontax + currentRetirementIncomeMonthly(op) * 12;
}

/** Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates. */
export function taxableAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  const a = op ?? {};
  const ex = extraIncome(op);
  return salaryAnnual(op, now) + tipsAnnual(op, now) + toNum(a.bonusAnnual) + toNum(a.signingOnetime) + rsuAnnual(op) + rentalNetAnnual(op)
    + ex.taxableMonthly * 12 + ex.onetimeTaxable + currentRetirementIncomeMonthly(op) * 12;
}

/** Effective tax rate in use: the user's manual rate, else the IRS-schedule estimate on taxable income. */
/** PRD F2#11 — the ONE per-calendar-month effective tax-rate vector (Jan→Dec). Estimate mode:
 *  progressive bracket-filling over the calendar-year taxable profile, so a bonus month carries
 *  its real higher withholding while Σ monthly tax === the annual schedule EXACTLY. Manual mode:
 *  the user's flat rate in every month — their explicit number always wins. Both money grids
 *  (this module's and the dated F2 grid) read THIS vector, so they cannot disagree on take-home. */
export function monthlyTaxRates(op: OnboardingProfile | null, now: Date = new Date()): number[] {
  const a = op ?? {};
  const flat = effectiveRate(op);
  if (a.taxMode === 'manual') return new Array(12).fill(flat);
  const taxable = taxableByCalendarMonth(op, now);
  const total = taxable.reduce((t, g) => t + g, 0);
  if (total <= 0) return new Array(12).fill(flat);
  const { progressiveMonthlyTax } = require('./tax');
  const tax = progressiveMonthlyTax(taxable);
  return taxable.map((g, i) => (g > 0 ? Math.min(0.6, Math.max(0, tax[i] / g)) : flat));
}

/** The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses,
 *  extracted so the rate vector and the grid can never drift apart. */
export function taxableByCalendarMonth(op: OnboardingProfile | null, now: Date = new Date()): number[] {
  const a = op ?? {};
  const salByMonth = salaryGrossByMonth(op);
  const tipsM = toNum(a.tipsMonthly);
  const rentalM = rentalNetAnnual(op) / 12;
  const ex = extraIncome(op);
  const retIncMonthly = currentRetirementIncomeMonthly(op);
  const eqAnnual = rsuAnnual(op);
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
  if (totalV > 0) for (let i = 0; i < 12; i++) equityByMonth[i] = eqAnnual * (weights[i] / totalV);
  const bonusIdx = Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1));
  const otherIdx = otherIncomeMonth(op) - 1;
  return new Array(12).fill(0).map((_, i) => {
    let t = salByMonth[i] + (salByMonth[i] > 0 ? tipsM : 0) + rentalM + equityByMonth[i] + ex.taxableMonthly + retIncMonthly;
    if (i === bonusIdx) t += toNum(a.bonusAnnual);
    if (i === 0) t += toNum(a.signingOnetime);
    if (i === otherIdx) t += ex.onetimeTaxable;
    return t;
  });
}

export function effectiveRate(op: OnboardingProfile | null): number {
  const a = op ?? {};
  if (a.taxMode === 'manual') return Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1);
  return effectiveRateOnGross(taxableAnnual(op));
}

/** A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness:
 *  salary & net rental are steady every month; the annual bonus lands in December; the
 *  signing bonus is one-time (January); equity is the level annual vesting spread across the
 *  month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).
 *  mode: 'gross' (pre-tax), 'net' (after tax), or 'available' (net minus the locked 401(k)). */
export function incomeMonthlyGrid(op: OnboardingProfile | null, mode: 'gross' | 'net' | 'available' = 'available', now: Date = new Date()): { label: string; amount: number }[] {
  const a = op ?? {};
  const salByMonth = salaryGrossByMonth(op);   // per-month gross base salary (table-driven)
  const tipsM = toNum(a.tipsMonthly);          // tips ride with the job (only in months you're paid)
  const rentalM = rentalNetAnnual(op) / 12;
  const bonus = toNum(a.bonusAnnual);
  const signing = toNum(a.signingOnetime);
  const c401kM = toNum(a.c_401k);
  const rates = monthlyTaxRates(op, now);   // PRD F2#11 — per-month withholding, one shared vector

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
  const retIncMonthly = currentRetirementIncomeMonthly(op);
  const nontaxFlat = toNum(a.supportMonthly);                              // genuinely monthly, non-taxable
  const benM = toNum(a.benefitMonthly);                                    // benefits land in THEIR months
  const benSet = new Set(benefitActiveMonths(op));
  const schByMonth = scholarshipByCalendarMonth(op);                       // lumpy — placed in its months
  const bonusIdx = Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1));   // bonus month (default December)
  const otherIdx = otherIncomeMonth(op) - 1;                                      // one-time other → its month
  return MONTH_ABBR.map((label, i) => {
    // taxable steady inflows (salary honoring end-date, rental, equity, self-employment/investment/other)
    let taxable = salByMonth[i] + (salByMonth[i] > 0 ? tipsM : 0) + rentalM + equityByMonth[i] + ex.taxableMonthly + retIncMonthly;
    if (i === bonusIdx) taxable += bonus;           // annual bonus → its month (default December)
    if (i === 0) taxable += signing;                 // signing bonus → first month
    if (i === otherIdx) taxable += ex.onetimeTaxable;   // one-time other → ITS month
    const nontax = nontaxFlat + schByMonth[i] + (benSet.has(i + 1) ? benM : 0)
      + (i === otherIdx ? ex.onetimeNontax : 0);    // support steady; benefits/scholarships/gifts in their months
    const gross = taxable + nontax;                 // benefits/support/scholarship are non-taxable
    let amount = mode === 'gross' ? gross : taxable * (1 - rates[i]) + nontax;
    if (mode === 'available') amount -= c401kM;     // employee 401(k) is locked away
    return { label, amount: round2(amount) };
  });
}

export { DEFAULT_TAX };
