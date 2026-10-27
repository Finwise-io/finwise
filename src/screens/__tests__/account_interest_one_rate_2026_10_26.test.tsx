/** ONE PERSON, ONE RATE, WITH THE ACCOUNTS' INTEREST IN IT (2026-10-26, FIX-INCOME-A; the lead's ruling from DEC-0179 and DEC-0198;
 *  tenet 4).
 *
 *  The year's interest and dividends are one figure (interestAndDividendsForYear: records → typed → calculated from the accounts'
 *  rates ≈) and they count in the tax whether or not they were typed. Only the Income summary and the Income manager handed the
 *  accounts in, so the rate in force (MK-CF-F-181) differed between screens. Every income screen now reads its profile through
 *  src/hooks/useIncomeProfile.ts (profileWithAccountIncome); the Tax organizer's door does the same; the Cash flow months read it
 *  in useCashflowModel (FIX-MONTH).
 *
 *  The household, by hand: single, $5,000 a month of wages, no 401(k), savings of $10,000 at 4%, nothing typed for interest.
 *    Interest calculated: $10,000 × 4% = $400. Taxed: $60,000 + $400 − $16,100 = $44,300 → $1,240 + 12% × $31,900 = $5,068.
 *    The rate in force: $5,068 ÷ $60,400 = 8.3907%. Your base pay (the wage alone): tax $5,000 × 8.3907% = $419.54 a month,
 *    take-home $4,580.46. The $400 is reinvested where it is earned, so it is taxed and is not money in the month (DEC-0179) — its
 *    tax, $400 × 8.3907% ÷ 12 = $2.80 a month, still comes out of pay (the law in dividends.test.ts, B34). So the month lands
 *    $4,580.46 − $2.80 = $4,577.67 = $5,000 − $5,068 ÷ 12 on the Income summary ("Tax on interest and dividends"), Home and Cash flow.
 *    Without the interest (what Your base pay, Home, Cash flow and the Tax organizer's rate read before): $5,020 ÷ $60,000 = 8.3667%,
 *    $418.33 and $4,581.67.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { profileWithAccountIncome } from '../../domain/income/onboarding';
import { rateInForce } from '../../domain/income/tax-rate';
import { basePay, entryFromWage } from '../../../MoneyKeel/functions/cashflow/base-pay';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';
import { theTaxOrganizer } from '../../../MoneyKeel/functions/cashflow/tax-organizer';
import { buildDatedGrid } from '../../domain/grid';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const OP: any = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'single', whoEarns: 'you',
  baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross', monthlySpending: '2000' };
const SAVINGS: any = { asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'TAXABLE', balance: 10_000, coupon_rate: 0.04, asset_class: 'cash' };
const ACCOUNTS = [SAVINGS];
const RATE = 5068 / 60400;
const OLD_RATE = 5020 / 60000;

/** render a screen in the household and read every figure it printed under its identifier */
function printed(name: 'basepay' | 'summary' | 'home' | 'cashflow' | 'taxorg'): { id: string; text: string }[] {
  const SCREENS: Record<string, () => any> = {
    basepay: () => require('../BasePayScreen').default, summary: () => require('../IncomeSummaryScreen').default,
    home: () => require('../HomeScreen').default, cashflow: () => require('../CashFlowScreen').default,
    taxorg: () => require('../TaxOrganizerScreen').default,
  };
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: OP, assetAccounts: ACCOUNTS, transactions: [], nwSetupChoice: 'self' } as any);
  const C = SCREENS[name]();
  const r = render(<C />);
  resetFiguresPrinted();
  r.rerender(<C />);
  const out = figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text }));
  r.unmount();
  return out;
}
const first = (rows: { id: string; text: string }[], id: string) => rows.find((r) => r.id === id)?.text;

beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-15T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); });
afterEach(() => { jest.useRealTimers(); });

describe('the doors: one rate, one tax, the $400 of interest in it', () => {
  test('the profile every screen reads carries the $400, calculated (≈), and nothing is stored', () => {
    const p: any = profileWithAccountIncome(OP, ACCOUNTS, []);
    expect(p.invAnnual).toBeCloseTo(400, 9);
    expect(p.invBasis).toBe('calculated');
    expect(OP.invAnnual).toBeUndefined();
    expect(rateInForce(p).rate).toBeCloseTo(RATE, 12);
  });
  test('Your base pay, the Income summary, the Tax organizer and the Cash flow months read 8.3907% and $5,068', () => {
    const p: any = profileWithAccountIncome(OP, ACCOUNTS, []);
    const pay = basePay({ earners: [{ name: 'You', entry: entryFromWage(OP) }], filingStatus: 'single', over65: 0, profile: p });
    const sum = incomeSummary(OP, { accounts: ACCOUNTS, transactions: [] });
    const org = theTaxOrganizer({ profile: OP, accounts: ACCOUNTS, debts: [], transactions: [], year: 2026 });
    expect(pay.tax.rate).toBeCloseTo(RATE, 12);
    expect(pay.tax.monthly).toBeCloseTo(5000 * RATE, 9);
    expect(sum.taxed.rate).toBeCloseTo(RATE, 12);
    expect(sum.taxed.tax).toBeCloseTo(5068, 6);
    expect(org.estTaxRate as number).toBeCloseTo(RATE, 12);
    expect(pay.landsInBank).toBeCloseTo(5000 * (1 - RATE), 9);                      // the wage alone: $4,580.46
    const interestTax = sum.lands.lines.find((l) => l.label === 'Tax on interest and dividends')?.amount as number;
    expect(interestTax).toBeCloseTo(-(400 * RATE) / 12, 9);                            // −$2.80 a month
    expect(sum.lands.usualMonth).toBeCloseTo(5000 - 5068 / 12, 9);                     // $4,577.67 = $4,580.46 − $2.80
    expect(pay.landsInBank + interestTax).toBeCloseTo(sum.lands.usualMonth, 9);
    const grid = buildDatedGrid(p, { now: new Date(2026, 9, 15, 12) });
    expect(grid.cells[0].inflow).toBeCloseTo(sum.lands.usualMonth, 9);                 // the Cash flow months: the same $4,577.67
    // the year's tax, one figure: the wage's share on Your base pay + the interest's share = the Income summary's $5,068
    expect(pay.tax.monthly * 12 + 400 * RATE).toBeCloseTo(sum.taxed.tax, 9);
  });
});

describe('the screens, as printed', () => {
  test('Your base pay: tax ≈$420/month, take-home ≈$4,580/month (it read $418 and $4,582 without the interest)', () => {
    const P = printed('basepay');
    expect(first(P, 'MK-CF-M-033')).toBe('$420/month');
    expect(first(P, 'MK-CF-M-031')).toBe('$4,580/month');
  });
  test('the Income summary: take-home each month $4,578 (the pay, less the $3 of tax on the reinvested interest) and $5,068 of tax a year', () => {
    const P = printed('summary');
    expect(first(P, 'MK-CF-M-037')).toBe('$4,578');
    expect(P.filter((r) => r.id === 'MK-CF-M-044').map((r) => r.text)).toContain('$5,068/year');
  });
  test('Home and Cash flow: this month\'s inflow is the Income summary\'s $4,578', () => {
    const H = printed('home');
    const CF = printed('cashflow');
    const homeIn = first(H, 'MK-CF-M-051') ?? first(H, 'MK-CF-M-047');
    expect(homeIn).toBe('$4,578');
    expect(first(CF, 'MK-CF-M-004')).toBe('$4,578');        // This month's first row: the take-home planned in (each row of the month)
  });
  test('the Tax organizer reads the same rate (8.3907%, shown whole as 8%) and lists the $400', () => {
    const org = theTaxOrganizer({ profile: OP, accounts: ACCOUNTS, debts: [], transactions: [], year: 2026 });
    expect(Math.round((org.estTaxRate as number) * 100)).toBe(8);
    expect(org.estTaxRate as number).toBeCloseTo(rateInForce(profileWithAccountIncome(OP, ACCOUNTS, []) as any).rate, 12);
  });
});

describe('sign-up reads the same profile (its Taxes step)', () => {
  test('"On the ~$60,400 it is taxed on" — the $400 of interest in it, the rate ~8% (it read ~$60,000)', () => {
    const { renderStep } = require('../../onboarding/modules');
    useStore.getState().resetAll();
    useStore.setState({ assetAccounts: ACCOUNTS, transactions: [] } as any);
    const r = render(<>{renderStep('income_tax', { status: 'employed', tracks: [], answers: OP, setAnswer: jest.fn() } as any)}</>);
    expect(r.getByText(/^On the ~\$60,400 it is taxed on/)).toBeTruthy();
    expect(r.getByText('Use the calculated rate (~8.39%)')).toBeTruthy();   // $5,068 ÷ $60,400 = 8.3907%, two decimals since 2026-10-26 (MK-CF-M-081)
    r.unmount();
  });
});

describe('what the screens read before (kept as test.failing, never deleted)', () => {
  test.failing('the app until 2026-10-26, pinned (no longer its answer): Your base pay\'s rate left the $400 out — 8.3667%, $418/month', () => {
    const P = printed('basepay');
    expect(first(P, 'MK-CF-M-033')).toBe('$418/month');
  });
  test.failing('the app until 2026-10-26, pinned (no longer its answer): the Tax organizer\'s rate left the $400 out — 8.3667%', () => {
    const org = theTaxOrganizer({ profile: OP, accounts: ACCOUNTS, debts: [], transactions: [], year: 2026 });
    expect(org.estTaxRate as number).toBeCloseTo(OLD_RATE, 12);
  });
});
