/** ONE PAY-FREQUENCY TABLE, EVERY READER AGREES (2026-11-01, FX-CF-B; the lead's ruling R23 under his DEC-0296; a dated row on
 *  income-end-to-end_v07). For each of the five frequencies and for one the app does not know, every reader of a wage's frequency
 *  gives the same year — or, for the unknown one, no figure and the refusal in words:
 *    1. MK-CF-F-059 annualizedEnteredSalary (onboarding.ts)        4. MK-CF-O-004 incomeSummary — "= Gross /year"
 *    2. MK-CF-F-171 earnerPay / MK-CF-O-001 basePay (base-pay.ts)  5. MK-CF-F-186 convertTakeHomeMode (the take-home migration)
 *    3. MK-CF-F-082 salaryAnnual (the wage's year)                 6. the screens: Your base pay, the Income summary, Your income
 *  The readers are counted off the source, so a new one cannot sit outside this test: every file that reads a period count from a
 *  frequency imports src/domain/income/pay-frequency.ts.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { PAY_FREQUENCIES, payPeriodsAYear, PAY_FREQUENCY_NOT_RECOGNISED } from '../../domain/income/pay-frequency';
import { annualizedEnteredSalary, salaryAnnual, SALARY_PERIODS } from '../../domain/income/onboarding';
import { convertTakeHomeMode, repairHourlyTakeHome } from '../../domain/income/take-home-mode-migration';
import { earnerPay, entryFromWage, PAY_PERIODS } from '../../../MoneyKeel/functions/cashflow/base-pay';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

const ROOT = path.join(__dirname, '..', '..', '..');
/** a wage typed per period, the same every month, no 401(k), the person's own 0% rate — so gross, take-home and year can be checked by hand */
const wage = (salaryFreq: any, baseSalary: string, extra: any = {}) =>
  ({ status: 'employed', incomeSources: ['employment'], baseSalary, salaryFreq, salaryMode: 'gross', hoursPerWeek: '40', taxMode: 'manual', manualTaxRate: '0', ...extra });
/** the year each reader gives for one wage */
const readers = (op: any) => ({
  annualizedEnteredSalary: annualizedEnteredSalary(op),
  earnerPay: earnerPay(entryFromWage(op)).grossAnnualised,
  salaryAnnual: salaryAnnual(op),
  incomeSummary: incomeSummary(op).taxed.grossAnnual,
  migration: toYear(convertTakeHomeMode({ ...op, salaryMode: 'takehome' })),
});
/** the migration's take-home a month, as a year: a 0% rate makes the gross the take-home typed */
const toYear = (op: any) => (op.salaryMode === 'gross' ? Number(op.landsTypical) * 12 : null);

test('the table is the ruling: hourly 2,080, weekly 52, biweekly 26, monthly 12, annually 1 — and every exported name is it', () => {
  expect(PAY_FREQUENCIES).toEqual({ hourly: 2080, weekly: 52, biweekly: 26, monthly: 12, annually: 1 });
  expect(SALARY_PERIODS).toBe(PAY_FREQUENCIES);
  expect(PAY_PERIODS).toBe(PAY_FREQUENCIES);
});

// by hand: $25 an hour × 40 × 52 = $52,000; $1,000 a week × 52 = $52,000; $2,000 a fortnight × 26 = $52,000; $4,333.33 a month ×
// 12 = $51,999.96; $52,000 a year × 1
const FIVE: [string, string, number][] = [
  ['hourly', '25', 52_000], ['weekly', '1000', 52_000], ['biweekly', '2000', 52_000], ['monthly', '4333.33', 51_999.96], ['annually', '52000', 52_000],
];
test.each(FIVE)('%s: every reader gives one year — $%s a period', (freq, amount, year) => {
  const r = readers(wage(freq, amount));
  for (const [name, v] of Object.entries(r)) expect(`${name}: ${(v as number).toFixed(2)}`).toBe(`${name}: ${year.toFixed(2)}`);
});

test('nothing saved is the Monthly the screen shows chosen: $4,333.33 × 12', () => {
  expect(payPeriodsAYear(undefined)).toBe(12);
  expect(payPeriodsAYear('')).toBe(12);
  const r = readers(wage(undefined, '4333.33'));
  for (const [name, v] of Object.entries(r)) expect(`${name}: ${(v as number).toFixed(2)}`).toBe(`${name}: 51999.96`);
});

describe('a frequency the table does not hold — no figure, never × 12, and the refusal in words', () => {
  // 'annual' was the old Income sheet's word; 'fortnightly' and 'yearly' are other screens' words — none is one of the five
  test.each(['annual', 'fortnightly', 'yearly'])('"%s": no year from any reader', (freq) => {
    expect(payPeriodsAYear(freq)).toBeNull();
    const op = wage(freq, '100000');
    expect(annualizedEnteredSalary(op)).toBeNull();                                 // it read $1,200,000 for 'annual' ($100,000 × 12)
    const pay = earnerPay(entryFromWage(op));
    expect(pay.freqNotRecognised).toBe(true);
    expect(pay.grossAnnualised).toBe(0);
    expect(salaryAnnual(op)).toBe(0);
    expect(incomeSummary(op).notCounted).toContain(PAY_FREQUENCY_NOT_RECOGNISED);
    const kept = { ...op, salaryMode: 'takehome' };
    expect(convertTakeHomeMode(kept)).toBe(kept);                                   // nothing converted on a guess
  });
  test('the screens say so: Your base pay, the Income summary and Your income', () => {
    const op = wage('annual', '100000');
    useStore.getState().resetAll();
    useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any);
    render(<BasePayScreen />);
    let L = builtLines(screen.toJSON());
    expect(L).toContain(PAY_FREQUENCY_NOT_RECOGNISED);
    expect(L.join(' ')).not.toMatch(/\$1,200,000|\$100,000\/month/);
    screen.unmount();
    render(<BasePayScreen />);
    screen.unmount();
    render(<IncomeSummaryScreen />);
    L = builtLines(screen.toJSON());
    expect(L).toContain(PAY_FREQUENCY_NOT_RECOGNISED);
    screen.unmount();
    render(<IncomeManagerScreen />);
    expect(builtLines(screen.toJSON()).join(' ')).toMatch(/· pay frequency not recognised/);
  });
  test('the sentence is the one the drawing’s row of 2026-11-01 prints', () => {
    const v07 = fs.readFileSync(path.join(ROOT, 'MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html'), 'utf8');
    expect(v07).toContain(`‘${PAY_FREQUENCY_NOT_RECOGNISED}’`);
  });
});

describe('the take-home migration, worked by hand (R23 item 4)', () => {
  // A profile saved before Build 54 (2026-09-01): sign-up offered Hourly beside Take-home, so "$25 an hour, take-home, 40 hours a week"
  // was stored as baseSalary 25, salaryFreq hourly, salaryMode takehome.
  const OLD = { status: 'employed', incomeSources: ['employment'], baseSalary: '25', salaryFreq: 'hourly', salaryMode: 'takehome', hoursPerWeek: '40' };
  test('now: the hourly take-home is worked on the hours — $25 × 40 × 52 = $52,000 a year, $4,333.33 a month', () => {
    const c: any = convertTakeHomeMode(OLD);
    expect(Number(c.landsTypical)).toBeCloseTo(52_000 / 12, 6);
    expect(c.salaryMode).toBe('gross');
    expect(Number(c.baseSalary) * 40 * 52).toBeGreaterThan(52_000);                   // the gross is above the take-home, by its tax
  });
  test('what it wrote until 2026-11-01: an hour read as a month — take-home $25 a month, gross $25 an hour from $300 a year', () => {
    // the old table: hourly 12. netAnnual = 25 × 12 = $300, under the standard deduction, so no tax: gross $300 a year, ÷ 12 = 25
    const oldWrote = { ...OLD, salaryMode: 'gross', baseSalary: '25', landsTypical: '25', grossWorkedBack: true };
    const fixed: any = repairHourlyTakeHome(oldWrote);
    expect(Number(fixed.landsTypical)).toBeCloseTo(52_000 / 12, 6);                    // $4,333.33 a month, where it read $25
    expect(fixed).toEqual(convertTakeHomeMode(OLD));                                   // the repair is the conversion done right
    expect(repairHourlyTakeHome(fixed)).toBe(fixed);                                    // and runs once: the footprint is gone
  });
  test('the repair touches only the old footprint: a gross typed since, or no hours, is left alone', () => {
    const typedSince = { ...OLD, salaryMode: 'gross', baseSalary: '31.50', landsTypical: '25', grossWorkedBack: undefined };
    expect(repairHourlyTakeHome(typedSince)).toBe(typedSince);
    const changed = { ...OLD, salaryMode: 'gross', baseSalary: '25', landsTypical: '4100', grossWorkedBack: true };   // take-home typed since
    expect(repairHourlyTakeHome(changed)).toBe(changed);
    const noHours = { ...OLD, salaryMode: 'gross', baseSalary: '25', landsTypical: '25', grossWorkedBack: true, hoursPerWeek: '' };
    expect(repairHourlyTakeHome(noHours)).toBe(noHours);
    const noHoursYet = { ...OLD, hoursPerWeek: undefined };
    expect(convertTakeHomeMode(noHoursYet)).toBe(noHoursYet);                          // no hours: not converted on a 40-hour guess
  });
  test('the store runs the repair on the way in: a profile set with the old footprint reads $4,333.33', () => {
    useStore.getState().resetAll();
    useStore.getState().setOnboardingProfile?.({ ...OLD, salaryMode: 'gross', baseSalary: '25', landsTypical: '25', grossWorkedBack: true } as any);
    expect(Number((useStore.getState() as any).onboardingProfile.landsTypical)).toBeCloseTo(52_000 / 12, 6);
  });
});

test('every reader of a period count reads the one table — counted off the source, the guard proves it looked', () => {
  const files = ['src/domain/income/onboarding.ts', 'MoneyKeel/functions/cashflow/base-pay.ts', 'src/domain/income/take-home-mode-migration.ts',
    'src/domain/income/calc.ts', 'MoneyKeel/functions/cashflow/income-summary.ts', 'src/screens/BasePayScreen.tsx'];
  for (const f of files) expect(`${f}: ${/from '[^']*\/pay-frequency'/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))}`).toBe(`${f}: true`);
  // no second table: a literal "biweekly: 26" or "hourly: 12" anywhere in the app's code outside the one file
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? (/__tests__|node_modules/.test(e.name) ? [] : walk(p)) : /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
  const all = ['src', 'MoneyKeel/functions', 'app'].flatMap((d) => walk(path.join(ROOT, d)));
  expect(all.length).toBeGreaterThan(250);   // 290 read on 2026-11-01
  const second = all.filter((f) => !f.endsWith('pay-frequency.ts') && /\b(biweekly|hourly)['"]?\s*:\s*(26|12|2080)\b/.test(fs.readFileSync(f, 'utf8')));
  expect(second.map((f) => path.relative(ROOT, f))).toEqual([]);
});
