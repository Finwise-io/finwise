/** A BOND'S YEAR OF INTEREST IS ONE NUMBER ON EVERY SCREEN THAT PRINTS IT (2026-10-24, NW-BONDS).
 *
 *  Three screens print what a bond or CD pays in a year: the account page (BOND FACTS · Interest payments, MK-NW-M-024 and
 *  MK-NW-M-056), the Bonds screen (each bond's coupon, MK-NW-M-056, and INTEREST A YEAR, MK-NW-M-043) and the income sheet
 *  (Income · Interest & dividends · From your accounts, MK-CF-M-066 — incomeFromAccounts). The first two read the bonds door;
 *  the income sheet worked the figure out with its own arithmetic until today: face × rate, else rate × balance. So a bond
 *  whose face was left blank read 4.5% of its market value there, and a matured bond kept paying. It now reads the same one
 *  rule (MK-NW-F-126 yearlyInterestNow), and this file holds the three screens to one answer, bond by bond.
 *
 *  THE RULE, 2026-10-24 (the lead's decision under DEC-3523 tenet 3, which outranks tenet 6; the outside re-run's
 *  MK-NW-M-024 tenet 3): a bond's coupon is paid on its face. A bond with a maturity date and no face value entered has no
 *  year's interest — "face value not entered" — where it read the rate on the market value. His ruling DEC-2748c's value ×
 *  rate stands for a CD bought from the bank typed by its balance (DEC-3837) and for a bond fund (no maturity date).
 *
 *  The household, on Sep 28, 2026 — every figure by hand:
 *    US Treasury 2029   $25,000 face, 4.5%, matures Sep 30, 2029, worth $24,200   → 25,000 × 4.5% = $1,125/year
 *    US Treasury 2031   no face entered, 4.5%, matures May 15, 2031, worth $24,200 → none (it read 24,200 × 4.5% = $1,089)
 *    Ally 12-month CD   bought from the bank, no face, 5.05%, worth $10,000        → 10,000 × 5.05% = $505/year
 *    Corp 2026          $10,000 face, 4%, matured Jun 30, 2026, worth $10,000       → $0 (it pays no more; the income sheet read $400)
 *  INTEREST A YEAR on the Bonds screen = $1,125 + $505 + $0 = $1,630; the income sheet's bond lines add to the same $1,630.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BondsScreen from '../BondsScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { useStore } from '../../store/useStore';
import { builtLines } from '../../testing/mockMatch';
import { theBonds } from '../../../MoneyKeel/functions/networth-and-performance/bonds';
import { incomeFromAccounts } from '../../domain/income/from-accounts';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const TODAY = '2026-09-28';
const base = { kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', target_return: 0, source: 'manual' };
const ACCOUNTS = [
  { ...base, asset_id: 'b1', label: 'US Treasury 2029', balance: 24_200, face_value: 25_000, coupon_rate: 0.045, maturity_date: '2029-09-30' },
  { ...base, asset_id: 'b2', label: 'US Treasury 2031', balance: 24_200, coupon_rate: 0.045, maturity_date: '2031-05-15' },
  { ...base, asset_id: 'b3', label: 'Ally 12-month CD', kind: 'cd', balance: 10_000, coupon_rate: 0.0505, maturity_date: '2027-03-15', cd_bought: 'bank' },
  { ...base, asset_id: 'b4', label: 'Corp 2026', balance: 10_000, face_value: 10_000, coupon_rate: 0.04, maturity_date: '2026-06-30' },
];
/** what each screen should print for each bond's year of interest */
const WANT: Record<string, { page: string; bonds: string; income: [string, string] }> = {
  'US Treasury 2029': { page: '4.50%/year · $1,125/year', bonds: '$1,125/year coupon', income: ['4.50% coupon on $25,000 face', '$1,125'] },   // the rate to two decimals, as the page prints it (IN3-04, 2026-10-31)
  'US Treasury 2031': { page: '4.50%/year · face value not entered', bonds: 'coupon — face value not entered',
    income: ['4.50% coupon — face value not entered, so counted as $0 until it is', '$0'] },
  'Ally 12-month CD': { page: '5.05%/year · $505/year', bonds: '$505/year coupon', income: ['5.05% on $10,000', '$505'] },
  'Corp 2026': { page: '4.00%/year · $0/year', bonds: '$0/year coupon', income: ['matured Jun 30, 2026 — it pays no more interest', '$0'] },
};

function seed(accounts: any[] = ACCOUNTS) {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self', liabilities: [], transactions: [], assetAccounts: accounts,
    onboardingProfile: { status: 'employed', incomeSources: ['investment_income'] } } as any);
}
afterEach(() => { jest.useRealTimers(); mockParams = {}; });
const lines = () => builtLines(screen.toJSON());
const afterLabel = (L: string[], label: string, n = 1, from = 0) => { const i = L.indexOf(label, from); return i >= 0 ? L[i + n] : undefined; };

test('the door: one answer for each bond, the rows add up to INTEREST A YEAR, and the faceless Treasury is named, not counted', () => {
  seed();
  const door = theBonds({ accounts: ACCOUNTS as any, today: new Date(`${TODAY}T12:00:00`) });
  const by = Object.fromEntries(door.rows.map((r) => [r.label, r.couponPerYear]));
  expect(by['US Treasury 2029']!).toBeCloseTo(1125, 9);      // 25,000 × 0.045
  expect(by['US Treasury 2031']).toBeNull();                 // no face: no year's interest
  expect(by['Ally 12-month CD']!).toBeCloseTo(505, 9);       // 10,000 × 0.0505
  expect(by['Corp 2026']).toBe(0);                           // matured Jun 30, 2026
  expect(door.couponPerYear).toBeCloseTo(1125 + 505 + 0, 9);
  expect(door.leftOutNoFace).toEqual(['US Treasury 2031']);
  expect(door.leftOutNoRate).toEqual([]);
});

test('the account page: Interest payments reads each bond\'s one figure (four pages opened — the guard looked)', () => {
  let opened = 0;
  for (const a of ACCOUNTS) {
    seed();
    mockParams = { id: a.asset_id };
    const r = render(<AccountPortfolioScreen />);
    const L = lines();
    expect(L).toContain('BOND FACTS');
    expect(afterLabel(L, 'Interest payments')).toBe(WANT[a.label].page);
    // the faceless Treasury has no yield on today's value either — it would be its own rate read back (4.50%)
    if (a.label === 'US Treasury 2031') expect(L).not.toContain("Yield on today's value");
    r.unmount();
    opened++;
  }
  expect(opened).toBe(4);
});

test('the Bonds screen: each card\'s coupon is the same figure, INTEREST A YEAR is $1,630, and the faceless Treasury is named under AVERAGE YIELD', () => {
  seed();
  render(<BondsScreen />);
  const L = lines();
  for (const [label, w] of Object.entries(WANT)) {
    const at = L.indexOf(label);
    expect(at).toBeGreaterThanOrEqual(0);
    // the card's lines after its name: value, sub-line(s), then the coupon metric
    expect(L.slice(at, at + 6)).toContain(w.bonds);
  }
  expect(afterLabel(L, 'INTEREST A YEAR')).toBe('$1,630');
  expect(L).toContain('Average yield leaves out US Treasury 2031 — face value not entered.');
  expect(L.join(' ')).not.toMatch(/\$1,089/);
});

test('the income sheet: From your accounts lists each bond with the same figure, and its bond lines add to the Bonds screen\'s $1,630', () => {
  seed();
  mockParams = { open: 'dividends' };
  render(<IncomeManagerScreen />);
  const L = lines();
  expect(L).toContain('From your accounts');
  for (const [label, w] of Object.entries(WANT)) {
    const at = L.indexOf(label);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(L.slice(at + 1, at + 3)).toEqual(w.income);
  }
  const worked = incomeFromAccounts(ACCOUNTS as any, [], new Date(`${TODAY}T12:00:00`));
  expect(worked.lines).toHaveLength(4);                       // the guard looked: one line a bond
  expect(worked.annual).toBeCloseTo(1125 + 0 + 505 + 0, 9);
  expect(worked.annual).toBeCloseTo(theBonds({ accounts: ACCOUNTS as any, today: new Date(`${TODAY}T12:00:00`) }).couponPerYear, 9);
  expect(L.join(' ')).not.toMatch(/\$1,089|4\.5% on \$24,200/);
});

test.failing('the app until 2026-10-24, pinned: the income sheet worked the bonds out itself — $1,089 for the faceless Treasury and $400 for the matured bond — no longer its answer', () => {
  const worked = incomeFromAccounts(ACCOUNTS as any, [], new Date(`${TODAY}T12:00:00`));
  expect(worked.lines.find((l) => l.label === 'US Treasury 2031')!.annual).toBeCloseTo(1089, 6);
  expect(worked.lines.find((l) => l.label === 'Corp 2026')!.annual).toBeCloseTo(400, 6);
});

test('twice a year: the account page and the Bonds screen print one yield to maturity, about 5.67% (it read 6.56%)', () => {
  const twice = [{ ...ACCOUNTS[0], coupons_per_year: 2 }];
  seed(twice);
  mockParams = { id: 'b1' };
  const r = render(<AccountPortfolioScreen />);
  expect(afterLabel(lines(), 'Yield if held to maturity')).toBe('about 5.67% · estimate');
  expect(lines()).toContain('Added estimated $556 in accrued interest to bond value at 4.5% coupon for 182 days to calculate YTM. If this is not accurate, enter actual accrued interest');
  r.unmount();
  seed(twice);
  render(<BondsScreen />);
  expect(lines()).toContain('Yield to maturity: 5.67% *');
});
