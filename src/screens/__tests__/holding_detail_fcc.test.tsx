// Holding detail — equity per-ticker page (detailed design v1.1, Invest r20-r31). Pins: the header
// numbers are the SAME helpers the Invest list uses; the tax card's two gains sum to the header gain;
// honest states (no price / closed / masked); look-back arrives pre-filled; the engine's new
// holding-concentration insight uses the same shared rule the Invest callout shows.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { buildInsights } from '../../domain/insights';
import { topHoldingConcentration, buildPerformance } from '../../domain/performance';

let mockParams: Record<string, string> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r) }),
  useLocalSearchParams: () => mockParams,
}));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const seriesFor = (start: number, end: number) => {
  const now = new Date();
  const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
  return { points: [{ date: back(14), close: start }, { date: back(6), close: (start + end) / 2 }, { date: iso(now), close: end }] };
};

const NVDA_POS = {
  position_id: 'p1', ticker: 'NVDA', label: 'NVIDIA', kind: 'stocks_etf',
  lots: [
    { lot_id: 'l1', shares: 200, cost_per_share: 410, purchase_date: '2024-01-12' },
    { lot_id: 'l2', shares: 160, cost_per_share: 648, purchase_date: iso(new Date(Date.now() - 90 * 86400e3)) },  // held under a year
  ],
};

beforeEach(() => {
  mockParams = { account: 'brk', position: 'p1' };
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false,
    assetAccounts: [
      { asset_id: 'brk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [NVDA_POS, { position_id: 'p2', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l3', shares: 10, cost_per_share: 200, purchase_date: '2024-01-02' }] }] },
    ],
    priceCache: {
      NVDA: { ticker: 'NVDA', ...seriesFor(500, 727.5) },
      VTI: { ticker: 'VTI', ...seriesFor(200, 224) },
      SPY: { ticker: 'SPY', ...seriesFor(100, 110.1) },
    },
    pricesFetchedAt: new Date().toISOString(),
  } as any);
});

test('header: name, account, value/gain/shares/avg — the SAME numbers as the Invest list row', () => {
  render(<HoldingDetailScreen />);
  const st = useStore.getState() as any;
  const row = buildPerformance([NVDA_POS as any], (t: string) => st.priceCache[t], '1Y')[0];
  expect(screen.getByText('NVIDIA (NVDA)')).toBeOnTheScreen();
  expect(screen.getByText('in Fidelity')).toBeOnTheScreen();
  const { money } = require('../../domain/_shared/num');
  expect(screen.getByText(money(Math.round(row.marketValue)))).toBeOnTheScreen();
  expect(screen.getByText(/360 shares · average cost/)).toBeOnTheScreen();
  expect(screen.getByText(/▲ Up \+\$/)).toBeOnTheScreen();               // the word, never color alone
  expect(screen.getByText(/Price \$728 · updated/)).toBeOnTheScreen();   // money() whole-dollar + freshness
});

test("vs-the-market card: holding vs SAME-period market and the points gap with ahead/behind WORD", () => {
  render(<HoldingDetailScreen />);
  expect(screen.getByText('VS THE STOCK MARKET (1 yr)')).toBeOnTheScreen();
  expect(screen.getByText(/NVDA up \+.*market \+/)).toBeOnTheScreen();
  expect(screen.getByText(/(Ahead|Behind) by [\d.]+ points/)).toBeOnTheScreen();
});

test('the tax card: long + short gains SUM to the header gain, labeled an estimate', () => {
  render(<HoldingDetailScreen />);
  expect(screen.getByText('Estimate, not tax advice')).toBeOnTheScreen();
  const st = useStore.getState() as any;
  const row = buildPerformance([NVDA_POS as any], (t: string) => st.priceCache[t], '1Y')[0];
  const { capGains } = require('../../domain/performance');
  const cg = capGains(NVDA_POS, row.price);
  expect(Math.round(cg.longGain + cg.shortGain)).toBe(Math.round(row.gain));   // the identity the card relies on
  expect(screen.getByText(/Held over a year: \+\$/)).toBeOnTheScreen();
  expect(screen.getByText(/Held under a year: \+\$/)).toBeOnTheScreen();
  expect(screen.getByText(/Estimated tax: ~\$/)).toBeOnTheScreen();
});

test('lots list shows each purchase with its date words (the cost-basis story)', () => {
  render(<HoldingDetailScreen />);
  expect(screen.getByText('200 shares at $410')).toBeOnTheScreen();   // plain English, no trader shorthand (audit HD-3)
  expect(screen.getByText('Jan 12, 2024')).toBeOnTheScreen();
});

test('look back opens PRE-FILLED with this holding (ticker + current value)', () => {
  render(<HoldingDetailScreen />);
  fireEvent.press(screen.getByLabelText(/Look back: what if I'd sold NVDA/));
  expect(mockPushes.find((r) => r.startsWith('/look-back?from=NVDA&amount='))).toBeTruthy();
});

test('dividends roll-up: this year + all time from the one ledger', () => {
  const year = new Date().getFullYear();
  useStore.setState({
    transactions: [
      { id: 't1', type: 'DIVIDEND', ticker: 'NVDA', amount: 310, date: `${year}-03-01`, account_id: 'brk' },
      { id: 't2', type: 'DIVIDEND', ticker: 'NVDA', amount: 930, date: `${year - 1}-06-01`, account_id: 'brk' },
      { id: 't3', type: 'DIVIDEND', ticker: 'VTI', amount: 99, date: `${year}-02-01`, account_id: 'brk' },
    ],
  } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getByText('$310 this year · $1,240 all time')).toBeOnTheScreen();
});

test('no price for the ticker: shows what you paid, hides the market comparison AND look-back', () => {
  useStore.setState({ priceCache: {} } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getByText('no current price — showing what you paid')).toBeOnTheScreen();
  expect(screen.queryByText(/VS THE STOCK MARKET \(1 yr\)/)).toBeNull();
  expect(screen.queryByLabelText(/Look back/)).toBeNull();
});

test("all lots sold: 'Position closed' with $0 — correct here, and history is kept", () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [{ ...NVDA_POS, lots: [] }, { position_id: 'p2', ticker: 'VTI', kind: 'stocks_etf', lots: [] }] }],
  } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getByText(/Position closed — all shares sold/)).toBeOnTheScreen();
});

test('hide balances: dollars mask; shares, dates and percentages stay readable', () => {
  useStore.setState({ hideBalances: true } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getAllByText(/••••/).length).toBeGreaterThan(0);
  expect(screen.getByText(/360 shares/)).toBeOnTheScreen();
  expect(screen.getByText('Jan 12, 2024')).toBeOnTheScreen();
});

test('a deleted holding degrades honestly (no crash, a way back to Invest)', () => {
  mockParams = { account: 'brk', position: 'gone' };
  render(<HoldingDetailScreen />);
  expect(screen.getByText("This holding isn't here any more")).toBeOnTheScreen();
});

test('Invest main equity rows ROUTE to this page (no more inline-editor dead end)', () => {
  render(<PerformanceScreen />);
  fireEvent.press(screen.getAllByLabelText(/NVIDIA.*Opens its page/)[0]);
  expect(mockPushes).toContain('/holding-detail?account=brk&position=p1');
});

test('engine: holding-concentration insight fires from the SAME shared rule the Invest callout uses', () => {
  const st = useStore.getState() as any;
  const rows = buildPerformance([NVDA_POS as any, { position_id: 'p2', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l3', shares: 10, cost_per_share: 200, purchase_date: '2024-01-02' }] } as any],
    (t: string) => st.priceCache[t], '1Y');
  const top = topHoldingConcentration(rows)!;
  expect(top.ticker).toBe('NVDA');
  expect(top.pct).toBeGreaterThanOrEqual(25);
  const ins = buildInsights({ cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90, cashDragPct: 10, topAccountPct: 20, planPct: 100, beatBy: 0.01, investRate: 0.2, topHolding: top } as any);
  const hit = ins.find((i) => i.id === 'holding-concentration')!;
  expect(hit.body).toContain(`${top.pct}% of your invested money is in one stock (NVDA)`);
  expect(hit.theme).toBe('protect');
});

// Realized P/L (PRD Invest r3 + NW r43 — the founder-asked fragment, built 2026-07-18)
test('realized gains from sales show honestly, with the FIFO note', () => {
  const yr = new Date().getFullYear();
  useStore.setState({
    transactions: [
      { id: 'b1', date: `${yr - 1}-01-10`, type: 'BUY', account_id: 'brk', ticker: 'NVDA', shares: 100, price: 150, created_at: 'x' },
      { id: 's1', date: `${yr}-02-10`, type: 'SELL', account_id: 'brk', ticker: 'NVDA', shares: 40, price: 200, created_at: 'x' },
    ],
  } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getByText('REALIZED FROM SALES')).toBeOnTheScreen();
  expect(screen.getByText(/\+\$2,000 all time/)).toBeOnTheScreen();   // 40 × (200 − 150)
  expect(screen.getByText(/oldest shares sold first/)).toBeOnTheScreen();
});
