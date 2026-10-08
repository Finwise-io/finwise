// THE OUTSIDE REVIEW OF NET WORTH BATCH 2, ON THE SCREENS (2026-10-05). The functions are held by
// MoneyKeel/functions/networth-and-performance/outside_networth_02*.test.ts; this holds what a person
// reads. Four things, each wrong on a screen before the fixes:
//   1. Home's investments figure and Performance's "Ending value" differed by the cash sitting
//      uninvested in a linked account — one household, two figures, a tap apart.
//   2. Cash a hand-built investment account records for itself was in no Cash line.
//   3. A 529 read "taxable" and an HSA read "taxed when it comes out" on their own pages.
//   4. A holding nobody has classed was counted as Unclassified on Net worth and listed under Stocks /
//      Funds on its account's page.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import PerformanceScreen from '../PerformanceScreen';
import NetWorthScreen from '../NetWorthScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

const WORKER = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000', targetRetirementAge: '67', horizonAge: '92' };
const held = (ticker: string, shares: number, price: number, extra: Record<string, any> = {}) =>
  ({ position_id: `p-${ticker}`, ticker, name: ticker, asset_class: 'stock_etf', last_price: price, lots: [{ lot_id: `l-${ticker}`, shares, cost_per_share: price, purchase_date: '2025-01-02' }], ...extra });
// the approved Net worth drawing's household (v08, state A): Vanguard holds $838 of uninvested cash
const VANGUARD = { asset_id: 'v', label: 'Vanguard', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected',
  last_synced: new Date().toISOString(), balance: 349333, cash_balance: 838, positions: [held('VTI', 1000, 348.495)] };
const HOUSEHOLD = [
  { asset_id: 'c', label: 'Chase Checking', kind: 'checking', tax_bucket: 'CASH', balance: 8000 },
  VANGUARD,
  { asset_id: 'e', label: 'E*TRADE bonds', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 5819 },
];
const seed = (accounts: any[]) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: WORKER, nwSeeded: true, nwSetupChoice: 'self', assetAccounts: accounts } as any);
};
beforeEach(() => { mockParams = {}; });

test('1 · Home’s YOUR INVESTMENTS is Net worth’s Investments line (MK-XS-M-003, one figure on both) — cash not included (DEC-0457)', () => {
  seed(HOUSEHOLD);
  const home = render(<HomeScreen />);
  // 2026-10-08: it read $355,152 — Performance's ending value, Vanguard's $838 of uninvested cash inside
  expect(screen.getAllByText('$354,314').length).toBeGreaterThan(0);
  expect(screen.queryByText('$355,152')).toBeNull();
  home.unmount();
  render(<PerformanceScreen />);
  expect(screen.getAllByText('$355,152').length).toBeGreaterThan(0);        // "Ending value": the two accounts, each whole
});

test('1 · and Net worth keeps its drawing’s lines: Investments $354,314, with the $838 on the Cash line', () => {
  seed(HOUSEHOLD);
  render(<NetWorthScreen />);
  expect(screen.getAllByText('$354,314').length).toBeGreaterThan(0);
  expect(screen.getAllByText('$8,838').length).toBeGreaterThan(0);
});

test('2 · cash a hand-built account records for itself is on the Cash line, named as cash in that account', () => {
  seed([
    { asset_id: 'c', label: 'Chase Checking', kind: 'checking', tax_bucket: 'CASH', balance: 3000 },
    { asset_id: 'b', label: 'My brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, cash_balance: 4000, balance: 64000,
      positions: [{ ...held('VTI', 200, 300), last_price: undefined }] },
  ]);
  render(<NetWorthScreen />);
  expect(screen.getAllByText('$7,000').length).toBeGreaterThan(0);          // Cash: 3,000 + the 4,000 — it read $3,000
  expect(screen.getAllByText('$60,000').length).toBeGreaterThan(0);         // and the invested part, not the whole $64,000
  expect(screen.queryByText('$64,000')).toBeNull();
});

test('3 · a 529 and an HSA say on their own pages what makes them tax-free', () => {
  seed([{ asset_id: 'k', label: 'College fund', kind: 'college_529', tax_bucket: 'TAXABLE', balance: 40000, asset_class: 'stocks_etf' },
    { asset_id: 'h', label: 'Health savings', kind: 'hsa', tax_bucket: 'PRE_TAX', balance: 18000, asset_class: 'stocks_etf' }]);
  mockParams = { id: 'k' };
  const first = render(<AccountPortfolioScreen />);
  expect(screen.getByText('Stocks / Funds · tax-free for education')).toBeOnTheScreen();      // it read "Stocks / Funds · taxable"
  first.unmount();
  mockParams = { id: 'h' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('Stocks / Funds · pre-tax — tax-free for medical costs')).toBeOnTheScreen();   // it read "pre-tax — taxed when it comes out"
});

test('4 · a holding nobody has classed is listed under Unclassified on its account’s page, as Net worth counts it', () => {
  seed([{ ...VANGUARD, balance: 349333 + 50, positions: [held('VTI', 1000, 348.495), held('ZZZZ', 10, 5, { class_asked: true })] }]);
  mockParams = { id: 'v' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('Unclassified')).toBeOnTheScreen();               // the band appears only when there is something in it
  expect(screen.getAllByText('$50').length).toBeGreaterThan(0);
});

test('4 · and an account with nothing unclassed shows the drawing’s four bands and no fifth', () => {
  seed([VANGUARD]);
  mockParams = { id: 'v' };
  render(<AccountPortfolioScreen />);
  expect(screen.queryByText('Unclassified')).toBeNull();
});
