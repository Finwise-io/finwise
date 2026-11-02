/* THE OUTSIDE CASES, RUN AGAINST THE APP — Cash flow, OpenAI package of 2026-10-24, PART 1 of 19:
 * "Wages — what is paid, in which months, and the year it makes". Measured 2026-10-25 by CFR-1.
 * Cards: MK-CF-F-059 annualizedEnteredSalary · MK-CF-F-130 enteredMonthlyRaw · MK-CF-F-060 salaryGrossByMonth ·
 * MK-CF-F-177 wageGrossByMonth · MK-CF-F-061 grossSalaryMonthly · MK-CF-F-080 jobActiveMonth · MK-CF-F-081
 * salaryActiveMonths · MK-CF-F-082 salaryAnnual · MK-CF-F-083 totalGrossAnnual · MK-CF-F-206 householdK401ByMonth ·
 * MK-CF-F-233 earnerWageShares · MK-CF-F-234 wagesLandingByMonth · MK-CF-F-078 employerMatchMonthly · MK-CF-F-178
 * wageMatchMonthly · MK-CF-F-079 incomeFromOnboarding (all src/domain/income/onboarding.ts).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/
 * MoneyKeel_CashFlow_Independent_Audit/audit_results/MoneyKeel_CashFlow_Audit_Part_01.json. Every expected answer is READ
 * FROM THE PACKAGE (C(id).expected), never retyped; only the plain input names are mapped onto the app's fields.
 * Results, case by case: MoneyKeel/documents/audit/outside-test-cases/returned/results/cashflow_openai_part01_results.json
 *
 * MEASURED ONLY: no app code, record or drawing was changed.
 *
 * Markers: AGREES (plain test on the reviewer's answer) · APP WRONG (test.failing on the reviewer's answer, plus a plain
 * test pinning the app's answer today, so the pair flips when it is fixed) · REVIEWER WRONG (test.failing on the reviewer's
 * answer, plus a plain test pinning the app's answer with the decision in its name) · NEEDS A RULING (the app's answer
 * pinned) · OUTSIDE DOMAIN (a plain test proving no caller can send the input, plus the literal answer pinned).
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   amount / frequency / hours_per_week → baseSalary / salaryFreq / hoursPerWeek on one wage.
 *   earner_N_months, gross_months (Jan→Dec) → that wage's salaryByMonth as dated keys '2026-01'…'2026-12' (the canonical
 *     store, salary-months.ts); earner 2 → partnerWage with whoEarns 'both'. The clock is held at the cases' as_of,
 *     2026-10-24, because wageGrossByMonth reads "this calendar year" from the device clock.
 *   typical / table → baseSalary (monthly) / salaryByMonth.
 *   gross_annual over paid_months → that many paid months at gross_annual ÷ paid_months, the LAST months of 2026 (July on
 *     for six, October on for three), zero before; k_monthly_when_paid → c_401k; take_home_monthly_when_paid → landsTypical
 *     (the take-home Your base pay asks for "each month").
 *   correct_own_shares (F-234) → the only way the app takes an earner's share: their typed take-home on a full year,
 *     T = gross × (1 − share) − 401(k) (that is the share earnerWageShares works back). The part-year witness (C04) is the
 *     F-233 July starter, as the case's note says.
 *   wage_annual etc. (F-083) → baseSalary = wage ÷ 12; rental_net_annual → one named rental (property 'A') with the net ÷ 12
 *     as rent (a loss as running costs); interest_annual → invAnnual; untaxed_support_annual → supportMonthly = ÷ 12;
 *     bonus → bonusAnnual + bonusMonth; vesting → one RSU row (1 share at the amount, its date); employee 401(k) → c_401k ÷ 12.
 *   match_percent_of_contribution / flat_other_match → employerMatchMode 'pct' / 'dollar' with employerMatchValue (the
 *     screen offers one or the other per earner). A percent AND a flat amount (C04): two independent calls (F-178), and for
 *     the household figure (F-078) two earners, one of each, which is how employerMatchMonthly receives two matches.
 *   signing_bonus → signingOnetime; bonus / bonus_month → bonusAnnual / bonusMonth; rent {property, monthly, cost} → rentals.
 * enteredMonthlyRaw is not exported: it is compiled from its own source text in onboarding.ts, its imports handed in.
 * TOLERANCES: money to 1e-6 dollars, shares to 1e-12 — floating sums only. REFUSES = no number (null), never 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  annualizedEnteredSalary, salaryGrossByMonth, wageGrossByMonth, grossSalaryMonthly, jobActiveMonth, salaryActiveMonths,
  salaryAnnual, totalGrossAnnual, householdK401ByMonth, earnerWageShares, wagesLandingByMonth, employerMatchMonthly,
  wageMatchMonthly, incomeFromOnboarding, SALARY_PERIODS, DEFAULT_HOURS_PER_WEEK, incomeMonthlyGrid, rsuAnnual,
  equityVestWeights, taxableAnnual,
} from '../../../src/domain/income/onboarding';
import { buildIncomeState } from '../../../src/domain/income/calc';
import { toNum } from '../../../src/domain/_shared/num';
import { enteredLandsAnnual, rateInForce, taxedAfterPreTax } from '../../../src/domain/income/tax-rate';
import { householdPreTaxContributionsAnnual } from '../../../src/domain/income/earners';
import { deductionsFromPay, entryFromWage, payFiguresAgree, takeHomeAsEntered } from './base-pay';
import { incomeSources, incomeSummary } from './income-summary';
import * as SUMMARY from './income-summary';
import { taxedSourcesAnnual } from '../../../src/domain/income/onboarding';
import { equityByMonth } from '../../../src/domain/cashflow/index';
import { buildDatedGrid } from '../../../src/domain/grid/index';

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
/** FIXED (2026-10-26, FIX-INCOME-A): an APP WRONG case whose fix landed — the reviewer's answer is a plain test, and the app's old
 *  answer (the pin) is kept beside it as test.failing, never deleted. */
type Mark = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'OUTSIDE DOMAIN' | 'FIXED';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_CashFlow_Independent_Audit_Package/MoneyKeel_CashFlow_Independent_Audit/audit_results');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_CashFlow_Audit_Part_01.json'), 'utf8'));
const C = (id: string): any => {
  const c = PART.cases.find((x: any) => x.case_id === id);
  if (!c) throw new Error(`no case ${id} in the package`);
  return c;
};
/** test.failing, or a plain test when the measurer sets CFR_STRICT to read each failure's own message */
const failing: jest.It = process.env.CFR_STRICT ? test : test.failing;
const RAN: string[] = [];
const ACT: Record<string, unknown> = {};
const DUMP = process.env.CFR1_DUMP;   // set only by the measurer, to write the app's answers beside the results file
afterAll(() => { if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(ACT, null, 1)); });
const kase = (id: string, mark: Mark, why: string, run: (c: any) => any, check: (c: any, got: any) => void, pin?: (got: any, c: any) => void) => {
  const c = C(id);
  RAN.push(id);
  const r = mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? failing : test;
  r(`${id} · ${c.kind} · ${c.title} [${mark}] — ${why}`, () => { const got = run(c); ACT[id] = got; check(c, got); });
  if (pin && mark === 'FIXED') test.failing(`${id} · the app until 2026-10-26, pinned (no longer its answer) [FIXED]`, () => pin(run(c), c));
  else if (pin) test(`${id} · the app's answer today, pinned [${mark}]`, () => pin(run(c), c));
};

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
/** an exact decimal or rational string from the package as a number ("447993/10" → 44799.3) */
const X = (s: any): number => {
  if (typeof s === 'number') return s;
  const m = /^(-?[\d.]+)\/([\d.]+)$/.exec(String(s));
  return m ? Number(m[1]) / Number(m[2]) : Number(s);
};
const money = (got: number, exp: any) => expect(got).toBeCloseTo(X(exp?.exact ?? exp), 6);
const months12 = (got: number[], exp: any[]) => { expect(got).toHaveLength(12); exp.forEach((e, i) => expect(got[i]).toBeCloseTo(X(e.exact), 6)); };
const refuses = (v: unknown) => expect(v == null).toBe(true);
const KEYS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
/** twelve Jan→Dec amounts as the canonical dated table of 2026 */
const dated = (arr: any[]) => Object.fromEntries(arr.map((v, i) => [KEYS[i], v]));
const oneWage = (months: any[], extra: Record<string, any> = {}) => ({ salaryFreq: 'monthly', salaryByMonth: dated(months), ...extra });
const twoWages = (m1: any[], m2: any[], e1: Record<string, any> = {}, e2: Record<string, any> = {}) =>
  ({ whoEarns: 'both', salaryFreq: 'monthly', salaryByMonth: dated(m1), ...e1, partnerWage: { salaryFreq: 'monthly', salaryByMonth: dated(m2), ...e2 } });
/** gross_annual over paid_months, paid in the LAST months of 2026 */
const partYear = (grossAnnual: any, paid: number) => Array.from({ length: 12 }, (_, i) => (i >= 12 - paid ? toNum(grossAnnual) / paid : 0));
/** the July starter of the brief's worked example: $60,000.30 over six paid months, $501.13 into a 401(k), $3,799.17 typed */
const JULY = () => oneWage(partYear('60000.30', 6), { c_401k: '501.13', landsTypical: '3799.17' });

// payPeriodsAYear (2026-11-01, FX-CF-B, R23): enteredMonthlyRaw reads the one pay-frequency table through it
const IMPORTED: Record<string, unknown> = { toNum, SALARY_PERIODS, DEFAULT_HOURS_PER_WEEK, payPeriodsAYear: require('../../../src/domain/income/pay-frequency').payPeriodsAYear };
const compile = (file: string, start: RegExp, name: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = text.search(start);
  if (at < 0) throw new Error(`${start} not found in ${file}`);
  const code = text.slice(at, text.indexOf('\n}\n', at) + 3);
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(...Object.keys(IMPORTED), `${js}\nreturn ${name};`)(...Object.values(IMPORTED));
};
const enteredMonthlyRaw: (a: Record<string, any>) => number = compile('../../../src/domain/income/onboarding.ts', /function enteredMonthlyRaw\(/, 'enteredMonthlyRaw');
const wage = (c: any) => ({ baseSalary: c.inputs.amount, salaryFreq: c.inputs.frequency, ...(c.inputs.hours_per_week !== undefined ? { hoursPerWeek: c.inputs.hours_per_week } : {}) });

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 24, 12, 0, 0)); });
afterAll(() => { jest.useRealTimers(); });

// ═══════════════════════════════════════════ THE 75 CASES ═══════════════════════════════════════════

describe('MK-CF-F-059 annualizedEnteredSalary — five cases', () => {
  kase('MK-CF-F-059-C01', 'AGREES', '5000 × 12', (c) => annualizedEnteredSalary(wage(c) as any), (c, g) => money(g, c.expected));
  kase('MK-CF-F-059-C02', 'AGREES', '2000 × 26', (c) => annualizedEnteredSalary(wage(c) as any), (c, g) => money(g, c.expected));
  kase('MK-CF-F-059-C03', 'AGREES', '27.35 × 31.5 × 52', (c) => annualizedEnteredSalary(wage(c) as any), (c, g) => money(g, c.expected));
  kase('MK-CF-F-059-C04', 'AGREES', '1567.89 × 52', (c) => annualizedEnteredSalary(wage(c) as any), (c, g) => money(g, c.expected));
  // APP WRONG (DEC-0296 "an unknown input produces no number and a reason — never a default"; tenet 3). Hours a week are
  // never asked: src/screens/BasePayScreen.tsx offers "Hourly" and has no hours field, so every hourly wage reads 40 hours
  // silently. $25 an hour reads $52,000 a year with nothing on screen saying 40 was assumed.
  // FIXED 2026-10-26 (FIX-INCOME-A): hours a week not entered give no number — never a 40-hour week (DEC-0296, tenet 3)
  kase('MK-CF-F-059-C05', 'FIXED', 'hours never entered: no number (DEC-0296; it read 40)', (c) => annualizedEnteredSalary(wage(c) as any),
    (c, g) => { expect(c.expected.state).toBe('REFUSES'); refuses(g); }, (g) => expect(g).toBe(25 * 40 * 52));
});

describe('MK-CF-F-130 enteredMonthlyRaw — five cases (its own source text)', () => {
  kase('MK-CF-F-130-C01', 'AGREES', '5000 × 12 ÷ 12', (c) => enteredMonthlyRaw(wage(c)), (c, g) => money(g, c.expected));
  kase('MK-CF-F-130-C02', 'AGREES', '2000 × 26 ÷ 12', (c) => enteredMonthlyRaw(wage(c)), (c, g) => money(g, c.expected));
  kase('MK-CF-F-130-C03', 'AGREES', '27.35 × 31.5 × 52 ÷ 12', (c) => enteredMonthlyRaw(wage(c)), (c, g) => money(g, c.expected));
  kase('MK-CF-F-130-C04', 'AGREES', '1567.89 × 52 ÷ 12', (c) => enteredMonthlyRaw(wage(c)), (c, g) => money(g, c.expected));
  // APP WRONG (DEC-0296; tenet 3) — the live path: wageGrossByMonth reads this for every month, so the 40 hours reach
  // every wage figure. $25 an hour reads $4,333.33 a month.
  // FIXED 2026-10-26 (FIX-INCOME-A): no number, and the live path (wageGrossByMonth) reads the wage's untyped months as $0
  kase('MK-CF-F-130-C05', 'FIXED', 'hours never entered: no number (DEC-0296; it read 40)', (c) => enteredMonthlyRaw(wage(c)),
    (c, g) => { expect(c.expected.state).toBe('REFUSES'); refuses(g); },
    (g, c) => { expect(g).toBeCloseTo((25 * 40 * 52) / 12, 6); expect(wageGrossByMonth(wage(c))[0]).toBeCloseTo(g, 6); });
  test('MK-CF-F-130-C05 · the live path (FIXED 2026-10-26): with no hours a week the hourly wage counts $0 in every month — no made-up week', () => {
    expect(wageGrossByMonth({ baseSalary: 25, salaryFreq: 'hourly' })).toEqual(new Array(12).fill(0));
    expect(wageGrossByMonth({ baseSalary: 25, salaryFreq: 'hourly', hoursPerWeek: '30' })[0]).toBeCloseTo((25 * 30 * 52) / 12, 6);
  });
  test('the compiled text is the live one: wageGrossByMonth with no table is enteredMonthlyRaw in every month', () => {
    expect(wageGrossByMonth({ baseSalary: '1567.89', salaryFreq: 'weekly' })).toEqual(new Array(12).fill(enteredMonthlyRaw({ baseSalary: '1567.89', salaryFreq: 'weekly' })));
  });
});

describe('MK-CF-F-060 salaryGrossByMonth — five cases', () => {
  const run = (c: any) => salaryGrossByMonth(twoWages(c.inputs.earner_1_months, c.inputs.earner_2_months) as any);
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-060-${id}`, 'AGREES', 'each slot = earner 1 + earner 2', run, (c, g) => months12(g, c.expected));
  }
});

describe('MK-CF-F-177 wageGrossByMonth — five cases', () => {
  const run = (c: any) => wageGrossByMonth({ baseSalary: c.inputs.typical, salaryFreq: 'monthly', salaryByMonth: c.inputs.table });
  kase('MK-CF-F-177-C01', 'AGREES', 'twelve × 5000', run, (c, g) => months12(g, c.expected));
  kase('MK-CF-F-177-C02', 'AGREES', 'January a known $0', run, (c, g) => months12(g, c.expected));
  kase('MK-CF-F-177-C03', 'AGREES', '2026 entries only', run, (c, g) => months12(g, c.expected));
  kase('MK-CF-F-177-C04', 'AGREES', 'every month explicit', run, (c, g) => months12(g, c.expected));
  // OUTSIDE DOMAIN: no caller hands wageGrossByMonth a missing wage. Its three callers (salaryGrossByMonth through
  // sumMonthsOverEarners, householdK401ByMonth, earnerWageShares) each hand it a row of earnerWages, and earnerWages always
  // returns the profile itself as the first row — never null. Proved below by reading the call sites. The literal answer
  // for null, pinned: twelve $0.
  kase('MK-CF-F-177-C05', 'OUTSIDE DOMAIN', 'no caller passes a null wage (earnerWages always hands a row)',
    () => wageGrossByMonth(null),
    (c) => {
      expect(c.expected.state).toBe('REFUSES');
      // every line of the app's source (src/, app/, MoneyKeel/functions — tests left out) that calls it, read from disk:
      // the definition plus three call sites, each handing it an earnerWages row named w
      const ROOT = path.join(__dirname, '../../..');
      const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
        ? (e.name === 'node_modules' || e.name === '__tests__' ? [] : walk(path.join(d, e.name)))
        : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
      const files = ['src', 'app', 'MoneyKeel/functions'].flatMap((d) => walk(path.join(ROOT, d)));
      expect(files.length).toBeGreaterThanOrEqual(250);   // the guard proves it looked
      const calls = files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => /wageGrossByMonth\(/.test(l) && !/^\s*\*/.test(l)).map((l) => l.trim()));
      // (2026-10-26, FIX-INCOME-A) the callers grow — wagePaidMonths, the Income summary's wage rows — so the guard reads each call:
      // the definition once, and every other call hands it `w`, a row of earnerWages (each caller iterates earnerWages or is handed
      // one of its rows by a caller that does). It still counts what it saw: at least the four of 2026-10-25 and the new one.
      expect(calls.filter((l) => l.startsWith('export function wageGrossByMonth('))).toEqual(['export function wageGrossByMonth(w: Record<string, any> | null): number[] {']);
      const uses = calls.filter((l) => !l.startsWith('export function wageGrossByMonth('));
      expect(uses.length).toBeGreaterThanOrEqual(4);
      for (const l of uses) expect(l).toMatch(/wageGrossByMonth\(w\)/);
      expect(uses).toEqual(expect.arrayContaining(['return sumMonthsOverEarners(op, (w) => wageGrossByMonth(w));', 'const own = wageGrossByMonth(w);',
        'const gross = wageGrossByMonth(w);', 'return wageGrossByMonth(w).filter((g) => g > 0).length;']));
      const { earnerWages } = require('../../../src/domain/income/earners');
      expect(earnerWages(null)).toEqual([{}]);
    },
    (g) => expect(g).toEqual(new Array(12).fill(0)));
});

describe('MK-CF-F-061 grossSalaryMonthly · MK-CF-F-080 jobActiveMonth · MK-CF-F-081 salaryActiveMonths · MK-CF-F-082 salaryAnnual — twenty cases', () => {
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) {
    kase(`MK-CF-F-061-${id}`, 'AGREES', 'the largest month', (c) => grossSalaryMonthly(oneWage(c.inputs.gross_months) as any), (c, g) => money(g, c.expected));
    kase(`MK-CF-F-080-${id}`, 'AGREES', 'that month above $0', (c) => jobActiveMonth(oneWage(c.inputs.gross_months) as any, c.inputs.month_index), (c, g) => expect(g).toBe(c.expected));
    kase(`MK-CF-F-081-${id}`, 'AGREES', 'months above $0', (c) => salaryActiveMonths(oneWage(c.inputs.gross_months) as any), (c, g) => expect(g).toBe(X(c.expected.exact)));
    kase(`MK-CF-F-082-${id}`, 'AGREES', 'the twelve months added', (c) => salaryAnnual(oneWage(c.inputs.gross_months) as any), (c, g) => money(g, c.expected));
  }
});

describe('MK-CF-F-083 totalGrossAnnual — five cases', () => {
  const op = (i: any) => ({
    baseSalary: toNum(i.wage_annual) / 12, salaryFreq: 'monthly',
    ...(toNum(i.rental_net_annual) !== 0 ? { rentals: [toNum(i.rental_net_annual) > 0
      ? { property_id: 'A', income: toNum(i.rental_net_annual) / 12, expenses: 0 }
      : { property_id: 'A', income: 0, expenses: -toNum(i.rental_net_annual) / 12 }] } : {}),
    invAnnual: i.interest_annual, supportMonthly: toNum(i.untaxed_support_annual) / 12,
    bonusAnnual: i.bonus.amount, bonusMonth: Number(String(i.bonus.date).slice(5, 7)),
    equityType: 'rsu', rsuGrants: [{ shares: 1, price: i.vesting.amount, date: i.vesting.date }],
    c_401k: toNum(i.employee_k_actual_annual) / 12,
  });
  const run = (c: any) => totalGrossAnnual(op(c.inputs) as any, new Date(2026, 9, 24));
  kase('MK-CF-F-083-C01', 'AGREES', 'wages only', run, (c, g) => money(g, c.expected));
  kase('MK-CF-F-083-C02', 'AGREES', 'wages + untaxed support', run, (c, g) => money(g, c.expected));
  kase('MK-CF-F-083-C03', 'AGREES', 'every source, before the 401(k)', run, (c, g) => money(g, c.expected));
  kase('MK-CF-F-083-C04', 'AGREES', 'a rental loss kept', run, (c, g) => money(g, c.expected));
  // APP WRONG (DEC-0447 "income that arrives once ... lands in its own month"; DEC-7940 "one-time income keeps its month
  // with its year and lands once"; DEC-0296). A one-time $2,000 with no year is counted in THIS year's total — and in every
  // year after, because the test is "no year, or this year". Reachable: the sign-up step (src/onboarding/modules.tsx,
  // income_other) shows January selected but saves no month and no year until a chip is tapped. (The case's title says
  // "Social Security only"; its inputs and answer are the one-time year, which is what is measured.)
  // FIXED 2026-10-25 (FIX-INCOME-B; landsOnce): the yearless $2,000 is counted in no year — it waits for its year, and the Income
  // summary and the Income manager say "year not entered". REVIEWER WRONG on the rest of its answer: refusing the WHOLE year's total
  // would drop income that is known (tenet 1 outranks); the total stands on what is known and names what is not counted.
  kase('MK-CF-F-083-C05', 'REVIEWER WRONG', 'FIXED 2026-10-25: the yearless amount is in no year; the known total stands, the missing year is named',
    (c) => totalGrossAnnual({ otherFreq: 'onetime', otherAmount: c.inputs.one_time_other } as any, new Date(2026, 9, 24)),
    (c, g) => { expect(c.expected.state).toBe('REFUSES'); refuses(g); },
    (g) => {
      expect(g).toBe(0);
      jest.setSystemTime(new Date(2027, 5, 1));   // and not the next year either
      try { expect(totalGrossAnnual({ otherFreq: 'onetime', otherAmount: 2000 } as any)).toBe(0); }
      finally { jest.setSystemTime(new Date(2026, 9, 24, 12)); }
    });
  test.failing('MK-CF-F-083-C05 · what the app gave before the fix (pinned, now failing): $2,000 this year, and again next year', () => {
    expect(totalGrossAnnual({ otherFreq: 'onetime', otherAmount: 2000 } as any, new Date(2026, 9, 24))).toBe(2000);
  });
});

describe('MK-CF-F-206 householdK401ByMonth — five cases', () => {
  const run = (c: any) => householdK401ByMonth(twoWages(c.inputs.earner_1_gross, c.inputs.earner_2_gross, { c_401k: c.inputs.earner_1_k }, { c_401k: c.inputs.earner_2_k }) as any);
  for (const id of ['C01', 'C02', 'C03', 'C04', 'C05']) kase(`MK-CF-F-206-${id}`, 'AGREES', 'own 401(k) only in own paid months', run, (c, g) => months12(g, c.expected));
});

describe('MK-CF-F-233 earnerWageShares — five cases', () => {
  const op = (i: any) => oneWage(partYear(i.gross_annual, i.paid_months), { c_401k: i.k_monthly_when_paid, landsTypical: i.take_home_monthly_when_paid });
  const run = (c: any) => earnerWageShares(op(c.inputs) as any)[0].own;
  const share = (c: any, g: any) => expect(g).toBeCloseTo(X(c.expected.own_share.exact), 12);
  kase('MK-CF-F-233-C01', 'AGREES', '(60000 − 6000 − 48000) ÷ 60000', run, share);
  kase('MK-CF-F-233-C02', 'AGREES', 'no deduction', run, share);
  // APP WRONG — THE PRIORITY FINDING, REAL (DEC-7938's own example "a take-home typed as $6,200 reads $6,200"; the founder's
  // base-pay rule of 2026-08-27, DEC-0176, "if they told us, that IS take-home"; tenets 1, 4, 5). The share subtracts the
  // typed take-home × 12 although the July starter is paid in six months: (60,000.30 − 3,006.78 − 45,590.04) ÷ 60,000.30 =
  // 19.01%, where the six paid months give 57.00%. So each paid month lands $10,000.05 × (1 − 0.1901) − $501.13 = $7,598.34
  // — twice the $3,799.17 the person typed.
  // FIXED 2026-10-26 (FIX-INCOME-A): the take-home and the 401(k) are each a paid month's — 57.00%, a paid month lands $3,799.17
  kase('MK-CF-F-233-C03', 'FIXED', 'a part-year take-home × the paid months (DEC-7938, DEC-0176; it was × 12)', run, share,
    (g) => expect(g).toBeCloseTo((60000.30 - 501.13 * 6 - 3799.17 * 12) / 60000.30, 12));
  // APP WRONG — the same fault: three paid months make (42,000.57 − 1,195.23 − 127,201.56) negative, clamped to 0, so the
  // paid month lands $14,000.19 − $398.41 = $13,601.78 where $10,600.13 was typed.
  kase('MK-CF-F-233-C04', 'FIXED', 'three paid months: 21.44% (DEC-7938, DEC-0176; × 12 clamped to 0%)', run, share, (g) => expect(g).toBe(0));
  // APP WRONG (tenet 5 "the person's word outranks the app's guess"; tenet 3; the 2026-08-27 rule "if they told us, that IS
  // take-home"). A take-home typed as 0 is treated as not typed (typed > 0), so the household's calculated rate is used
  // instead of the person's figure. No ruling of his says a typed $0 is silence.
  // FIXED 2026-10-26 (FIX-INCOME-A; tenet 5, the lead's ruling 3): a take-home typed as 0 is the person's answer — only a blank is not typed
  kase('MK-CF-F-233-C05', 'FIXED', 'a typed $0 take-home is an answer (tenets 3, 5; it was read as not typed)', run, share, (g) => expect(g).toBeNull());
});

describe('MK-CF-F-234 wagesLandingByMonth — five cases', () => {
  /** each earner a full year at the month's gross, the share handed in as their typed take-home T = g × (1 − s) − k */
  const op = (i: any) => {
    const w = i.gross_in_month.map((g: any, n: number) => ({ salaryFreq: 'monthly', baseSalary: g, c_401k: i.k_in_month[n],
      landsTypical: toNum(g) * (1 - X(i.correct_own_shares[n])) - toNum(i.k_in_month[n]) }));
    return w.length === 1 ? w[0] : { ...w[0], whoEarns: 'both', partnerWage: w[1] };
  };
  const rows = (o: any) => earnerWageShares(o).map((s, n) => s.gross[0] * (1 - (s.own as number)) - toNum((n === 0 ? o : o.partnerWage).c_401k));
  const run = (c: any) => { const o = op(c.inputs); return { total: wagesLandingByMonth(o as any)[0], rows: rows(o) }; };
  const check = (c: any, g: any) => { money(g.total, c.expected.total); c.expected.earner_take_home.forEach((e: any, n: number) => money(g.rows[n], e)); };
  kase('MK-CF-F-234-C01', 'AGREES', '5000 × 0.9 − 500', run, check);
  kase('MK-CF-F-234-C02', 'AGREES', 'two wages added', run, check);
  kase('MK-CF-F-234-C03', 'AGREES', 'different shares', run, check);
  // APP WRONG — THE PRIORITY FINDING, REAL, where it reaches the screens: the July starter's paid month lands $7,598.34
  // (the share above), not the $3,799.17 typed. wagesLandingByMonth is what MK-XS-F-004 buildDatedGrid puts on This month
  // and Home as "Salary (take-home share)" (src/domain/grid/index.ts), so This month reads twice the typed take-home while
  // Your base pay reads $3,799.17 (tenet 4).
  // FIXED 2026-10-26 (FIX-INCOME-A): the paid month lands the $3,799.17 typed — the figure Your base pay prints (tenet 4)
  kase('MK-CF-F-234-C04', 'FIXED', 'the part-year take-home lands as typed in a paid month (DEC-7938, tenet 4; it doubled)',
    () => { const o = JULY(); const s = earnerWageShares(o as any)[0]; return { total: wagesLandingByMonth(o as any)[6], rows: [s.gross[6] * (1 - (s.own as number)) - 501.13] }; },
    check, (g) => { expect(g.total).toBeCloseTo(7598.34, 2); expect(takeHomeAsEntered(entryFromWage(JULY())).monthly).toBe(3799.17); });
  kase('MK-CF-F-234-C05', 'AGREES', 'a known unpaid month lands $0',
    () => { const o = oneWage([0, ...new Array(11).fill(5000)], { landsTypical: 3800 }); const s = earnerWageShares(o as any)[0]; return { total: wagesLandingByMonth(o as any)[0], rows: [s.gross[0] * (1 - (s.own as number)) - 0] }; },
    check);
});

describe('MK-CF-F-078 employerMatchMonthly · MK-CF-F-178 wageMatchMonthly — ten cases', () => {
  const one = (i: any) => toNum(i.flat_other_match) > 0 && toNum(i.match_percent_of_contribution) === 0
    ? { c_401k: i.employee_k, employerMatchMode: 'dollar', employerMatchValue: i.flat_other_match }
    : { c_401k: i.employee_k, employerMatchMode: 'pct', employerMatchValue: i.match_percent_of_contribution };
  for (const id of ['C01', 'C02', 'C03', 'C05']) {
    kase(`MK-CF-F-078-${id}`, 'AGREES', 'percent of the contribution, or flat', (c) => employerMatchMonthly({ baseSalary: 5000, ...one(c.inputs) } as any), (c, g) => money(g, c.expected));
    kase(`MK-CF-F-178-${id}`, 'AGREES', 'percent of the contribution, or flat', (c) => wageMatchMonthly(one(c.inputs)), (c, g) => money(g, c.expected));
  }
  kase('MK-CF-F-078-C04', 'AGREES', 'a percent match and a flat match: two earners, one of each, added',
    (c) => employerMatchMonthly({ whoEarns: 'both', baseSalary: 5000, c_401k: c.inputs.employee_k, employerMatchMode: 'pct', employerMatchValue: c.inputs.match_percent_of_contribution,
      partnerWage: { baseSalary: 3000, employerMatchMode: 'dollar', employerMatchValue: c.inputs.flat_other_match } } as any),
    (c, g) => money(g, c.expected));
  kase('MK-CF-F-178-C04', 'AGREES', 'two independent calls, percent and flat, added (the case\'s note)',
    (c) => wageMatchMonthly({ c_401k: c.inputs.employee_k, employerMatchMode: 'pct', employerMatchValue: c.inputs.match_percent_of_contribution })
      + wageMatchMonthly({ employerMatchMode: 'dollar', employerMatchValue: c.inputs.flat_other_match }),
    (c, g) => money(g, c.expected));
});

describe('MK-CF-F-079 incomeFromOnboarding — five cases', () => {
  const src = (doc: any, label: string) => doc.sources.find((s: any) => s.label === label);
  kase('MK-CF-F-079-C01', 'AGREES', '60000 ÷ 12, monthly',
    (c) => src(incomeFromOnboarding('u' as any, { baseSalary: toNum(c.inputs.salary_annual) / 12, salaryFreq: 'monthly' } as any), 'Base salary'),
    (c, g) => { money(g.gross_amount, c.expected.monthly_salary); expect(g.frequency).toBe('MONTHLY'); });
  // AGREES: $12,000 in September. A bonus is yearly (DEC-7940 separated "Bonus" from "One-time income"), so the stored
  // source carries its month, not a year; its September 2026 landing is read back through buildIncomeState's months.
  kase('MK-CF-F-079-C02', 'AGREES', '$12,000 kept in September (a yearly bonus has its month, DEC-7940)',
    (c) => { const doc = incomeFromOnboarding('u' as any, { bonusAnnual: c.inputs.bonus, bonusMonth: c.inputs.bonus_month } as any);
      return { s: src(doc, 'Bonus'), sep: buildIncomeState('u', doc.sources, doc.tax).monthly_cash_flow_grid[8].gross }; },
    (c, g) => { money(g.s.gross_amount, c.expected.bonus_payment); expect(g.s.landing_month).toBe(Number(c.expected.date.slice(5))); money(g.sep, c.expected.bonus_payment); });
  // APP WRONG on the wage months (DEC-0003 "every month you enter carries its own month AND year"); the rental net agrees.
  // The stored Base salary source is the year ÷ 12 (B-34), so a seasonal pair — July $5,111.17, August $6,111.43, the
  // spouse's January $3,111.19 — is stored as $1,194.48 in every month, and buildIncomeState's months (read by the Income
  // detail screen and the snapshot) lose which months were paid. Reach is small: /income-detail has no way in today, and the
  // snapshot reads only the yearly average. The rent net, $1,219.74, is right.
  // FIXED 2026-10-25 (FIX-INCOME-B): pay that differs month to month is stored as the year with each month's share (landing_months)
  kase('MK-CF-F-079-C03', 'AGREES', 'FIXED 2026-10-25: each wage month keeps its own pay (DEC-0003)',
    (c) => {
      const i = c.inputs;
      const doc = incomeFromOnboarding('u' as any, { whoEarns: 'both', salaryFreq: 'monthly', salaryByMonth: i.wage1_months,
        partnerWage: { salaryFreq: 'monthly', salaryByMonth: i.wage2_months }, rentals: [{ property_id: i.rent.property, income: i.rent.monthly, expenses: i.rent.cost }] } as any);
      const rent = src(doc, 'Rental property');
      const grid = buildIncomeState('u', doc.sources, doc.tax).monthly_cash_flow_grid.map((m: any) => m.gross - (rent.gross_amount - rent.operating_expenses));
      return { rentNet: rent.gross_amount - rent.operating_expenses, jan: grid[0], feb: grid[1], jul: grid[6], aug: grid[7] };
    },
    (c, g) => {
      money(g.rentNet, c.expected.rental_monthly_net);
      expect(c.expected.wage_months_preserved).toBe(true);
      expect([g.jan, g.feb, g.jul, g.aug].map((v) => Math.round(v * 100) / 100)).toEqual([3111.19, 0, 5111.17, 6111.43]);
    },
    (g) => { expect(g.rentNet).toBeCloseTo(1219.74, 6); expect(g.jul).toBeCloseTo(5111.17, 6); });
  test.failing('MK-CF-F-079-C03 · what the app gave before the fix (pinned, now failing): $1,194.48 in every month', () => {
    const i = C('MK-CF-F-079-C03').inputs;
    const doc = incomeFromOnboarding('u' as any, { whoEarns: 'both', salaryFreq: 'monthly', salaryByMonth: i.wage1_months,
      partnerWage: { salaryFreq: 'monthly', salaryByMonth: i.wage2_months } } as any);
    expect(buildIncomeState('u', doc.sources, doc.tax).monthly_cash_flow_grid[1].gross).toBeCloseTo((5111.17 + 6111.43 + 3111.19) / 12, 6);
  });
  // FIXED 2026-10-25 (FIX-INCOME-B; landsOnce): the signing bonus is asked its month, stored with its year (signingDate, the sign-up
  // Bonuses step), and lands once, in that month. The case's payment_date is handed in as the step stores it.
  // WAS APP WRONG (DEC-0447 "income that arrives once ... lands in its own month"). The signing bonus has no month or year
  // question anywhere (src/onboarding/modules.tsx: MoneyRow signingOnetime only) and is stored landing in January
  // (landing_month 1). The reviewer's October date cannot be sent today — the fix needs the month and year asked.
  kase('MK-CF-F-079-C04', 'AGREES', 'FIXED 2026-10-25: a signing bonus lands once, in its own month (DEC-0447)',
    (c) => src(incomeFromOnboarding('u' as any, { baseSalary: toNum(c.inputs.salary_annual) / 12, signingOnetime: c.inputs.signing_bonus, signingDate: c.inputs.payment_date } as any), 'Signing bonus'),
    (c, g) => { money(g.gross_amount, c.expected.one_off.amount); expect(g.landing_month).toBe(Number(c.expected.one_off.date.slice(5, 7))); expect(g.frequency).toBe('ONETIME'); });
  test.failing('MK-CF-F-079-C04 · what the app gave before the fix (pinned, now failing): landing in January, with no date asked', () => {
    const g = src(incomeFromOnboarding('u' as any, { baseSalary: 83111.43 / 12, signingOnetime: '7311.17' } as any), 'Signing bonus');
    expect(g.landing_month).toBe(1);
  });
  // APP WRONG (DEC-0447; DEC-7940 "lands once"). A $2,000 signing bonus of 2026 is still a source of 2027's income: the
  // profile holds no year, so incomeFromOnboarding run in 2027 books it again (and totalGrossAnnual / taxableAnnual add it
  // every year).
  kase('MK-CF-F-079-C05', 'AGREES', 'FIXED 2026-10-25: a 2026 one-off is not 2027 income (DEC-0447, DEC-7940)',
    (c) => { jest.setSystemTime(new Date(c.inputs.requested_year, 2, 1));
      try { const op = { signingOnetime: c.inputs.signing_bonus, signingDate: String(c.inputs.payment_year) };
        const s = src(incomeFromOnboarding('u' as any, op as any), 'Signing bonus');
        return { amount: s ? s.gross_amount : 0, taxed: taxableAnnual(op as any) }; }
      finally { jest.setSystemTime(new Date(2026, 9, 24, 12)); } },
    (c, g) => { money(g.amount, c.expected.amount); money(g.taxed, c.expected.amount); });
  test.failing('MK-CF-F-079-C05 · what the app gave before the fix (pinned, now failing): $2,000 booked again as 2027 income', () => {
    jest.setSystemTime(new Date(2027, 2, 1));
    try { expect(taxableAnnual({ signingOnetime: 2000 } as any)).toBe(2000); } finally { jest.setSystemTime(new Date(2026, 9, 24, 12)); }
  });
});

describe('coverage — part 1', () => {
  test('75 of 75 cases run, each once', () => {
    expect(PART.cases.length).toBe(75);
    expect([...RAN].sort()).toEqual(PART.cases.map((x: any) => x.case_id).sort());
  });
});

// ═══════════════════ FORMULA VERDICTS (6 of 15 not RIGHT) AND RULES (4 of 17 NOT HELD) ═══════════════════
// The nine RIGHT cards (F-060, F-177, F-061, F-080, F-081, F-082, F-206, F-078, F-178) are held by their cases above.
const FORMULA: Record<string, Mark> = {
  'MK-CF-F-059': 'APP WRONG', 'MK-CF-F-130': 'APP WRONG', 'MK-CF-F-083': 'APP WRONG',
  'MK-CF-F-233': 'APP WRONG', 'MK-CF-F-234': 'APP WRONG', 'MK-CF-F-079': 'APP WRONG',
};
const RULES: Record<string, Mark> = { 'DEC-0003': 'APP WRONG', 'DEC-0376': 'APP WRONG', 'DEC-0447': 'APP WRONG', 'DEC-7938': 'APP WRONG' };
describe('formula verdicts and rules — part 1', () => {
  test('every verdict that is not RIGHT, and every rule NOT HELD, is classified here (6 and 4)', () => {
    expect(Object.keys(FORMULA).sort()).toEqual(PART.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id).sort());
    expect(Object.keys(RULES).sort()).toEqual(PART.rules_held.filter((r: any) => r.verdict === 'NOT HELD').map((r: any) => r.rule).sort());
    expect(PART.formula_checks.length).toBe(15);
    expect(PART.rules_held.length).toBe(17);
  });
  // F-059 / F-130: the frequency default is SHOWN (Monthly is the selected choice on Your base pay), so only the hours part is
  // an app fault; F-083: one-offs with no year recur (C05) and equity is the run-rate (part 3, DEC-0012); F-079: C03–C05.
  // DEC-0376 (a total agrees with its lines): the July starter's Your base pay line reads $3,799.17 while This month lands
  // $7,598.34 — one take-home, two figures (also tenet 4, DEC-7938).
  // FIXED 2026-10-26 (FIX-INCOME-A): one take-home, one figure — Your base pay, the Cash flow months and the month grid all $3,799.17
  test('DEC-0376 / DEC-7938 · the July starter: Your base pay, the Cash flow months and the month grid all land $3,799.17 a paid month [FIXED]', () => {
    const o = JULY();
    expect(takeHomeAsEntered(entryFromWage(o)).monthly).toBe(3799.17);
    expect(wagesLandingByMonth(o as any)[6]).toBeCloseTo(3799.17, 6);
    expect(incomeMonthlyGrid(o as any, 'available')[6].amount).toBeCloseTo(3799.17, 6);
    expect(incomeMonthlyGrid(o as any, 'available')[0].amount).toBe(0);   // an unpaid month lands nothing
  });
  test.failing('DEC-0376 / DEC-7938 · the app until 2026-10-26, pinned (no longer its answer): Your base pay $3,799.17 a month, the Cash flow months $7,598.34', () => {
    const o = JULY();
    expect(takeHomeAsEntered(entryFromWage(o)).monthly).toBe(3799.17);
    expect(wagesLandingByMonth(o as any)[6]).toBeCloseTo(7598.34, 2);
    expect(incomeMonthlyGrid(o as any, 'available')[6].amount).toBeCloseTo(7598.34, 2);
  });
  // And on ONE card: the Income summary (MK-CF-O-004) reads the July starter's usual month as $3,799.17 and, beside it, a
  // "standout" July of $7,598.34 — "its own month, never spread" — from the same wage, so the card disagrees with itself.
  test('DEC-0376 · the Income summary card: usual month $3,799.17 and no standout month — every paid month lands the same [FIXED 2026-10-26]', () => {
    const s: any = incomeSummary(JULY() as any);
    expect(s.lands.usualMonth).toBe(3799.17);
    expect(s.lands.standoutMonth).toBeNull();
  });
  test.failing('DEC-0376 · the app until 2026-10-26, pinned (no longer its answer): usual month $3,799.17, and a standout July of $7,598.34 from the same wage', () => {
    const s: any = incomeSummary(JULY() as any);
    expect(s.lands.usualMonth).toBe(3799.17);
    expect(s.lands.lines.map((l: any) => l.amount)).toEqual([3799.17]);
    expect(s.lands.standoutMonth.label).toBe('July');
    expect(s.lands.standoutMonth.amount).toBeCloseTo(7598.34, 2);
  });
  // FIXED 2026-10-25 (FIX-INCOME-B): a vest with no date is in no month and no year — "vest date not entered"
  test('DEC-0003 · a vest with no date is filed nowhere (part 3 measures it) [FIXED 2026-10-25]', () => {
    expect(equityVestWeights({ rsuGrants: [{ shares: 1, price: 1000 }] } as any)).toBeNull();
  });
  test.failing('DEC-0003 · what the app gave before the fix (pinned, now failing): filed in December', () => {
    expect(equityVestWeights({ rsuGrants: [{ shares: 1, price: 1000 }] } as any)![11]).toBe(1);
  });
});

// ═══════════ THE LEAD'S PRIORITY FINDINGS THAT SIT ON OTHER PARTS' CARDS — measured here, classified by those parts ═══════════
// Not counted in part 1's totals. Each says plainly whether the finding is real, with the brief's own worked example.
describe('priority findings on other parts\' cards (F-180, F-145, F-188, F-230, F-210, F-018, F-066)', () => {
  // REAL. MK-CF-F-180 enteredLandsAnnual: the typed take-home × 12 although the July starter is paid six months.
  test('MK-CF-F-180 enteredLandsAnnual · July starter: entered take-home a year is $22,795.02 (3,799.17 × 6) [FIXED 2026-10-26]', () => {
    expect(enteredLandsAnnual(JULY() as any)).toBeCloseTo(22795.02, 6);
  });
  test.failing('MK-CF-F-180 · the app until 2026-10-26, pinned (no longer its answer): $45,590.04 (× 12)', () => { expect(enteredLandsAnnual(JULY() as any)).toBeCloseTo(45590.04, 6); });
  // REAL. MK-CF-F-181 rateInForce (the implied rate printed beside it) carries both twelves: the 401(k) × 12 and lands × 12.
  test('MK-CF-F-181 rateInForce · July starter: "your figures, 57%" — the paid months\' own figures [FIXED 2026-10-26]', () => {
    const r = rateInForce(JULY() as any);
    expect(r.rate).toBeCloseTo((60000.30 - 501.13 * 6 - 3799.17 * 6) / 60000.30, 12);
    expect(r.label).toBe('your figures, 57.00%');   // two decimals since 2026-10-26 (MK-CF-M-081; Q49)
  });
  test.failing('MK-CF-F-181 rateInForce · the app until 2026-10-26, pinned (no longer its answer): "your figures, 14%"', () => {
    const r = rateInForce(JULY() as any);
    expect(r.rate).toBeCloseTo((60000.30 - 501.13 * 12 - 3799.17 * 12) / 60000.30, 12);
    expect(r.label).toBe('your figures, 14%');
  });
  // REAL. MK-CF-F-145 deductionsFromPay: gross − 401(k) × 12 − take-home × 12 on a six-month year.
  test('MK-CF-F-145 deductionsFromPay · July starter: everything else taken out is $34,198.50 a year [FIXED 2026-10-26]', () => {
    expect(deductionsFromPay(entryFromWage(JULY()))).toBeCloseTo(60000.30 - 3006.78 - 22795.02, 6);
  });
  test.failing('MK-CF-F-145 · the app until 2026-10-26, pinned (no longer its answer): $8,396.70', () => { expect(deductionsFromPay(entryFromWage(JULY()))).toBeCloseTo(60000.30 - 6013.56 - 45590.04, 6); });
  // And MK-CF-F-146 payFiguresAgree, on the same household: it lays the typed take-home on the six unpaid months too, so Your
  // base pay tells the July starter "These three cannot all be right in 2026-01".
  // FIXED (CF-MMFIX-B, 2026-10-25, its F6; re-measured by FIX-INCOME-A 2026-10-26): a month with no pay is not reconciled, and the
  // paid months' $10,000.05 − $501.13 − $3,799.17 = $5,699.75 is within the check — so the figures agree (no warning: 57% < 60%)
  test('MK-CF-F-146 payFiguresAgree · July starter: the figures agree — the unpaid months are not reconciled [FIXED]', () => {
    expect(payFiguresAgree(entryFromWage(JULY()))).toEqual({ ok: true, warn: false, say: '' });
  });
  test.failing('MK-CF-F-146 payFiguresAgree · July starter, the app until 2026-10-25, pinned (no longer its answer): refuses the figures over January', () => {
    const v = payFiguresAgree(entryFromWage(JULY()));
    expect(v.ok).toBe(false);
    expect(v.say).toContain('These three cannot all be right in 2026-01');
  });
  // REAL (part 2 measures its cases). MK-CF-F-188: the 401(k) × 12, read by the Tax organizer's steps.
  test('MK-CF-F-188 householdPreTaxContributionsAnnual · July starter: $3,006.78, the paid months\' 401(k) [FIXED 2026-10-26]', () => {
    expect(householdPreTaxContributionsAnnual(JULY() as any)).toBeCloseTo(3006.78, 6);
  });
  test.failing('MK-CF-F-188 · the app until 2026-10-26, pinned (no longer its answer): $6,013.56', () => {
    expect(householdPreTaxContributionsAnnual(JULY() as any)).toBeCloseTo(6013.56, 6);
  });
  // NOT REAL on the measured household: MK-CF-F-230 taxedAfterPreTax already takes the 401(k) of the paid months only.
  test('MK-CF-F-230 taxedAfterPreTax · July starter: $60,000.30 − $3,006.78 = $56,993.52 (AGREES — paid months)', () => {
    expect(taxedAfterPreTax(JULY() as any)).toBeCloseTo(60000.30 - 3006.78, 6);
  });
  // RETIRED 2026-10-25 (FIX-INCOME-B): MK-CF-F-210 annualOfSource returned the HOUSEHOLD salary for each salary row and nothing called
  // it; YOUR SOURCES never converts a row's period. Each earner's own year is a row of taxedSourcesAnnual (MK-CF-F-084's rows).
  test('MK-CF-F-210 annualOfSource · RETIRED 2026-10-25 — $84,000 and $54,000: each earner\'s own year, from taxedSourcesAnnual', () => {
    const op = { whoEarns: 'both', baseSalary: 7000, salaryFreq: 'monthly', partnerWage: { baseSalary: 4500, salaryFreq: 'monthly' } };
    expect((SUMMARY as any).annualOfSource).toBeUndefined();
    expect(taxedSourcesAnnual(op as any).filter((r) => r.key === 'wages').map((r) => r.amount)).toEqual([84000, 54000]);
    expect(incomeSources(op).filter((s) => s.kind === 'salary')).toHaveLength(2);
  });
  test.failing('MK-CF-F-210 · what the app gave before the fix (pinned, now failing): annualOfSource, $138,000 on both rows', () => {
    expect((SUMMARY as any).annualOfSource).toBeDefined();
  });
  // REAL. MK-CF-F-018 equityByMonth (read by MK-XS-F-004 buildDatedGrid, so This month and Home): a $8,317.43 March 2026 vest
  // with $1,321.19 (June 2027) and $4,211.17 (December 2027) to come lands the run-rate $6,924.90 across March, June and
  // December 2026 — the 2027 vests in 2026's months (DEC-0012 "shares that vest land in the month they vest").
  const VESTS = { equityType: 'rsu', rsuGrants: [{ shares: 1, price: '8317.43', date: '2026-03-15' }, { shares: 1, price: '4211.17', date: '2027-12-15' }, { shares: 1, price: '1321.19', date: '2027-06-15' }] };
  // FIXED 2026-10-25 (FIX-BILLS): each vest lands in its own year and month — equityByMonth is asked for one calendar year.
  test('MK-CF-F-018 equityByMonth · 2026 lands $8,317.43 in March and nothing in June or December (FIXED 2026-10-25 — DEC-0012, DEC-0003)', () => {
    const m = equityByMonth(VESTS, 2026);
    [8317.43, 0, 0].forEach((v, n) => expect([m[2], m[5], m[11]][n]).toBeCloseTo(v, 6));
    expect(m.reduce((t, v) => t + v, 0)).toBeCloseTo(8317.43, 6);
    const y27 = equityByMonth(VESTS, 2027);
    expect([y27[5], y27[11]]).toEqual([1321.19, 4211.17]);
  });
  test.failing('MK-CF-F-018 · the app until 2026-10-25, pinned: the run-rate $6,924.895 spread over March, June and December, and it reaches the dated grid — no longer its answer (FIXED 2026-10-25)', () => {
    const m = equityByMonth(VESTS, 2026);
    expect(m.reduce((t, v) => t + v, 0)).toBeCloseTo(rsuAnnual(VESTS as any) as number, 6);
    expect(rsuAnnual(VESTS as any)).toBeCloseTo(6924.895, 6);
    expect(m[5]).toBeCloseTo(6924.895 * 1321.19 / 13849.79, 6);
    const g = buildDatedGrid(VESTS as any, { now: new Date(2026, 9, 24, 12) });
    expect(JSON.stringify(g)).toContain('Equity vesting');
  });
});
