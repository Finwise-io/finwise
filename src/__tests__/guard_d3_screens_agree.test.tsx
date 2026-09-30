/** GUARD D3 — the screens must agree (build spec moneykeel_build_spec_guards-before-a-build_v01.md).
 *
 *  "For one test person, every metric shown on more than one screen rendered on each and compared.
 *  The guard that does not rely on discipline, because it looks at what a person would see."
 *
 *  One person — a 55-year-old still working, $9,000 a month gross, $4,500 a month of expenses, a
 *  $300,000 brokerage and $20,000 of savings — is rendered on every screen that shows a shared
 *  figure, and the figure is read off each screen the way a person (or VoiceOver) reads it. The
 *  figures compared, by identifier:
 *    MK-NW-M-017 net worth        — Home glance card · Net worth tab
 *    MK-XS-M-002 will-it-last odds — Home · Plan hub
 *    MK-XS-M-004 the month's return — Home glance card · Performance's 1M window
 *  A figure added to a third screen is added here the same day.
 *
 *  The return needed a SECOND person (INVESTOR, below). Pat holds one fund with no price history
 *  and no records, so both screens honestly show nothing, and nothing-equals-nothing hid a real
 *  disagreement for five days: Home counted price change only while Performance counted dividends
 *  too (B-112). A household with a month of closes and a dividend inside the window tells them
 *  apart — this pin fails on the old code and passes on the fixed code.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../store/useStore';

jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
}));

const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString();
const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(YEAR - 55), baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '65', horizonAge: '92',
};
const brokerage = {
  asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 300000, target_return: 0.07, source: 'connected', last_synced: TODAY,
  positions: [{ position_id: 'p1', ticker: 'VTI', name: 'VANGUARD TOTAL STOCK MARKET ETF', asset_class: 'stock_etf',
    last_price: 100, price: 100, shares: 3000, lots: [{ lot_id: 'l1', shares: 3000, cost_per_share: 90, purchase_date: '2024-01-02' }] }],
};
const savings = { asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0.01 };

/** Every accessibility label and every visible string on the rendered screen. */
function readable(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; }
    if (n.props?.accessibilityLabel) out.push(String(n.props.accessibilityLabel));
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const firstMatch = (re: RegExp): string | null => {
  for (const s of readable()) { const m = s.match(re); if (m) return m[1]; }
  return null;
};
const renderScreen = (file: string) => { const C = require(`../screens/${file}`).default; render(<C />); };

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: WORKER, assetAccounts: [brokerage, savings], liabilities: [] } as any);
});

test('MK-NW-M-017 — net worth reads the same on Home and on the Net worth tab', () => {
  renderScreen('HomeScreen');
  const home = firstMatch(/^Net worth \$?(\d{1,3}(?:,\d{3})*)/);   // Home speaks it (spokenMoney), Net worth prints it (maskedMoney)
  screen.unmount();
  renderScreen('NetWorthScreen');
  const nw = firstMatch(/^Net worth \$?(\d{1,3}(?:,\d{3})*)/);
  expect(home).not.toBeNull();
  expect(nw).not.toBeNull();
  expect(home).toBe(nw);
  expect(home).toBe('320,000');   // the seed adds up: 300,000 + 20,000 — a person can check it
});

test('MK-XS-M-002 — the will-it-last odds read the same on Home and on the Plan hub', () => {
  renderScreen('HomeScreen');
  const home = firstMatch(/Will my money last: (\d{1,3}(?:\.\d+)?) percent odds/);   // exact odds (2026-09-14)
  screen.unmount();
  renderScreen('PlanHubScreen');
  const plan = firstMatch(/Will my money last: [^0-9]*?(\d{1,3}(?:\.\d+)?)(?: percent| out of 100|%)/);
  expect(home).not.toBeNull();
  expect(plan).not.toBeNull();
  expect(home).toBe(plan);
});


// ── a second person: one fund, a month of closes, and $2,000 of dividends inside the window ──
// The dividend is the whole point. Without one, price-only and wealth-generated agree by luck.
const TODAY_D = new Date();
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const back = (n: number) => { const d = new Date(TODAY_D); d.setDate(d.getDate() - n); return d; };
const closes = (ticker: string, from: number, to: number) => ({
  ticker,
  points: Array.from({ length: 46 }, (_, i) => ({ date: dayKey(back(45 - i)), close: from + (to - from) * (i / 45) })),
});
const INVESTOR_ACCOUNT = {
  asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 300000, target_return: 0.07, source: 'connected', last_synced: TODAY_D.toISOString(),
  positions: [{
    position_id: 'p1', ticker: 'VTI', name: 'VTI', asset_class: 'stock_etf', kind: 'brokerage',
    last_price: 100, price: 100, shares: 3000,
    lots: [{ lot_id: 'l1', shares: 3000, cost_per_share: 90, purchase_date: '2024-01-02' }],
  }],
};
// the daily record the door READS its beginning from: $285,000 forty-five days ago → $300,000 today
const INVESTOR_DAYS = Array.from({ length: 46 }, (_, i) => {
  const d = back(45 - i); const v = 285000 + 15000 * (i / 45);
  return {
    date: dayKey(d), origin: 'observed', writtenAt: TODAY_D.toISOString(),
    holdings: [{ date: dayKey(d), accountId: 'van', securityKey: 'VTI', symbol: 'VTI', units: 3000, price: v / 3000, value: v }],
    accounts: [{ date: dayKey(d), accountId: 'van', cash: 0, statedTotal: v, currency: 'USD' }],
  };
});
const INVESTOR_TXNS = [
  { txn_id: 'd1', account_id: 'van', ticker: 'VTI', type: 'DIVIDEND', amount: 2000, date: dayKey(back(10)) },
];

test("MK-XS-M-004 — the month's return reads the same on Home and on Performance's 1M window", () => {
  useStore.setState({
    assetAccounts: [INVESTOR_ACCOUNT], transactions: INVESTOR_TXNS, snapshotDays: INVESTOR_DAYS,
    priceCache: { VTI: closes('VTI', 95, 100), SPY: closes('SPY', 96, 100) },
    pricesFetchedAt: TODAY_D.toISOString(),
  } as any);

  renderScreen('HomeScreen');
  const home = firstMatch(/^you ([+-]\d+\.\d{2}%)$/);
  screen.unmount();

  renderScreen('PerformanceScreen');
  const perf = firstMatch(/^Show 1M, ([+-]\d+\.\d{2}%)$/);

  expect(home).not.toBeNull();     // a pin that reads nothing proves nothing
  expect(perf).not.toBeNull();
  expect(home).toBe(perf);
  // and it is the figure that COUNTS THE DIVIDEND: price change alone gives +3.57%
  expect(home).toBe('+3.69%');
});
