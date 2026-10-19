/** NET WORTH FIGURES PRINTED UNDER THEIR OWN IDENTIFIERS (inputs-and-use audit, 2026-10-11, Net worth: "Metrics not
 *  printed under their own ID — the trail from screen to formula is broken").
 *
 *  Each screen below is rendered and the record of what it printed is read back: the figure's own identifier must be
 *  there, carrying the words a person reads, and the identifier it used to borrow must not carry them.
 *    MK-NW-M-028  the rates-move estimate on a bond      (printed as MK-NW-M-023, the face value, until 2026-10-14)
 *    MK-NW-M-042  "n bonds · face $X" on Bonds            (printed only as MK-NW-M-053, the face total)
 *    MK-NW-M-045  each bond's coupon rate on its row      (no identifier; "not entered" borrowed MK-NW-M-055, the face)
 *    MK-NW-M-014  the emergency fund's sum line           (only its two amounts carried identifiers)
 *    MK-NW-M-017  "Assets $X − Debts $Y = Net worth $Z" in the guided setup (only its three amounts carried identifiers)
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import BondsScreen from '../BondsScreen';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, router: { push: jest.fn(), back: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));

const BOND = { asset_id: 'bnd', label: 'US Treasury 2036', institution: 'Treasury', kind: 'fixed_income', tax_bucket: 'TAXABLE',
  asset_class: 'bonds', balance: 95000, face_value: 100000, coupon_rate: 0.045, maturity_date: '2036-06-30' };
const CD_NO_RATE = { asset_id: 'cd', label: 'Ally CD', institution: 'Ally', kind: 'fixed_income', tax_bucket: 'TAXABLE',
  asset_class: 'bonds', balance: 10000, face_value: 10000, maturity_date: '2027-03-15' };
const printed = (id: string) => figuresPrinted().filter((f) => f.id === id).map((f) => f.text);

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self' } as any);
  resetFiguresPrinted();
});

test('MK-NW-M-028: the rates-move amounts print under their own identifier, the face value stays MK-NW-M-023', () => {
  useStore.setState({ assetAccounts: [BOND] } as any);
  mockParams = { id: 'bnd' };
  render(<AccountPortfolioScreen />);
  const line = screen.getByText(/Rates rise 1% → value roughly/);
  const amounts = printed('MK-NW-M-028');
  expect(amounts.length).toBeGreaterThanOrEqual(5);   // rise low, high, the fall in value; fall low, high
  for (const a of amounts.filter((t) => t.startsWith('$'))) expect(screen.getAllByText(new RegExp(a.replace(/[$,]/g, '\\$&'))).length).toBeGreaterThan(0);
  expect(line).toBeOnTheScreen();
  expect(printed('MK-NW-M-023')).toEqual(expect.arrayContaining(['$100,000']));   // the face value, and only figures that are the face
  expect(printed('MK-NW-M-023').every((t) => t === '$100,000' || t === 'not entered')).toBe(true);
});

test('MK-NW-M-042 and MK-NW-M-045 on Bonds: the summary line and each coupon rate carry their own identifiers', () => {
  useStore.setState({ assetAccounts: [BOND, CD_NO_RATE] } as any);
  render(<BondsScreen />);
  expect(printed('MK-NW-M-042')).toEqual(['2 bonds · face $110,000']);
  expect(screen.getByText('2 bonds · face $110,000')).toBeOnTheScreen();
  expect(printed('MK-NW-M-045').sort()).toEqual(['4.50% coupon', 'coupon rate not entered']);
  expect(printed('MK-NW-M-055')).not.toContain('coupon rate not entered');   // no longer borrowed from the face
});

test('MK-NW-M-014: the emergency fund line is recorded whole, its two amounts keep MK-NW-M-005 and MK-NW-M-048', () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '4500' },
    assetAccounts: [{ asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0.01 }],
    liabilities: [],
  } as any);
  render(<NetWorthScreen />);
  const line = printed('MK-NW-M-014');
  expect(line).toHaveLength(1);
  expect(line[0]).toMatch(/^of essentials covered by your cash — \$20,000 cash ÷ \$4,500\/month essentials — /);
  expect(printed('MK-NW-M-005')).toContain('$20,000');
  expect(printed('MK-NW-M-048')).toContain('$4,500/month');
});

test('MK-NW-M-017: the guided setup\'s whole sum is recorded under its own identifier, drawn as before', () => {
  useStore.setState({ nwSetupChoice: 'guided',
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 18000 }],
    liabilities: [{ debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.05, minimum_monthly_payment: 250 }],
  } as any);
  render(<NetWorthScreen />);
  expect(printed('MK-NW-M-017')).toEqual(['Assets $18,000 − Debts $14,000 = Net worth $4,000']);
  expect(screen.getByText('Assets $18,000 − Debts $14,000 = Net worth $4,000')).toBeOnTheScreen();
});
