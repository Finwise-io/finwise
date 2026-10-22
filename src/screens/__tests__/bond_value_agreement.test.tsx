/** ONE BOND, ONE VALUE, ON EVERY SCREEN THAT SHOWS IT (DEC-0281, 2026-08-26; built 2026-10-20).
 *
 *  His rule: a bond's value shown is its current (market) value if there is one, if not what was paid, if not its face
 *  value — and with none of the three, the words for a value never entered (DEC-3657), left out of every total. The rule
 *  is written onto the account when it is saved (settleBondValue, asked of the bonds door by the store), so the balance
 *  Net worth adds up is the value the Bonds list and the account page show.
 *
 *  Four bonds, each saved through the store's own addAsset — the real writer, never a hand-typed balance:
 *    US Treasury 2030 — market value $9,850 entered (face $10,000)           → $9,850
 *    Corp 2029        — no market value, $4,900 paid (face $5,000)          → $4,900, said to be what was paid
 *    Muni 2031        — no market value, nothing paid, face $10,000         → $10,000, said to be the face value
 *    Ally CD          — nothing at all                                      → Value not entered, left out
 *  Total: $9,850 + $4,900 + $10,000 = $24,750 on the Bonds list and on Net worth alike.
 *  Before: the Bonds list counted a bond with no value as $0 and printed $0, while Net worth left it out.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BondsScreen from '../BondsScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { theBonds } from '../../../MoneyKeel/functions/networth-and-performance/bonds';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const BONDS = [
  { label: 'US Treasury 2030', face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30', balance: 9_850 },
  { label: 'Corp 2029', face_value: 5_000, amount_paid: 4_900, maturity_date: '2029-03-01' },
  { label: 'Muni 2031', face_value: 10_000, maturity_date: '2031-06-01' },
  { label: 'Ally CD', institution: 'Ally', kind: 'cd' },
];
const EXPECT: Record<string, string> = { 'US Treasury 2030': '$9,850', 'Corp 2029': '$4,900', 'Muni 2031': '$10,000', 'Ally CD': 'Value not entered' };
const NOTE: Record<string, string | null> = {
  'US Treasury 2030': null, 'Ally CD': null,
  'Corp 2029': 'The value shown is what you paid — no market value entered.',
  'Muni 2031': 'The value shown is the face value — no market value entered.',
};

function seed() {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, nwSeeded: true, nwSetupChoice: 'self', liabilities: [], transactions: [] } as any);
  for (const b of BONDS) {
    useStore.getState().addAsset({ kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', target_return: 0, source: 'manual', ...b } as any);
  }
  return useStore.getState().assetAccounts;
}

test('the writer: each bond is stored with the value the rule picks, and where it came from', () => {
  const accounts = seed();
  const by = (l: string) => accounts.find((a: any) => a.label === l) as any;
  expect([by('US Treasury 2030').balance, by('US Treasury 2030').value_basis]).toEqual([9_850, undefined]);
  expect([by('Corp 2029').balance, by('Corp 2029').value_basis]).toEqual([4_900, 'paid']);
  expect([by('Muni 2031').balance, by('Muni 2031').value_basis]).toEqual([10_000, 'face']);
  expect('balance' in by('Ally CD')).toBe(false);
  // the bonds door: the same four values, the total and the one left out
  const doorAnswer = theBonds({ accounts: accounts as any });
  expect(doorAnswer.count).toBe(4);
  expect(Object.fromEntries(doorAnswer.rows.map((r) => [r.label, r.value]))).toEqual({ 'US Treasury 2030': 9_850, 'Corp 2029': 4_900, 'Muni 2031': 10_000, 'Ally CD': null });
  expect(doorAnswer.totalValue).toBe(24_750);
  expect(doorAnswer.valueNotEntered).toEqual(['Ally CD']);
});

test('Bonds list: each card shows the same value, the CD says Value not entered — never $0 — and the total is $24,750', () => {
  seed();
  render(<BondsScreen />);
  expect(screen.getByText('$24,750')).toBeOnTheScreen();
  for (const v of Object.values(EXPECT)) expect(screen.getAllByText(v).length).toBeGreaterThan(0);
  expect(screen.queryByText('$0')).toBeNull();
});

test('the account page: Market value is the same figure for each bond, with the line saying where it came from', () => {
  const accounts = seed();
  // the guard looked: all four bonds were opened
  let opened = 0;
  for (const a of accounts as any[]) {
    mockParams = { id: String(a.asset_id) };
    render(<AccountPortfolioScreen />);
    // the trio: Market value, then its figure
    const label = screen.getByText('Market value');
    const cell = (label.parent as any)?.parent;
    const texts: string[] = [];
    (function walk(n: any) { if (typeof n === 'string') texts.push(n); else (n?.children ?? []).forEach(walk); })(cell);
    expect(texts).toEqual(['Market value', EXPECT[a.label]]);
    if (NOTE[a.label]) expect(screen.getByText(NOTE[a.label] as string)).toBeOnTheScreen();
    else expect(screen.queryByText(/^The value shown is /)).toBeNull();
    screen.unmount();
    opened += 1;
  }
  expect(opened).toBe(4);
});

test('Net worth: the same four values on its rows, the CD named as not entered, and Bonds & CDs adds to $24,750', () => {
  seed();
  render(<NetWorthScreen />);
  expect(screen.getByLabelText('Bonds & CDs, $24,750. Collapses its 4 accounts.')).toBeOnTheScreen();
  expect(screen.getByLabelText('US Treasury 2030, $9,850. Opens its page.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Corp 2029, $4,900. Opens its page.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Muni 2031, $10,000. Opens its page.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Ally CD, value not entered. Opens its page.')).toBeOnTheScreen();
});

test('a face value saved again by an editor that saves every box stays a face value; a new figure entered is a market value', () => {
  seed();
  const muni = () => useStore.getState().assetAccounts.find((a: any) => a.label === 'Muni 2031') as any;
  useStore.getState().updateAsset(muni().asset_id, { balance: 10_000, label: 'Muni 2031' });   // the same figure handed back
  expect([muni().balance, muni().value_basis]).toEqual([10_000, 'face']);
  useStore.getState().updateAsset(muni().asset_id, { balance: 10_120 });                      // a market value entered
  expect([muni().balance, muni().value_basis]).toEqual([10_120, undefined]);
  useStore.getState().updateAsset(muni().asset_id, { balance: undefined });                   // the market value cleared
  expect([muni().balance, muni().value_basis]).toEqual([10_000, 'face']);
});
