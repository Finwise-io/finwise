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

// ── R23a (2026-11-01, round 5): an unknown pay frequency gives no figure anywhere downstream ─────────────────────────────────────
describe('R23a · every downstream reader refuses a wage it cannot read — and prints what does not rest on it', () => {
  const { wageRefusalOf } = require('../../domain/income/pay-frequency');
  const { taxOrganizer } = require('../../domain/planning');
  const RENT = [{ type: 'long', income: '1800', expenses: '600', property_id: 'h' }];
  const HOUSE = [{ asset_id: 'h', label: 'Rental', asset_class: 'real_estate', balance: 300_000 }];
  const UNKNOWN = { ...wage('annual', '100000'), taxMode: undefined, manualTaxRate: undefined, incomeSources: ['employment', 'rental'], rentals: RENT };
  const shown = (C: any, op: any) => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false, assetAccounts: HOUSE } as any);
    render(<C />);
    const L = builtLines(screen.toJSON()).filter((l) => !/^[-]+$/.test(l));
    screen.unmount();
    return L;
  };
  test('one refusal, read two ways, agrees: Base pay’s (through the Income summary) and the organizer’s, for every case', () => {
    const cases: [any, string | null][] = [
      ...FIVE.map(([f, amt]) => [wage(f, amt), null] as [any, null]),
      [wage('annual', '100000'), PAY_FREQUENCY_NOT_RECOGNISED],
      [wage('hourly', '25', { hoursPerWeek: '' }), 'Hours a week not entered — your hourly pay is not counted until it is.'],
      [{ ...wage('monthly', '5000'), whoEarns: 'both', partnerWage: { baseSalary: '4000', salaryFreq: 'fortnightly' } }, PAY_FREQUENCY_NOT_RECOGNISED],
    ];
    for (const [op, want] of cases) {
      expect(incomeSummary(op).wageRefusal).toBe(want);
      expect(wageRefusalOf(op)).toBe(want);
    }
  });
  test('Your base pay: "Gross pay", no "Gross undefined", no ✓ beside the refusal', () => {
    const L = shown(BasePayScreen, UNKNOWN);
    expect(L).toContain('Gross pay');
    expect(L.join(' ')).not.toMatch(/undefined|✓/);
  });
  test('Your income: "You · pay frequency not recognised", no "≈$0/month", no ✓ on the job', () => {
    const L = shown(IncomeManagerScreen, UNKNOWN);
    expect(L).toContain('You · pay frequency not recognised');
    expect(L.join(' ')).not.toMatch(/[~≈]\$0/);   // no about-zero in either mark ('~' since R25, 2026-11-01)
    expect(L[L.indexOf('A job') + 1]).not.toBe('✓');
    expect(L).toContain('One property · $1,200/month net');                           // the rent does not rest on the wage: it prints
  });
  test('the Income summary: no $0 total, no "Nothing entered yet", no bracket or tax on a $0 wage; the rent’s gross prints', () => {
    const L = shown(IncomeSummaryScreen, UNKNOWN);
    const t = L.join(' ');
    expect(t).not.toMatch(/Nothing entered yet|\$0\b|Federal tax bracket|Calculated federal tax|10%/);
    // by hand: ($1,800 − $600) × 12 = $14,400 of rent kept, the gross without the wage
    expect(t).toMatch(/Rent, net \$14,400 = Gross \/year, not counting your wage \$14,400/);
    expect(L.filter((l) => l === PAY_FREQUENCY_NOT_RECOGNISED).length).toBe(2);          // under each of the two bands
  });
  test('the Tax organizer: no walk and no rate on a $0 wage — the sentence instead', () => {
    const org = taxOrganizer(UNKNOWN, { year: 2026, accounts: HOUSE, liabilities: [] });
    expect(org.wageRefusal).toBe(PAY_FREQUENCY_NOT_RECOGNISED);
    expect(org.steps).toBeNull();
    expect(org.estTaxRate).toBeNull();
    const ok = taxOrganizer({ ...UNKNOWN, salaryFreq: 'annually' }, { year: 2026, accounts: HOUSE, liabilities: [] });
    expect(ok.wageRefusal).toBeNull();
    expect(ok.steps).not.toBeNull();                                                   // $100,000 + $14,400 walked as before
  });
  // RE-WORKED 2026-11-02 (FX-PLAN, the lead's R26, CF6-09; ways-to-add v10's row of that date): the rent does not rest on the wage, so
  // Home prints it as Cash flow's This month does — $1,800 − $600 = $1,200 — with the sentence under it; Left still reads —
  test('Home’s THIS MONTH’S CASH FLOW: the rent the person entered, the sentence under it, Left —', () => {
    const L = shown(require('../HomeScreen').default, UNKNOWN);
    const i = L.indexOf('THIS MONTH’S CASH FLOW');
    const box = L.slice(i, i + 12);
    expect(box).toContain(PAY_FREQUENCY_NOT_RECOGNISED);
    expect(box[box.indexOf('Income') + 1]).toBe('$1,200');
    expect(box[box.indexOf('Income') + 2]).toBe(PAY_FREQUENCY_NOT_RECOGNISED);
    expect(box[box.indexOf('Left') + 1]).toBe('—');
  });
  test.failing('the old answer, kept (CF6-09, 2026-11-02): Home’s Income read — beside $1,200 of rent entered', () => {
    const L = shown(require('../HomeScreen').default, UNKNOWN);
    const i = L.indexOf('THIS MONTH’S CASH FLOW');
    const box = L.slice(i, i + 12);
    expect(box[box.indexOf('Income') + 1]).toBe('—');
  });
  test('choose a frequency and every figure is back: $100,000 annually — bracket and tax print', () => {
    const t = shown(IncomeSummaryScreen, { ...UNKNOWN, salaryFreq: 'annually' }).join(' ');
    expect(t).toMatch(/Federal tax bracket/);
    expect(t).not.toMatch(/not recognised/);
  });
});

test('sign-up, Student loans: no claim about when repayment starts — it was never asked', () => {
  const { renderStep } = require('../../onboarding/modules');
  useStore.getState().resetAll();
  render(<>{renderStep('income_loans', { status: 'student', tracks: [], answers: { loans: [{ label: 'Federal', amount: '20000', months: [9], apr: '5', termYears: '10' }] }, setAnswer: jest.fn() })}</>);
  const t = builtLines(screen.toJSON()).join(' ');
  // by hand: $20,000 at 5% over 10 years = $212.13/month
  expect(t).toMatch(/\$20,000 borrowed · ~\$212\/month once repayment starts/);
  expect(t).toMatch(/It lands as cash now in your bill calendar\. When repayment starts is not entered\./);
  expect(t).not.toMatch(/after you graduate|after graduation/);
});

// ── R27 (2026-11-02, round 6): a wage that can't be counted never prints as $0, in any month or screen ───────────────────────────
describe('R27 · no month and no screen prints a figure that rests on a wage it cannot read', () => {
  const { fireEvent } = require('@testing-library/react-native');
  const RENT = [{ type: 'long', income: '1800', expenses: '600', property_id: 'h' }];
  const HOUSE = [{ asset_id: 'h', label: 'Rental', asset_class: 'real_estate', balance: 300_000 }];
  const base = { status: 'employed', incomeSources: ['employment'], salaryMode: 'gross', monthlySpending: '2000' };
  const UNKNOWN = { ...base, baseSalary: '100000', salaryFreq: 'annual' };
  const HOURLY = { ...base, baseSalary: '25', salaryFreq: 'hourly' };
  const COUPLE = { ...UNKNOWN, hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both', partnerWage: { baseSalary: '4500', salaryFreq: 'monthly' } };
  const cash = (op: any, go?: (s: any) => void) => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false, assetAccounts: HOUSE } as any);
    render(React.createElement(require('../CashFlowScreen').default));
    if (go) go(screen);
    const L = builtLines(screen.toJSON()).filter((l) => !/^[-]+$/.test(l));
    screen.unmount();
    return L;
  };
  test.each([['a frequency not recognised', UNKNOWN, PAY_FREQUENCY_NOT_RECOGNISED],
             ['hourly, no hours', HOURLY, 'Hours a week not entered — your hourly pay is not counted until it is.'],
             ['with rent', { ...UNKNOWN, incomeSources: ['employment', 'rental'], rentals: RENT }, PAY_FREQUENCY_NOT_RECOGNISED],
             ['a couple', COUPLE, PAY_FREQUENCY_NOT_RECOGNISED]])('CF6-06 · This month, %s: no inflow figure, the reason, each surplus —', (_n, op, why) => {
    const L = cash(op);
    expect(L.filter((l) => /inflow/i.test(l) && /take-home/.test(l))).toEqual([]);   // no wage row: no "$0", no "~$4,318"
    expect(L.filter((l) => l === why).length).toBe(2);                                 // under PLANNED and under ACTUAL
    expect(L[L.indexOf('= Planned surplus') + 1]).toBe('—');
    expect(L[L.indexOf('= Actual surplus so far') + 1]).toBe('—');
  });
  test('R27 · with rent, the rent row does not rest on the wage and prints: "Actual inflow (rent) $1,200" ($1,800 − $600)', () => {
    const L = cash({ ...UNKNOWN, incomeSources: ['employment', 'rental'], rentals: RENT });
    expect(L[L.indexOf('Actual inflow (rent)') + 1]).toBe('$1,200');
    expect(L[L.indexOf('= Actual surplus so far') + 1]).toBe('—');                     // the surplus still rests on the wage
  });
  test('R25a · a surplus worked on a calculated take-home wears the mark before its sign; a typed one none', () => {
    const calc = cash({ ...base, baseSalary: '8000', salaryFreq: 'monthly' });          // $8,000 gross, no rate: calculated
    expect(calc[calc.indexOf('= Planned surplus') + 1]).toMatch(/^~[+−]\$/);
    const typed = cash({ ...base, baseSalary: '8000', salaryFreq: 'monthly', landsTypical: '6000' });
    expect(typed[typed.indexOf('= Planned surplus') + 1]).toBe('+$4,000');            // $6,000 − $2,000, no mark
  });
  test('CF6-07 · a later month: "Planned inflow —" and the reason, never "$0 · Nothing entered yet"; the surplus —', () => {
    const L = cash({ ...UNKNOWN, incomeSources: ['employment', 'rental'], rentals: RENT }, (s) => fireEvent.press(s.getByLabelText('Next month')));
    expect(L[L.indexOf('Planned inflow') + 1]).toBe('—');
    expect(L).toContain(PAY_FREQUENCY_NOT_RECOGNISED);
    expect(L.join(' ')).not.toMatch(/Nothing entered yet/);
    const i = L.indexOf('= Planned surplus');
    if (i >= 0) expect(L[i + 1]).toBe('—');
  });
  test('CF6-08 · a past month before tracking, rent only: "—" on each line, nothing recorded — never "$0 · $0 · +$0"', () => {
    const L = cash({ ...base, incomeSources: ['rental'], rentals: RENT }, (s) => { for (let k = 0; k < 4; k++) fireEvent.press(s.getByLabelText('Previous month')); });
    expect(L.join(' ')).toMatch(/Actual inflow — Outflow \(expenses \+ debt\) — = Surplus — Nothing recorded for this month — it predates your tracking\./);
  });
  test('CF6-12 · Income tab, hourly with no hours: "hours a week not entered", and "$25/hour"', () => {
    const L = cash(HOURLY, (s) => fireEvent.press(s.getByLabelText(/^Income tab/)));
    const t = L.join(' ');
    expect(t).toMatch(/before tax · hours a week not entered \$25\/hour ›/);
    expect(t).not.toMatch(/pay frequency not recognised/);
  });
  test('CF6-12 · the couple’s Income tab puts the refusal on the wage it belongs to, and Sam’s take-home waits', () => {
    const t = cash(COUPLE, (s) => fireEvent.press(s.getByLabelText(/^Income tab/))).join(' ');
    expect(t).toMatch(/You · Salary — steady before tax · pay frequency not recognised \$100,000/);
    expect(t).toMatch(/Sam · Salary — steady before tax · monthly · take-home not calculated — the other pay cannot be read yet \$4,500/);
  });
  test('CF6-15 · Base pay: Sam’s calculated take-home is not worked on a $0 wage', () => {
    const p = earnerPay; void p;
    const L = (() => { useStore.getState().resetAll(); useStore.setState({ onboardingProfile: COUPLE, onboardingComplete: true, hideBalances: false } as any);
      render(<BasePayScreen />); const x = builtLines(screen.toJSON()); screen.unmount(); return x; })();
    expect(L).toContain('Monthly · the same each month · take-home not calculated — the other pay cannot be read yet');
    expect(L.join(' ')).not.toMatch(/4,318/);
  });
  test('CF6-17 · the couple’s Income summary keeps Sam’s $54,000, so its rows add up: $54,000 + $14,400 = $68,400', () => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingProfile: { ...COUPLE, incomeSources: ['employment', 'rental'], rentals: RENT }, onboardingComplete: true, hideBalances: false, assetAccounts: HOUSE } as any);
    render(<IncomeSummaryScreen />);
    const t = builtLines(screen.toJSON()).join(' ');
    screen.unmount();
    expect(t).toMatch(/Sam’s gross \$54,000 Rent, net \$14,400 = Gross \/year, not counting your wage \$68,400/);
    expect(t).not.toMatch(/Your gross/);
  });
  test('CF6-11 · rent with no property named: every income screen says it waits for its property, never "Nothing entered yet"', () => {
    const op = { ...base, incomeSources: ['rental'], rentals: [{ type: 'long', income: '1800', expenses: '600' }] };
    const want = 'Your rent of $1,200/month is not counted until you pick its property.';   // $1,800 − $600
    expect(cash(op)).toContain(want);
    const tab = cash(op, (s) => fireEvent.press(s.getByLabelText(/^Income tab/)));
    expect(tab).toContain(want);
    expect(tab.join(' ')).not.toMatch(/Nothing entered yet/);
    useStore.getState().resetAll();
    useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any);
    render(<IncomeSummaryScreen />);
    const t = builtLines(screen.toJSON());
    screen.unmount();
    expect(t).toContain(want);
    expect(t.join(' ')).not.toMatch(/Nothing entered yet/);
  });
  test('CF6-16 · sign-up loans: the heading is what it asks', () => {
    const { renderStep } = require('../../onboarding/modules');
    useStore.getState().resetAll();
    render(<>{renderStep('income_loans', { status: 'student', tracks: [], answers: { loans: [{ label: 'Federal', amount: '20000', months: [9] }] }, setAnswer: jest.fn() })}</>);
    const t = builtLines(screen.toJSON()).join(' ');
    expect(t).toMatch(/Rate and years to pay it off \(optional\)/);
    expect(t).not.toMatch(/graduate/);
  });
});
