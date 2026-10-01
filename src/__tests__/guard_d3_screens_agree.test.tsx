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
 *    MK-NW-M-013 months of emergency fund — Net worth tab · Insights · Job safety
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
  // the line carries his Q51 clarifier after the figure now, so read the figure and ignore the rest
  const home = firstMatch(/^you ([+-]\d+\.\d{2}%)/);
  screen.unmount();

  renderScreen('PerformanceScreen');
  const perf = firstMatch(/^Show 1M, ([+-]\d+\.\d{2}%)$/);

  expect(home).not.toBeNull();     // a pin that reads nothing proves nothing
  expect(perf).not.toBeNull();
  expect(home).toBe(perf);

  // AND IT IS THE DOOR'S FIGURE, NOT THE PRICE-ONLY ONE — asserted as a property, not a percentage.
  //
  // This said `toBe('+3.69%')` until 2026-10-01, when it broke for a reason worth keeping: the
  // household's dates are relative to today (the screens read the real clock, so they must be), so the
  // beginning sits at a different point on the record's ramp each day and the honest answer moves with
  // it. +3.69% was true on 30 September, +3.57% on 1 October. A pin on the number was pinning the
  // calendar.
  //
  // Nor can the dividend be removed to prove it counts: a dividend is INSIDE wealth generated, not
  // added to it, so taking the row away leaves the total unchanged. What B-112 was about is the
  // METHOD — Home used portfolioPeriodReturn, price change weighted by holding. So the pin is that
  // Home's figure is the door's and NOT that one, which holds on any day.
  const { buildPerformance, portfolioPeriodReturn } = require('../domain/performance');
  const positions = (INVESTOR_ACCOUNT.positions ?? []) as any[];
  const priceOnly = portfolioPeriodReturn(
    buildPerformance(positions, (t: string) => ({ VTI: closes('VTI', 95, 100) } as any)[t.toUpperCase()], '1M'));
  expect(priceOnly).not.toBeNull();
  expect(Number(home!.replace(/[+%]/g, ''))).not.toBeCloseTo(priceOnly! * 100, 2);
});

/** HIS RULING ON Q51 (2026-09-30): the Home line says which of the two figures counts income.
 *
 *  He asked why "ahead by" could be trusted when the two sides are measured differently, and ruled
 *  the line reads "you +3.69% (including dividend and interest), market +2.83%, ahead by 0.85%".
 *  Written "dividends and interest" — the words the walk, the category table and the glossary use.
 *
 *  Why it needs a pin: without the clarifier the gap reads as skill, when part of it is simply income
 *  the market side cannot see — no price feed we hold gives an index's dividends.
 */
test('MK-PF-M-008 — Home says WHICH figure counts dividends and interest, so the gap is not read as skill', () => {
  useStore.setState({
    assetAccounts: [INVESTOR_ACCOUNT], transactions: INVESTOR_TXNS, snapshotDays: INVESTOR_DAYS,
    priceCache: { VTI: closes('VTI', 95, 100), SPY: closes('SPY', 96, 100) },
    pricesFetchedAt: TODAY_D.toISOString(),
  } as any);
  renderScreen('HomeScreen');
  const lines = readable();
  const you = lines.find((s) => /^you [+-]/.test(s));
  // the WORDS are the pin, not the percentage — the figure moves with the calendar (see above)
  expect(you).toMatch(/^you [+-]\d+\.\d{2}% \(including dividends and interest\)$/);
  // the market side is NOT claimed to include them, because it does not
  expect(lines.find((s) => /^market [+-]/.test(s))).toMatch(/^market [+-]\d+\.\d{2}%$/);
  expect(lines.find((s) => /^market [+-]/.test(s))).not.toMatch(/including/);
  expect(lines.some((s) => /^ahead by /.test(s))).toBe(true);
});


/** MK-NW-M-013 — THE MONTHS OF EMERGENCY FUND, ON EVERY SCREEN THAT SHOWS IT.
 *
 *  B-117, found by Net worth pass 3 on 2026-09-30. Insights divided cash by ESSENTIALS ALONE while the
 *  door — read by the Net worth tab, Job safety and Stress test — divides by essentials PLUS the debt
 *  minimums, on his ruling of 2026-09-28: *"What about credit card debt, HELOC, car..."*. The ruling
 *  reached the door and the three screens that read it, and never reached this one.
 *
 *  IT DID NOT MERELY SHOW A WRONG NUMBER — IT SUPPRESSED THE WARNING. The "Build your emergency fund"
 *  card fires below three months. Pat below has $18,000 of cash against $4,500 of expenses and $2,650
 *  of debt minimums, so honestly she has 18,000 ÷ 7,150 = 2.5 months and the card belongs on her
 *  screen. Dividing by expenses alone gives 4.0 months, which is above the line, so the card never
 *  appeared for exactly the person who needed it.
 *
 *  This pin reads the rendered screens, and it is RED on the old code twice over: the number and the
 *  card's very existence.
 */
const SHORT_OF_CASH = {
  onboardingProfile: { ...WORKER, monthlySpending: '4500' },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 18000, target_return: 0 },
    { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 300000, target_return: 0.07 },
  ],
  liabilities: [
    { debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400 },
    { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
  ],
};

test('MK-NW-M-013 — months of emergency fund reads the same on the Net worth tab and on Insights', () => {
  useStore.setState(SHORT_OF_CASH as any);

  renderScreen('NetWorthScreen');
  const nw = firstMatch(/(\d+\.\d) months/);
  screen.unmount();

  renderScreen('InsightsScreen');
  const lines = readable();
  const ins = (() => { for (const l of lines) { const m = l.match(/covers about (\d+\.\d) months/); if (m) return m[1]; } return null; })();

  expect(nw).not.toBeNull();        // a pin that reads nothing proves nothing
  expect(ins).not.toBeNull();
  expect(ins).toBe(nw);
  expect(nw).toBe('2.5');           // 18,000 ÷ (4,500 expenses + 2,650 debt minimums)
});

test('MK-NW-M-013 — and the warning FIRES for someone under three months, which it did not before', () => {
  useStore.setState(SHORT_OF_CASH as any);
  renderScreen('InsightsScreen');
  // dividing by expenses alone gives 4.0 months, above the three-month line, so this card was absent
  expect(readable().some((l) => /Build your emergency fund/.test(l))).toBe(true);
});
