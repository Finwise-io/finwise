/** YOUR BASE PAY: THE BAND'S SENTENCE SAYS WHAT IT IS READ ON (2026-10-26, CLEANUP-LEFT; income-end-to-end_v07, READ THIS FIRST
 *  row of 2026-10-26; tenet 1 of DEC-3523).
 *
 *  Since FIX-INCOME-A (2026-10-26) the band is read on the accounts' interest and dividends too, typed or not (useIncomeProfile).
 *  The sentence under the take-home still said "using your tax band read on the $60,400 you have entered so far" — but $400 of
 *  it was calculated from a savings account, never entered. Now it names both parts; with interest typed, or none, phone 8's
 *  sentence is unchanged.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-15T12:00:00'), doNotFake: [...FAKE] }); });
afterEach(() => { jest.useRealTimers(); });

// FIX-INCOME-A's agreement household: single, $5,000 a month, savings of $10,000 at 4%, nothing typed for interest
const OP: any = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'single', whoEarns: 'you',
  baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross', monthlySpending: '2000' };
const SAVINGS: any = { asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'TAXABLE', balance: 10_000, coupon_rate: 0.04, asset_class: 'cash' };
const said = (op: any, accounts: any[], transactions: any[] = []) => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false, assetAccounts: accounts, transactions } as any);
  render(<BasePayScreen />);
  const s = (builtLines(screen.toJSON()).find((l) => /We’ll calculate ≈/.test(l)) ?? '').replace(/^.*?(?=We’ll calculate)/, '');
  screen.unmount();
  return s;
};

test('interest calculated from the accounts: "$60,400 — what you have entered so far and the interest and dividends calculated from your accounts"', () => {
  // by hand: $60,000 of wages + $10,000 × 4% = $400 calculated = $60,400; the take-home is the wage alone, $4,580 (FIX-INCOME-A)
  expect(said(OP, [SAVINGS])).toBe('We’ll calculate ≈$4,580/month, using your tax band read on $60,400 — what you have entered so far and the interest and dividends calculated from your accounts. Add rent, a bonus or a spouse’s wage later and the band is calculated again, so this figure moves. It knows nothing about your state or your insurance, so the ≈$4,580 is higher than it will really be.');
});

test('interest from the accounts\' records: the records, said as the records', () => {
  // by hand: one $500 interest payment on 2026-06-30 → $60,000 + $500 = $60,500
  const s = said(OP, [SAVINGS], [{ id: 'i1', account_id: 'sav', type: 'INTEREST', amount: 500, date: '2026-06-30' }]);
  expect(s).toContain('using your tax band read on $60,500 — what you have entered so far and the interest and dividends from your accounts’ records.');
});

test('nothing but what was typed: phone 8\'s sentence, unchanged ("the $60,000 you have entered so far — add …")', () => {
  expect(said(OP, [])).toContain('using your tax band read on the $60,000 you have entered so far — add rent, a bonus or a spouse’s wage later and the band is calculated again, so this figure moves.');
  // interest typed: entered, so "you have entered" is true of all of it — $60,000 + $1,000 typed = $61,000
  expect(said({ ...OP, invAnnual: '1000' }, [SAVINGS])).toContain('using your tax band read on the $61,000 you have entered so far — add');
});

test.failing('the words until 2026-10-26, pinned: "the $60,400 you have entered so far" with $400 never entered (FIXED 2026-10-26)', () => {
  expect(said(OP, [SAVINGS])).toContain('using your tax band read on the $60,400 you have entered so far');
});
