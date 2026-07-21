// Invest main — the FCC glance-then-drill (approved wireframe). Pins: the TOTAL RETURN glance
// speaks $ AND % with the word up/down + the points gap; winners & laggards come from the SAME
// rows; the concentration callout is a quantified fact at 25%+; bonds and alternatives are folded
// into ONE grouped list with value-as-of stamps and stale flags; the plan chip shows adopted saving.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GLOSSARY } from '../../domain/glossary';
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

test('the hero (invest-v3/v4 FINAL, 2026-07-19): YOUR RETURN leads with the gain in $ and %, the NAMED honest comparison + points', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText(/YOUR RETURN \(PAST YEAR\)/)).toBeOnTheScreen();       // renamed — it's what happened to YOUR money
  expect(screen.getByLabelText('What is Your return?')).toBeOnTheScreen();       // the ⓘ explains the purchase cap
  expect(screen.getByText(/▲ up \$[\d,]+/)).toBeOnTheScreen();                   // gain in $, word + arrow
  expect(screen.getByText('HONEST COMPARISON')).toBeOnTheScreen();
  // approved "all three" + v7 FINAL (2026-07-19): true name, ONE footnote dot, weights, table headers
  expect(screen.getByText(/vs the market, matched to your mix/)).toBeOnTheScreen();
  expect(screen.getByText('How these numbers work')).toBeOnTheScreen();
  expect(screen.getByLabelText('What is How these numbers work?')).toBeOnTheScreen();
  expect(GLOSSARY.howReturnsWork.body).toMatch(/counted from the day you bought/);
  expect(GLOSSARY.howReturnsWork.body).toMatch(/same dates/);
  expect(GLOSSARY.howReturnsWork.body).toMatch(/Dividends and interest aren't included yet/);
  expect(screen.getAllByText(/^\d+%$/).length).toBeGreaterThan(0);               // portfolio weights in the list
  expect(screen.getAllByText('HOLDING').length).toBe(2);                         // winners table + holdings list headers
  expect(screen.getByText('CHANGE')).toBeOnTheScreen();
  expect(screen.getAllByText('RETURN').length).toBe(2);
  expect(screen.getByText('WEIGHT')).toBeOnTheScreen();
  // BUILD-44 FIX: every header cell wears the SAME header type (10.5pt) — the column styles supply
  // width/alignment only, so "RETURN" can never wrap its last letter again
  for (const el of [...screen.getAllByText('HOLDING'), screen.getByText('CHANGE'), ...screen.getAllByText('RETURN'), screen.getByText('WEIGHT')]) {
    expect(el).toHaveStyle({ fontSize: 10.5 });
    expect(el.props.numberOfLines).toBe(1);
  }
  expect(screen.getByText(/★ You're (ahead|behind) by .* points/)).toBeOnTheScreen();
});

test('the period chips switch the WHOLE story: 3M relabels the hero kicker', () => {
  render(<PerformanceScreen />);
  fireEvent.press(screen.getByText('3M'));
  expect(screen.getByText(/YOUR RETURN \(PAST 3 MONTHS\)/)).toBeOnTheScreen();
});

test('winners: top mode words Leader + Laggard (v7 table — no emoji); by-account groups under account names', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText(/Leader: /)).toBeOnTheScreen();
  expect(screen.getByText(/Laggard: /)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('View by account'));
  expect(screen.getByText('Brokerage')).toBeOnTheScreen();                        // the account header
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

test('B44 fix: a LONG alternative label (a dated option) shrinks — value-as-of chip and amount keep their columns', () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'opt1', label: 'QQQ $600 put · exp Dec 31 2026', kind: 'options', tax_bucket: 'TAXABLE', asset_class: 'alternatives', balance: 1408, value_as_of: '2026-07-01' }],
    priceCache: {},
  } as any);
  render(<PerformanceScreen />);
  const label = screen.getByText('QQQ $600 put · exp Dec 31 2026');
  expect(label.props.numberOfLines).toBe(1);                       // truncates, never wraps or spills
  expect(label).toHaveStyle({ flexShrink: 1 });                    // the label yields; columns never overlap
  expect(screen.getAllByText('$1,408').length).toBeGreaterThan(0);  // the amount renders in its own column
  expect(screen.getByText(/Value as of 2026-07/)).toBeOnTheScreen();
});

test('bonds and alternatives fold into the grouped list with value-as-of stamps and stale flags', () => {
  render(<PerformanceScreen />);
  expect(screen.getByText(/YOUR INVESTMENTS/)).toBeOnTheScreen();
  expect(screen.getByText(/Bonds\s+\$95,000/)).toBeOnTheScreen();
  expect(screen.getByText(/Value as of 2026-03/)).toBeOnTheScreen();          // fresh: a dated CHIP, no flag
  expect(screen.getByText(/Alternatives\s+\$9,000/)).toBeOnTheScreen();
  expect(screen.getByText(/⏱ \d+ mo old/)).toBeOnTheScreen();                // Nov 2025 gold → the stale chip
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
