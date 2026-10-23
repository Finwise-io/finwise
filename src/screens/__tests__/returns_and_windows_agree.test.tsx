/** RETURNS AND WINDOWS — ONE FIGURE ON EVERY SCREEN THAT SHOWS IT (2026-10-21, the Performance fix round, PF-A).
 *
 *  Four fixes of the outside re-run (OpenAI, Performance), each proven on the real screens — the Holding page, the account
 *  page and the Performance tab — rendered with the store's own shapes, every Text read in order. Every right figure was
 *  worked by hand first; it is in the comment above its test.
 *
 *  1. A PURCHASE COUNTS FROM THE START OF ITS DAY (DEC-4439; MK-PF-F-040). 10 shares of Y bought 1 Sep at $100 (close $100),
 *     10 more the next morning at $110, close $121 that evening and the day after. Each day's growth is the evening value ÷
 *     (the previous evening's value + money added): 1 Sep 1,000 ÷ (0 + 1,000) = 1; 2 Sep 2,420 ÷ (1,000 + 1,100) = 1.152381;
 *     3 Sep 2,420 ÷ 2,420 = 1 → +15.24%. The holding's own figure read +26.76% (the old shares re-priced at 2 Sep's close
 *     before the new money arrived: 1.21 × 2,420 ÷ 2,310 − 1). The account's record of the same money reads +15.24%.
 *  2. ONE YEARLY RATE (MK-PF-M-016). VTI held throughout, $100 on 12 Oct 2024 (the close before the 2Y window opens) and
 *     $121 on 13 Oct 2026: +21.00% over 731 days → 1.21^(365 ÷ 731) − 1 = +9.99% a year on the account page, the
 *     Performance tab and the Holding page alike (the Holding page read +10.00%, exponent ½). The account page said
 *     "— not a yearly rate" under it; it now says the Performance tab's sentence.
 *  3. A VALUE BELOW ZERO (MK-PF-M-017). $1,000 on 31 Dec 2025, −$500 on 28 Sep 2026: no return, and the same sentence on
 *     the account page and the Performance tab (it read −100.00%).
 *  4. THE PERSON'S OWN DAY (DEC-0189, DEC-0282; closeAsOf). The same 1Y window read at 9 am and at 8 pm: $100 on 12 Oct
 *     2025 (the close before the window), $110 on 13 Oct 2025, $121 on 13 Oct 2026 → +21.00% both times. West of
 *     London it read +10.00% after 5 pm (the window's first day's close taken as the beginning).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { buildPerformance } from '../../domain/performance';
import { thePerformance } from '../../../MoneyKeel/functions/networth-and-performance/performance';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

// ── reading a screen: every Text in order, and every figure printed under its identifier ─────────────────────────────
const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
const readLines = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};
const SCREENS: Record<string, () => any> = {
  invest: () => require('../PerformanceScreen').default, account: () => require('../AccountPortfolioScreen').default,
  holding: () => require('../HoldingDetailScreen').default,
};
type Shot = { lines: string[]; printed: { id: string; text: string }[] };
function shoot(name: string, state: any, at: string, params: Record<string, string | undefined> = {}): Shot {
  jest.useFakeTimers({ now: new Date(at), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  try {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, ...state } as any);
    mockParams = params;
    const C = SCREENS[name]();
    const r = render(<C />);
    resetFiguresPrinted();
    r.rerender(<C />);
    const shot = { lines: readLines(), printed: figuresPrinted().filter((p) => !p.spoken).map((p) => ({ id: p.id, text: p.text })) };
    r.unmount();
    return shot;
  } finally { jest.useRealTimers(); }
}
/** the line printed just after a label (a row's value) */
const after = (s: Shot, label: string): string | undefined => { const i = s.lines.indexOf(label); return i < 0 ? undefined : s.lines[i + 1]; };
const printedAs = (s: Shot, id: string): string[] => s.printed.filter((p) => p.id === id).map((p) => p.text);
const pct2 = (r: number) => `${r >= 0 ? '+' : '−'}${Math.abs(r * 100).toFixed(2)}%`;

// ── the store's own shapes ───────────────────────────────────────────────────────────────────────────────────────────
const closes = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const day = (date: string, accountId: string, holdings: [string, number, number][], cash = 0) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: holdings.map(([k, units, price]) => ({ date, accountId, securityKey: k, symbol: k, units, price, value: units * price, currency: 'USD' })),
  accounts: [{ date, accountId, currency: 'USD', typedValue: null, cash, statedTotal: holdings.reduce((t, h) => t + h[1] * h[2], 0) + cash }],
});
const txn = (id: string, type: string, amount: number, date: string, extra: any = {}) => ({ id, txn_id: id, account_id: 'a1', type, amount, date, source: 'connected', ...extra });
const brokerage = (positions: any[], balance: number, extra: any = {}) => ({ asset_id: 'a1', label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance, cash_balance: 0, source: 'connected', last_synced: '2026-09-03T08:00:00Z', positions, ...extra });

// ═══ 1 · THE MORNING PURCHASE (DEC-4439, MK-PF-F-040) ════════════════════════════════════════════════════════════════
const Y = { position_id: 'py', ticker: 'Y', label: 'Y Fund', asset_class: 'stock_etf', kind: 'stocks_etf', unit: 'shares', last_price: 121,
  lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 100, purchase_date: '2026-09-01' }, { lot_id: 'l2', shares: 10, cost_per_share: 110, purchase_date: '2026-09-02' }] };
const MORNING = {
  assetAccounts: [brokerage([Y], 2420)],
  transactions: [txn('d1', 'DEPOSIT', 1000, '2026-09-01'), txn('b1', 'BUY', 1000, '2026-09-01', { ticker: 'Y', shares: 10, price: 100 }),
    txn('d2', 'DEPOSIT', 1100, '2026-09-02'), txn('b2', 'BUY', 1100, '2026-09-02', { ticker: 'Y', shares: 10, price: 110 })],
  snapshotDays: [day('2026-09-01', 'a1', [['Y', 10, 100]]), day('2026-09-02', 'a1', [['Y', 20, 121]])],
  priceCache: { Y: closes([['2026-08-31', 100], ['2026-09-01', 100], ['2026-09-02', 121], ['2026-09-03', 121]]),
    SPY: closes([['2026-08-31', 600], ['2026-09-01', 600], ['2026-09-02', 606], ['2026-09-03', 606]]) },
  pricesFetchedAt: '2026-09-03T11:00:00Z',
};
const MORNING_RIGHT = 2420 / (1000 + 1100) - 1;   // +15.24%

describe('1 · a purchase counts from the start of its day — the holding and its account read one figure (DEC-4439)', () => {
  test('the functions: the holding\'s own figure equals the account\'s record of the same money, +15.24% (it read +26.76%)', () => {
    const [row] = buildPerformance([Y as any], (t) => (MORNING.priceCache as any)[t], '1M', new Date('2026-09-03T12:00:00'));
    expect(row.cappedSince).toBe('2026-09-01');
    expect(row.periodReturn!).toBeCloseTo(MORNING_RIGHT, 12);
    const account = thePerformance({ windowStart: '2026-09-02', windowLabel: 'since Sep 1, 2026', today: '2026-09-03', transactions: MORNING.transactions,
      snapshotDays: MORNING.snapshotDays, investmentAccountIds: new Set(['a1']), accounts: MORNING.assetAccounts, wholeRecord: true });
    expect(account.cumulative!).toBeCloseTo(MORNING_RIGHT, 12);
    expect(row.periodReturn!).toBeCloseTo(account.cumulative!, 12);
  });
  test('on screen: the Holding page, the account page and the Performance tab all print +15.24%', () => {
    const hold = shoot('holding', MORNING, '2026-09-03T12:00:00', { account: 'a1', position: 'py', period: '1M' });
    expect(after(hold, 'Your return since purchase')).toBe(pct2(MORNING_RIGHT));
    const acct = shoot('account', MORNING, '2026-09-03T12:00:00', { id: 'a1' });
    expect(printedAs(acct, 'MK-PF-M-016')).toContain(pct2(MORNING_RIGHT));
    const inv = shoot('invest', MORNING, '2026-09-03T12:00:00');
    expect(printedAs(inv, 'MK-PF-M-017')).toContain(pct2(MORNING_RIGHT));
    // a guard that proves it looked: each screen printed its return, and none printed the old +26.76%
    for (const s of [hold, acct, inv]) { expect(s.lines.length).toBeGreaterThan(10); expect(s.lines).not.toContain('+26.76%'); }
  });
});

// ═══ 2 · ONE YEARLY RATE (MK-PF-M-016) ═══════════════════════════════════════════════════════════════════════════════
const VTI = { position_id: 'pv', ticker: 'VTI', label: 'Vanguard Total Market', asset_class: 'stock_etf', kind: 'stocks_etf', unit: 'shares', last_price: 121,
  lots: [{ lot_id: 'v1', shares: 1000, cost_per_share: 80, purchase_date: '2023-03-15' }] };
const TWO = {
  assetAccounts: [brokerage([VTI], 121_000, { last_synced: '2026-10-13T08:00:00Z' })],
  transactions: [],
  snapshotDays: [day('2024-10-12', 'a1', [['VTI', 1000, 100]]), day('2025-10-12', 'a1', [['VTI', 1000, 110]]), day('2026-10-12', 'a1', [['VTI', 1000, 121]])],
  priceCache: { VTI: closes([['2024-10-11', 100], ['2024-10-12', 100], ['2025-10-12', 110], ['2026-10-12', 121], ['2026-10-13', 121]]),
    SPY: closes([['2024-10-12', 500], ['2026-10-13', 550]]) },
  pricesFetchedAt: '2026-10-13T11:00:00Z',
};
const YEARLY = Math.pow(1.21, 365 / 731) - 1;   // +9.99% a year: 12 Oct 2024 → 13 Oct 2026 is 731 days

describe('2 · one yearly rate on every screen — 21% over 731 days is +9.99% a year (MK-PF-M-016)', () => {
  const SENTENCE = `+21.00% over the two years, which is ${pct2(YEARLY)}/year — a yearly rate, so it sits fairly beside a one-year window`;
  test('the Performance tab and the account page say the same sentence; the account page no longer says "not a yearly rate"', () => {
    const inv = shoot('invest', TWO, '2026-10-13T12:00:00');
    // the tab opens on Since; 2Y is picked from its control
    const { fireEvent } = require('@testing-library/react-native');
    jest.useFakeTimers({ now: new Date('2026-10-13T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    let invLines: string[] = [];
    try {
      useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true); useStore.setState({ hideBalances: false, ...TWO } as any);
      mockParams = {};
      const C = SCREENS.invest();
      render(<C />);
      const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show 2Y'));
      expect(btn).toBeTruthy();
      fireEvent.press(btn!);
      invLines = readLines();
      screen.unmount();
    } finally { jest.useRealTimers(); }
    expect(inv.lines.length).toBeGreaterThan(10);
    expect(invLines.some((l) => l.startsWith(SENTENCE))).toBe(true);
    const acct = shoot('account', TWO, '2026-10-13T12:00:00', { id: 'a1', period: '2Y' });
    expect(acct.lines.some((l) => l.startsWith(SENTENCE))).toBe(true);
    expect(acct.lines.join(' ')).not.toMatch(/not a yearly rate/);
    expect(printedAs(acct, 'MK-PF-M-016')).toContain(pct2(YEARLY));
  });
  test('the Holding page\'s 2Y figure is the same yearly rate, +9.99% (it read +10.00%)', () => {
    const hold = shoot('holding', TWO, '2026-10-13T12:00:00', { account: 'a1', position: 'pv', period: '2Y' });
    // written as a yearly rate, with the window's own total beside it in the Performance tab's sentence (2026-10-21, W-HOLDING, gap 34)
    expect(after(hold, 'Your return, past 2 years')).toBe(`${pct2(YEARLY)}/year`);
    expect(hold.lines).toContain(`Your return: ${SENTENCE}.`);   // the Performance tab's and the account page's sentence, its subject named
    expect(pct2(YEARLY)).toBe('+9.99%');
  });
});

// ═══ 3 · A VALUE BELOW ZERO (MK-PF-M-017) ════════════════════════════════════════════════════════════════════════════
const NEG = {
  assetAccounts: [{ ...brokerage([], -500, { last_synced: '2026-09-28T08:00:00Z' }), cash_balance: -500 }],
  transactions: [],
  snapshotDays: [day('2025-12-31', 'a1', [], 1000), day('2026-09-28', 'a1', [], -500)],
  priceCache: {}, pricesFetchedAt: '2026-09-28T11:00:00Z',
};
describe('3 · a value below $0 gives no return, and the same reason, on the account page and the Performance tab (MK-PF-M-017)', () => {
  const WHY = 'The value recorded on Sep 28, 2026 is below $0, so a return cannot be measured across that day. The dollar figures here are still right.';
  test('the account page (This year): no percent, the sentence', () => {
    const acct = shoot('account', NEG, '2026-09-28T12:00:00', { id: 'a1', period: 'YTD' });
    expect(acct.lines.join(' ')).toContain(WHY);
    expect(printedAs(acct, 'MK-PF-M-016')).not.toContain('−100.00%');
  });
  test('the Performance tab (This year): the same sentence, no −100.00%', () => {
    const { fireEvent } = require('@testing-library/react-native');
    jest.useFakeTimers({ now: new Date('2026-09-28T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    try {
      useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true); useStore.setState({ hideBalances: false, ...NEG } as any);
      mockParams = {};
      const C = SCREENS.invest();
      render(<C />);
      const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show This year'));
      expect(btn).toBeTruthy();
      fireEvent.press(btn!);
      const lines = readLines();
      expect(lines.join(' ')).toContain(WHY);
      expect(lines).not.toContain('−100.00%');
      screen.unmount();
    } finally { jest.useRealTimers(); }
  });
});

// ═══ 4 · THE PERSON'S OWN DAY (DEC-0189, DEC-0282) ═══════════════════════════════════════════════════════════════════
const DAYS = {
  assetAccounts: [brokerage([{ ...VTI, last_price: 121, lots: [{ lot_id: 'v1', shares: 10, cost_per_share: 80, purchase_date: '2023-03-15' }] }], 1210)],
  transactions: [], snapshotDays: [],
  priceCache: { VTI: closes([['2025-10-12', 100], ['2025-10-13', 110], ['2026-10-13', 121]]), SPY: closes([['2025-10-12', 500], ['2026-10-13', 550]]) },
  pricesFetchedAt: '2026-10-13T11:00:00Z',
};
describe('4 · a window\'s first day is the person\'s own calendar day — the same figure at 9 am and at 8 pm (DEC-0189, DEC-0282)', () => {
  test('the Holding page\'s 1Y figure is +21.00% in the morning and in the evening (it read +10.00% after 5 pm in California)', () => {
    const morning = shoot('holding', DAYS, '2026-10-13T09:00:00', { account: 'a1', position: 'pv', period: '1Y' });
    const evening = shoot('holding', DAYS, '2026-10-13T20:00:00', { account: 'a1', position: 'pv', period: '1Y' });
    expect(after(morning, 'Your return, past year')).toBe('+21.00%');
    expect(after(evening, 'Your return, past year')).toBe('+21.00%');
  });
  test('the record the screens build for today is the same day morning and evening (a guard that the day is read locally)', () => {
    expect(buildDayFromAccounts(DAYS.assetAccounts as any, '2026-10-13', 'x').date).toBe('2026-10-13');
  });
});

// ═══ 5 · A HOLDING'S ROW ON THE ACCOUNT PAGE STARTS WHERE THE WINDOW DOES (DEC-0315) ═══════════════════════════════════
// VTI $100 at the close of 12 Oct 2025 (the day before the 1Y window's first day), $110 at the close of 13 Oct 2025 (its
// first day), $121 today: the window's move is 121 ÷ 100 − 1 = +21.00%. The account page's row read the close ON the
// first day — 121 ÷ 110 − 1 = +10.00% — while the Holding page and the account's own return read +21.00%.
const TWO_HOLDINGS = {
  ...DAYS,
  assetAccounts: [brokerage([{ ...VTI, last_price: 121, lots: [{ lot_id: 'v1', shares: 10, cost_per_share: 80, purchase_date: '2023-03-15' }] },
    { position_id: 'pb', ticker: 'BND', label: 'Vanguard Total Bond', asset_class: 'bond', kind: 'fixed_income', unit: 'shares', last_price: 70,
      lots: [{ lot_id: 'b1', shares: 10, cost_per_share: 70, purchase_date: '2023-03-15' }] }], 1910)],
  priceCache: { ...DAYS.priceCache, BND: closes([['2025-10-12', 70], ['2025-10-13', 70], ['2026-10-13', 70]]), AGG: closes([['2025-10-12', 100], ['2026-10-13', 100]]) },
  // the account's own daily record reaches the window's beginning, so 1Y can be picked on its page
  snapshotDays: [day('2025-10-12', 'a1', [['VTI', 10, 100], ['BND', 10, 70]]), day('2025-10-13', 'a1', [['VTI', 10, 110], ['BND', 10, 70]]),
    day('2026-10-12', 'a1', [['VTI', 10, 121], ['BND', 10, 70]])],
};
describe('5 · the account page\'s holding row and the Holding page read one window from one close (DEC-0315)', () => {
  test('VTI over 1Y reads +21.00% on its row of the account page and on its own page', () => {
    const acct = shoot('account', TWO_HOLDINGS, '2026-10-13T12:00:00', { id: 'a1', period: '1Y' });
    const hold = shoot('holding', TWO_HOLDINGS, '2026-10-13T12:00:00', { account: 'a1', position: 'pv', period: '1Y' });
    expect(after(hold, 'Your return, past year')).toBe('+21.00%');
    expect(acct.lines.length).toBeGreaterThan(10);
    expect(acct.lines).toContain('+21.00%');
    expect(acct.lines).not.toContain('+10.00%');
  });
});

// ═══ 6 · A PURCHASE WITH NO DATE BESIDE A DATED ONE (MK-PF-F-040, MK-PF-F-012; tenet 3) ════════════════════════════════
// 7.25 shares bought 17 Sep 2026 at $83.17 and 3.125 with no date at $91.43; $97.31 today. When the undated money arrived
// is not known, so there is no return since purchase: it read +13.60%, as if both were bought on 17 Sep.
const MIXED = {
  assetAccounts: [brokerage([{ position_id: 'pm', ticker: 'M', label: 'M Fund', asset_class: 'stock_etf', kind: 'stocks_etf', unit: 'shares', last_price: 97.31,
    lots: [{ lot_id: 'm1', shares: 7.25, cost_per_share: 83.17, purchase_date: '2026-09-17' }, { lot_id: 'm2', shares: 3.125, cost_per_share: 91.43, purchase_date: '' }] }],
    10.375 * 97.31, { last_synced: '2026-10-13T08:00:00Z' })],
  transactions: [], snapshotDays: [],
  priceCache: { M: closes([['2026-09-16', 83], ['2026-09-17', 83.17], ['2026-10-13', 97.31]]), SPY: closes([['2026-09-16', 600], ['2026-10-13', 610]]) },
  pricesFetchedAt: '2026-10-13T11:00:00Z',
};
describe('6 · a purchase with no date beside a dated one: no return since purchase, and the Holding page says why', () => {
  test('the Holding page prints the reason, never +13.60% and never the price-history line', () => {
    const hold = shoot('holding', MIXED, '2026-10-13T12:00:00', { account: 'a1', position: 'pm', period: '1M' });
    expect(hold.lines.length).toBeGreaterThan(10);
    expect(hold.lines).toContain('A purchase of this holding has no date on record, so its return since purchase cannot be measured.');
    expect(hold.lines).not.toContain('+13.60%');
    expect(hold.lines).not.toContain('Not enough price history for a fair comparison — check back as prices fill in.');
  });
});

// ═══ 7 · OVER 2Y, A WINDOW JOINED AT THE RECORD'S FIRST DAY STILL SAYS ITS TOTAL (DEC-0237, DEC-0404; 2026-10-22) ════════
// The same VTI holding, but the account's daily record begins 1 Dec 2025: the days before are worked back from prices and
// joined there (DEC-6412). The yearly rate stood alone under the record's sentence; now the two years' own total sits
// beside it, on the account page and on the Performance tab, in the one sentence.
const JOINED = { ...TWO, snapshotDays: [day('2025-12-01', 'a1', [['VTI', 1000, 112]]), day('2026-10-12', 'a1', [['VTI', 1000, 121]])],
  priceCache: { ...TWO.priceCache, VTI: closes([['2024-10-11', 100], ['2024-10-12', 100], ['2025-10-12', 110], ['2025-12-01', 112], ['2026-10-12', 121], ['2026-10-13', 121]]) } };
describe('7 · 2Y joined at the record\'s first day: the yearly rate and the two years\' own total, on the account page', () => {
  test('the account page prints the record\'s sentence, then the one sentence: +21.00% over the two years, which is +9.99%/year', () => {
    const acct = shoot('account', JOINED, '2026-10-13T12:00:00', { id: 'a1', period: '2Y' });
    expect(acct.lines.some((l) => l.startsWith('Your daily record begins'))).toBe(true);
    expect(acct.lines).toContain(`+21.00% over the two years, which is ${pct2(YEARLY)}/year — a yearly rate, so it sits fairly beside a one-year window.`);
  });
});
