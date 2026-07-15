// Invest main — the FCC glance-then-drill (approved wireframe). Pins: the TOTAL RETURN glance
// speaks $ AND % with the word up/down + the points gap; winners & laggards come from the SAME
// rows; the concentration callout is a quantified fact at 25%+; bonds and alternatives are folded
// into ONE grouped list with value-as-of stamps and stale flags; the plan chip shows adopted saving.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';

const pushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => pushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const seriesFor = (start: number, end: number) => {
  const now = new Date();
  const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
  return { points: [{ date: back(14), close: start }, { date: back(6), close: (start + end) / 2 }, { date: iso(now), close: end }] };
};
const pos = (id: string, ticker: string, shares: number, cost: number) => ({
  position_id: id, ticker, kind: 'stocks_etf',
  lots: [{ lot_id: `l${id}`, shares, cost_per_share: cost, purchase_date: '2024-01-02' }],
});

beforeEach(() => {
  pushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({
    assetAccounts: [
      { asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [pos('p1', 'NVDA', 200, 300), pos('p2', 'VTI', 100, 200), pos('p3', 'BND', 100, 80)] },
      { asset_id: 'bnd1', label: 'Treasury 4.5% ’36', kind: 'fixed_income', tax_bucket: 'TAXABLE', asset_class: 'bonds',
        balance: 95000, face_value: 100000, coupon_rate: 0.045, maturity_date: '2036-06-30', value_as_of: '2026-03-03' },
      { asset_id: 'gld', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', asset_class: 'alternatives',
        balance: 9000, value_as_of: '2025-11-20' },
    ],
    priceCache: {
      NVDA: { ticker: 'NVDA', ...seriesFor(300, 423) },   // +41%
      VTI:  { ticker: 'VTI',  ...seriesFor(200, 224) },   // +12%
      BND:  { ticker: 'BND',  ...seriesFor(80, 77.6) },   // −3%
      SPY:  { ticker: 'SPY',  ...seriesFor(100, 110.1) }, // the market +10.1%
    },
    retirementAssumptions: { ...useStore.getState().retirementAssumptions, contribMonthly: 1500 },
  } as any);
});

test('the glance: dollar + percent with the up/down WORD, the market line, and the points gap', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText(/TOTAL RETURN \(1Y\)/)).toBeOnTheScreen();
  expect(screen.getByText(/▲ Up \+\$/)).toBeOnTheScreen();          // word + arrow + dollars, never color alone
  expect(screen.getByText(/Stock market:/)).toBeOnTheScreen();
  expect(screen.getByText(/You're (ahead|behind) by .* points/)).toBeOnTheScreen();
});

test('winners & laggards from the SAME rows: NVDA up, BND down with the word', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText('Winners & laggards (1Y)')).toBeOnTheScreen();
  expect(screen.getByLabelText(/NVDA, up \+?\$?[\d,]+/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/BND, down/)).toBeOnTheScreen();
});

test('the concentration callout is a quantified fact when one holding is 25%+ (NVDA here)', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText(/% of your invested money is in one stock \(NVDA\)/)).toBeOnTheScreen();
});

test('bonds and alternatives fold into the grouped list with value-as-of stamps and stale flags', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText(/YOUR INVESTMENTS/)).toBeOnTheScreen();
  expect(screen.getByText(/Bonds\s+\$95,000/)).toBeOnTheScreen();
  expect(screen.getByText(/value as of 2026-03-03/)).toBeOnTheScreen();      // fresh: dated, no flag
  expect(screen.getByText(/Alternatives\s+\$9,000/)).toBeOnTheScreen();
  expect(screen.getByText(/⏱ value \d+ months old/)).toBeOnTheScreen();      // Nov 2025 gold → the nudge
});

test('tapping a bond row opens its account page (the routed holding detail)', () => {
  render(<PerformanceScreen />);
  fireEvent.press(screen.getByLabelText(/Treasury 4.5% ’36/));
  expect(pushes).toContain('/account-detail?id=bnd1');
});

test('the plan chip shows the adopted monthly saving (F11 propagation: Plan is visible here too)', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText(/Saving \$1,500\/mo toward retirement \(from your Plan\)/)).toBeOnTheScreen();
});

test('the two what-if entry cards say what they are: estimate forward, facts backward', () => {
  render(<PerformanceScreen />);
  fireEvent.press(screen.getByLabelText(/Look ahead: what saving more could do/));
  expect(pushes).toContain('/what-if');
  fireEvent.press(screen.getByLabelText(/Look back: what a past move would have done/));
  expect(pushes).toContain('/look-back');
});

test('a bonds-only user still gets the grouped list, never the add-a-ticker empty state', () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'bnd1', label: 'Treasury', kind: 'fixed_income', tax_bucket: 'TAXABLE', asset_class: 'bonds', balance: 50000, face_value: 50000, coupon_rate: 0.04, maturity_date: '2033-01-01' }],
    priceCache: {},
  } as any);
  render(<PerformanceScreen />);
  expect(screen.queryByText(/Add a holding with its ticker/)).toBeNull();
  expect(screen.getByText(/Bonds\s+\$50,000/)).toBeOnTheScreen();
});

test('PRD F3#16: the money-weighted line shows ONLY when the ledger stands behind it', () => {
  // fixture accounts have no ledger history → honest absence
  render(<PerformanceScreen />);
  expect(screen.queryByText(/money-weighted/)).toBeNull();
});

test('PRD F3#16: with a complete ledger the personal return renders, spoken as an estimate', () => {
  const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  useStore.setState({
    assetAccounts: [{ asset_id: 'brk2', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 11000 }],
    transactions: [{ id: 'op1', type: 'DEPOSIT', account_id: 'brk2', amount: 10000, date: yearAgo }],
    priceCache: {},
  } as any);
  render(<PerformanceScreen />);
  expect(screen.getByText(/money-weighted return: \+10%\/yr/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/counting when you added money.*an estimate/)).toBeOnTheScreen();
});
