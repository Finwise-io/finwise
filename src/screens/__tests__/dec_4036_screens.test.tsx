// HIS ANSWERS ON THE OPEN NET WORTH POINTS (DEC-4036b to DEC-4036k, 2026-10-10), ON THE SCREENS.
//   b · Bonds row and the account page's BOND FACTS read "maturity date not entered" for a bond with no date.
//   f · the account page says "tax type not stated" and a tap opens the account's own editor.
//   g · Net worth asks "Is this cash savings or investments?" about the old sign-up answer.
//   h · Alternatives names "$1,500 asset type not classified" and says the rate and growth leave it out.
//   j · the sheet showing the car you drive names a vehicle whose value is not entered.
//   k · the Plan screens' retirement money names an account it leaves out: "leaves out … — Value not entered".
// The function rules are held by MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BondsScreen from '../BondsScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import NetWorthScreen from '../NetWorthScreen';
import OtherInvestmentsScreen from '../OtherInvestmentsScreen';
import { EarmarkSheet } from '../RetirementCockpit';
import { PlanInputs } from '../../components/PlanInputs';
import { useStore } from '../../store/useStore';
import { assetsFromOnboarding } from '../../domain/assets';

let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

const WORKER = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000', targetRetirementAge: '67', horizonAge: '92' };
const seed = (accounts: any[]) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: WORKER, nwSeeded: true, nwSetupChoice: 'self',
    assetAccounts: accounts, liabilities: [], bigCosts: [] } as any);
};
beforeEach(() => { mockParams = {}; mockPush.mockClear(); });

const UNDATED = { asset_id: 't', label: 'Treasury note', institution: 'Vanguard', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 10000, face_value: 10000, coupon_rate: 0.04, target_return: 0.04 };

test('DEC-4036b · the Bonds row of a bond with no date reads "maturity date not entered", and its $400 still counts', () => {
  seed([UNDATED]);
  render(<BondsScreen />);
  expect(screen.getAllByText(/maturity date not entered/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/matures\s*$/)).toBeNull();
  expect(screen.getAllByText(/\$400/).length).toBeGreaterThan(0);   // COUPON /year
});

test('DEC-4036b · the account page keeps its BOND FACTS and says "maturity date not entered" where the date stands', () => {
  seed([UNDATED]);
  mockParams = { id: 't' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('BOND FACTS')).toBeOnTheScreen();   // the card used to vanish with no date
  expect(screen.getByText('Matures')).toBeOnTheScreen();
  expect(screen.getByText('maturity date not entered')).toBeOnTheScreen();
  expect(screen.queryByText('(matured)', { exact: false })).toBeNull();
});

test('DEC-4036f · an account with no tax type reads "tax type not stated" and a tap opens its editor', () => {
  seed([{ asset_id: 'n', label: 'Old account', institution: 'Fidelity', balance: 5000, target_return: 0 }]);   // no kind, no bucket
  mockParams = { id: 'n' };
  render(<AccountPortfolioScreen />);
  expect(screen.queryByText(/· taxable$/)).toBeNull();
  fireEvent.press(screen.getByLabelText('Tax type not stated. Tap to choose.'));
  expect(mockPush).toHaveBeenCalledWith('/add-account?edit=n');
  expect(screen.getByText(/tax type not stated — choose ›/)).toBeOnTheScreen();
});

test('DEC-4036g · Net worth asks about the old "savings or portfolio" answer', () => {
  seed(assetsFromOnboarding('u' as any, { currentSavingsPortfolio: '8000' }).accounts);
  render(<NetWorthScreen />);
  const asked = () => screen.queryAllByText(/Is this cash savings or investments\? Tap to say\./);
  if (!asked().length) fireEvent.press(screen.getByLabelText(/Group what you own by institution/));
  expect(asked().length).toBeGreaterThan(0);
  expect(screen.queryByText(/undefined/)).toBeNull();
});

test('DEC-4036h · Alternatives names "$1,500 asset type not classified" and says the rate and growth leave it out', () => {
  const P = (name: string, shares: number, price: number | null) =>
    ({ position_id: name, ticker: '', name, asset_class: 'other', last_price: price, lots: [{ lot_id: 'l', shares, cost_per_share: 0 }] });
  seed([{ asset_id: 'b', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', balance: 4000,
    target_return: 0, positions: [P('Gold', 25, 100), P('Private holding', 1, null)] }]);
  render(<OtherInvestmentsScreen />);
  expect(screen.getByText('Expected return and growth leave out $1,500 asset type not classified.')).toBeOnTheScreen();
  expect(screen.getAllByText(/\$1,500 asset type not classified/).length).toBeGreaterThan(1);   // the summary and the row
  expect(screen.getAllByText('$4,000').length).toBeGreaterThan(0);   // the total still equals the Alternatives line
});

test('DEC-4036j · the sheet showing the car you drive names a vehicle whose value is not entered', () => {
  const assets = [
    { asset_id: 'A', label: 'Car A', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: null, target_return: 0 },
    { asset_id: 'B', label: 'Car B', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 8000, target_return: 0 },
  ] as any[];
  render(<EarmarkSheet open assets={assets} nestEgg={0} onClose={() => {}} onSet={() => {}} onDone={() => {}} />);
  expect(screen.getByText(/Car A's value not entered — it may be the car you drive\./)).toBeOnTheScreen();
});

test('DEC-4036k · the Plan inputs and the earmark sheet name an account the retirement money leaves out', () => {
  const accounts = [
    { asset_id: 'l', label: 'Linked 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', source: 'connected', balance: null, target_return: 0.07 },
    { asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0.07 },
  ];
  seed(accounts);
  const D = { retireAge: 65, horizonAge: 90, extraMonthly: 0 };
  render(<PlanInputs draft={D} committed={D} onDraft={() => {}} onCommit={() => {}} />);
  expect(screen.getByText(/What counts toward retirement leaves out .*Linked 401\(k\).* — Value not entered\./)).toBeOnTheScreen();
  screen.unmount();
  render(<EarmarkSheet open assets={accounts as any} nestEgg={10000} onClose={() => {}} onSet={() => {}} onDone={() => {}} />);
  expect(screen.getByText(/Counts toward retirement leaves out .*Linked 401\(k\).* — Value not entered/)).toBeOnTheScreen();
});
