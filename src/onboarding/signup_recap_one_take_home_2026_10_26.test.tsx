/** SIGN-UP'S "YOUR INCOME" RECAP: ONE TAKE-HOME, ONE RULE (2026-10-26, CLEANUP-LEFT; his DEC-0198 "does this reach your bank?",
 *  DEC-0179, the lead's ruling of 2026-10-25 for vests kept as shares; tenet 4; income-end-to-end_v07, READ THIS FIRST row of
 *  2026-10-26).
 *
 *  "Take-home / year" was total − tax − 401(k): interest and dividends reinvested where they are earned, and stock kept as shares
 *  when it vests, counted as money in the bank. The "≈/month average" beside it is the month grid that owns take-home
 *  (MK-XS-F-027 takeHomeMonthly), which leaves them out. Pat with $3,600/year reinvested read $53,924/year beside ≈$4,194/month —
 *  $50,324/year. Now both read the grid, and the card names what is taxed but is not money to spend, so its rows still
 *  add up to "Available /year".
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import { money } from '../domain/_shared/num';
import { renderStep } from './modules';
import { builtLines } from '../testing/mockMatch';
import { takeHomeMonthly } from '../domain/savings';
import { profileWithAccountIncome } from '../domain/income/onboarding';
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00'), doNotFake: [...FAKE] }); });
afterEach(() => { jest.useRealTimers(); });

// the 2026-10-24 agreement test's Pat: single, $5,000 a month, $400 a month into a 401(k), no rate typed
const PAT = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: '1975', baseSalary: '5000', salaryMode: 'gross',
  salaryFreq: 'monthly', c_401k: '400', filingStatus: 'single', taxMode: 'system', monthlySpending: '3000' };
const SAVINGS = { asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'TAXABLE', balance: 10_000, coupon_rate: 0.04, asset_class: 'cash' };
const recap = (op: any, accounts: any[] = []) => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: accounts, transactions: [] } as any);
  const r = render(<>{renderStep('recap_income' as any, { status: 'employed', tracks: [], answers: op, setAnswer: jest.fn() } as any)}</>);
  const L = builtLines(screen.toJSON()); r.unmount();
  const after = (label: string) => L[L.indexOf(label) + 1];
  return { L, after };
};
/** the card's rows, signed, from "WHERE IT COMES FROM"'s total down to the box: they must add up to it, to the dollar */
const addsUp = (L: string[]) => {
  const at = L.indexOf('Total income /year'), box = L.indexOf('Available /year');
  const val = (s: string) => Number(s.replace(/[^0-9.-]/g, '').replace(/^-?/, (m) => m));
  const rows = L.slice(at + 3, box).filter((_, i) => i % 2 === 1).map(val);
  return { total: val(L[at + 1]), rows, box: val(L[box + 1]) };
};

test('Pat, $3,600 a year reinvested: $50,324 a year beside ≈$4,194 a month — one figure; the card names the reinvested $3,600', () => {
  const { L, after } = recap({ ...PAT, invAnnual: '3600' });
  // by hand: $60,000 + $3,600 = $63,600; tax ~8%, $4,876; 401(k) $4,800; reinvested $3,600, not money to spend → $50,324
  expect(after('Take-home / year')).toBe(money(50_324));
  expect(L).toContain(`≈ ${money(50_324 / 12)}/month average`);
  expect(after('Interest & dividends, reinvested — not money to spend')).toBe(`-${money(3_600)}`);
  expect(after('Available /year')).toBe(money(50_324));
  const c = addsUp(L);
  expect(c.total + c.rows.reduce((t, r) => t + r, 0)).toBe(c.box);   // 63,600 − 4,876 − 4,800 − 3,600 = 50,324
  // the one function: the month grid that owns take-home, and the Income summary's own "is not here" figure (MK-CF-M-040)
  expect(takeHomeMonthly({ ...PAT, invAnnual: '3600' } as any) * 12).toBeCloseTo(50_324, 6);
  expect(incomeSummary({ ...PAT, invAnnual: '3600' } as any).taxedNotLanded * 12).toBe(3_600);
});

test('$10,000 of savings at 4%, nothing typed: the $400 calculated is taxed and not spendable — $50,708 a year, ≈$4,226 a month', () => {
  const { L, after } = recap(PAT, [SAVINGS]);
  expect(after('Take-home / year')).toBe(money(50_708));
  expect(L).toContain(`≈ ${money(50_708 / 12)}/month average`);
  expect(after('Interest & dividends, reinvested — not money to spend')).toBe(`-${money(400)}`);
  const c = addsUp(L);
  expect(c.total + c.rows.reduce((t, r) => t + r, 0)).toBe(c.box);   // 60,400 − 4,492 − 4,800 − 400 = 50,708
  expect(takeHomeMonthly(profileWithAccountIncome(PAT as any, [SAVINGS], []) as any) * 12).toBeCloseTo(50_708, 6);
});

test('paid to the bank: money to spend — no line, $53,924 a year and ≈$4,494 a month', () => {
  const { L, after } = recap({ ...PAT, invAnnual: '3600', invPaidToBank: 'yes' });
  expect(after('Take-home / year')).toBe(money(53_924));
  expect(L).toContain(`≈ ${money(53_924 / 12)}/month average`);
  expect(L.join(' ')).not.toMatch(/not money to spend/);
});

test('stock kept as shares when it vests: $10,000 in March is not money to spend, after its tax — $50,362 a year', () => {
  const op = { ...PAT, incomeSources: ['employment', 'equity'], equityType: 'rsu', rsuGrants: [{ shares: 25, price: 400, date: '2026-03-15' }] };
  const { L, after } = recap(op);
  // by hand: tax ~8.06% ($5,644 of $70,000); the vest after its tax, $10,000 × (1 − 5,644 ÷ 70,000) = $9,193.71
  expect(after('Stock vesting, kept as shares, after its tax — not money to spend')).toBe(`-${money(9_193.71)}`);
  expect(after('Take-home / year')).toBe(money(50_362.29));
  const c = addsUp(L);
  expect(Math.abs(c.total + c.rows.reduce((t, r) => t + r, 0) - c.box)).toBeLessThanOrEqual(1);   // rounded once per row (DEC-0264)
  // sold when they vest: money to spend, no line
  const sold = recap({ ...op, rsuSoldAtVest: 'yes' });
  expect(sold.after('Take-home / year')).toBe(money(59_556));
  expect(sold.L.join(' ')).not.toMatch(/not money to spend/);
});

describe('the person\'s own rate is for their pay (v07 rule 5 and phone 16): the rows still add up to the box', () => {
  // 20% typed; $5,000/month of wages; $400/month into a 401(k); a rental $1,800 − $600 = $1,200/month; $3,600/year reinvested
  const TYPED = { ...PAT, taxMode: 'manual', manualTaxRate: '20', invAnnual: '3600', incomeSources: ['employment', 'rental'],
    rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'h' }] };
  test('20% typed, rent and interest: $78,000 − $12,000 taken out of pay − $4,800 − $3,600 = $57,600; the year\'s $15,600 said under it', () => {
    const { L, after } = recap(TYPED);
    // by hand: the year's tax 20% × $78,000 = $15,600 (the Income summary's); taken out of pay, the wages' 20% × $60,000 = $12,000;
    // the other 20% × ($14,400 rent + $3,600 interest) = $3,600 is not taken out of the take-home (phone 16's rent lands whole)
    expect(after('Total income /year')).toBe(money(78_000));
    expect(after('Tax taken out of your pay')).toBe(`-${money(12_000)}`);
    expect(after('Interest & dividends, reinvested — not money to spend')).toBe(`-${money(3_600)}`);
    expect(after('Available /year')).toBe(money(57_600));
    expect(after('Take-home / year')).toBe(money(57_600));
    expect(L).toContain('Your tax for the year is $15,600, at your 20.00% rate. $3,600 of it is on your rent, interest and dividends — your own rate is for your pay, so it is not taken out of your take-home.');
    const c = addsUp(L);
    expect(c.total + c.rows.reduce((t, r) => t + r, 0)).toBe(c.box);
    // one figure each: the year's tax is the Income summary's; the box is the twelve months' take-home
    expect(incomeSummary(TYPED as any).taxed.tax).toBeCloseTo(15_600, 6);
    expect(takeHomeMonthly(TYPED as any) * 12).toBeCloseTo(57_600, 6);
  });
  test('a take-home typed ($4,000/month) and $3,600 reinvested: $63,600 − $7,200 − $4,800 − $3,600 = $48,000, the take-home entered × 12', () => {
    const op = { ...PAT, landsTypical: '4000', invAnnual: '3600' };
    const { L, after } = recap(op);
    // by hand: the rate worked from the take-home, ($5,000 − $400 − $4,000) ÷ $5,000 = 12%; the year's tax 12% × $63,600 = $7,632;
    // taken out of pay 12% × $60,000 = $7,200; the other $432 is on the interest
    expect(after('Tax taken out of your pay')).toBe(`-${money(7_200)}`);
    expect(after('Available /year')).toBe(money(48_000));
    expect(L).toContain('Your tax for the year is $7,632, at your 12.00% rate. $432 of it is on your interest and dividends — your own rate is for your pay, so it is not taken out of your take-home.');
    const c = addsUp(L);
    expect(c.total + c.rows.reduce((t, r) => t + r, 0)).toBe(c.box);
    expect(incomeSummary(op as any).taxed.tax).toBeCloseTo(7_632, 6);
  });
  test('the calculated rate takes the tax on every source from the months: no line, the row as before', () => {
    const { L } = recap({ ...PAT, invAnnual: '3600' });
    expect(L.join(' ')).not.toMatch(/Tax taken out of your pay|Your tax for the year/);
  });
  test.failing('the card until 2026-10-26, pinned: Tax −$15,600 above a $57,600 box, its rows giving $54,000 (FIXED 2026-10-26)', () => {
    const { L } = recap(TYPED);
    const c = addsUp(L);
    expect(c.total + c.rows.reduce((t, r) => t + r, 0)).toBe(54_000);
  });
});

test.failing('the recap until 2026-10-26, pinned: $53,924 a year beside ≈$4,194 a month (FIXED 2026-10-26)', () => {
  expect(recap({ ...PAT, invAnnual: '3600' }).after('Take-home / year')).toBe(money(53_924));
});
