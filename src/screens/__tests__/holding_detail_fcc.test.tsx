// Holding detail — equity per-ticker page (detailed design v1.1, Invest r20-r31). Pins: the header
// numbers are the SAME helpers the Invest list uses; the tax card's two gains sum to the header gain;
// honest states (no price / closed / masked); look-back arrives pre-filled; the function's new
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

// finding 6 (approved mock v2, founder 'approved.' 2026-07-31): price at the top, graph with the
// Invest period chips, then the position as a TABLE — same numbers as the Invest list row.
test('hero: current price on top, then the position table — the SAME numbers as the Invest list row', () => {
  render(<HoldingDetailScreen />);
  const st = useStore.getState() as any;
  const row = buildPerformance([NVDA_POS as any], (t: string) => st.priceCache[t], '1Y')[0];
  expect(screen.getByText('NVIDIA (NVDA)')).toBeOnTheScreen();
  expect(screen.getByText('in Fidelity')).toBeOnTheScreen();
  const { money, money2 } = require('../../domain/_shared/num');
  expect(screen.getByText(/CURRENT PRICE/)).toBeOnTheScreen();
  // PRECISION COMES FROM THE DECLARATION NOW (rule 11, 2026-10-01). These assertions were written
  // against what the screen used to print, and the screen was wrong: it formatted six figures with
  // cents while their declarations say whole dollars. Routing each print through fig(identifier)
  // surfaced the disagreement, and the precision standard (Q49) settles it — whole dollars for
  // totals, balances and projections; two decimals for prices and per-share figures. So a price is
  // $310.00 and a gain is $2,000.
  expect(screen.getByText(money2(row.price))).toBeOnTheScreen();         // a PRICE: two decimals
  expect(screen.getByText('Current value')).toBeOnTheScreen();
  expect(screen.getByText(money(row.marketValue))).toBeOnTheScreen();    // a BALANCE: whole dollars
  expect(screen.getByText('Change since purchase')).toBeOnTheScreen();
  expect(screen.getByText(/▲ \+\$/)).toBeOnTheScreen();                  // the word/arrow, never color alone
  expect(screen.getByText('Quantity')).toBeOnTheScreen();
  expect(screen.getByText('360 shares')).toBeOnTheScreen();
  expect(screen.getByText('Price paid (average)')).toBeOnTheScreen();
  // the period chips moved onto this page (they drive the graph + compare window)
  for (const pd of ['1M', '3M', '6M', 'YTD', '1Y', '2Y']) expect(screen.getByText(pd)).toBeOnTheScreen();
});

test("vs-the-market card: table rows, same-dates window words, ahead/behind in WORDS", () => {
  render(<HoldingDetailScreen />);
  expect(screen.getByText('VS THE STOCK MARKET · SAME DATES')).toBeOnTheScreen();
  expect(screen.getByText(/Your return/)).toBeOnTheScreen();
  expect(screen.getByText('The market, same dates')).toBeOnTheScreen();
  expect(screen.getByText(/(ahead|behind) by [\d.]+ points/)).toBeOnTheScreen();
  expect(screen.getByText('price changes only — dividends not included')).toBeOnTheScreen();
});

test('the gains card: long + short gains SUM to the header gain (estimated-tax line cut, brief §C Q12)', () => {
  render(<HoldingDetailScreen />);
  const st = useStore.getState() as any;
  const row = buildPerformance([NVDA_POS as any], (t: string) => st.priceCache[t], '1Y')[0];
  const { capGains } = require('../../domain/performance');
  const cg = capGains(NVDA_POS, row.price);
  expect(Math.round(cg.longGain + cg.shortGain)).toBe(Math.round(row.gain));   // the identity the card relies on
  expect(screen.getByText('Gain — long-term (held over 1 yr)')).toBeOnTheScreen();
  expect(screen.getByText('Gain — short-term (under 1 yr)')).toBeOnTheScreen();
  expect(screen.queryByText(/~ Tax at your own rate/)).toBeNull();   // the cut line stays gone
});

test('lots list: date leads, shares-at-price follows — the approved table grammar (pre-48 audit A6)', () => {
  render(<HoldingDetailScreen />);
  expect(screen.getByText('200 sh @ $410.00')).toBeOnTheScreen();        // cents kept (B44)
  expect(screen.getByText('Jan 12, 2024')).toBeOnTheScreen();
});

test('DEC-0030 — the look-back door is GONE from this page, on his word "remove it"', () => {
  // It used to read "LOOK BACK: what if I'd sold a year ago?" and open /look-back pre-filled with this
  // holding and its value. He parked the decision on 2026-09-30 and then said remove it, so this pin
  // is inverted rather than deleted: the door must stay gone, and nothing is stranded because
  // /look-back is still reached from Account detail and from Contribution room.
  render(<HoldingDetailScreen />);
  expect(screen.queryByLabelText(/Look back/i)).toBeNull();
  expect(screen.queryByText(/LOOK BACK/)).toBeNull();
  expect(mockPushes.find((r) => r.startsWith('/look-back'))).toBeFalsy();
});

test('dividends & realized: one card — trailing 12 months from the one ledger, zeros said plainly', () => {
  const recent = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const old = new Date(Date.now() - 400 * 86400e3).toISOString().slice(0, 10);
  useStore.setState({
    transactions: [
      { id: 't1', type: 'DIVIDEND', ticker: 'NVDA', amount: 310, date: recent, account_id: 'brk' },
      { id: 't2', type: 'DIVIDEND', ticker: 'NVDA', amount: 930, date: old, account_id: 'brk' },     // outside 12 mo
      { id: 't3', type: 'DIVIDEND', ticker: 'VTI', amount: 99, date: recent, account_id: 'brk' },    // other ticker
    ],
  } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getByText('DIVIDENDS & REALIZED')).toBeOnTheScreen();
  expect(screen.getByText('Dividends received (12 mo)')).toBeOnTheScreen();
  expect(screen.getByText('$310')).toBeOnTheScreen();                    // a TOTAL: whole dollars
  expect(screen.getByText(/\$0 — nothing sold/)).toBeOnTheScreen();       // the zero is a sentence, not a hidden card
});

test('no price for the ticker: honest basis hero, comparison/tax/look-back all absent — nothing invented', () => {
  useStore.setState({ priceCache: {} } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getByText('NO LIVE PRICE — SHOWING WHAT YOU PAID')).toBeOnTheScreen();
  expect(screen.getByText('⏱ live pricing arrives with the price provider')).toBeOnTheScreen();
  expect(screen.getByText('Quantity')).toBeOnTheScreen();
  expect(screen.queryByText(/VS THE STOCK MARKET · SAME DATES/)).toBeNull();
  expect(screen.queryByText('IF YOU SOLD TODAY')).toBeNull();
  expect(screen.queryByLabelText(/Look back/)).toBeNull();
});

test('sub-$2 average cost keeps 3 decimals (the LCTX case) — and still masks when hidden', () => {
  useStore.setState({
    priceCache: {},
    assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [{ position_id: 'p1', ticker: 'LCTX', label: 'Lineage Inc', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 1000, cost_per_share: 1.132, purchase_date: '2024-05-01' }] }] }],
  } as any);
  const r = render(<HoldingDetailScreen />);
  expect(screen.getByText('$1.13')).toBeOnTheScreen();   // Q49 (2026-09-09): prices show two decimals; the three-decimal case was not a stated exception
  r.unmount();
  useStore.setState({ hideBalances: true } as any);
  render(<HoldingDetailScreen />);
  expect(screen.queryByText('$1.132')).toBeNull();          // mask rule holds for the 3-decimal path
});

test("all lots sold: 'Position closed' with $0 — correct here, and history is kept", () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [{ ...NVDA_POS, lots: [] }, { position_id: 'p2', ticker: 'VTI', kind: 'stocks_etf', lots: [] }] }],
  } as any);
  render(<HoldingDetailScreen />);
  expect(screen.getByText(/Holding liquidated — all shares sold/)).toBeOnTheScreen();
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

test('the holdings list ROUTES to this page — from the account page, where the holdings now live', () => {
  // The list moved on 2026-09-25: the approved Performance design (mock v14) carries the walks and
  // what each category earned, and each account's own page carries its holdings. Pinned at the
  // source so it survives however the account page is laid out: the account page opens this screen,
  // and Performance no longer tries to.
  const fs = require('fs'); const path = require('path');
  const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  expect(read('AccountDetailScreen.tsx')).toMatch(/\/holding-detail\?account=/);
  expect(read('PerformanceScreen.tsx')).not.toMatch(/\/holding-detail\?account=/);
});

test('function: holding-concentration insight fires from the SAME shared rule the Invest callout uses', () => {
  const st = useStore.getState() as any;
  const rows = buildPerformance([NVDA_POS as any, { position_id: 'p2', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l3', shares: 10, cost_per_share: 200, purchase_date: '2024-01-02' }] } as any],
    (t: string) => st.priceCache[t], '1Y');
  const top = topHoldingConcentration(rows)!;
  expect(top.ticker).toBe('NVDA');
  expect(top.pct).toBeGreaterThanOrEqual(25);
  const ins = buildInsights({ cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90, topAccountPct: 20, planPct: 100, beatBy: 0.01, investRate: 0.2, topHolding: top } as any);
  const hit = ins.find((i) => i.id === 'holding-concentration')!;
  // walk row 9 (home-v2): dollar-first — the value leads, the percent follows in parentheses
  expect(hit.body).toMatch(new RegExp(`^\\$[\\d,]+ \\(${top.pct}%\\) of your invested money rides on one stock \\(NVDA\\)`));
  expect(hit.body).toContain(top.value.toLocaleString());
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
  expect(screen.getByText('Realized from sales')).toBeOnTheScreen();
  expect(screen.getByText(/\+\$2,000 all time/)).toBeOnTheScreen();       // 40 × (200 − 150), a total
  expect(screen.getByText(/oldest shares sold first/)).toBeOnTheScreen();
});
