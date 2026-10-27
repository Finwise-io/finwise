/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow, OpenAI package of 2026-10-24, PART 4 of 19:
 * "Benefits, retirement income and other income". Measured 2026-10-25 by CFR-1.
 * Cards: MK-CF-F-069 benefitActiveMonths · MK-CF-F-070 benefitAnnual · MK-CF-F-071 extraIncome · MK-CF-F-072
 * currentRetirementIncomeMonthly · MK-CF-F-073 otherIncomeMonth · MK-CF-F-074 tipsAnnual · MK-CF-F-075
 * retirementIncomeMonthly · MK-CF-F-076 guaranteedOutsideStreams · MK-CF-F-077 scholarshipByCalendarMonth · MK-CF-F-092
 * incomeMonthlyGrid (all src/domain/income/onboarding.ts).
 *
 * Source, unchanged: …/MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_04.json. Every
 * expected answer is READ FROM THE PACKAGE, never retyped. Results: returned/results/cashflow_openai_part04_results.json.
 * MEASURED ONLY: no app code, record or drawing was changed. Markers as in part 1's file.
 *
 * INPUT NAMES MAPPED:
 *   monthly / months → benefitMonthly / benefitMonths.
 *   self_employment (+ frequency) / self_employment_annual → seAmount with seFreq 'monthly' / 'annual'; dividends_annual →
 *     invAnnual, paid_to_bank false → invPaidToBank 'no'; support_monthly → supportMonthly; other_amount, frequency 'once',
 *     payment_date / month / year → otherAmount, otherFreq 'onetime', otherMonth, otherIncomeYear (absent when null);
 *     requested_year → the clock's year (held at 2026-10-24).
 *   streams {ss | pension | annuity | other | withdrawal | rmd: {payment, frequency}} → ri_ss, ri_pension, ri_annuities,
 *     ri_other, ri_withdrawals, ri_rmd with ri_<k>_freq; 'yearly' → the app's 'annual'. retirement_selected → whether
 *     incomeSources includes 'retirement_income' (false → ['salary']). source → the stream's kind.
 *   tips_monthly → tipsMonthly; active months → the wage's paid months (a dated table, the LAST months of 2026).
 *   awards → scholarships { amount, freq: 'monthly' | 'annual', months }.
 *   F-092: wage_gross_monthly / k_monthly → a steady monthly wage with c_401k; other_taxable_monthly → the title's "net
 *     rental cash" (C02, one named rental) or reinvested interest and dividends (C03: invAnnual = × 12, not paid to the
 *     bank); household_rate with rate_mode 'calculated' → the rate in force handed in as the CALCULATED rate
 *     (MK-CF-F-181 rateInForce stubbed to { rate, mine: false } for that call only — the grid reads the rate from there and
 *     nowhere else); planned_spend and debt_due are outflow, which the grid does not read. Expected tax = gross − net and
 *     k = net − take-home, the grid's own three stages.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  benefitActiveMonths, benefitAnnual, extraIncome, currentRetirementIncomeMonthly, otherIncomeMonth, tipsAnnual,
  retirementIncomeMonthly, guaranteedOutsideStreams, scholarshipByCalendarMonth, incomeMonthlyGrid, taxableAnnual,
} from '../../../src/domain/income/onboarding';
import { toNum } from '../../../src/domain/_shared/num';

/** FIXED (2026-10-26, FIX-INCOME-A): an APP WRONG case whose fix landed — the reviewer's answer a plain test, the old pin test.failing */
type Mark = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'OUTSIDE DOMAIN' | 'FIXED';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_04.json'), 'utf8'));
const C = (id: string): any => { const c = PART.cases.find((x: any) => x.case_id === id); if (!c) throw new Error(`no case ${id}`); return c; };
/** test.failing, or a plain test when the measurer sets CFR_STRICT to read each failure's own message */
const failing: jest.It = process.env.CFR_STRICT ? test : test.failing;
const RAN: string[] = [];
const ACT: Record<string, unknown> = {};
const DUMP = process.env.CFR4_DUMP;
afterAll(() => { if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(ACT, null, 1)); });
const kase = (id: string, mark: Mark, why: string, run: (c: any) => any, check: (c: any, got: any) => void, pin?: (got: any, c: any) => void) => {
  const c = C(id);
  RAN.push(id);
  const r = mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? failing : test;
  r(`${id} · ${c.kind} · ${c.title} [${mark}] — ${why}`, () => { const got = run(c); ACT[id] = got; check(c, got); });
  if (pin && mark === 'FIXED') test.failing(`${id} · the app until 2026-10-26, pinned (no longer its answer) [FIXED]`, () => pin(run(c), c));
  else if (pin) test(`${id} · the app's answer today, pinned [${mark}]`, () => pin(run(c), c));
};
const X = (s: any): number => { if (typeof s === 'number') return s; const m = /^(-?[\d.]+)\/([\d.]+)$/.exec(String(s)); return m ? Number(m[1]) / Number(m[2]) : Number(s); };
const money = (got: number, exp: any) => expect(got).toBeCloseTo(X(exp?.exact ?? exp), 6);
const refuses = (v: unknown) => expect(v == null).toBe(true);
const KEYS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
const paidLast = (n: number, amount = 5000) => Object.fromEntries(KEYS.map((k, i) => [k, i >= 12 - n ? amount : 0]));
const STREAM: Record<string, string> = { ss: 'ss', pension: 'pension', annuity: 'annuities', other: 'other', withdrawal: 'withdrawals', rmd: 'rmd' };
const FREQ: Record<string, string> = { monthly: 'monthly', quarterly: 'quarterly', yearly: 'annual' };
const retiree = (i: any) => ({ incomeSources: i.retirement_selected ? ['retirement_income'] : ['salary'],
  ...Object.fromEntries(Object.entries(i.streams).flatMap(([k, s]: [string, any]) => [[`ri_${STREAM[k]}`, s.payment], [`ri_${STREAM[k]}_freq`, FREQ[s.frequency]]])) });

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 24, 12, 0, 0)); });
afterAll(() => { jest.useRealTimers(); });

// ═══════════════════════════════════════════ THE 50 CASES ═══════════════════════════════════════════

describe('MK-CF-F-069 benefitActiveMonths · MK-CF-F-070 benefitAnnual — ten cases', () => {
  const op = (i: any) => ({ benefitMonthly: i.monthly, ...(i.months ? { benefitMonths: i.months } : {}) });
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-069-${id}`, 'AGREES', 'the months named, else all twelve', (c) => benefitActiveMonths(op(c.inputs) as any), (c, g) => expect(g).toEqual(c.expected.map((e: any) => X(e.exact))));
    kase(`MK-CF-F-070-${id}`, 'AGREES', 'monthly × the months it is paid', (c) => benefitAnnual(op(c.inputs) as any), (c, g) => money(g, c.expected));
  }
});

describe('MK-CF-F-071 extraIncome — five cases', () => {
  kase('MK-CF-F-071-C01', 'AGREES', '1,200 a month, not divided', (c) => extraIncome({ seAmount: c.inputs.self_employment, seFreq: c.inputs.frequency } as any),
    (c, g) => { money(g.taxableMonthly, c.expected.taxed_monthly); money(g.nontaxMonthly, c.expected.untaxed_monthly); });
  kase('MK-CF-F-071-C02', 'AGREES', 'taxed, and not spendable (DEC-0179)', (c) => extraIncome({ invAnnual: c.inputs.dividends_annual, invPaidToBank: c.inputs.paid_to_bank ? 'yes' : 'no' } as any),
    (c, g) => { money(g.taxableMonthly, c.expected.taxed_monthly); money(g.reinvestedMonthly, c.expected.reinvested_monthly); });
  kase('MK-CF-F-071-C03', 'AGREES', '(17,311.19 + 2,831.17) ÷ 12; support untaxed', (c) => extraIncome({ seAmount: c.inputs.self_employment_annual, seFreq: 'annual', invAnnual: c.inputs.dividends_annual, supportMonthly: c.inputs.support_monthly } as any),
    (c, g) => { money(g.taxableMonthly, c.expected.taxed_monthly); money(g.nontaxMonthly, c.expected.untaxed_monthly); });
  kase('MK-CF-F-071-C04', 'AGREES', 'a 2027 one-off is not 2026 income (DEC-7940)', (c) => extraIncome({ otherAmount: c.inputs.other_amount, otherFreq: 'onetime', otherMonth: Number(c.inputs.payment_date.slice(5, 7)), otherIncomeYear: Number(c.inputs.payment_date.slice(0, 4)) } as any),
    (c, g) => money(g.onetimeTaxable, c.expected.one_time_taxed));
  // APP WRONG — THE PRIORITY FINDING, REAL (DEC-0447 "income that arrives once ... lands in its own month"; DEC-7940
  // "one-time income keeps its month with its year and lands once"; DEC-0296). With no year the test is "no year, or this
  // year", so $2,000 is this year's income — and next year's, and every year's. Reachable: the sign-up "Other income" step
  // (src/onboarding/modules.tsx, income_other) shows January selected but saves no month and no year until a chip is
  // tapped; a profile saved before 2026-10-24 has no year at all.
  // FIXED 2026-10-25 (FIX-INCOME-B; landsOnce): with no year it waits — "year not entered", counted in no year, and in no month of
  // the month tables (MK-CF-F-088, MK-CF-F-092, MK-XS-F-004)
  kase('MK-CF-F-071-C05', 'AGREES', 'FIXED 2026-10-25: a one-time amount with no year waits until its year is known (DEC-0447, DEC-7940)',
    (c) => extraIncome({ otherAmount: c.inputs.other_amount, otherFreq: 'onetime', otherMonth: c.inputs.month } as any).onetimeTaxable,
    (c, g) => {
      expect(c.expected.state).toBe('REFUSES'); refuses(g);
      const op: any = { otherAmount: 2000, otherFreq: 'onetime', otherMonth: 9, taxMode: 'manual', manualTaxRate: 0 };
      expect(taxableAnnual(op)).toBe(0);
      expect(incomeMonthlyGrid(op, 'gross')[8].amount).toBe(0);
    });
  test.failing('MK-CF-F-071-C05 · what the app gave before the fix (pinned, now failing): $2,000 this year, and still $2,000 in 2028', () => {
    expect(extraIncome({ otherAmount: 2000, otherFreq: 'onetime', otherMonth: 9 } as any).onetimeTaxable).toBe(2000);
  });
});

describe('MK-CF-F-072 currentRetirementIncomeMonthly · MK-CF-F-075 retirementIncomeMonthly · MK-CF-F-076 guaranteedOutsideStreams — fifteen cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-072-${id}`, 'AGREES', 'monthly equivalents, only when received now', (c) => currentRetirementIncomeMonthly(retiree(c.inputs) as any), (c, g) => money(g, c.expected));
    kase(`MK-CF-F-075-${id}`, 'AGREES', 'monthly equivalents of every stream', (c) => retirementIncomeMonthly(retiree(c.inputs) as any), (c, g) => money(g, c.expected));
    kase(`MK-CF-F-076-${id}`, 'AGREES', 'outside money only — no withdrawals, no RMDs (DEC-0244, DEC-0307)', (c) => guaranteedOutsideStreams(retiree(c.inputs) as any),
      (c, g) => { expect(g.map((r: any) => r.kind)).toEqual(c.expected.map((e: any) => e.source)); c.expected.forEach((e: any, n: number) => { money(g[n].monthly, e.monthly); expect(g[n].inflates).toBe(e.inflates); }); });
  }
});

describe('MK-CF-F-073 otherIncomeMonth — five cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-073-${id}`, 'AGREES', 'the month entered; January when none', (c) => otherIncomeMonth({ otherMonth: c.inputs.month } as any), (c, g) => expect(g).toBe(X(c.expected.exact)));
});

describe('MK-CF-F-074 tipsAnnual — five cases', () => {
  kase('MK-CF-F-074-C01', 'AGREES', '300 × 12', (c) => tipsAnnual({ tipsMonthly: c.inputs.tips_monthly, salaryFreq: 'monthly', salaryByMonth: paidLast(c.inputs.household_active_months) } as any), (c, g) => money(g, c.expected));
  kase('MK-CF-F-074-C02', 'AGREES', '300 × 6', (c) => tipsAnnual({ tipsMonthly: c.inputs.tips_monthly, salaryFreq: 'monthly', salaryByMonth: paidLast(c.inputs.household_active_months) } as any), (c, g) => money(g, c.expected));
  // OUTSIDE DOMAIN (C03–C05): these need tips that belong to ONE earner, whose paid months differ from the household's. The
  // app keeps tips as one household figure (tipsMonthly, top level, no earner), and no screen writes it at all — read from
  // the source below: only the type, a test persona and readers mention it. The literal household reading is pinned.
  const tipsWriters = () => {
    const ROOT = path.join(__dirname, '../../..');
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
      ? (e.name === 'node_modules' || e.name === '__tests__' ? [] : walk(path.join(d, e.name)))
      : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
    const files = ['src', 'app', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
    expect(files.length).toBeGreaterThanOrEqual(250);   // the guard proves it looked
    return files.filter((f) => /tipsMonthly/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f)).sort();
  };
  const outside = (c: any) => {
    expect(c.inputs.tipped_earner_active_months).not.toBe(c.inputs.household_active_months);
    // re-measured 2026-10-25 (FIX-INCOME-B): src/domain/cashflow/index.ts no longer reads tipsMonthly — its reader, MK-CF-F-020
    // cashflowYear, was retired by FIX-BILLS the same day. Still only the type, a test persona and readers; still no writer.
    expect(tipsWriters()).toEqual(['MoneyKeel/functions/cashflow/income-summary.ts', 'src/domain/grid/index.ts',
      'src/domain/income/onboarding.ts', 'src/domain/onboardingProfile.ts', 'src/onboarding/modules.tsx', 'src/testing/personas.ts']);
    expect(fs.readFileSync(path.join(__dirname, '../../../src/onboarding/modules.tsx'), 'utf8')).not.toMatch(/setAnswer\('tipsMonthly'/);
  };
  const household = (c: any) => tipsAnnual({ tipsMonthly: c.inputs.tips_monthly, salaryFreq: 'monthly', salaryByMonth: paidLast(c.inputs.household_active_months) } as any);
  kase('MK-CF-F-074-C03', 'OUTSIDE DOMAIN', 'tips have no earner, and no screen writes them', household, outside, (g) => expect(g).toBeCloseTo(313.17 * 12, 6));
  kase('MK-CF-F-074-C04', 'OUTSIDE DOMAIN', 'tips have no earner, and no screen writes them', household, outside, (g) => expect(g).toBeCloseTo(427.19 * 9, 6));
  kase('MK-CF-F-074-C05', 'OUTSIDE DOMAIN', 'tips have no earner, and no screen writes them', household, outside, (g) => expect(g).toBe(3600));
});

describe('MK-CF-F-077 scholarshipByCalendarMonth — five cases', () => {
  const run = (c: any) => scholarshipByCalendarMonth({ scholarships: c.inputs.awards.map((a: any) => ({ amount: a.amount, freq: a.frequency === 'monthly' ? 'monthly' : 'annual', ...(a.months ? { months: a.months } : {}) })) } as any);
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-077-${id}`, 'AGREES', 'each award in its own months', run, (c, g) => { expect(g).toHaveLength(12); c.expected.forEach((e: any, i: number) => money(g[i], e)); });
});

describe('MK-CF-F-092 incomeMonthlyGrid — five cases', () => {
  const taxRate = require('../../../src/domain/income/tax-rate');
  const op = (i: any) => ({
    baseSalary: i.wage_gross_monthly, salaryFreq: 'monthly', c_401k: i.k_monthly,
    ...(/rental/i.test(i._title) && toNum(i.other_taxable_monthly) > 0 ? { rentals: [{ property_id: 'A', income: i.other_taxable_monthly, expenses: 0 }] } : {}),
    ...(toNum(i.reinvested_monthly) > 0 ? { invAnnual: toNum(i.other_taxable_monthly) * 12, invPaidToBank: 'no' } : {}),
  });
  /** gross, tax, 401(k) and take-home of one month, with the case's household rate handed in as the calculated rate */
  const run = (c: any) => {
    const spy = jest.spyOn(taxRate, 'rateInForce').mockReturnValue({ rate: X(c.inputs.household_rate), source: 'estimated', mine: false, label: '', covers: '' });
    try {
      const o = op({ ...c.inputs, _title: c.title });
      const [g, n, a] = (['gross', 'net', 'available'] as const).map((m) => incomeMonthlyGrid(o as any, m, new Date(2026, 9, 24))[9].amount);
      return { gross: g, tax: g - n, k: n - a, take_home: a, rateCalls: spy.mock.calls.length };
    } finally { spy.mockRestore(); }
  };
  const check = (c: any, g: any) => { expect(g.rateCalls).toBeGreaterThan(0); for (const k of ['gross', 'tax', 'k', 'take_home']) money(g[k], c.expected[k]); };
  kase('MK-CF-F-092-C01', 'AGREES', '5000 × (1 − 0.1) − 500', run, check);
  kase('MK-CF-F-092-C02', 'AGREES', 'the calculated rate on wage and rent alike', run, check);
  kase('MK-CF-F-092-C03', 'AGREES', 'reinvested income taxed, not landed (DEC-0179)', run, check);
  // RULE UNCLEAR in the package — SETTLED, and the app is on the wrong side: DEC-7938 ("a take-home typed as $6,200 reads
  // $6,200"), the founder's base-pay rule of 2026-08-27 (DEC-0176, "if they told us, that IS take-home") and tenet 5 pick the
  // first reading, "use recorded take-home". The case names the F-233 part-year fixture and gives no typed figure of its
  // own, so the July starter of the brief's worked example is the household measured: the grid lands $7,598.34 in July
  // where $3,799.17 was typed.
  // FIXED 2026-10-26 (FIX-INCOME-A, MK-CF-F-233 earnerWageShares): the July starter's paid month lands the $3,799.17 typed
  kase('MK-CF-F-092-C04', 'FIXED', 'settled by DEC-7938 / DEC-0176: the typed take-home lands, not × 12 (the July starter) — FIXED 2026-10-26',
    () => {
      const july = { salaryFreq: 'monthly', c_401k: '501.13', landsTypical: '3799.17', salaryByMonth: Object.fromEntries(KEYS.map((k, i) => [k, i >= 6 ? 60000.30 / 6 : 0])) };
      return incomeMonthlyGrid(july as any, 'available', new Date(2026, 9, 24))[6].amount;
    },
    (c, g) => { expect(c.expected.state).toBe('RULE UNCLEAR'); expect(c.expected.readings.correct_paid_month).toBe('use recorded take-home'); expect(g).toBeCloseTo(3799.17, 6); },
    (g) => expect(g).toBeCloseTo(7598.34, 2));
  kase('MK-CF-F-092-C05', 'AGREES', 'a known zero month', run, check);
});

describe('coverage — part 4', () => {
  test('50 of 50 cases run, each once', () => {
    expect(PART.cases.length).toBe(50);
    expect([...RAN].sort()).toEqual(PART.cases.map((x: any) => x.case_id).sort());
  });
});

// ═══════════════════ FORMULA VERDICTS (3 of 10 not RIGHT) AND RULES (3 of 20 NOT HELD) ═══════════════════
const FORMULA: Record<string, Mark> = { 'MK-CF-F-071': 'APP WRONG', 'MK-CF-F-074': 'OUTSIDE DOMAIN', 'MK-CF-F-092': 'APP WRONG' };
const RULES: Record<string, Mark> = { 'DEC-0003': 'APP WRONG', 'DEC-0447': 'APP WRONG', 'DEC-7940': 'APP WRONG' };
describe('formula verdicts and rules — part 4', () => {
  test('every verdict that is not RIGHT, and every rule NOT HELD, is classified here (3 and 3)', () => {
    expect(Object.keys(FORMULA).sort()).toEqual(PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id).sort());
    expect(Object.keys(RULES).sort()).toEqual(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule).sort());
    expect(PART.formula_checks.length).toBe(10);
    expect(PART.rules_held.length).toBe(20);
  });
  // MK-CF-F-071's second point, "general taxability also needs source-specific classification" — real for unemployment:
  // every benefit is put in untaxed income, and the Benefits step says "We won't tax this income." even when Unemployment is
  // chosen. Unemployment compensation is income you are taxed on (Internal Revenue Code §85(a); IRS Publication 525). APP WRONG.
  // FIXED 2026-10-25 (FIX-INCOME-B; unemploymentMonthly): unemployment pay is taxed, in the months it is paid; the Benefits step says
  // so ("Unemployment pay is taxed, so we count it in what you are taxed on.") — dated row on income-end-to-end_v07 of 2026-10-25
  test('MK-CF-F-071 · $1,000 a month of unemployment benefits is taxed income (IRC §85) — FIXED 2026-10-25', () => {
    const ex = extraIncome({ benefitMonthly: 1000, benefitTypes: ['unemployment'] } as any);
    expect(ex.taxableMonthly).toBe(1000);
    expect(ex.nontaxMonthly).toBe(0);
    expect(taxableAnnual({ benefitMonthly: 1000, benefitTypes: ['unemployment'] } as any)).toBe(12000);
    // paid July to December: $1,000 taxed in each of those months, $6,000 in the year
    const half: any = { benefitMonthly: 1000, benefitTypes: ['unemployment'], benefitMonths: [7, 8, 9, 10, 11, 12] };
    expect(taxableAnnual(half)).toBe(6000);
    // SNAP beside it, the unemployment part typed: only that part is taxed
    expect(taxableAnnual({ benefitMonthly: 1300, benefitTypes: ['snap', 'unemployment'], unemploymentMonthly: '1000' } as any)).toBe(12000);
    const step = fs.readFileSync(path.join(__dirname, '../../../src/onboarding/modules.tsx'), 'utf8');
    expect(step).toContain('Unemployment pay is taxed, so we count it in what you are taxed on.');
  });
  test.failing('MK-CF-F-071 · what the app gave before the fix (pinned, now failing): unemployment untaxed — $12,000 a year left out of what is taxed', () => {
    const op = { benefitMonthly: 1000, benefitTypes: ['unemployment'] };
    expect(extraIncome(op as any)).toMatchObject({ taxableMonthly: 0, nontaxMonthly: 1000 });
    expect(taxableAnnual(op as any)).toBe(0);
  });
});
